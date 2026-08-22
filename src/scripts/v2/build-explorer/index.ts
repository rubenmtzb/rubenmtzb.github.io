/**
 * Build explorer: photographic cover and layered 3D model.
 *
 * The component renders one panel per build, so nothing here is tied to the
 * Neo65: opening a card wires up the matching panel and all of the state —
 * camera, exploded view, pinned part — lives inside it.
 */
import { onSwipe, pad, trackPointer } from '../dom'
import { createBuildPanel, type BuildPanel } from './panel'
import { createBuildSound } from './sound'

export function initKeyboardBuildExplorer() {
  const root = document.querySelector<HTMLElement>('[data-kb-build-explorer]')
  if (!root) return

  /*
   * The photos live on the cover, not in a separate viewer. Each build keeps its
   * own index and accepts buttons, bars, keyboard and touch gestures.
   */
  for (const carousel of root.querySelectorAll<HTMLElement>('[data-bx-card-carousel]')) {
    const slides = [...carousel.querySelectorAll<HTMLElement>('[data-bx-card-slide]')]
    const dots = [...carousel.querySelectorAll<HTMLButtonElement>('[data-bx-card-dot]')]
    const caption = carousel.querySelector<HTMLElement>('[data-bx-card-caption]')
    const counter = carousel.querySelector<HTMLElement>('[data-bx-card-counter]')
    const previous = carousel.querySelector<HTMLButtonElement>('[data-bx-card-prev]')
    const next = carousel.querySelector<HTMLButtonElement>('[data-bx-card-next]')
    if (slides.length === 0) continue

    let index = 0
    const show = (target: number) => {
      index = (target + slides.length) % slides.length
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === index
        slide.hidden = !active
        slide.setAttribute('aria-hidden', String(!active))
      })
      dots.forEach((dot, dotIndex) => dot.setAttribute('aria-current', String(dotIndex === index)))
      if (caption) caption.textContent = slides[index].dataset.bxCardLabel ?? ''
      if (counter) counter.textContent = `${pad(index + 1)} / ${pad(slides.length)}`
    }

    previous?.addEventListener('click', () => show(index - 1))
    next?.addEventListener('click', () => show(index + 1))
    dots.forEach((dot) => dot.addEventListener('click', () => show(Number(dot.dataset.bxCardDot))))
    carousel.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      show(index + (event.key === 'ArrowLeft' ? -1 : 1))
    })
    trackPointer(carousel, '--bx-pointer')
    onSwipe(carousel, (direction) => show(index + direction))
    show(0)
  }

  const gallery = root.querySelector<HTMLElement>('[data-bx-gallery]')
  const viewer = root.querySelector<HTMLElement>('[data-bx-viewer]')
  const closeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-bx-close]')]
  const previousBuildButton = root.querySelector<HTMLButtonElement>('[data-bx-build-prev]')
  const nextBuildButton = root.querySelector<HTMLButtonElement>('[data-bx-build-next]')
  const assembledButton = root.querySelector<HTMLButtonElement>('[data-bx-assembled-view]')
  const explodeButton = root.querySelector<HTMLButtonElement>('[data-bx-explode]')
  const status = root.querySelector<HTMLElement>('[data-bx-status]')
  const openButtons = [...root.querySelectorAll<HTMLButtonElement>('button[data-bx-open]')]

  const sound = createBuildSound(root)

  const panels = new Map<string, BuildPanel>()
  for (const element of root.querySelectorAll<HTMLElement>('[data-bx-build]')) {
    const key = element.dataset.bxBuild
    if (key) panels.set(key, createBuildPanel(element, root))
  }
  if (panels.size === 0) return
  const buildKeys = [...panels.keys()]

  const archivedLabel = status?.textContent ?? ''
  let active: BuildPanel | null = null
  let activeKey = ''
  let drag: { x: number, y: number, tilt: number, spin: number, moved: boolean, partId: string | null } | null = null
  let suppressPartClick = false

  /** The label always describes what is on screen, presets included. */
  const syncStatus = () => {
    if (!status) return
    const percent = Math.round((active?.spread ?? 0) * 100)
    const label = percent === 0 ? root.dataset.assembled
      : percent === 100 ? root.dataset.exploded
        : `${root.dataset.exploded} ${percent}%`
    status.textContent = `${activeKey.toUpperCase()} // ${label}`
  }

  const setViewMode = (mode: 'assembled' | 'exploded') => {
    const exploded = mode === 'exploded'
    assembledButton?.setAttribute('aria-pressed', String(mode === 'assembled'))
    explodeButton?.setAttribute('aria-pressed', String(exploded))

    if (active) {
      if (active.scrub) active.scrub.hidden = false
      active.setSpread(exploded ? 1 : 0)
    }

    syncStatus()
  }

  const showGallery = () => {
    sound.silence()
    if (gallery) gallery.hidden = false
    if (viewer) viewer.hidden = true
    if (active) {
      active.element.hidden = true
      active.clearPart()
      active.setSpread(0)
      active.resetCamera()
    }
    root.classList.remove('is-exploded', 'is-spread', 'has-active', 'is-scrubbing')
    if (status) status.textContent = archivedLabel
    const opener = openButtons.find((button) => button.dataset.bxOpen === activeKey) ?? openButtons[0]
    active = null
    activeKey = ''
    opener?.focus()
  }

  const openBuild = (key: string) => {
    const panel = panels.get(key)
    if (!panel) return
    sound.silence()
    if (active && active !== panel) active.element.hidden = true
    active = panel
    activeKey = key
    panel.element.hidden = false
    if (gallery) gallery.hidden = true
    if (viewer) viewer.hidden = false
    panel.clearPart()
    panel.setSpread(0)
    panel.resetCamera()
    setViewMode('assembled')
    closeButtons[0]?.focus()
  }

  closeButtons.forEach((button) => button.addEventListener('click', showGallery))
  previousBuildButton?.addEventListener('click', () => {
    if (!active) return
    const index = buildKeys.indexOf(activeKey)
    openBuild(buildKeys[(index - 1 + buildKeys.length) % buildKeys.length])
  })
  nextBuildButton?.addEventListener('click', () => {
    if (!active) return
    const index = buildKeys.indexOf(activeKey)
    openBuild(buildKeys[(index + 1) % buildKeys.length])
  })
  assembledButton?.addEventListener('click', () => setViewMode('assembled'))
  explodeButton?.addEventListener('click', () => setViewMode('exploded'))

  /*
   * Escape closes the viewer: it is the gesture anyone who entered a detail view
   * expects, and without it the keyboard could only leave by tabbing all the way
   * to the back button.
   */
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !active) return
    event.preventDefault()
    showGallery()
  })

  /*
   * The carousel's controls act on the card without leaving the gallery; any
   * other point on the card enters the build.
   */
  const CARD_CONTROLS = '[data-bx-card-prev], [data-bx-card-next], [data-bx-card-dot]'

  /** Both the opening and the parts listing expand with every build. */
  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement

    if (target.closest(CARD_CONTROLS)) return
    const opener = target.closest<HTMLElement>('[data-bx-open]')
    if (opener) return openBuild(opener.dataset.bxOpen ?? '')
    if (!active) return

    const partButton = target.closest<HTMLElement>('[data-bx-part-button]')
    if (partButton) active.togglePart(partButton.dataset.bxPartButton ?? '')
  })

  const PART_HOLDER = '[data-bx-part-button], [data-bx-part]'
  const holderOf = (node: EventTarget | null) =>
    (node as HTMLElement | null)?.closest?.<HTMLElement>(PART_HOLDER) ?? null

  root.addEventListener('pointerover', (event) => {
    if (!active) return
    const holder = holderOf(event.target)
    if (!holder) return
    active.previewPart(holder.dataset.bxPartButton ?? holder.dataset.bxPart ?? null)
  })
  /*
   * `pointerout` bubbles, so moving between a layer's drawn keys fires it
   * constantly. It only counts as leaving if the pointer lands outside that same
   * part.
   */
  root.addEventListener('pointerout', (event) => {
    if (!active) return
    const from = holderOf(event.target)
    if (!from || holderOf(event.relatedTarget) === from) return
    active.previewPart(null)
  })
  root.addEventListener('focusin', (event) => {
    if (!active) return
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-bx-part-button]')
    active.previewPart(button?.dataset.bxPartButton ?? null)
  })

  /* ---------- Explode slider ---------- */
  root.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement
    if (!active || !input.matches('[data-bx-range]')) return
    root.classList.add('is-scrubbing')
    active.setSpread(Number(input.value) / 100)
    // The presets follow the control: the accessible state never lies.
    const exploded = active.spread > .999
    const assembled = active.spread < .001
    assembledButton?.setAttribute('aria-pressed', String(assembled))
    explodeButton?.setAttribute('aria-pressed', String(exploded))
    syncStatus()
  })
  const endScrub = () => root.classList.remove('is-scrubbing')
  root.addEventListener('pointerup', endScrub)
  root.addEventListener('pointercancel', endScrub)
  root.addEventListener('change', endScrub)

  /* ---------- Orbit ---------- */
  const stopDragging = (cancelled = false) => {
    if (drag?.partId) {
      suppressPartClick = true
      window.setTimeout(() => { suppressPartClick = false }, 0)
      if (!drag.moved && !cancelled && active) active.togglePart(drag.partId)
    }
    drag = null
    active?.stage?.classList.remove('is-dragging')
  }

  root.addEventListener('pointerdown', (event) => {
    const stage = (event.target as HTMLElement).closest<HTMLElement>('[data-bx-stage]')
    if (!active || !stage) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    stage.focus({ preventScroll: true })
    const partId = (event.target as HTMLElement).closest<HTMLElement>('[data-bx-part]')?.dataset.bxPart ?? null
    const { tilt, spin } = active.camera
    drag = { x: event.clientX, y: event.clientY, tilt, spin, moved: false, partId }
    stage.classList.add('is-dragging')
    try { stage.setPointerCapture(event.pointerId) } catch { /* La captura es una mejora, no un requisito. */ }
  })
  root.addEventListener('pointermove', (event) => {
    if (!drag || !active) return
    event.preventDefault()
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.moved && Math.hypot(dx, dy) < 3) return
    drag.moved = true
    active.orbitFrom(drag.tilt, drag.spin, dy * .2, dx * .24)
  })
  root.addEventListener('pointerup', () => stopDragging())
  root.addEventListener('pointercancel', () => stopDragging(true))
  root.addEventListener('lostpointercapture', () => stopDragging(true))
  root.addEventListener('selectstart', (event) => {
    if ((event.target as HTMLElement).closest('[data-bx-stage]')) event.preventDefault()
  })
  root.addEventListener('dragstart', (event) => {
    if ((event.target as HTMLElement).closest('[data-bx-stage]')) event.preventDefault()
  })
  root.addEventListener('click', (event) => {
    if (!suppressPartClick) return
    const layer = (event.target as HTMLElement).closest('[data-bx-part]')
    if (!layer) return
    event.preventDefault()
    event.stopPropagation()
  }, true)
  root.addEventListener('dblclick', (event) => {
    if ((event.target as HTMLElement).closest('[data-bx-stage]')) active?.resetCamera()
  })

  /* ---------- Keyboard over the stage ---------- */
  const ORBIT_STEP = 6
  const SPREAD_STEP = .12
  root.addEventListener('keydown', (event) => {
    const stage = (event.target as HTMLElement).closest('[data-bx-stage]')
    if (!active || !stage) return

    /*
     * Orbiting and exploding from the keyboard: the model simply did not exist
     * for anyone who cannot drag, even though the container was already
     * focusable.
     */
    const orbits: Record<string, [number, number]> = {
      ArrowUp: [-ORBIT_STEP, 0],
      ArrowDown: [ORBIT_STEP, 0],
      ArrowLeft: [0, -ORBIT_STEP],
      ArrowRight: [0, ORBIT_STEP],
    }
    const orbit = orbits[event.key]
    if (orbit) {
      event.preventDefault()
      return active.orbit(orbit[0], orbit[1])
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      active.zoomBy(1.1)
      active.readout?.classList.add('is-visible')
      return
    }
    if (event.key === '-') {
      event.preventDefault()
      active.zoomBy(.9)
      active.readout?.classList.add('is-visible')
      return
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      active.setSpread(active.spread + (event.key === 'PageUp' ? SPREAD_STEP : -SPREAD_STEP))
      syncStatus()
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      active.resetCamera()
    }
  })

  /* ---------- Wheel zoom ---------- */
  root.addEventListener('wheel', (event) => {
    const stage = (event.target as HTMLElement).closest<HTMLElement>('[data-bx-stage]')
    if (!active || !stage) return
    /*
     * Zoom only claims the wheel while the stage holds focus. Passing the cursor
     * over it while reading the page must not block scrolling: you have to enter
     * the model on purpose.
     */
    if (!stage.contains(document.activeElement)) return
    event.preventDefault()
    active.zoomBy(event.deltaY > 0 ? .9 : 1.1)
    active.readout?.classList.add('is-visible')
  }, { passive: false })
}
