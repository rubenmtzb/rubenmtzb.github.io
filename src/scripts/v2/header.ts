/* Cabecera fija y navegación. */

export function initHeader() {
  const header = document.getElementById('site-header')
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav]'))
  const mobileNav = document.getElementById('mobile-nav') as HTMLDetailsElement | null

  /*
   * Las secciones se resuelven una vez. El bucle de scroll solo mide: buscar
   * cada `id` en el documento en cada fotograma era trabajo repetido sobre
   * un conjunto que no cambia mientras la página está abierta.
   */
  const sections = [...new Set(links.map((l) => l.dataset.nav).filter((id): id is string => Boolean(id)))]
    .map((id) => ({ id, el: document.getElementById(id) }))
    .filter((section): section is { id: string, el: HTMLElement } => section.el !== null)

  let active = ''
  let frame: number | null = null

  const sync = () => {
    frame = null

    /*
     * Primero se mide y después se escribe. Al revés, el cambio de clase de
     * la cabecera invalidaba el estilo y la primera medición tenía que
     * recalcular el diseño entero antes de responder.
     */
    const line = window.innerHeight * 0.34
    let next = ''
    for (const section of sections) {
      if (section.el.getBoundingClientRect().top <= line) next = section.id
    }

    header?.classList.toggle('is-scrolled', window.scrollY > 32)
    if (next === active) return
    active = next
    for (const l of links) {
      if (l.dataset.nav === active) l.setAttribute('aria-current', 'true')
      else l.removeAttribute('aria-current')
    }
  }
  const schedule = () => { if (frame === null) frame = requestAnimationFrame(sync) }
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 640 && mobileNav) mobileNav.open = false
    schedule()
  })
  mobileNav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => { mobileNav.open = false })
  })
  schedule()
}
