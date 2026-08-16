import { initLivingArchitecture } from './living-architecture'

/**
 * Mejora progresiva de la V2. Todo lo de aquí es opcional: el HTML de
 * build ya es navegable y legible sin JavaScript.
 */

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- Revelado ---------- */
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
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  )
  targets.forEach((el) => io.observe(el))
}

/* ---------- Navegación: marca la sección visible ---------- */
function initNav() {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-v2nav]'))
  const header = document.getElementById('v2-header')
  if (links.length === 0) return
  const ids = links.map((l) => l.dataset.v2nav!).filter(Boolean)
  let active = ''
  let frame: number | null = null

  const sync = () => {
    frame = null
    header?.classList.toggle('is-scrolled', window.scrollY > 24)
    const line = window.innerHeight * 0.3
    let next = ''
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el && el.getBoundingClientRect().top <= line) next = id
    }
    if (next === active) return
    active = next
    for (const l of links) {
      const on = l.dataset.v2nav === active
      l.classList.toggle('text-[var(--v2-fg)]', on)
      l.classList.toggle('text-[var(--v2-fg-dim)]', !on)
      if (on) l.setAttribute('aria-current', 'true')
      else l.removeAttribute('aria-current')
    }
  }
  const schedule = () => {
    if (frame === null) frame = requestAnimationFrame(sync)
  }
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  schedule()
}

/* ---------- Menú móvil ---------- */
function initMenu() {
  const toggle = document.getElementById('v2-menu-toggle')
  const menu = document.getElementById('v2-menu')
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
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus() }
  })
  window.addEventListener('resize', () => { if (window.innerWidth >= 768) setOpen(false) })
}

/* ---------- Archivo personal: carrusel + lightbox ---------- */
function initArchive() {
  const track = document.getElementById('pa-track')
  const dialog = document.getElementById('pa-lightbox') as HTMLDialogElement | null
  if (!track) return

  const slides = Array.from(track.querySelectorAll<HTMLElement>('.pa-slide'))
  const thumbs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-goto]'))
  const counter = document.getElementById('pa-counter')
  const total = slides.length
  let current = 0

  const pad = (n: number) => String(n + 1).padStart(2, '0')

  const setCurrent = (i: number) => {
    current = Math.max(0, Math.min(i, total - 1))
    if (counter) counter.textContent = pad(current)
    thumbs.forEach((th, ti) => th.setAttribute('aria-current', String(ti === current)))
  }

  const goTo = (i: number) => {
    setCurrent(i)
    const slide = slides[current]
    if (slide) {
      track.scrollTo({
        left: slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2,
        behavior: reduce ? 'auto' : 'smooth',
      })
    }
  }

  thumbs.forEach((th) => th.addEventListener('click', () => goTo(Number(th.dataset.goto))))
  document.getElementById('pa-prev')?.addEventListener('click', () => goTo(current - 1))
  document.getElementById('pa-next')?.addEventListener('click', () => goTo(current + 1))

  // El scroll manual también actualiza el indicador.
  let scrollFrame: number | null = null
  track.addEventListener(
    'scroll',
    () => {
      if (scrollFrame !== null) return
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = null
        const center = track.scrollLeft + track.clientWidth / 2
        let best = 0
        let bestDist = Infinity
        slides.forEach((s, i) => {
          const d = Math.abs(s.offsetLeft + s.clientWidth / 2 - center)
          if (d < bestDist) { bestDist = d; best = i }
        })
        setCurrent(best)
      })
    },
    { passive: true },
  )

  // Teclado sobre el carrusel
  track.setAttribute('tabindex', '0')
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1) }
  })

  /* ---- Lightbox ---- */
  if (!dialog) return
  const items = Array.from(dialog.querySelectorAll<HTMLElement>('.pa-lb-item'))
  const lbCounter = document.getElementById('pa-lb-counter')
  let lbIndex = 0
  let opener: HTMLElement | null = null

  const showItem = (i: number) => {
    lbIndex = (i + total) % total
    items.forEach((el, ei) => el.setAttribute('data-active', String(ei === lbIndex)))
    if (lbCounter) lbCounter.textContent = pad(lbIndex)
  }

  const open = (i: number, from: HTMLElement) => {
    opener = from
    showItem(i)
    dialog.showModal()
  }

  document.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => open(Number(btn.dataset.open), btn))
  })

  document.getElementById('pa-lb-close')?.addEventListener('click', () => dialog.close())
  document.getElementById('pa-lb-prev')?.addEventListener('click', () => showItem(lbIndex - 1))
  document.getElementById('pa-lb-next')?.addEventListener('click', () => showItem(lbIndex + 1))

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); showItem(lbIndex + 1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); showItem(lbIndex - 1) }
  })

  // Devuelve el foco al thumbnail de origen y sincroniza el carrusel.
  dialog.addEventListener('close', () => {
    goTo(lbIndex)
    opener?.focus()
    opener = null
  })

  // Swipe en móvil, solo si el gesto es claramente horizontal: así no
  // secuestra el scroll vertical del documento.
  let sx = 0
  let sy = 0
  dialog.addEventListener('touchstart', (e) => {
    sx = e.touches[0].clientX
    sy = e.touches[0].clientY
  }, { passive: true })
  dialog.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx
    const dy = e.changedTouches[0].clientY - sy
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showItem(lbIndex + (dx < 0 ? 1 : -1))
  }, { passive: true })

  showItem(0)
}

/* ---------- Game Mode: opcional y bajo demanda ---------- */
function initGameMode() {
  const root = document.getElementById('gm-root')
  const toggle = document.getElementById('gm-toggle')
  const help = document.getElementById('gm-help')
  if (!root || !toggle) return
  // Con reduced-motion ni se ofrece: es puro movimiento.
  if (reduce) return
  root.hidden = false

  let session: { stop: () => void } | null = null
  toggle.addEventListener('click', async () => {
    if (session) { session.stop(); return }
    toggle.setAttribute('aria-pressed', 'true')
    if (help) help.hidden = false
    // El código del juego solo se descarga al activarlo.
    const { startGameMode } = await import('./game-mode')
    session = startGameMode(document.body, () => {
      session = null
      toggle.setAttribute('aria-pressed', 'false')
      if (help) help.hidden = true
    })
  })
}

/* ---------- Living Architecture ---------- */
function initWow() {
  const canvas = document.getElementById('living-architecture') as HTMLCanvasElement | null
  if (canvas) initLivingArchitecture(canvas)
}

initReveal()
initNav()
initMenu()
initArchive()
initWow()
initGameMode()
