/**
 * The V2's three carousels — projects, education and certifications — and the
 * single primitive they all come from.
 */
import { onSwipe, pad, trackPointer, whenNear } from './dom'

/** A group of controls that mirrors the active index and navigates on press. */
type CarouselControls = {
  els: HTMLElement[]
  /** ARIA attribute that describes the selection beyond the visual state. */
  state?: 'aria-selected' | 'aria-current'
}

type CarouselOptions = {
  slides: HTMLElement[]
  controls?: CarouselControls[]
  prev?: HTMLElement | null
  next?: HTMLElement | null
  counter?: HTMLElement | null
  /** Region that accepts touch gestures and, when asked, the arrow keys. */
  surface?: HTMLElement | null
  keyboard?: boolean
  /** Hidden slides are marked as such for screen readers. */
  ariaHideInactive?: boolean
}

/**
 * Projects, education and certifications used to be three copied
 * implementations with the identifiers swapped. The logic — circular index,
 * control marking, counter, arrow keys and swipe — is the same for all three,
 * so it lives here once.
 */
function createCarousel({
  slides,
  controls = [],
  prev,
  next,
  counter,
  surface,
  keyboard = false,
  ariaHideInactive = false,
}: CarouselOptions) {
  const total = slides.length
  if (total === 0) return

  let active = -1
  if (ariaHideInactive) {
    slides.forEach((slide, index) => slide.setAttribute('aria-hidden', index === 0 ? 'false' : 'true'))
  }

  const show = (index: number) => {
    const next = (index + total) % total
    if (next === active) return

    /*
     * Only two slides and two controls can change per navigation. Iterating over
     * every node made each click invalidate the whole carousel's style tree.
     * Initial markup already describes index zero; the first call simply
     * confirms it, and subsequent calls touch the previous and next nodes only.
     */
    if (active >= 0) {
      slides[active]?.classList.remove('is-active')
      if (ariaHideInactive) slides[active]?.setAttribute('aria-hidden', 'true')
      for (const group of controls) {
        const previous = group.els[active]
        previous?.classList.remove('is-active')
        if (group.state) previous?.setAttribute(group.state, 'false')
      }
    }

    active = next
    slides[active]?.classList.add('is-active')
    if (ariaHideInactive) slides[active]?.setAttribute('aria-hidden', 'false')
    for (const group of controls) {
      const current = group.els[active]
      current?.classList.add('is-active')
      if (group.state) current?.setAttribute(group.state, 'true')
    }

    if (counter) counter.textContent = `${pad(active + 1)} / ${pad(total)}`
  }

  prev?.addEventListener('click', () => show(active - 1))
  next?.addEventListener('click', () => show(active + 1))
  for (const group of controls) {
    group.els.forEach((el, i) => el.addEventListener('click', () => show(i)))
  }

  if (surface) {
    onSwipe(surface, (direction) => show(active + direction))
    if (keyboard) {
      const STEPS: Record<string, () => number> = {
        ArrowLeft: () => active - 1,
        ArrowRight: () => active + 1,
        Home: () => 0,
        End: () => total - 1,
      }
      surface.addEventListener('keydown', (event) => {
        if (event.target !== surface) return
        const step = STEPS[event.key]
        if (!step) return
        event.preventDefault()
        show(step())
      })
    }
  }

  show(0)
}

/* ---------------- Carrusel Spotlight de Proyectos ---------------- */
export function initProjectCarousel() {
  const carousel = document.getElementById('project-carousel')
  if (!carousel) return

  const slides = Array.from(carousel.querySelectorAll<HTMLElement>('.project-slide'))

  /* The light that follows the pointer is decorative and not part of the carousel. */
  for (const slide of slides) trackPointer(slide, '--project-pointer')

  const title = carousel.querySelector('.project-slide[data-project="youtube-transcriber"] .project-cover-title')
  if (title) whenNear(title, () => title.classList.add('has-entered'), '-72px 0px -12% 0px')

  createCarousel({
    slides,
    controls: [{
      els: Array.from(document.querySelectorAll<HTMLElement>('[data-dot-index]')),
      state: 'aria-current',
    }],
    prev: document.getElementById('proj-prev'),
    next: document.getElementById('proj-next'),
    surface: carousel,
    keyboard: true,
    ariaHideInactive: true,
  })
}

/* ---------------- Education timeline slider ---------------- */
export function initEducationSlider() {
  const stage = document.getElementById('edu-slider-stage')
  if (!stage) return

  createCarousel({
    slides: Array.from(stage.querySelectorAll<HTMLElement>('.edu-slide')),
    controls: [
      { els: Array.from(document.querySelectorAll<HTMLElement>('.edu-timeline-pill')), state: 'aria-selected' },
      { els: Array.from(document.querySelectorAll<HTMLElement>('[data-edu-dot]')) },
    ],
    prev: document.getElementById('edu-prev'),
    next: document.getElementById('edu-next'),
    counter: document.getElementById('edu-counter'),
    surface: stage,
  })
}

/* ---------------- Slider / Showcase de Certificaciones ---------------- */
export function initCertsSlider() {
  const stage = document.getElementById('certs-stage')
  if (!stage) return

  createCarousel({
    slides: Array.from(stage.querySelectorAll<HTMLElement>('.cert-slide')),
    controls: [
      { els: Array.from(document.querySelectorAll<HTMLElement>('.cert-pill')), state: 'aria-selected' },
      { els: Array.from(document.querySelectorAll<HTMLElement>('[data-cert-dot]')) },
    ],
    prev: document.getElementById('certs-prev'),
    next: document.getElementById('certs-next'),
    counter: document.getElementById('certs-counter'),
    surface: stage,
  })
}
