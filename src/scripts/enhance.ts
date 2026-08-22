/**
 * The V1's progressive enhancement. A full replacement for Framer Motion.
 *
 * Everything here is optional: the built HTML is already functional and
 * navigable without JavaScript. If this file never runs, the animation is lost,
 * not the content.
 */

import { revealOnScroll } from './reveal'

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- Mobile menu ----------
   The markup always exists. All that happens here is hiding and toggling, so
   without JavaScript it stays open and the links remain usable.           */
function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle')
  const menu = document.getElementById('mobile-menu')
  if (!toggle || !menu) return

  const openLabel = toggle.getAttribute('aria-label') ?? ''
  // The close label travels in a data attribute so i18n is not duplicated.
  const closeLabel = toggle.dataset.closeLabel ?? openLabel

  menu.hidden = true
  toggle.setAttribute('aria-expanded', 'false')

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
    if (e.key === 'Escape' && !menu.hidden) {
      setOpen(false)
      toggle.focus()
    }
  })
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) setOpen(false)
  })
}

/* ---------- Scroll-spy and active pill ----------
   The pill replaces Framer Motion's layoutId: a single absolute element whose
   position and width are set here; the transition is pure CSS.           */
function initScrollSpy() {
  const nav = document.getElementById('site-nav')
  const container = document.getElementById('nav-links')
  const pill = container?.querySelector<HTMLElement>('.nav-pill')
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav]'))
  const mobileLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav-mobile]'))
  if (links.length === 0) return

  /* The sections are resolved once: the scroll loop only measures. */
  const sections = [...new Set(links.map((l) => l.dataset.nav).filter((id): id is string => Boolean(id)))]
    .map((id) => ({ id, el: document.getElementById(id) }))
    .filter((section): section is { id: string, el: HTMLElement } => section.el !== null)

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

    /* Measure before writing: changing the bar's class invalidated the style
       and the first measurement had to recalculate the whole layout.      */
    let next = sections[0]?.id ?? ''
    if (!navigating) {
      const line = window.innerHeight * 0.25
      for (const section of sections) {
        if (section.el.getBoundingClientRect().top <= line) next = section.id
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100
      if (window.scrollY > 100 && atBottom) next = sections[sections.length - 1]?.id ?? next
    }

    if (nav) {
      const scrolled = window.scrollY > 24
      nav.classList.toggle('bg-black/70', scrolled)
      nav.classList.toggle('backdrop-blur-md', scrolled)
      nav.classList.toggle('border-green-500/20', scrolled)
      nav.classList.toggle('border-transparent', !scrolled)
      nav.classList.toggle('bg-black/20', !scrolled)
    }
    if (navigating) return
    setActive(next)
  }

  const schedule = () => {
    if (frame !== null) return
    frame = window.requestAnimationFrame(sync)
  }

  // During a click's smooth scroll the spy pauses, so the indicator does not
  // flicker across the sections it passes through.
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

revealOnScroll({ reduce: reduceMotion, rootMargin: '0px 0px -10% 0px', threshold: 0.05 })
initMobileMenu()
initScrollSpy()

export {}
