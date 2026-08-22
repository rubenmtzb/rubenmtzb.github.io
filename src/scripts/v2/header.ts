/* Sticky header and navigation. */

export function initHeader() {
  const header = document.getElementById('site-header')
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav]'))
  const mobileNav = document.getElementById('mobile-nav') as HTMLDetailsElement | null

  /*
   * The sections are resolved once. The scroll loop only measures: looking up
   * every `id` in the document on every frame was repeated work over a set that
   * does not change while the page is open.
   */
  const sections = [...new Set(links.map((l) => l.dataset.nav).filter((id): id is string => Boolean(id)))]
    .map((id) => ({ id, el: document.getElementById(id) }))
    .filter((section): section is { id: string, el: HTMLElement } => section.el !== null)

  let active = ''
  let frame: number | null = null

  const sync = () => {
    frame = null

    /*
     * Measure first, write afterwards. The other way round, the header's class
     * change invalidated the style and the first measurement had to recalculate
     * the whole layout before it could answer.
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
