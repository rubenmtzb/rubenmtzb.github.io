/**
 * Game Mode — Killua Platformer (Godspeed ⚡ / Kanmuru)
 *
 * Principles:
 *   · Dead-zone camera with immediate scrolling, independent of the portfolio's smooth scroll.
 *   · Simulation capped at 60 FPS and normalised over time for high-refresh monitors.
 *   · Deduplicated DOM platforms and bounded effects, so the easter egg never becomes a burden.
 *   · Total keyboard isolation: keys only drive Killua; the mouse keeps 100% of the web interaction.
 *   · Calibrated physics driven by Killua's retro animations (idle, steps 1 and 2, jump, Godspeed).
 *   · Comic/manga speech bubbles and retro synthesiser sound effects (voice chirps).
 *   · Ultimate ability: KANMURU / GODSPEED MODE (pure neon-blue aura, lightning and orb magnet).
 *
 * What lives elsewhere, and why the drawing does not:
 *   The arithmetic (`game/physics`), the levels (`game/levels`) and the
 *   synthesiser (`game/audio`) were pulled out because each one can be reasoned
 *   about — and, in the first case, tested — without a canvas. The drawing code
 *   stays here on purpose: every routine paints into this canvas, with this
 *   camera and this frame's state, so moving it out would only trade a long file
 *   for a wide interface passing the same six variables around. The split that
 *   pays for itself is the one between calculating and painting, and that one is
 *   already made: the loop simulates, `paintFrame` only reads.
 */

import {
  BODY,
  PHYSICS,
  clampToStage,
  cutJump,
  LEDGE_INSET,
  landsOn,
  nextVelocityX,
  nextVelocityY,
} from './game/physics'
import { createGameAudio, type BleepMood } from './game/audio'
import {
  LEVELS,
  type ComicBubble,
  type CustomLedge,
  type MovingLedge,
  type Rect,
  type SectionOrb,
} from './game/levels'

const W = BODY.width
const H = BODY.height
const BLOCK_H = 8

// Ultimate ability: Godspeed mode (Kanmuru / electric aura)
const GODSPEED_DURATION = 4500
const GODSPEED_COOLDOWN = 7500
const FRAME_MS = 1000 / 60
const MAX_FRAME_SCALE = 2
const MAX_TRAIL = 28
const MAX_SPARKS = 72
const MAX_SHOCKWAVES = 4


export function startGameMode(onExit: () => void) {
  const originalScrollY = window.scrollY
  document.documentElement.classList.add('game-mode-active')

  const canvas = document.createElement('canvas')
  canvas.className = 'gm-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!

  const ui = document.createElement('div')
  ui.className = 'gm-ui'
  document.body.appendChild(ui)

  let w = window.innerWidth
  let h = window.innerHeight
  let dpr = Math.min(window.devicePixelRatio || 1, 1.25)
  let maxCameraY = Math.max(0, document.documentElement.scrollHeight - h)

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.25)
    w = window.innerWidth
    h = window.innerHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    maxCameraY = Math.max(0, document.documentElement.scrollHeight - h)
    cacheDomPlatforms()
  }

  const isSpanish = document.documentElement.lang === 'es'

  // Sprites
  const spriteIdle = new Image(); spriteIdle.src = '/killua-pixel.png'
  const spriteRun1 = new Image(); spriteRun1.src = '/killua-run-1.png'
  const spriteRun2 = new Image(); spriteRun2.src = '/killua-run-2.png'
  const spriteJump = new Image(); spriteJump.src = '/killua-jump.png'
  const spriteGodspeed = new Image(); spriteGodspeed.src = '/killua-godspeed.png'

  const audio = createGameAudio()
  const { playBoltSound, playDoubleJumpSound, playGodspeedSound, playVoiceBleep } = audio


  let currentLevelIdx = 0
  let status: 'playing' | 'level_clear' | 'dead' | 'won' = 'playing'
  let got = 0
  let totalOrbsInLevel = 0
  let orbs: SectionOrb[] = []
  let customLedges: CustomLedge[] = []
  let movingLedges: MovingLedge[] = []
  let cachedDomPlatforms: Rect[] = []
  let recoveryLedge: CustomLedge | null = null
  let deathY = 2000
  let dropThroughUntil = 0

  let lastGodspeedTime = -9999
  let godspeedActiveUntil = -9999

  let currentBubble: ComicBubble | null = null
  let lastIdleSpeechTime = 0
  let lastMoveTime = performance.now()

  const say = (text: string, duration = 2800, mood: BleepMood = 'normal') => {
    currentBubble = {
      text,
      startTime: performance.now(),
      duration,
      mood,
    }
    playVoiceBleep(mood)
  }

  const me = {
    x: Math.round(w / 2 - W / 2),
    y: Math.max(window.scrollY + 100, 80),
    vx: 0,
    vy: 0,
    grounded: false,
    face: 1 as 1 | -1,
    frame: 0,
    lastGround: -9999,
    lastJump: -9999,
    jumpsLeft: 1,
    currentMovingLedge: null as MovingLedge | null,
    sx: 1,
    sy: 1,
  }

  // ── SILKY-SMOOTH CAMERA (ZERO JITTER, LOCKSTEP) ──
  let cameraY = window.scrollY
  let targetCameraY = window.scrollY
  let cameraInspectionActive = false
  let descentAnimationStartedAt = -9999
  let descentAnimationUntil = -9999
  let scrollDirection = 0

  // Pre-computed DOM platforms (zero layout thrashing inside the animation loop)
  const cacheDomPlatforms = () => {
    const list: Rect[] = []
    const seen = new Set<string>()
    const sy = window.scrollY
    const PLATFORM_SELECTORS = [
      'h1', 'h2', 'h3',
      '.job-panel', '.project-slide.is-active', '.project-grid-card',
      '.profile-workbench', '.edu-slide.is-active', '.cert-slide.is-active',
      '.moment-card', '.kb-console-card', '.contact-signal',
      '.hero-tech-chip', '.site-badge'
    ]
    const EXCLUDED = ['#viewer', 'dialog', '.site-header', '.gm-ui', '.gm-canvas']

    for (const sel of PLATFORM_SELECTORS) {
      for (const el of document.querySelectorAll<HTMLElement>(sel)) {
        if (EXCLUDED.some((ex) => el.closest(ex))) continue
        const r = el.getBoundingClientRect()
        if (r.width < 50 || r.height > 180 || r.width > w) continue
        const platform = {
          x: Math.round(r.left),
          y: Math.round(r.top + sy),
          w: Math.round(r.width),
        }
        const key = `${platform.x}:${platform.y}:${platform.w}`
        if (seen.has(key)) continue
        seen.add(key)
        list.push(platform)
      }
    }
    cachedDomPlatforms = list.sort((a, b) => a.y - b.y)
  }

  const trail: Array<{ x: number; y: number; a: number; isGodspeed?: boolean }> = []
  const sparks: Array<{ x: number; y: number; vx: number; vy: number; life: number; color?: string }> = []
  const shockwaves: Array<{ x: number; y: number; r: number; maxR: number; a: number; color?: string }> = []

  // Load the level and build a clean, dynamic platform architecture
  const loadLevel = (idx: number) => {
    keys.clear()
    currentLevelIdx = idx
    const cfg = LEVELS[idx]
    got = 0
    status = 'playing'
    cameraInspectionActive = false
    customLedges = []
    movingLedges = []
    recoveryLedge = null
    trail.length = 0
    sparks.length = 0
    shockwaves.length = 0
    me.currentMovingLedge = null
    me.lastGround = performance.now()
    me.lastJump = -9999
    dropThroughUntil = 0
    lastGodspeedTime = -9999
    godspeedActiveUntil = -9999

    const docHeight = document.documentElement.scrollHeight
    const firstTargetSafeY = Math.min(docHeight - 160, Math.max(300, h * 0.38))
    cacheDomPlatforms()

    // 1. Place the orbs on the key targets
    orbs = cfg.targets.map((tgt, i) => {
      let targetX = Math.round(w * tgt.fallbackRatio.x)
      let targetY = Math.round(docHeight * tgt.fallbackRatio.y)

      if (tgt.selector) {
        const el = document.querySelector(tgt.selector)
        if (el) {
          const rect = el.getBoundingClientRect()
          targetY = Math.round(rect.top + window.scrollY + Math.min(rect.height * 0.5, 90))
          targetX = Math.round(Math.max(70, Math.min(w - 90, rect.left + rect.width * 0.5)))
        }
      }
      targetY = Math.max(firstTargetSafeY, targetY)

      return {
        id: `target-${i}`,
        name: tgt.name[isSpanish ? 'es' : 'en'],
        x: targetX,
        y: targetY,
        taken: false,
        seed: Math.random() * 10,
      }
    }).sort((a, b) => a.y - b.y)
      .map((orb, index) => ({ ...orb, id: `target-${index}` }))
    totalOrbsInLevel = orbs.length

    // Spawn Killua near the first orb
    const firstOrb = orbs[0]
    const startY = firstOrb ? Math.max(70, firstOrb.y - 110) : 100
    const startX = firstOrb ? Math.round(Math.max(80, Math.min(w - 80, firstOrb.x > w / 2 ? firstOrb.x - 80 : firstOrb.x + 80))) : Math.round(w / 2)

    me.x = Math.round(startX - W / 2)
    me.y = startY - H - 4
    me.vx = 0
    me.vy = 0
    me.grounded = true
    me.jumpsLeft = 1
    me.currentMovingLedge = null

    cameraY = Math.max(0, startY - h * 0.35)
    targetCameraY = cameraY
    appliedScrollY = Math.round(cameraY)
    document.documentElement.scrollTop = appliedScrollY
    previousFrame = performance.now()

    // Safe starting platform
    customLedges.push({ x: Math.round(startX - 65), y: startY, w: 130, alpha: 1 })

    // 2. Guaranteed base platform under every orb
    orbs.forEach((orb) => {
      customLedges.push({
        x: Math.max(20, Math.min(w - 125, orb.x - 55)),
        y: orb.y + 36,
        w: 110,
        alpha: 1,
      })
    })

    // 3. Smooth staircases and moving platforms between consecutive orbs
    for (let i = 0; i < orbs.length - 1; i++) {
      const oA = orbs[i]
      const oB = orbs[i + 1]
      const dy = oB.y - oA.y
      const dx = oB.x - oA.x

      // More fixed footholds and fewer moving platforms: the route favours flow over difficulty.
      const numSteps = Math.max(2, Math.min(8, Math.ceil(Math.abs(dy) / 120)))
      const stepY = dy / (numSteps + 1)
      const stepX = dx / (numSteps + 1)

      for (let s = 1; s <= numSteps; s++) {
        const ledgeY = Math.round(oA.y + 36 + stepY * s)
        const ledgeX = Math.round(Math.max(30, Math.min(w - 120, oA.x - 45 + stepX * s)))

        if (s % 3 === 0) {
          movingLedges.push({
            x: ledgeX,
            y: ledgeY,
            w: 90,
            originX: ledgeX,
            range: Math.min(48, w * 0.1),
            speed: 0.48,
            dir: 1,
          })
        } else {
          customLedges.push({ x: ledgeX, y: ledgeY, w: 90, alpha: 0.9 })
        }
      }

      // One well-placed side rescue ledge per stretch
      const rescueY = Math.round(oA.y + 36 + dy * 0.5)
      if (i % 2 === 0) {
        customLedges.push({ x: 25, y: rescueY, w: 85, alpha: 0.85 })
      } else {
        customLedges.push({ x: Math.max(80, w - 110), y: rescueY, w: 85, alpha: 0.85 })
      }
    }

    deathY = Math.max(
      2000,
      ...orbs.map((orb) => orb.y),
      ...customLedges.map((ledge) => ledge.y),
      ...movingLedges.map((ledge) => ledge.y),
    ) + 280

    const INTRO_DIALOGS: Record<number, { es: string; en: string }> = {
      0: { es: '¡Examen de Cazador! ¡Vamos a por los 4 orbes! ⚡', en: 'Hunter Exam! Let\'s secure all 4 orbs! ⚡' },
      1: { es: '¡Greed Island! Usa los puentes móviles entre proyectos ⚡', en: 'Greed Island! Use moving bridges across projects ⚡' },
      2: { es: '¡Fase Final! Desatemos el Modo Godspeed hasta la meta ⚡', en: 'Final Stage! Unleash full Godspeed to the goal ⚡' },
    }
    say(INTRO_DIALOGS[idx]?.[isSpanish ? 'es' : 'en'] || '¡En marcha! ⚡', 3200, 'normal')

    renderUI()
  }

  // Godspeed ultimate ability
  const triggerGodspeed = () => {
    if (status !== 'playing') return
    const now = performance.now()
    if (now - lastGodspeedTime < GODSPEED_COOLDOWN) return
    lastGodspeedTime = now
    godspeedActiveUntil = now + GODSPEED_DURATION

    me.jumpsLeft = Math.max(me.jumpsLeft, 2)
    playGodspeedSound()

    shockwaves.push({ x: me.x + W / 2, y: me.y + H / 2, r: 6, maxR: 75, a: 1, color: '#00d4ff' })
    shockwaves.push({ x: me.x + W / 2, y: me.y + H / 2, r: 4, maxR: 50, a: 1, color: '#6fe3ff' })

    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18
      const speed = 4 + Math.random() * 7
      sparks.push({
        x: me.x + W / 2,
        y: me.y + H / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.3,
        color: i % 2 === 0 ? '#00d4ff' : '#6fe3ff',
      })
    }

    say(isSpanish ? '¡KANMURU: Velocidad del Rayo! ⚡' : 'KANMURU: Lightning Speed! ⚡', 3000, 'godspeed')
  }

  // Mid-air double jump
  const executeAirJump = () => {
    if (status !== 'playing' || me.jumpsLeft <= 0) return
    const isGodspeed = performance.now() < godspeedActiveUntil
    me.vy = isGodspeed ? PHYSICS.jumpForce * 1.15 : PHYSICS.doubleJumpForce
    me.jumpsLeft--
    me.sx = 0.75
    me.sy = 1.35
    playDoubleJumpSound()

    shockwaves.push({
      x: me.x + W / 2,
      y: me.y + H,
      r: 4,
      maxR: 36,
      a: 1,
      color: '#6fe3ff',
    })

    for (let i = 0; i < 8; i++) {
      sparks.push({
        x: me.x + W / 2,
        y: me.y + H,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() * 2) + 1,
        life: 1,
        color: '#6fe3ff',
      })
    }

    if (Math.random() < 0.25 && !currentBubble) {
      say(isSpanish ? '¡Doble salto! ⚡' : 'Double jump! ⚡', 1500)
    }
  }

  const requestJump = () => {
    if (status !== 'playing') return
    const now = performance.now()
    const canUseGroundJump = me.grounded || now - me.lastGround < PHYSICS.coyoteMs
    me.lastJump = now
    if (!canUseGroundJump && me.jumpsLeft > 0) {
      me.lastJump = -9999
      executeAirJump()
    }
  }

  // Drop down / fall through a platform
  const triggerDropThrough = () => {
    if (status !== 'playing') return
    descentAnimationStartedAt = performance.now()
    descentAnimationUntil = descentAnimationStartedAt + 360
    scrollDirection = 1
    dropThroughUntil = performance.now() + 240
    me.currentMovingLedge = null
    if (!me.grounded) {
      me.vy = Math.min(me.vy + 6, PHYSICS.fastFall)
    } else {
      me.grounded = false
      me.y += 6
    }
  }

  const renderUI = () => {
    const cfg = LEVELS[currentLevelIdx]
    const now = performance.now()
    const isGodspeedActive = now < godspeedActiveUntil
    const godspeedReady = now - lastGodspeedTime >= GODSPEED_COOLDOWN
    const remainingCd = Math.max(0, Math.ceil((GODSPEED_COOLDOWN - (now - lastGodspeedTime)) / 1000))
    const remainingActive = Math.max(0, Math.ceil((godspeedActiveUntil - now) / 1000))

    const nextTargetOrb = orbs.find((o) => !o.taken)
    const nextTargetIdx = orbs.findIndex((o) => !o.taken)

    ui.innerHTML = `
      <div class="gm-hud-bar">
        <span class="rounded-full bg-[color:var(--ink-700)] px-2 py-0.5 text-[0.68rem] font-mono text-[color:var(--fg-2)] border border-[color:var(--line)]">
          ${isSpanish ? `NIVEL ${cfg.level}/3` : `LEVEL ${cfg.level}/3`}
        </span>
        <span id="gm-hud-progress" class="gm-hud-pill">⚡ ${got}/${totalOrbsInLevel}</span>

        ${nextTargetOrb ? `
          <div id="gm-hud-target" class="hidden md:inline-flex items-center gap-1 rounded-full border border-[color:var(--cyan)]/30 bg-[color:var(--ink-900)] px-2 py-0.5 text-[0.65rem] font-mono text-[color:var(--cyan)]">
            <span class="h-1.5 w-1.5 rounded-full bg-[color:var(--cyan)] animate-pulse"></span>
            <span>[${nextTargetIdx + 1}/${totalOrbsInLevel}] ${nextTargetOrb.name}</span>
          </div>
        ` : ''}

        <button
          type="button"
          id="gm-hud-godspeed"
          class="gm-hud-super ${isGodspeedActive ? 'is-active' : godspeedReady ? 'is-ready' : 'opacity-60'}"
          title="${isSpanish ? 'Modo Godspeed (Aura Eléctrica)' : 'Godspeed Mode (Electric Aura)'}"
        >
          <span>⚡ ${isGodspeedActive ? `AURA (${remainingActive}s)` : 'GODSPEED'}</span>
          <span class="text-[0.62rem] opacity-80">${isGodspeedActive ? '⚡' : godspeedReady ? '[Q / F]' : `(${remainingCd}s)`}</span>
        </button>

        <button type="button" class="gm-exit-btn" id="gm-exit" aria-label="${isSpanish ? 'Salir del juego' : 'Exit game'}">✕ ${isSpanish ? 'Salir' : 'Exit'}</button>
      </div>

      ${status === 'level_clear' ? `
        <div class="gm-modal-overlay">
          <div class="gm-modal">
            <h3 class="gm-modal-title text-[color:var(--cyan)]">⚡ ${isSpanish ? '¡Nivel Superado!' : 'Level Cleared!'}</h3>
            <p class="gm-modal-sub">${cfg.title[isSpanish ? 'es' : 'en']} ${isSpanish ? 'completado con éxito.' : 'completed successfully.'}</p>
            <div class="gm-modal-actions">
              <button type="button" id="gm-next-level" class="btn btn-primary text-sm">${isSpanish ? 'Siguiente Nivel ⚡' : 'Next Level ⚡'}</button>
              <button type="button" id="gm-modal-exit" class="btn btn-ghost text-sm">${isSpanish ? 'Salir' : 'Exit'}</button>
            </div>
          </div>
        </div>
      ` : ''}

      ${status === 'dead' ? `
        <div class="gm-modal-overlay">
          <div class="gm-modal">
            <h3 class="gm-modal-title">⚡ ${isSpanish ? '¡Has caído!' : 'You fell!'}</h3>
            <p class="gm-modal-sub">${isSpanish ? 'Killua perdió el salto. ¡Reintenta para superar este nivel!' : 'Killua slipped. Try again to beat this level!'}</p>
            <div class="gm-modal-actions">
              <button type="button" id="gm-retry" class="btn btn-primary text-sm">${isSpanish ? 'Reintentar Nivel' : 'Retry Level'}</button>
              <button type="button" id="gm-modal-exit" class="btn btn-ghost text-sm">${isSpanish ? 'Salir' : 'Exit'}</button>
            </div>
            <p class="t-meta mt-3 text-xs opacity-60">${isSpanish ? 'O pulsa Espacio' : 'Or press Space'}</p>
          </div>
        </div>
      ` : ''}

      ${status === 'won' ? `
        <div class="gm-modal-overlay">
          <div class="gm-modal gm-modal-win">
            <h3 class="gm-modal-title text-[color:var(--cyan)]">⚡ ${isSpanish ? '¡Maestría Godspeed alcanzada!' : 'Godspeed Master Achieved!'}</h3>
            <p class="gm-modal-sub">${isSpanish ? '¡Has completado todos los 3 niveles del portfolio con Killua!' : 'You mastered all 3 portfolio levels with Killua!'}</p>
            <div class="gm-modal-actions">
              <button type="button" id="gm-play-again" class="btn btn-primary text-sm">${isSpanish ? 'Jugar desde el inicio' : 'Play from start'}</button>
              <button type="button" id="gm-modal-exit" class="btn btn-ghost text-sm">${isSpanish ? 'Cerrar' : 'Close'}</button>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="gm-mobile-controls sm:hidden">
        <div class="flex gap-2">
          <button type="button" id="gm-btn-left" class="gm-touch-btn" aria-label="Left">◀</button>
          <button type="button" id="gm-btn-right" class="gm-touch-btn" aria-label="Right">▶</button>
          <button type="button" id="gm-btn-down" class="gm-touch-btn" aria-label="Down">▼</button>
        </div>
        <div class="flex gap-2">
          <button type="button" id="gm-btn-godspeed" class="gm-touch-btn !bg-[color:var(--blue-bright)]/25 !border-[color:var(--cyan)] text-[color:var(--cyan)]" aria-label="${isSpanish ? 'Aura Godspeed' : 'Godspeed aura'}">⚡</button>
          <button type="button" id="gm-btn-jump" class="gm-touch-btn gm-touch-jump" aria-label="Jump">▲ ${isSpanish ? 'Saltar' : 'Jump'}</button>
        </div>
      </div>
    `

    document.getElementById('gm-exit')?.addEventListener('click', stop)
    document.getElementById('gm-modal-exit')?.addEventListener('click', stop)
    document.getElementById('gm-retry')?.addEventListener('click', () => loadLevel(currentLevelIdx))
    document.getElementById('gm-next-level')?.addEventListener('click', () => loadLevel(currentLevelIdx + 1))
    document.getElementById('gm-play-again')?.addEventListener('click', () => loadLevel(0))
    document.getElementById('gm-hud-godspeed')?.addEventListener('click', triggerGodspeed)

    const leftBtn = document.getElementById('gm-btn-left')
    const rightBtn = document.getElementById('gm-btn-right')
    const downBtn = document.getElementById('gm-btn-down')
    const jumpBtn = document.getElementById('gm-btn-jump')
    const godspeedBtn = document.getElementById('gm-btn-godspeed')

    leftBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); cameraInspectionActive = false; keys.add('ArrowLeft') }, { passive: false })
    leftBtn?.addEventListener('touchend', () => keys.delete('ArrowLeft'))
    leftBtn?.addEventListener('touchcancel', () => keys.delete('ArrowLeft'))
    rightBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); cameraInspectionActive = false; keys.add('ArrowRight') }, { passive: false })
    rightBtn?.addEventListener('touchend', () => keys.delete('ArrowRight'))
    rightBtn?.addEventListener('touchcancel', () => keys.delete('ArrowRight'))
    downBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); cameraInspectionActive = false; triggerDropThrough() }, { passive: false })
    godspeedBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); triggerGodspeed() }, { passive: false })
    jumpBtn?.addEventListener('touchstart', (e) => {
      e.preventDefault()
      cameraInspectionActive = false
      requestJump()
      keys.add('Space')
    }, { passive: false })
    jumpBtn?.addEventListener('touchend', () => keys.delete('Space'))
    jumpBtn?.addEventListener('touchcancel', () => keys.delete('Space'))
  }

  const updateProgressHud = () => {
    const progress = ui.querySelector<HTMLElement>('#gm-hud-progress')
    if (progress) progress.textContent = `⚡ ${got}/${totalOrbsInLevel}`

    const target = ui.querySelector<HTMLElement>('#gm-hud-target')
    const nextOrb = orbs.find((orb) => !orb.taken)
    const nextIndex = orbs.findIndex((orb) => !orb.taken)
    if (target && nextOrb) {
      const label = target.querySelector<HTMLElement>('span:last-child')
      if (label) label.textContent = `[${nextIndex + 1}/${totalOrbsInLevel}] ${nextOrb.name}`
    }
  }

  let lastHudTick = -1
  const updateGodspeedHud = (now: number) => {
    const tick = Math.floor(now / 250)
    if (tick === lastHudTick) return
    lastHudTick = tick

    const button = ui.querySelector<HTMLButtonElement>('#gm-hud-godspeed')
    if (!button) return

    const isActive = now < godspeedActiveUntil
    const isReady = now - lastGodspeedTime >= GODSPEED_COOLDOWN
    const remainingCd = Math.max(0, Math.ceil((GODSPEED_COOLDOWN - (now - lastGodspeedTime)) / 1000))
    const remainingActive = Math.max(0, Math.ceil((godspeedActiveUntil - now) / 1000))

    button.classList.toggle('is-active', isActive)
    button.classList.toggle('is-ready', !isActive && isReady)
    button.classList.toggle('opacity-60', !isActive && !isReady)
    button.innerHTML = `
      <span>⚡ ${isActive ? `AURA (${remainingActive}s)` : 'GODSPEED'}</span>
      <span class="text-[0.62rem] opacity-80">${isActive ? '⚡' : isReady ? '[Q / F]' : `(${remainingCd}s)`}</span>
    `
  }

  const drawLedge = (bx: number, by: number, bw: number, alpha: number, isMoving = false) => {
    ctx.save()
    ctx.globalAlpha = alpha

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.fillRect(bx + 2, by + BLOCK_H, bw - 2, 4)

    ctx.fillStyle = isMoving ? '#0c1a36' : '#0a1020'
    ctx.fillRect(bx, by, bw, BLOCK_H)

    ctx.shadowBlur = isMoving ? 14 : 8
    ctx.shadowColor = isMoving ? '#00d4ff' : '#6fe3ff'
    ctx.fillStyle = isMoving ? '#00d4ff' : '#6fe3ff'
    ctx.fillRect(bx, by, bw, 2)

    ctx.fillStyle = 'rgba(91, 155, 255, 0.3)'
    for (let px = bx + 6; px < bx + bw - 3; px += 8) {
      ctx.fillRect(px, by + 3, 2, 2)
    }
    ctx.restore()
  }

  // Killua's rendering
  const drawKillua = (px: number, py: number, now: number) => {
    const isGodspeed = now < godspeedActiveUntil
    const isMoving = me.grounded && Math.abs(me.vx) > 0.35
    const isDescending = !me.grounded && (me.vy > 1.2 || (now < descentAnimationUntil && scrollDirection > 0))

    ctx.save()
    ctx.translate(Math.round(px + W / 2), Math.round(py + H))
    if (isDescending) {
      ctx.rotate(Math.sin(now * 0.018) * 0.045 * me.face)
    }
    ctx.scale(me.face * me.sx, me.sy)
    ctx.translate(-W / 2, -H)

    const idleBob = me.grounded && !isMoving ? (Math.sin(me.frame * 0.08) > 0.25 ? 1 : 0) : 0

    let activeSprite = spriteIdle
    if (isGodspeed) {
      activeSprite = spriteGodspeed
    } else if (isDescending) {
      const fallClock = now < descentAnimationUntil
        ? Math.max(0, now - descentAnimationStartedAt)
        : me.frame * FRAME_MS
      const fallFrame = Math.floor(fallClock / 48) % 2
      activeSprite = fallFrame === 0 ? spriteJump : spriteRun2
    } else if (!me.grounded) {
      activeSprite = spriteJump
    } else if (isMoving) {
      const stepIdx = Math.floor(me.frame / 9) % 2
      activeSprite = stepIdx === 0 ? spriteRun1 : spriteRun2
    }

    // Neon blue and cyan electric aura
    if (isGodspeed) {
      ctx.save()
      const auraPulse = 0.92 + Math.sin(now * 0.012) * 0.08
      const aura = ctx.createRadialGradient(W / 2, H * 0.55, 4, W / 2, H * 0.55, H * 0.62)
      aura.addColorStop(0, 'rgba(224, 247, 255, 0.22)')
      aura.addColorStop(0.45, 'rgba(0, 212, 255, 0.18)')
      aura.addColorStop(1, 'rgba(59, 130, 246, 0)')
      ctx.fillStyle = aura
      ctx.beginPath()
      ctx.ellipse(W / 2, H * 0.55, W * 0.9 * auraPulse, H * 0.62 * auraPulse, 0, 0, Math.PI * 2)
      ctx.fill()

      if (Math.random() < 0.18) {
        ctx.strokeStyle = Math.random() < 0.4 ? '#ffffff' : '#6fe3ff'
        ctx.lineWidth = 1.5
        ctx.shadowColor = '#00d4ff'
        ctx.shadowBlur = 12
        ctx.beginPath()
        let lx = Math.random() * W
        let ly = Math.random() * H
        ctx.moveTo(lx, ly)
        for (let seg = 0; seg < 3; seg++) {
          lx += (Math.random() - 0.5) * 18
          ly += (Math.random() - 0.5) * 18
          ctx.lineTo(lx, ly)
        }
        ctx.stroke()
      }
      ctx.restore()
    }

    if (activeSprite.complete && activeSprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false
      ctx.shadowColor = isGodspeed ? '#00d4ff' : '#6fe3ff'
      ctx.shadowBlur = isGodspeed ? 18 : 10
      ctx.drawImage(activeSprite, 0, idleBob, W, H)
      ctx.shadowBlur = 0
    } else {
      const S = 2
      const HAIR = isGodspeed ? '#e0f7ff' : '#f0f4fc'
      const SKIN = '#f7dfcb'
      const SHIRT = '#0a0f1c'
      const px2 = (x: number, y: number, ww: number, hh: number, c: string) => {
        ctx.fillStyle = c
        ctx.fillRect(x * S, y * S, ww * S, hh * S)
      }
      px2(2, 0 + idleBob, 12, 4, HAIR)
      px2(3, 5 + idleBob, 10, 6, SKIN)
      px2(3, 11 + idleBob, 10, 10, SHIRT)
    }

    ctx.restore()
  }

  // Comic / manga speech bubbles
  const drawSpeechBubble = (px: number, py: number, now: number) => {
    if (!currentBubble) return

    const elapsed = now - currentBubble.startTime
    if (elapsed > currentBubble.duration) {
      currentBubble = null
      return
    }

    let alpha = 1
    if (elapsed < 180) {
      alpha = elapsed / 180
    } else if (elapsed > currentBubble.duration - 350) {
      alpha = Math.max(0, (currentBubble.duration - elapsed) / 350)
    }

    ctx.save()
    ctx.font = 'bold 11px JetBrains Mono, monospace'
    const text = currentBubble.text
    const textMetrics = ctx.measureText(text)
    const paddingX = 10
    const bubbleW = textMetrics.width + paddingX * 2
    const bubbleH = 24

    const targetCenterX = px + W / 2
    const bubbleX = Math.max(12, Math.min(w - bubbleW - 12, targetCenterX - bubbleW / 2))
    const bubbleY = Math.max(16, py - bubbleH - 12)

    ctx.globalAlpha = alpha

    ctx.shadowColor = currentBubble.mood === 'godspeed' ? '#00d4ff' : 'rgba(111, 227, 255, 0.6)'
    ctx.shadowBlur = currentBubble.mood === 'godspeed' ? 14 : 8

    ctx.fillStyle = 'rgba(6, 12, 24, 0.94)'
    ctx.strokeStyle = currentBubble.mood === 'godspeed' ? '#00d4ff' : 'rgba(111, 227, 255, 0.85)'
    ctx.lineWidth = 1.5

    const r = 8
    ctx.beginPath()
    ctx.moveTo(bubbleX + r, bubbleY)
    ctx.lineTo(bubbleX + bubbleW - r, bubbleY)
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + r)
    ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - r)
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - r, bubbleY + bubbleH)

    const pointerX = Math.max(bubbleX + 16, Math.min(bubbleX + bubbleW - 16, targetCenterX))
    ctx.lineTo(pointerX + 5, bubbleY + bubbleH)
    ctx.lineTo(targetCenterX, Math.min(py - 2, bubbleY + bubbleH + 7))
    ctx.lineTo(pointerX - 5, bubbleY + bubbleH)

    ctx.lineTo(bubbleX + r, bubbleY + bubbleH)
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - r)
    ctx.lineTo(bubbleX, bubbleY + r)
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + r, bubbleY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.fillStyle = currentBubble.mood === 'godspeed' ? '#e0f7ff' : '#ffffff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, bubbleX + paddingX, bubbleY + bubbleH / 2)

    ctx.restore()
  }

  const drawBolt = (orb: SectionOrb, sy: number, t: number, index: number) => {
    const pulse = 0.75 + Math.sin(t * 2.5 + orb.seed) * 0.25
    const drawY = orb.y - sy + Math.sin(t * 1.5 + orb.seed) * 4

    ctx.save()
    ctx.translate(orb.x, drawY)

    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 24 * pulse)
    g.addColorStop(0, 'rgba(111, 227, 255, 0.95)')
    g.addColorStop(0.5, 'rgba(91, 155, 255, 0.45)')
    g.addColorStop(1, 'rgba(91, 155, 255, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.shadowBlur = 18 * pulse
    ctx.shadowColor = '#6fe3ff'
    ctx.beginPath()
    ctx.moveTo(2, -12); ctx.lineTo(-6, 2); ctx.lineTo(-1, 2)
    ctx.lineTo(-3, 13); ctx.lineTo(6, -2); ctx.lineTo(1, -2)
    ctx.closePath()
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(5, 8, 15, 0.85)'
    ctx.strokeStyle = 'rgba(111, 227, 255, 0.5)'
    ctx.lineWidth = 1
    const tagText = `[${index + 1}/${totalOrbsInLevel}] ${orb.name}`
    ctx.font = '10px monospace'
    const tw = ctx.measureText(tagText).width
    ctx.fillRect(-tw / 2 - 4, -28, tw + 8, 14)
    ctx.strokeRect(-tw / 2 - 4, -28, tw + 8, 14)
    ctx.fillStyle = '#6fe3ff'
    ctx.textAlign = 'center'
    ctx.fillText(tagText, 0, -18)

    ctx.restore()
  }

  // Radar compass for off-screen orbs
  const drawRadarBeacon = (orb: SectionOrb, sy: number, index: number, now: number) => {
    const screenX = orb.x
    const screenY = orb.y - sy
    const pad = 36

    const isVisible = screenX >= pad && screenX <= w - pad && screenY >= pad && screenY <= h - pad
    if (isVisible) return

    const cx = w / 2
    const cy = h / 2
    const dx = screenX - cx
    const dy = screenY - cy
    const angle = Math.atan2(dy, dx)
    const dist = Math.round(Math.hypot(orb.x - (me.x + W / 2), orb.y - (me.y + H / 2)))

    const clampedX = Math.max(pad + 24, Math.min(w - pad - 24, cx + Math.cos(angle) * (w / 2 - pad)))
    const clampedY = Math.max(pad + 32, Math.min(h - pad - 32, cy + Math.sin(angle) * (h / 2 - pad)))

    const pulse = 0.85 + Math.sin(now * 0.007 + orb.seed) * 0.15
    const nextTarget = orbs.find((o) => !o.taken)
    const isNext = nextTarget?.id === orb.id

    ctx.save()
    ctx.translate(clampedX, clampedY)

    ctx.shadowColor = '#6fe3ff'
    ctx.shadowBlur = (isNext ? 18 : 8) * pulse

    ctx.fillStyle = isNext ? 'rgba(11, 19, 36, 0.95)' : 'rgba(11, 19, 36, 0.82)'
    ctx.strokeStyle = isNext ? '#6fe3ff' : 'rgba(111, 227, 255, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(0, 0, (isNext ? 18 : 14) * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.rotate(angle)
    ctx.fillStyle = isNext ? '#6fe3ff' : '#93c5fd'
    const s = isNext ? 1 : 0.8
    ctx.beginPath()
    ctx.moveTo(12 * s * pulse, 0)
    ctx.lineTo(4 * s * pulse, -6 * s * pulse)
    ctx.lineTo(6 * s * pulse, -2 * s * pulse)
    ctx.lineTo(-6 * s * pulse, -2 * s * pulse)
    ctx.lineTo(-6 * s * pulse, 2 * s * pulse)
    ctx.lineTo(6 * s * pulse, 2 * s * pulse)
    ctx.lineTo(4 * s * pulse, 6 * s * pulse)
    ctx.closePath()
    ctx.fill()

    ctx.restore()

    if (isNext) {
      ctx.save()
      const labelY = clampedY > h / 2 ? clampedY - 26 : clampedY + 26
      ctx.translate(clampedX, labelY)
      const dirText = dy > 0 ? '▼' : '▲'
      const label = `⚡ [${index + 1}/${totalOrbsInLevel}] ${orb.name} (${dist}px ${dirText})`
      ctx.font = 'bold 10px monospace'
      const lw = ctx.measureText(label).width

      ctx.fillStyle = 'rgba(5, 8, 15, 0.92)'
      ctx.strokeStyle = 'rgba(111, 227, 255, 0.75)'
      ctx.lineWidth = 1
      ctx.fillRect(-lw / 2 - 5, -8, lw + 10, 16)
      ctx.strokeRect(-lw / 2 - 5, -8, lw + 10, 16)
      ctx.fillStyle = '#6fe3ff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, 0, 0)
      ctx.restore()
    }
  }

  const keys = new Set<string>()
  let alive = true
  let raf: number | null = null
  let previousFrame = performance.now()
  let appliedScrollY = Math.round(cameraY)

  /**
   * Paints the frame.
   *
   * Nothing in here changes the game's state: the simulation has already
   * finished by the time it is called, so this block only reads. Splitting it
   * out lets the frame read as what it is — first it is computed, then it is
   * drawn — instead of as four hundred lines where the two alternate.
   */
  const paintFrame = (now: number, frameScale: number, isGodspeed: boolean) => {
  // Use a rounded cameraY for perfect 1:1 sync on screen
  const sy = Math.round(cameraY)

  // Draw the fixed platforms
  customLedges.forEach((ledge) => {
    const ly = ledge.y - sy
    if (ly > -20 && ly < h + 20) drawLedge(ledge.x, ly, ledge.w, ledge.alpha)
  })

  // Draw the moving platforms
  movingLedges.forEach((ml) => {
    const ly = ml.y - sy
    if (ly > -20 && ly < h + 20) drawLedge(ml.x, ly, ml.w, 1, true)
  })

  // Draw the shockwaves
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i]
    sw.r += 3.5 * frameScale
    sw.a -= 0.05 * frameScale
    if (sw.a <= 0 || sw.r >= sw.maxR) { shockwaves.splice(i, 1); continue }
    ctx.save()
    ctx.strokeStyle = sw.color === '#00d4ff'
      ? `rgba(0, 212, 255, ${sw.a.toFixed(3)})`
      : `rgba(111, 227, 255, ${sw.a.toFixed(3)})`
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(sw.x, sw.y - sy, sw.r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // Draw the motion trail
  for (let i = trail.length - 1; i >= 0; i--) {
    const tr = trail[i]
    tr.a -= (tr.isGodspeed ? 0.04 : 0.06) * frameScale
    if (tr.a <= 0) { trail.splice(i, 1); continue }
    const ty = tr.y - sy
    if (ty < -40 || ty > h + 40) continue
    ctx.fillStyle = tr.isGodspeed
      ? `rgba(0, 212, 255, ${tr.a.toFixed(3)})`
      : `rgba(111, 227, 255, ${tr.a.toFixed(3)})`
    ctx.fillRect(tr.x - 2, ty - 2, 4, 4)
  }

  // Draw the sparks
  for (let i = sparks.length - 1; i >= 0; i--) {
    const sp = sparks[i]
    sp.x += sp.vx * frameScale
    sp.y += sp.vy * frameScale
    sp.vy += 0.12 * frameScale
    sp.life -= 0.04 * frameScale
    if (sp.life <= 0) { sparks.splice(i, 1); continue }
    ctx.fillStyle = sp.color || `rgba(111, 227, 255, ${sp.life.toFixed(3)})`
    ctx.fillRect(sp.x, sp.y - sy, 2.5, 2.5)
  }

  // Draw and collect the bolts
  const t = now * 0.003
  const activeOrb = orbs.find((orb) => !orb.taken)
  orbs.forEach((orb, i) => {
    if (orb.taken || orb !== activeOrb) return

    if (isGodspeed && status === 'playing') {
      const kx = me.x + W / 2
      const ky = me.y + H / 2
      const dist = Math.hypot(orb.x - kx, orb.y - ky)
      if (dist < 240) {
        const magnetEase = 1 - Math.pow(0.93, frameScale)
        orb.x += (kx - orb.x) * magnetEase
        orb.y += (ky - orb.y) * magnetEase
      }
    }

    const oy = orb.y - sy
    if (oy >= -60 && oy <= h + 60) {
      drawBolt(orb, sy, t, i)
    } else {
      drawRadarBeacon(orb, sy, i, now)
    }

    if (status === 'playing' && Math.abs(me.x + W / 2 - orb.x) < 40 && Math.abs(me.y + H / 2 - orb.y) < 44) {
      orb.taken = true
      got++
      playBoltSound()
      updateProgressHud()

      const remaining = totalOrbsInLevel - got
      if (remaining === 1) {
        say(isSpanish ? '¡Solo queda un rayo más! ⚡' : 'Only one bolt left! ⚡', 2400, 'alert')
      } else if (remaining > 1) {
        say(isSpanish ? `¡Rayo capturado! (${got}/${totalOrbsInLevel}) ⚡` : `Bolt captured! (${got}/${totalOrbsInLevel}) ⚡`, 1800, 'success')
      }

      for (let s = 0; s < 12; s++) {
        sparks.push({
          x: orb.x,
          y: orb.y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 1,
          color: '#00d4ff',
        })
      }

      if (got === totalOrbsInLevel) {
        keys.clear()
        if (currentLevelIdx < LEVELS.length - 1) {
          status = 'level_clear'
          say(isSpanish ? '¡Nivel completado! ¡Pan comido! ⚡' : 'Level cleared! Piece of cake! ⚡', 3500, 'success')
        } else {
          status = 'won'
          say(isSpanish ? '¡Maestría Godspeed alcanzada! ⚡' : 'Godspeed Master Achieved! ⚡', 4000, 'godspeed')
        }
        renderUI()
      }
    }
  })

  // Electric guide trail towards the next orb
  const nextTargetOrb = orbs.find((o) => !o.taken)
  if (nextTargetOrb && Math.random() < 0.08 * frameScale) {
    const kx = me.x + W / 2
    const ky = me.y + H / 2
    const angle = Math.atan2(nextTargetOrb.y - ky, nextTargetOrb.x - kx)
    sparks.push({
      x: kx + (Math.random() - 0.5) * 8,
      y: ky + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * (2.5 + Math.random() * 2),
      vy: Math.sin(angle) * (2.5 + Math.random() * 2),
      life: 0.7,
      color: 'rgba(0, 212, 255, 0.95)',
    })
  }

  // Draw Killua and the comic bubble
  const py = me.y - sy
  if (py > -H && py < h + H) {
    drawKillua(me.x, py, now)
    drawSpeechBubble(me.x, py, now)
  }
  }

  const loop = (frameNow: number) => {
    if (!alive) return
    const elapsed = frameNow - previousFrame
    if (elapsed < FRAME_MS - 1) {
      raf = requestAnimationFrame(loop)
      return
    }

    const frameScale = Math.min(MAX_FRAME_SCALE, elapsed / FRAME_MS)
    previousFrame = frameNow
    const now = frameNow
    const isGodspeed = now < godspeedActiveUntil
    ctx.clearRect(0, 0, w, h)
    me.frame += frameScale
    updateGodspeedHud(now)

    // Update the moving platforms
    movingLedges.forEach((ml) => {
      const deltaX = ml.speed * ml.dir * frameScale
      ml.x += deltaX
      if (ml.x > ml.originX + ml.range) { ml.x = ml.originX + ml.range; ml.dir = -1 }
      if (ml.x < ml.originX - ml.range) { ml.x = ml.originX - ml.range; ml.dir = 1 }

      if (me.grounded && me.currentMovingLedge === ml) {
        me.x += deltaX
        me.y = ml.y - H
      }
    })

    if (status === 'playing') {
      const left = keys.has('ArrowLeft') || keys.has('KeyA')
      const right = keys.has('ArrowRight') || keys.has('KeyD')
      const jumpHeld = keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW')
      const fastFallHeld = keys.has('ArrowDown') || keys.has('KeyS')

      if (left || right || Math.abs(me.vx) > 0.3) {
        lastMoveTime = now
      }

      me.vx = nextVelocityX(me.vx, {
        left, right, grounded: me.grounded, godspeed: isGodspeed, frameScale,
      })
      if (left) me.face = -1
      else if (right) me.face = 1

      // Jump from the ground
      const canCoyote = now - me.lastGround < PHYSICS.coyoteMs
      const buffered = now - me.lastJump < PHYSICS.bufferMs
      if (buffered && canCoyote) {
        me.vy = isGodspeed ? PHYSICS.jumpForce * 1.15 : PHYSICS.jumpForce
        me.grounded = false
        me.currentMovingLedge = null
        me.lastJump = -9999
        me.lastGround = -9999
        me.sx = 0.78; me.sy = 1.25
        for (let i = 0; i < 6; i++) {
          sparks.push({
            x: me.x + W / 2,
            y: me.y + H,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 2,
            life: 1,
            color: '#6fe3ff',
          })
        }
      }

      me.vy = cutJump(me.vy, jumpHeld)
      me.vy = nextVelocityY(me.vy, { godspeed: isGodspeed, jumpHeld, fastFallHeld, frameScale })
      me.x += me.vx * frameScale
      me.y += me.vy * frameScale

      const bounded = clampToStage(me.x, me.vx, w)
      me.x = bounded.x
      me.vx = bounded.vx

      // Optimised platform collisions (memory instead of continuous DOM queries)
      const dropping = now < dropThroughUntil
      const wasAir = !me.grounded
      me.grounded = false

      if (me.vy >= 0 && !dropping) {
        let landedOnMoving = false
        for (const ml of movingLedges) {
          if (landsOn(me, ml, frameScale, LEDGE_INSET.moving)) {
            me.y = ml.y - H
            me.vy = 0
            me.grounded = true
            me.currentMovingLedge = ml
            me.lastGround = now
            me.jumpsLeft = isGodspeed ? 2 : 1
            landedOnMoving = true
            if (wasAir) {
              me.sx = 1.2; me.sy = 0.78
              for (let i = 0; i < 5; i++) {
                sparks.push({ x: me.x + W / 2, y: me.y + H, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, life: 0.8, color: '#00d4ff' })
              }
            }
            break
          }
        }

        if (!landedOnMoving) {
          me.currentMovingLedge = null
          // Check the custom platforms
          for (const p of customLedges) {
            if (landsOn(me, p, frameScale, LEDGE_INSET.custom)) {
              me.y = p.y - H
              me.vy = 0
              me.grounded = true
              me.lastGround = now
              me.jumpsLeft = isGodspeed ? 2 : 1
              if (wasAir) {
                me.sx = 1.2; me.sy = 0.78
                for (let i = 0; i < 5; i++) {
                  sparks.push({ x: me.x + W / 2, y: me.y + H, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, life: 0.8 })
                }
              }
              break
            }
          }

          // Check the pre-cached DOM platforms
          if (!me.grounded) {
            for (const p of cachedDomPlatforms) {
              const bottom = me.y + H
              const prev = bottom - me.vy * frameScale
              if (p.y < prev - 8) continue
              if (p.y > bottom + 8) break
              if (landsOn(me, p, frameScale, LEDGE_INSET.dom)) {
                me.y = p.y - H
                me.vy = 0
                me.grounded = true
                me.lastGround = now
                me.jumpsLeft = isGodspeed ? 2 : 1
                if (wasAir) {
                  me.sx = 1.2; me.sy = 0.78
                  for (let i = 0; i < 5; i++) {
                    sparks.push({ x: me.x + W / 2, y: me.y + H, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, life: 0.8 })
                  }
                }
                break
              }
            }
          }
        }
      }

      if (me.grounded) {
        me.lastGround = now
        me.jumpsLeft = isGodspeed ? 2 : 1
      }

      const squashEase = 1 - Math.pow(0.82, frameScale)
      me.sx += (1 - me.sx) * squashEase
      me.sy += (1 - me.sy) * squashEase

      // Safe fall into the void
      if (me.y > deathY && me.vy > 0) {
        status = 'dead'
        keys.clear()
        say(isSpanish ? '¡Maldición! Casi lo tenía...' : 'Blast it! Almost had it...', 2500, 'alert')
        renderUI()
      }

      // Speed trail
      if (isGodspeed || Math.abs(me.vx) > 1.6 || Math.abs(me.vy) > 3.5) {
        if (trail.length >= MAX_TRAIL) trail.shift()
        trail.push({
          x: me.x + W / 2,
          y: me.y + H / 2,
          a: isGodspeed ? 0.75 : 0.45,
          isGodspeed,
        })
      }

      // ── SILKY-SMOOTH SHELF-BY-SHELF CAMERA TRACKING (ZERO JITTER) ──
      // During ordinary jumps inside a section the camera does not move.
      // It only updates its target once Killua clears the upper/lower bounds.
      if (!cameraInspectionActive) {
        const screenY = me.y - cameraY
        if (screenY < h * 0.22) {
          targetCameraY = me.y - h * 0.25
        } else if (screenY > h * 0.68) {
          targetCameraY = me.y - h * 0.60
        }

        targetCameraY = Math.max(0, Math.min(maxCameraY, targetCameraY))
        const diffCamera = targetCameraY - cameraY

        if (Math.abs(diffCamera) > 0.5) {
          const cameraEase = 1 - Math.pow(0.9, frameScale)
          cameraY += diffCamera * cameraEase
          const nextScrollY = Math.round(cameraY)
          if (nextScrollY !== appliedScrollY) {
            appliedScrollY = nextScrollY
            document.documentElement.scrollTop = nextScrollY
          }
        }
      }

      // If the next target ends up behind, it is recovered ahead of the player.
      const missedOrbAbove = orbs.find((orb) => !orb.taken)
      if (missedOrbAbove && missedOrbAbove.y < me.y - 240) {
        missedOrbAbove.x = Math.max(70, Math.min(w - 90, me.x + W / 2))
        missedOrbAbove.y = me.y + 120
        if (recoveryLedge) {
          recoveryLedge.x = Math.max(20, Math.min(w - 130, missedOrbAbove.x - 60))
          recoveryLedge.y = missedOrbAbove.y + 36
        } else {
          recoveryLedge = {
            x: Math.max(20, Math.min(w - 130, missedOrbAbove.x - 60)),
            y: missedOrbAbove.y + 36,
            w: 120,
            alpha: 1,
          }
          customLedges.push(recoveryLedge)
        }
        deathY = Math.max(deathY, missedOrbAbove.y + 280)
        say(
          isSpanish ? '¡Rayo recuperado! Sigue descendiendo ⚡' : 'Bolt recovered! Keep moving down ⚡',
          2400,
          'alert',
        )
      }

      if (now - lastMoveTime > 4200 && now - lastIdleSpeechTime > 9000 && !currentBubble) {
        lastIdleSpeechTime = now
        const IDLE_QUOTES = isSpanish ? [
          'No hay tiempo que perder... ⚡',
          '¿Un descanso? ¡Sigamos explorando!',
          '¡Pulsa [Q] para activar el Modo Godspeed!',
          '¡Aprovecha las plataformas móviles!',
        ] : [
          'No time to lose... ⚡',
          'Taking a break? Let\'s keep exploring!',
          'Press [Q] to activate Godspeed Mode!',
          'Take advantage of moving ledges!',
        ]
        const quote = IDLE_QUOTES[Math.floor(Math.random() * IDLE_QUOTES.length)]
        say(quote, 2800, 'normal')
      }
    }

    paintFrame(now, frameScale, isGodspeed)

    if (sparks.length > MAX_SPARKS) sparks.splice(0, sparks.length - MAX_SPARKS)
    if (shockwaves.length > MAX_SHOCKWAVES) shockwaves.splice(0, shockwaves.length - MAX_SHOCKWAVES)
    raf = requestAnimationFrame(loop)
  }

  // ── KEYBOARD ISOLATION AND EXCLUSIVE GAME CONTROL ──
  if (document.activeElement && document.activeElement !== document.body) {
    ;(document.activeElement as HTMLElement).blur()
  }

  const GAME_PREVENT_KEYS = new Set([
    'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyK',
    'ShiftLeft', 'ShiftRight',
    'Tab', 'PageUp', 'PageDown', 'Home', 'End', 'Enter'
  ])

  const onKeyDown = (e: KeyboardEvent) => {
    if (GAME_PREVENT_KEYS.has(e.code)) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (document.activeElement && document.activeElement !== document.body) {
      ;(document.activeElement as HTMLElement).blur()
    }

    if (e.code === 'Escape') { stop(); return }
    if (e.repeat) {
      keys.add(e.code)
      return
    }
    if ([
      'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp',
      'KeyA', 'KeyD', 'KeyS', 'KeyW',
      'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyK',
    ].includes(e.code)) {
      cameraInspectionActive = false
    }
    if (e.code === 'Space' && status === 'dead') {
      loadLevel(currentLevelIdx)
      return
    }
    if (e.code === 'Space' && status === 'level_clear') {
      loadLevel(currentLevelIdx + 1)
      return
    }
    if (e.code === 'Space' && status === 'won') {
      loadLevel(0)
      return
    }

    // Godspeed ultimate ability (Q / R / F)
    if (['KeyQ', 'KeyR', 'KeyF'].includes(e.code)) {
      triggerGodspeed()
    }

    // Drop down / fast fall (S / Arrow Down)
    if (['ArrowDown', 'KeyS'].includes(e.code)) {
      triggerDropThrough()
    }

    // Jump / double jump (Space, W, Arrow Up, Shift, E)
    if (['Space', 'ArrowUp', 'KeyW', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyK'].includes(e.code)) {
      requestJump()
    }

    keys.add(e.code)
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (GAME_PREVENT_KEYS.has(e.code)) {
      e.preventDefault()
      e.stopPropagation()
    }
    keys.delete(e.code)
  }

  const onBlur = () => keys.clear()
  const onVisibilityChange = () => {
    keys.clear()
    previousFrame = performance.now()
  }
  const onScroll = () => {
    if (!alive || status !== 'playing') return
    const nextScrollY = Math.round(window.scrollY)
    if (Math.abs(nextScrollY - appliedScrollY) <= 1) return

    const delta = nextScrollY - cameraY
    cameraY = nextScrollY
    targetCameraY = nextScrollY
    appliedScrollY = nextScrollY
    cameraInspectionActive = Math.abs(delta) > 1
    keys.clear()
    trail.length = 0
  }

  window.addEventListener('keydown', onKeyDown, { capture: true })
  window.addEventListener('keyup', onKeyUp, { capture: true })
  window.addEventListener('blur', onBlur)
  window.addEventListener('resize', resize)
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)

  resize()
  loadLevel(0)
  previousFrame = performance.now()
  raf = requestAnimationFrame(loop)

  function stop() {
    if (!alive) return
    alive = false
    if (raf !== null) cancelAnimationFrame(raf)
    window.removeEventListener('keydown', onKeyDown, { capture: true })
    window.removeEventListener('keyup', onKeyUp, { capture: true })
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('resize', resize)
    window.removeEventListener('scroll', onScroll)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    keys.clear()
    trail.length = 0
    sparks.length = 0
    shockwaves.length = 0
    audio.close()
    canvas.remove()
    ui.remove()
    document.documentElement.scrollTop = originalScrollY
    document.documentElement.classList.remove('game-mode-active')
    onExit()
  }

  return { stop }
}
