/**
 * Mejora progresiva de la V1. Sustituye por completo a Framer Motion.
 *
 * Todo lo que hay aquí es opcional: el HTML de build ya es funcional y
 * navegable sin JavaScript. Si este fichero no se ejecuta, se pierde la
 * animación, no el contenido.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- Revelado al hacer scroll ---------- */
function initReveal() {
  const targets = document.querySelectorAll<HTMLElement>('.reveal')
  if (reduceMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'))
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
  )
  targets.forEach((el) => io.observe(el))
}

/* ---------- Menú móvil ----------
   El markup existe siempre. Aquí solo se oculta y se alterna, de modo que
   sin JavaScript queda desplegado y los enlaces siguen siendo usables.   */
function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle')
  const menu = document.getElementById('mobile-menu')
  if (!toggle || !menu) return

  const openLabel = toggle.getAttribute('aria-label') ?? ''
  let closeLabel = openLabel

  menu.hidden = true
  toggle.setAttribute('aria-expanded', 'false')

  const setOpen = (open: boolean) => {
    menu.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    toggle.setAttribute('aria-label', open ? closeLabel : openLabel)
  }

  // La etiqueta de cierre viaja en un data-attribute para no duplicar i18n.
  closeLabel = toggle.dataset.closeLabel ?? openLabel

  toggle.addEventListener('click', () => setOpen(menu.hidden))
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      setOpen(false)
      toggle.focus()
    }
  })
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) setOpen(false)
  })
}

/* ---------- Scroll-spy y píldora activa ----------
   La píldora sustituye al layoutId de Framer Motion: un único elemento
   absoluto cuya posición y anchura se fijan aquí; la transición es CSS.  */
function initScrollSpy() {
  const nav = document.getElementById('site-nav')
  const container = document.getElementById('nav-links')
  const pill = container?.querySelector<HTMLElement>('.nav-pill')
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav]'))
  const mobileLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav-mobile]'))
  if (links.length === 0) return

  const ids = links.map((l) => l.dataset.nav!).filter(Boolean)
  let activeId = ''
  let navigating = false
  let frame: number | null = null

  const movePill = (link: HTMLAnchorElement) => {
    if (!pill || !container) return
    pill.style.transform = `translateX(${link.offsetLeft}px)`
    pill.style.width = `${link.offsetWidth}px`
    pill.style.opacity = '1'
  }

  const setActive = (id: string) => {
    if (id === activeId) return
    activeId = id
    for (const link of links) {
      const on = link.dataset.nav === id
      link.classList.toggle('text-white', on)
      link.classList.toggle('font-semibold', on)
      link.classList.toggle('text-dim', !on)
      if (on) {
        link.setAttribute('aria-current', 'true')
        movePill(link)
      } else {
        link.removeAttribute('aria-current')
      }
    }
    for (const link of mobileLinks) {
      const on = link.dataset.navMobile === id
      link.classList.toggle('bg-green-500/10', on)
      link.classList.toggle('text-green-200', on)
      link.classList.toggle('text-dim', !on)
      if (on) link.setAttribute('aria-current', 'true')
      else link.removeAttribute('aria-current')
    }
  }

  const sync = () => {
    frame = null
    if (nav) {
      const scrolled = window.scrollY > 24
      nav.classList.toggle('bg-black/70', scrolled)
      nav.classList.toggle('backdrop-blur-md', scrolled)
      nav.classList.toggle('border-green-500/20', scrolled)
      nav.classList.toggle('border-transparent', !scrolled)
      nav.classList.toggle('bg-black/20', !scrolled)
    }
    if (navigating) return

    const line = window.innerHeight * 0.25
    let next = ids[0]
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el && el.getBoundingClientRect().top <= line) next = id
    }
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100
    if (window.scrollY > 100 && atBottom) next = ids[ids.length - 1]
    setActive(next)
  }

  const schedule = () => {
    if (frame !== null) return
    frame = window.requestAnimationFrame(sync)
  }

  // Durante el scroll suave de un clic, el spy se pausa para que el
  // indicador no parpadee entre secciones intermedias.
  for (const link of [...links, ...mobileLinks]) {
    link.addEventListener('click', () => {
      const id = link.dataset.nav ?? link.dataset.navMobile
      if (!id) return
      navigating = true
      setActive(id)
      window.setTimeout(() => { navigating = false }, 900)
    })
  }

  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', () => {
    const active = links.find((l) => l.dataset.nav === activeId)
    if (active) movePill(active)
    schedule()
  })
  schedule()
}

initReveal()
initMobileMenu()
initScrollSpy()

export {}
