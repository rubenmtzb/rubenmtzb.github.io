/**
 * Mejora progresiva. Todo lo de aquí es opcional: el HTML de build ya es
 * legible y navegable sin JavaScript.
 *
 * Criterio para que una interacción exista: tiene que aportar
 * storytelling, comprensión, personalidad, exploración o sensación de
 * calidad. Si es un experimento técnico aislado, no entra.
 */

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------------- Revelado ---------------- */
function initReveal() {
  const targets = document.querySelectorAll<HTMLElement>('.reveal')
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'))
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.04 },
  )
  targets.forEach((el) => io.observe(el))
}

/* ---------------- Cabecera y navegación ---------------- */
function initHeader() {
  const header = document.getElementById('site-header')
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav]'))
  const ids = links.map((l) => l.dataset.nav!).filter(Boolean)
  let active = ''
  let frame: number | null = null

  const sync = () => {
    frame = null
    header?.classList.toggle('is-scrolled', window.scrollY > 32)
    const line = window.innerHeight * 0.34
    let next = ''
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el && el.getBoundingClientRect().top <= line) next = id
    }
    if (next === active) return
    active = next
    for (const l of links) {
      if (l.dataset.nav === active) l.setAttribute('aria-current', 'true')
      else l.removeAttribute('aria-current')
    }
  }
  const schedule = () => { if (frame === null) frame = requestAnimationFrame(sync) }
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  schedule()
}

function initMenu() {
  const toggle = document.getElementById('menu-toggle')
  const menu = document.getElementById('menu')
  if (!toggle || !menu) return
  const openLabel = toggle.getAttribute('aria-label') ?? ''
  const closeLabel = toggle.dataset.closeLabel ?? openLabel
  menu.hidden = true
  const setOpen = (open: boolean) => {
    menu.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    toggle.setAttribute('aria-label', open ? closeLabel : openLabel)
  }
  toggle.addEventListener('click', () => setOpen(menu.hidden))
  menu.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false) })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus() }
  })
  window.addEventListener('resize', () => { if (window.innerWidth >= 768) setOpen(false) })
}

/* ---------------- Retrato: el foco sigue al cursor ----------------
   Dos custom properties y el compositor hace el resto. Sin canvas, sin
   listeners caros y sin recalcular layout.                             */
function initPortrait() {
  const el = document.getElementById('portrait')
  if (!el || reduce) return
  let frame: number | null = null
  let x = 50
  let y = 38
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect()
    x = ((e.clientX - r.left) / r.width) * 100
    y = ((e.clientY - r.top) / r.height) * 100
    if (frame !== null) return
    frame = requestAnimationFrame(() => {
      frame = null
      el.style.setProperty('--mx', `${x.toFixed(1)}%`)
      el.style.setProperty('--my', `${y.toFixed(1)}%`)
    })
  })
}

/* ---------------- Vista ampliada de las fotografías ---------------- */
function initViewer() {
  const dialog = document.getElementById('viewer') as HTMLDialogElement | null
  if (!dialog) return
  const items = Array.from(dialog.querySelectorAll<HTMLElement>('.viewer-item'))
  const counter = document.getElementById('viewer-count')
  const total = items.length
  let index = 0
  let opener: HTMLElement | null = null

  const show = (i: number) => {
    index = (i + total) % total
    items.forEach((el, ei) => el.setAttribute('data-active', String(ei === index)))
    if (counter) counter.textContent = String(index + 1).padStart(2, '0')
  }

  document.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      opener = btn
      show(Number(btn.dataset.open))
      dialog.showModal()
    })
  })

  document.getElementById('viewer-close')?.addEventListener('click', () => dialog.close())
  document.getElementById('viewer-prev')?.addEventListener('click', () => show(index - 1))
  document.getElementById('viewer-next')?.addEventListener('click', () => show(index + 1))
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1) }
  })
  dialog.addEventListener('close', () => { opener?.focus(); opener = null })

  // Swipe solo si el gesto es claramente horizontal, para no secuestrar
  // el scroll vertical del documento.
  let sx = 0, sy = 0
  dialog.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY }, { passive: true })
  dialog.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx
    const dy = e.changedTouches[0].clientY - sy
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1))
  }, { passive: true })

  show(0)
}

/* ---------------- Mercados: curva conceptual ----------------
   No es un mercado. No se dibuja ni un precio, ni un ticker, ni una
   cifra: sería información financiera falsa. Es la forma de un sistema
   con realimentación, que responde al cursor como responde un mercado a
   la presión.                                                          */
function initCurve() {
  const canvas = document.getElementById('curve') as HTMLCanvasElement | null
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const N = 180
  const series = new Float32Array(N)
  let w = 0, h = 0, raf: number | null = null, running = false
  let phase = 0
  const pointer = { x: -1, active: false }

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = r.width; h = r.height
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const value = (i: number, t: number) =>
    Math.sin(i * 0.055 + t) * 0.5 +
    Math.sin(i * 0.017 - t * 0.7) * 0.32 +
    Math.sin(i * 0.13 + t * 1.9) * 0.13

  const draw = () => {
    phase += reduce ? 0 : 0.006
    ctx.clearRect(0, 0, w, h)

    for (let i = 0; i < N; i++) {
      let v = value(i, phase)
      // El cursor ejerce presión local: el sistema reacciona y vuelve.
      if (pointer.active) {
        const d = Math.abs((i / (N - 1)) * w - pointer.x)
        const reach = w * 0.16
        if (d < reach) v += (1 - d / reach) ** 2 * 0.55
      }
      series[i] += (v - series[i]) * 0.12
    }

    const pad = 28
    const px = (i: number) => (i / (N - 1)) * w
    const py = (v: number) => h / 2 - v * (h / 2 - pad)

    // Área bajo la curva
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let i = 0; i < N; i++) ctx.lineTo(px(i), py(series[i]))
    ctx.lineTo(w, h)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, 'rgba(43,107,255,0.20)')
    g.addColorStop(1, 'rgba(43,107,255,0)')
    ctx.fillStyle = g
    ctx.fill()

    // Curva
    ctx.beginPath()
    for (let i = 0; i < N; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, px(i), py(series[i]))
    ctx.strokeStyle = '#5b9bff'
    ctx.lineWidth = 1.6
    ctx.stroke()

    // Eje de referencia
    ctx.beginPath()
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2)
    ctx.strokeStyle = 'rgba(110,125,153,0.22)'
    ctx.lineWidth = 1
    ctx.stroke()

    if (running) raf = requestAnimationFrame(draw)
  }

  const play = () => { if (!running) { running = true; raf = requestAnimationFrame(draw) } }
  const pause = () => { running = false; if (raf !== null) cancelAnimationFrame(raf); raf = null }

  canvas.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX - canvas.getBoundingClientRect().left
    pointer.active = true
  })
  canvas.addEventListener('pointerleave', () => { pointer.active = false })
  window.addEventListener('resize', () => { resize(); if (!running) draw() })
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()))

  resize()
  for (let i = 0; i < N; i++) series[i] = value(i, 0)
  if (reduce) { draw(); return }
  // Solo consume CPU mientras está a la vista.
  new IntersectionObserver(([e]) => (e.isIntersecting ? play() : pause()), { threshold: 0.05 }).observe(canvas)
}

/* ---------------- Teclado: lo acciona el teclado real ---------------- */
function initKeyboard() {
  const kb = document.getElementById('kb')
  if (!kb) return
  const keys = new Map<string, HTMLElement>()
  kb.querySelectorAll<HTMLElement>('[data-code]').forEach((k) => keys.set(k.dataset.code!, k))
  const hint = document.getElementById('kb-hint')
  let used = false

  const press = (code: string, down: boolean) => {
    const key = keys.get(code)
    if (!key) return
    key.classList.toggle('is-down', down)
    if (down && !used) { used = true; hint?.setAttribute('hidden', '') }
  }

  window.addEventListener('keydown', (e) => press(e.code, true))
  window.addEventListener('keyup', (e) => press(e.code, false))
  // Al perder el foco de la ventana no quedan teclas encalladas.
  window.addEventListener('blur', () => keys.forEach((k) => k.classList.remove('is-down')))
}

/* ---------------- Email: copiar al portapapeles ---------------- */
function initMail() {
  const btn = document.getElementById('copy-mail') as HTMLButtonElement | null
  if (!btn || !navigator.clipboard) return
  const original = btn.dataset.label ?? ''
  const done = btn.dataset.done ?? ''
  btn.hidden = false
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.mail ?? '')
      btn.textContent = done
      window.setTimeout(() => { btn.textContent = original }, 2200)
    } catch { /* sin portapapeles, el enlace mailto sigue ahí */ }
  })
}

initReveal()
initHeader()
initMenu()
initPortrait()
initViewer()
initCurve()
initKeyboard()
initMail()

export {}
