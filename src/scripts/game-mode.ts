/**
 * Game Mode — capa opcional de la V2.
 *
 * Coherente con Living Architecture: se recogen paquetes de datos que se
 * han salido del sistema, no un coleccionable genérico.
 *
 * Reglas que no negocia:
 *  - apagado por defecto y cargado bajo demanda: si nadie lo activa, no
 *    pesa ni un byte en el arranque;
 *  - no toca el DOM del contenido, solo lee posiciones;
 *  - no altera navegación, contacto, SEO ni accesibilidad;
 *  - se desactiva solo si hay un diálogo abierto o si el usuario ha
 *    pedido menos movimiento.
 */

const GRAVITY = 0.24
const JUMP = -7.2
const MAX_SPEED = 2.1
const FRICTION = 0.84
const W = 26
const H = 30
const PACKETS = 6

/** De dónde salen las plataformas: elementos reales del contenido. */
const PLATFORM_SELECTORS = ['h1', 'h2', 'h3', 'h4', 'p', 'li', '.v2-card', '.v2-chip']

/** El archivo personal queda fuera: sus pies de foto no son suelo. */
const EXCLUDED = ['#archive', 'dialog', 'header', 'footer']

type Rect = { x: number; y: number; w: number }
type Packet = { x: number; y: number; taken: boolean }

export function startGameMode(root: HTMLElement, onExit: () => void) {
  const canvas = document.createElement('canvas')
  canvas.className = 'gm-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  root.appendChild(canvas)
  const ctx = canvas.getContext('2d')!

  const hud = document.createElement('p')
  hud.className = 'gm-hud'
  hud.setAttribute('role', 'status')
  hud.setAttribute('aria-live', 'polite')
  root.appendChild(hud)

  let w = (canvas.width = window.innerWidth)
  let h = (canvas.height = window.innerHeight)

  const player = { x: window.innerWidth / 2, docY: window.scrollY + 120, vx: 0, vy: 0, onGround: false, frame: 0 }
  const keys = new Set<string>()
  let jumpLatch = false
  let raf: number | null = null
  let alive = true
  let collected = 0

  /* ---------- Plataformas leídas del contenido real ---------- */
  const platforms = (): Rect[] => {
    const out: Rect[] = []
    const sy = window.scrollY
    for (const sel of PLATFORM_SELECTORS) {
      for (const el of document.querySelectorAll<HTMLElement>(sel)) {
        if (EXCLUDED.some((ex) => el.closest(ex))) continue
        const r = el.getBoundingClientRect()
        if (r.width < 40 || r.height > 120) continue
        const top = r.top + sy
        if (top > sy + h + 400 || top + r.height < sy - 400) continue
        out.push({ x: r.left, y: top, w: r.width })
      }
    }
    return out
  }

  /* ---------- Paquetes repartidos por el documento ---------- */
  const docH = document.documentElement.scrollHeight
  const packets: Packet[] = Array.from({ length: PACKETS }, (_, i) => ({
    x: 60 + Math.random() * Math.max(w - 160, 120),
    y: (docH / (PACKETS + 1)) * (i + 1),
    taken: false,
  }))

  const setHud = () => {
    hud.textContent = `${collected} / ${PACKETS}`
  }
  setHud()

  /* ---------- Bucle ---------- */
  const loop = () => {
    if (!alive) return
    if (canvas.width !== window.innerWidth) w = canvas.width = window.innerWidth
    if (canvas.height !== window.innerHeight) h = canvas.height = window.innerHeight

    const sy = window.scrollY
    ctx.clearRect(0, 0, w, h)

    const left = keys.has('ArrowLeft') || keys.has('KeyA')
    const right = keys.has('ArrowRight') || keys.has('KeyD')
    const jump = keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW')

    if (left) player.vx = Math.max(player.vx - 0.36, -MAX_SPEED)
    else if (right) player.vx = Math.min(player.vx + 0.36, MAX_SPEED)
    else player.vx *= FRICTION

    if (jump && player.onGround && !jumpLatch) {
      player.vy = JUMP
      player.onGround = false
      jumpLatch = true
    }
    if (!jump) jumpLatch = false

    player.vy = Math.min(player.vy + GRAVITY, 9)
    player.x += player.vx
    player.docY += player.vy
    player.frame++

    if (player.x < 0) { player.x = 0; player.vx = 0 }
    if (player.x + W > w) { player.x = w - W; player.vx = 0 }

    player.onGround = false
    for (const p of platforms()) {
      const bottom = player.docY + H
      const prev = bottom - player.vy
      if (player.x + W > p.x + 2 && player.x < p.x + p.w - 2 && prev <= p.y + 6 && bottom >= p.y - 1 && player.vy >= 0) {
        player.docY = p.y - H
        player.vy = 0
        player.onGround = true
        break
      }
    }

    // Reaparece arriba si se cae del documento: sin pantalla de derrota,
    // el juego no puede bloquear la lectura.
    if (player.docY > docH + 200) {
      player.docY = sy + 80
      player.vy = 0
    }

    // Paquetes
    for (const pk of packets) {
      if (pk.taken) continue
      const py = pk.y - sy
      if (py < -30 || py > h + 30) continue
      const t = Date.now() * 0.003
      const bob = Math.sin(t + pk.x) * 3
      ctx.save()
      ctx.globalAlpha = 0.9
      ctx.fillStyle = '#00ff88'
      ctx.shadowBlur = 14
      ctx.shadowColor = '#00ff88'
      ctx.beginPath()
      ctx.arc(pk.x, py + bob, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      if (Math.abs(player.x + W / 2 - pk.x) < 26 && Math.abs(player.docY + H / 2 - pk.y) < 30) {
        pk.taken = true
        collected++
        setHud()
        if (collected === PACKETS) hud.textContent = '✓ system restored'
      }
    }

    // Avatar: un bloque de datos, coherente con el lenguaje del WOW
    const py = player.docY - sy
    if (py > -H && py < h + H) {
      ctx.save()
      ctx.translate(Math.round(player.x), Math.round(py))
      ctx.fillStyle = '#0d1117'
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = '#00ff88'
      ctx.lineWidth = 1.6
      ctx.strokeRect(0.8, 0.8, W - 1.6, H - 1.6)
      ctx.fillStyle = '#00ff88'
      const blink = player.onGround && Math.abs(player.vx) < 0.2 && Math.sin(player.frame * 0.06) > 0.4
      if (!blink) {
        ctx.fillRect(6, 9, 4, 5)
        ctx.fillRect(W - 10, 9, 4, 5)
      }
      ctx.globalAlpha = 0.55
      ctx.fillRect(6, H - 9, W - 12, 2)
      ctx.restore()
    }

    raf = requestAnimationFrame(loop)
  }

  /* ---------- Entradas ---------- */
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape') { stop(); return }
    keys.add(e.code)
    if (['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.code)) e.preventDefault()
  }
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code)

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  // Si se abre el lightbox, el juego se detiene: no compite con la interfaz.
  const dialog = document.getElementById('pa-lightbox') as HTMLDialogElement | null
  const onDialogOpen = () => stop()
  dialog?.addEventListener('close', () => {})
  const observer = new MutationObserver(() => {
    if (dialog?.open) onDialogOpen()
  })
  if (dialog) observer.observe(dialog, { attributes: true, attributeFilter: ['open'] })

  function stop() {
    alive = false
    if (raf !== null) cancelAnimationFrame(raf)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    observer.disconnect()
    canvas.remove()
    hud.remove()
    onExit()
  }

  raf = requestAnimationFrame(loop)
  return { stop }
}
