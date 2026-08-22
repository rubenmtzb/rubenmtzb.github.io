/**
 * Explorador de builds: portada fotográfica y modelo 3D por capas.
 *
 * El componente renderiza un panel por build, así que aquí no hay nada
 * atado al Neo65: al abrir una tarjeta se engancha el panel correspondiente
 * y todo el estado —cámara, despiece, pieza fijada— vive dentro de él.
 */
import { onSwipe, pad, trackPointer } from '../dom'
import { createBuildPanel, type BuildPanel } from './panel'
import { createBuildSound } from './sound'

export function initKeyboardBuildExplorer() {
  const root = document.querySelector<HTMLElement>('[data-kb-build-explorer]')
  if (!root) return

  /*
   * Las fotos viven en la portada, no en un visor aparte. Cada build mantiene
   * su propio índice y admite botones, barras, teclado y gesto táctil.
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

      const image = slides[index].querySelector<HTMLImageElement>('img')
      if (image) image.loading = 'eager'
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
  const closeButton = root.querySelector<HTMLButtonElement>('[data-bx-close]')
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

  const archivedLabel = status?.textContent ?? ''
  let active: BuildPanel | null = null
  let activeKey = ''
  let drag: { x: number, y: number, tilt: number, spin: number, moved: boolean, partId: string | null } | null = null
  let suppressPartClick = false

  /** El rótulo describe siempre lo que se está viendo, presets incluidos. */
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
    closeButton?.focus()
  }

  closeButton?.addEventListener('click', showGallery)
  assembledButton?.addEventListener('click', () => setViewMode('assembled'))
  explodeButton?.addEventListener('click', () => setViewMode('exploded'))

  /*
   * Escape cierra el visor: es el gesto que espera cualquiera que haya
   * entrado en una vista de detalle, y sin él el teclado solo podía salir
   * tabulando hasta el botón de volver.
   */
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !active) return
    event.preventDefault()
    showGallery()
  })

  /*
   * Los mandos del carrusel actúan sobre la tarjeta sin salir de la galería;
   * cualquier otro punto de la tarjeta entra en el build.
   */
  const CARD_CONTROLS = '[data-bx-card-prev], [data-bx-card-next], [data-bx-card-dot]'

  /** La apertura y el listado de piezas crecen con cada build. */
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
   * `pointerout` burbujea, así que moverse entre las teclas dibujadas de una
   * capa lo dispara constantemente. Solo cuenta como salida si el puntero
   * aterriza fuera de la misma pieza.
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

  /* ---------- Deslizador de separación ---------- */
  root.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement
    if (!active || !input.matches('[data-bx-range]')) return
    root.classList.add('is-scrubbing')
    active.setSpread(Number(input.value) / 100)
    // Los presets siguen al mando: el estado accesible nunca miente.
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

  /* ---------- Órbita ---------- */
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

  /* ---------- Teclado sobre el escenario ---------- */
  const ORBIT_STEP = 6
  const SPREAD_STEP = .12
  root.addEventListener('keydown', (event) => {
    const stage = (event.target as HTMLElement).closest('[data-bx-stage]')
    if (!active || !stage) return

    /*
     * Orbitar y separar con el teclado: el modelo dejaba de existir para
     * quien no puede arrastrar, aunque el contenedor ya fuese enfocable.
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

  /* ---------- Zoom con rueda ---------- */
  root.addEventListener('wheel', (event) => {
    const stage = (event.target as HTMLElement).closest<HTMLElement>('[data-bx-stage]')
    if (!active || !stage) return
    /*
     * El zoom solo se apropia de la rueda cuando el escenario tiene el foco.
     * Pasar el cursor por encima mientras se lee la página no debe bloquear
     * el scroll: hay que entrar en el modelo a propósito.
     */
    if (!stage.contains(document.activeElement)) return
    event.preventDefault()
    active.zoomBy(event.deltaY > 0 ? .9 : 1.1)
    active.readout?.classList.add('is-visible')
  }, { passive: false })
}
