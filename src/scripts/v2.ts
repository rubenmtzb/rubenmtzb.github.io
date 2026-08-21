import { initAsciiPortrait } from './ascii-portrait'
import { revealOnScroll } from './reveal'

/**
 * Mejora progresiva de la V2.
 * Todo lo de aquí es interactividad opcional: el HTML de build ya es
 * 100% accesible, semántico e indexable sin JavaScript.
 */

/** Preferencias e idioma se leen una sola vez: no cambian durante la sesión. */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isSpanish = document.documentElement.lang === 'es'

/** Elige entre la variante castellana y la inglesa según el idioma del documento. */
const say = <T,>(es: T, en: T): T => (isSpanish ? es : en)

/** Numeración de dos dígitos: "01 / 04". La comparten los dos contadores. */
const pad = (n: number) => String(n).padStart(2, '0')

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))

/**
 * Luz que sigue al puntero, compartida por el carrusel de proyectos y por
 * las portadas del archivo de builds.
 *
 * `pointermove` se dispara muchas más veces de las que el navegador llega a
 * pintar —un ratón de 1.000 Hz son diecisiete eventos por fotograma— y cada
 * uno medía la caja del elemento, que obliga a recalcular el diseño. Aquí se
 * agrupa en un fotograma: el efecto es el mismo y la medición pasa a ser una.
 */
function trackPointer(el: HTMLElement, prefix: string) {
  let latest: PointerEvent | null = null
  let frame: number | null = null

  const paint = () => {
    frame = null
    if (!latest) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty(`${prefix}-x`, `${latest.clientX - rect.left}px`)
    el.style.setProperty(`${prefix}-y`, `${latest.clientY - rect.top}px`)
  }

  el.addEventListener('pointermove', (event) => {
    latest = event
    if (frame === null) frame = requestAnimationFrame(paint)
  }, { passive: true })
}

/**
 * Gesto de deslizamiento horizontal. Lo comparten los tres carruseles,
 * así que el umbral y la dirección se definen en un único sitio.
 */
function onSwipe(el: HTMLElement, handler: (direction: 1 | -1) => void, threshold = 50) {
  let startX = 0
  el.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX }, { passive: true })
  el.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX
    if (Math.abs(dx) > threshold) handler(dx < 0 ? 1 : -1)
  }, { passive: true })
}

/* ---------------- Cabecera fija y navegación ---------------- */
function initHeader() {
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

/* ---------------- Typewriter: Efecto máquina de escribir alternante (rubén <-> rubenitx) ---------------- */
function initTypewriter() {
  const el = document.getElementById('hero-typewriter')
  if (!el) return

  const NAME_CLASS = 'text-[color:var(--blue-bright)] font-extrabold'
  const ALIAS_CLASS = 'text-[color:var(--cyan)] font-mono font-bold'

  const prefix = say('hola, me llamo ', 'hi there, my name is ')
  const names = [
    { text: say('rubén.', 'ruben.'), cls: NAME_CLASS },
    { text: 'rubenitx.', cls: ALIAS_CLASS },
  ]

  /*
   * El prefijo y el nombre son dos nodos estables: escribir letra a letra
   * solo cambia el texto de un nodo, en lugar de reconstruir el HTML del
   * titular en cada fotograma.
   */
  const prefixNode = document.createTextNode('')
  const nameNode = document.createElement('span')
  el.replaceChildren(prefixNode, nameNode)

  if (reduce) {
    prefixNode.data = prefix
    nameNode.className = names[0].cls
    nameNode.textContent = names[0].text
    return
  }

  let nameIndex = 0
  let charIdx = 0
  let deleting = false
  let prefixDone = false
  const after = (ms: number): void => { window.setTimeout(tick, ms) }

  function tick(): void {
    const current = names[nameIndex]

    if (!prefixDone) {
      charIdx += 1
      prefixNode.data = prefix.slice(0, charIdx)
      if (charIdx < prefix.length) return after(35 + Math.random() * 25)
      prefixDone = true
      charIdx = 0
      return after(200)
    }

    nameNode.className = current.cls
    charIdx += deleting ? -1 : 1
    nameNode.textContent = current.text.slice(0, charIdx)

    if (!deleting && charIdx >= current.text.length) {
      deleting = true
      return after(2400)
    }
    if (deleting && charIdx <= 0) {
      deleting = false
      nameIndex = (nameIndex + 1) % names.length
      return after(350)
    }
    return after(deleting ? 32 + Math.random() * 20 : 50 + Math.random() * 35)
  }

  after(300)
}

/* ---------------- Retrato ASCII (Killua) ---------------- */
function initPortrait() {
  const canvas = document.getElementById('ascii') as HTMLCanvasElement | null
  if (canvas) initAsciiPortrait(canvas, '/avatar.png')
}

/* ---------------- JobList / Pestañas interactivas de experiencia ---------------- */
function initJobList() {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.job-tab'))
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.job-panel'))
  const indicator = document.getElementById('job-indicator')
  if (tabs.length === 0 || panels.length === 0) return

  let activeIndex = 0

  const moveIndicator = (tab: HTMLButtonElement) => {
    if (!indicator) return
    const isMobile = window.innerWidth < 1024
    if (isMobile) {
      indicator.style.transform = `translateX(${tab.offsetLeft}px)`
      indicator.style.width = `${tab.offsetWidth}px`
      indicator.style.height = '2px'
      indicator.style.top = 'auto'
      indicator.style.bottom = '0'
      indicator.style.left = '0'
    } else {
      indicator.style.transform = `translateY(${tab.offsetTop}px)`
      indicator.style.height = `${tab.offsetHeight}px`
      indicator.style.width = '3px'
      indicator.style.top = '0'
      indicator.style.bottom = 'auto'
      indicator.style.left = '0'
    }
  }

  const selectTab = (index: number) => {
    activeIndex = (index + tabs.length) % tabs.length
    tabs.forEach((tab, i) => {
      const selected = i === activeIndex
      tab.setAttribute('aria-selected', String(selected))
      tab.tabIndex = selected ? 0 : -1
      tab.classList.toggle('is-active', selected)
      tab.classList.toggle('text-[color:var(--blue-bright)]', selected)
      tab.classList.toggle('font-semibold', selected)
      tab.classList.toggle('text-[color:var(--fg-3)]', !selected)
    })

    panels.forEach((panel, i) => {
      panel.classList.toggle('is-active', i === activeIndex)
    })

    const currentTab = tabs[activeIndex]
    if (currentTab) moveIndicator(currentTab)
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(i))
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        selectTab(activeIndex + 1)
        tabs[activeIndex]?.focus()
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        selectTab(activeIndex - 1)
        tabs[activeIndex]?.focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        selectTab(0)
        tabs[0]?.focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        selectTab(tabs.length - 1)
        tabs[tabs.length - 1]?.focus()
      }
    })
  })

  /* Recolocar el indicador mide la pestaña activa, así que un
     redimensionado continuo costaba un recálculo de diseño por evento. */
  let indicatorFrame: number | null = null
  window.addEventListener('resize', () => {
    if (indicatorFrame !== null) return
    indicatorFrame = requestAnimationFrame(() => {
      indicatorFrame = null
      const currentTab = tabs[activeIndex]
      if (currentTab) moveIndicator(currentTab)
    })
  }, { passive: true })

  selectTab(0)
}

/* ---------------- Deck secundario de proyectos ---------------- */
function initProjectDeck() {
  const deck = document.getElementById('project-deck')
  if (!deck) return

  const viewport = deck.querySelector<HTMLElement>('.project-deck-viewport')
  const track = deck.querySelector<HTMLElement>('.project-deck-track')
  const cards = Array.from(deck.querySelectorAll<HTMLElement>('.project-grid-card'))
  const prevBtn = document.getElementById('project-deck-prev') as HTMLButtonElement | null
  const nextBtn = document.getElementById('project-deck-next') as HTMLButtonElement | null
  const counter = document.getElementById('project-deck-counter')
  if (!viewport || !track || cards.length === 0) return

  let startIndex = 0
  let visibleCount = 1

  const update = () => {
    const cardWidth = cards[0].getBoundingClientRect().width
    const gap = Number.parseFloat(getComputedStyle(track).gap) || 0
    visibleCount = Math.max(1, Math.round((viewport.clientWidth + gap) / (cardWidth + gap)))
    const maxIndex = Math.max(0, cards.length - visibleCount)
    // El índice se acota por los dos lados: nada puede dejarlo en negativo.
    startIndex = Math.max(0, Math.min(startIndex, maxIndex))
    track.style.transform = `translateX(-${startIndex * (cardWidth + gap)}px)`
    if (counter) {
      const end = Math.min(cards.length, startIndex + visibleCount)
      counter.textContent = `${pad(startIndex + 1)}–${pad(end)} / ${pad(cards.length)}`
    }
    if (prevBtn) prevBtn.disabled = startIndex === 0
    if (nextBtn) nextBtn.disabled = startIndex === maxIndex
  }

  prevBtn?.addEventListener('click', () => {
    startIndex -= 1
    update()
  })
  nextBtn?.addEventListener('click', () => {
    startIndex += 1
    update()
  })
  deck.addEventListener('keydown', (event) => {
    if (event.target !== deck) return
    if (event.key === 'ArrowLeft' && startIndex > 0) {
      event.preventDefault()
      startIndex -= 1
      update()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      startIndex += 1
      update()
    }
  })

  new ResizeObserver(update).observe(viewport)
  update()
}

/* ---------------- Workbench de perfil ---------------- */
function initProfileWorkbench() {
  const workbench = document.getElementById('profile-workbench')
  if (!workbench) return

  const files = Array.from(workbench.querySelectorAll<HTMLButtonElement>('[data-profile-tab]'))
  const panels = Array.from(workbench.querySelectorAll<HTMLElement>('[data-profile-panel]'))
  const tabLabel = document.getElementById('profile-tab-label')
  const command = document.getElementById('profile-command') as HTMLFormElement | null
  const input = document.getElementById('profile-command-input') as HTMLInputElement | null
  const names: Record<string, string> = {
    identity: 'identity.json',
    focus: 'engineering.md',
    learning: 'learning.log',
  }

  const select = (tab: string) => {
    if (!(tab in names)) return
    files.forEach((file) => {
      const isActive = file.dataset.profileTab === tab
      file.classList.toggle('is-active', isActive)
      file.setAttribute('aria-selected', String(isActive))
    })
    panels.forEach((panel) => {
      const isActive = panel.dataset.profilePanel === tab
      panel.hidden = !isActive
      panel.classList.toggle('is-active', isActive)
    })
    if (tabLabel) tabLabel.textContent = names[tab]
  }

  files.forEach((file) => file.addEventListener('click', () => select(file.dataset.profileTab ?? 'identity')))
  command?.addEventListener('submit', (event) => {
    event.preventDefault()
    const value = input?.value.trim().toLowerCase() ?? ''
    if (value.includes('focus') || value.includes('engineering') || value.includes('arquitect')) select('focus')
    else if (value.includes('learning') || value.includes('education') || value.includes('estudio') || value.includes('formaci')) select('learning')
    else if (value) select('identity')
    if (input) input.value = ''
  })
}

/* ---------------- Carrusel: primitiva única de los tres sliders ---------------- */

/** Un grupo de controles que refleja el índice activo y navega al pulsarlo. */
type CarouselControls = {
  els: HTMLElement[]
  /** Atributo ARIA que además del estado visual describe la selección. */
  state?: 'aria-selected' | 'aria-current'
}

type CarouselOptions = {
  slides: HTMLElement[]
  controls?: CarouselControls[]
  prev?: HTMLElement | null
  next?: HTMLElement | null
  counter?: HTMLElement | null
  /** Zona que acepta gesto táctil y, si se indica, flechas del teclado. */
  surface?: HTMLElement | null
  keyboard?: boolean
  /** Los slides ocultos se marcan como tales para lectores de pantalla. */
  ariaHideInactive?: boolean
}

/**
 * Proyectos, formación y certificaciones eran tres implementaciones
 * copiadas con los identificadores cambiados. La lógica —índice circular,
 * marcado de controles, contador, flechas y swipe— es la misma para las
 * tres, así que vive aquí una sola vez.
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

  let active = 0

  const show = (index: number) => {
    active = (index + total) % total

    slides.forEach((slide, i) => {
      const on = i === active
      slide.classList.toggle('is-active', on)
      if (ariaHideInactive) slide.setAttribute('aria-hidden', String(!on))
    })

    for (const group of controls) {
      group.els.forEach((el, i) => {
        const on = i === active
        el.classList.toggle('is-active', on)
        if (group.state) el.setAttribute(group.state, String(on))
      })
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
function initProjectCarousel() {
  const carousel = document.getElementById('project-carousel')
  if (!carousel) return

  const slides = Array.from(carousel.querySelectorAll<HTMLElement>('.project-slide'))

  /* La luz que sigue al puntero es decorativa y no forma parte del carrusel. */
  for (const slide of slides) trackPointer(slide, '--project-pointer')

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

/* ---------------- Slider de Formación Académica (Timeline) ---------------- */
function initEducationSlider() {
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
function initCertsSlider() {
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

/* ---------------- Moment Cards: Arrastrables, Volteables 3D y con Física de Lanzamiento ---------------- */
function initMomentCards() {
  const stage = document.getElementById('moments-stage')
  if (!stage) return

  /* Constantes de la física del lanzamiento, calibradas a mano. */
  const DRAG_THRESHOLD_PX = 4      // por debajo, es un clic y no un arrastre
  const FLICK_WINDOW_MS = 120      // tramo final del gesto que fija la velocidad
  const FLICK_MIN_SPEED = 1.2      // por debajo, la carta se posa en lugar de volar
  const THROW_BOOST = 1.35
  const MAX_THROW_SPEED = 28
  const MAX_SPIN = 3.5
  const FRICTION = 0.92
  const SPIN_FRICTION = 0.93
  const BOUNCE = 0.45
  const REST_SPEED = 0.15          // por debajo, se considera parada
  const MOBILE_SCALE = 0.42        // el abanico se cierra en pantallas estrechas

  const cards = Array.from(stage.querySelectorAll<HTMLElement>('.moment-card'))
  const resetBtn = document.getElementById('moments-reset-btn')
  let highestZ = 20

  const cardStates = cards.map((card) => {
    const ox = Number.parseFloat(card.dataset.originX || '0')
    const oy = Number.parseFloat(card.dataset.originY || '0')
    const rot = Number.parseFloat(card.dataset.originRot || '0')
    return {
      el: card,
      x: ox,
      y: oy,
      rot,
      vx: 0,
      vy: 0,
      rotVel: 0,
      origX: ox,
      origY: oy,
      origRot: rot,
      animId: 0,
    }
  })

  const maxOriginX = Math.max(1, ...cardStates.map((state) => Math.abs(state.origX)))

  /**
   * Caja de una carta y del escenario que la contiene.
   *
   * Ni una ni otra cambian mientras dura un gesto —girar y desplazar no
   * alteran el flujo—, así que se miden una vez al empezar y el resto del
   * arrastre y del lanzamiento trabaja sobre esos números. Medir dentro del
   * bucle obligaba a recalcular el diseño en cada fotograma y por cada carta.
   */
  type CardBox = { width: number, height: number, stageWidth: number, stageHeight: number }
  const measure = (card: HTMLElement): CardBox => ({
    width: card.offsetWidth,
    height: card.offsetHeight,
    stageWidth: stage.clientWidth,
    stageHeight: stage.clientHeight,
  })

  /** Mitad del hueco libre alrededor de la carta ya girada. */
  const boundsIn = (box: CardBox, rotation: number) => {
    const radians = Math.abs(rotation % 180) * Math.PI / 180
    const cos = Math.abs(Math.cos(radians))
    const sin = Math.abs(Math.sin(radians))
    const paintedWidth = box.width * cos + box.height * sin
    const paintedHeight = box.width * sin + box.height * cos
    return {
      x: Math.max(0, (box.stageWidth - paintedWidth) / 2 - 8),
      y: Math.max(0, (box.stageHeight - paintedHeight) / 2 - 8),
    }
  }

  // Aplicar posición inicial adaptativa según ancho de pantalla
  const applyLayout = () => {
    const isMobile = window.innerWidth <= 768

    /* Se mide todo primero y se escribe después: intercalar lectura y
       escritura forzaba un recálculo de diseño por carta. */
    const boxes = cardStates.map((st) => measure(st.el))
    const mobileBounds = boxes[0] ? boundsIn(boxes[0], 0) : { x: 0, y: 0 }
    const scaleFactor = isMobile ? Math.min(MOBILE_SCALE, mobileBounds.x / maxOriginX) : 1

    cardStates.forEach((st, index) => {
      if (st.animId) cancelAnimationFrame(st.animId)
      const bounds = boundsIn(boxes[index], st.origRot)
      st.x = isMobile ? Math.max(-bounds.x, Math.min(bounds.x, st.origX * scaleFactor)) : st.origX
      st.y = isMobile ? Math.max(-bounds.y, Math.min(bounds.y, st.origY * scaleFactor)) : st.origY
      st.rot = st.origRot
      st.vx = 0
      st.vy = 0
      st.rotVel = 0
      if (!isMobile) st.el.classList.remove('is-flipped')
      st.el.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) rotate(${st.rot}deg)`
    })
  }

  applyLayout()

  /*
   * `applyLayout` mide cada carta, así que en un redimensionado continuo
   * costaba un reflujo por evento. Se agrupa en un fotograma: el resultado
   * es idéntico y el trabajo pasa a ser uno por frame.
   */
  let layoutFrame: number | null = null
  window.addEventListener('resize', () => {
    if (layoutFrame !== null) return
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = null
      applyLayout()
    })
  }, { passive: true })

  cardStates.forEach((st) => {
    const card = st.el
    let isDragging = false
    let startPointerX = 0
    let startPointerY = 0
    let startCardX = 0
    let startCardY = 0
    /** Rotación al empezar el gesto: la de trabajo se deriva de ella, nunca de sí misma. */
    let startCardRot = 0
    let hasMoved = false
    /** Medida del gesto en curso: se toma al apoyar el puntero y no se repite. */
    let box: CardBox = measure(card)

    type PosSample = { x: number; y: number; time: number }
    let pointerHistory: PosSample[] = []

    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      if (st.animId) cancelAnimationFrame(st.animId)

      isDragging = true
      hasMoved = false
      box = measure(card)
      startPointerX = e.clientX
      startPointerY = e.clientY
      startCardX = st.x
      startCardY = st.y
      startCardRot = st.rot
      pointerHistory = [{ x: e.clientX, y: e.clientY, time: performance.now() }]

      card.classList.remove('is-flying')
      card.setPointerCapture(e.pointerId)
    })

    card.addEventListener('pointermove', (e) => {
      if (!isDragging) return
      const dx = e.clientX - startPointerX
      const dy = e.clientY - startPointerY

      if (!hasMoved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        hasMoved = true
        highestZ += 2
        card.style.zIndex = String(highestZ)
        card.classList.add('is-dragging')
      }

      if (hasMoved) {
        const isNarrow = window.innerWidth <= 768
        /*
         * La inclinación se calcula siempre desde la rotación inicial del
         * gesto y se guarda en el estado. Antes solo vivía en el transform
         * del arrastre, así que al soltar sin impulso la carta volvía de
         * golpe a su ángulo de origen.
         */
        st.rot = isNarrow
          ? clamp(startCardRot + dx * 0.1, 16)
          : startCardRot + clamp(dx * 0.1, 16)
        const bounds = boundsIn(box, st.rot)
        st.x = isNarrow
          ? Math.max(-bounds.x, Math.min(bounds.x, startCardX + dx))
          : startCardX + dx
        st.y = isNarrow
          ? Math.max(-bounds.y, Math.min(bounds.y, startCardY + dy))
          : startCardY + dy

        const now = performance.now()
        pointerHistory.push({ x: e.clientX, y: e.clientY, time: now })
        if (pointerHistory.length > 5) pointerHistory.shift()

        card.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) rotate(${st.rot}deg)`
      }
    })

    const endDrag = (e: PointerEvent) => {
      if (!isDragging) return
      isDragging = false
      card.classList.remove('is-dragging')
      try { card.releasePointerCapture(e.pointerId) } catch { /* noop */ }

      // Calcular velocidad de lanzamiento (flick / toss)
      const now = performance.now()
      const recent = pointerHistory.filter((p) => now - p.time < FLICK_WINDOW_MS)
      let vx = 0
      let vy = 0

      if (recent.length >= 2) {
        const first = recent[0]
        const last = recent[recent.length - 1]
        const dt = Math.max(16, last.time - first.time)
        vx = ((last.x - first.x) / dt) * 16
        vy = ((last.y - first.y) / dt) * 16
      }

      const speed = Math.hypot(vx, vy)

      // Si se lanzó con fuerza (toss con inercia)
      if (hasMoved && speed > FLICK_MIN_SPEED) {
        card.classList.add('is-flying')
        st.vx = clamp(vx * THROW_BOOST, MAX_THROW_SPEED)
        st.vy = clamp(vy * THROW_BOOST, MAX_THROW_SPEED)
        st.rotVel = clamp(st.vx * 0.18, MAX_SPIN)

        /* El vuelo entero se resuelve con la medida del gesto: dentro del
           bucle no se vuelve a tocar el diseño, solo el transform. */
        const isNarrow = window.innerWidth <= 768
        const stageHalfW = (box.stageWidth || 900) / 2

        const animateThrow = () => {
          st.x += st.vx
          st.y += st.vy
          st.rot += st.rotVel
          if (isNarrow) st.rot = clamp(st.rot, 16)

          // Fricción y desaceleración fluida
          st.vx *= FRICTION
          st.vy *= FRICTION
          st.rotVel *= SPIN_FRICTION

          // Rebote suave en los límites del escenario
          const mobileBounds = boundsIn(box, st.rot)
          const boundX = isNarrow ? mobileBounds.x : Math.max(200, stageHalfW - 90)
          const boundY = isNarrow ? mobileBounds.y : 160

          if (st.x > boundX) {
            st.x = boundX
            st.vx = -st.vx * BOUNCE
            st.rotVel = -st.rotVel * 0.5
          } else if (st.x < -boundX) {
            st.x = -boundX
            st.vx = -st.vx * BOUNCE
            st.rotVel = -st.rotVel * 0.5
          }

          if (st.y > boundY) {
            st.y = boundY
            st.vy = -st.vy * BOUNCE
          } else if (st.y < -boundY) {
            st.y = -boundY
            st.vy = -st.vy * BOUNCE
          }

          card.style.transform = `translate3d(${Math.round(st.x)}px, ${Math.round(st.y)}px, 0) rotate(${st.rot.toFixed(1)}deg)`

          if (Math.hypot(st.vx, st.vy) > REST_SPEED) {
            st.animId = requestAnimationFrame(animateThrow)
          } else {
            st.vx = 0
            st.vy = 0
            st.rotVel = 0
            card.classList.remove('is-flying')
          }
        }

        st.animId = requestAnimationFrame(animateThrow)
      } else {
        if (!hasMoved && window.innerWidth <= 768) card.classList.toggle('is-flipped')
        // Asentar posición final
        card.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) rotate(${st.rot}deg)`
      }
    }

    card.addEventListener('pointerup', endDrag)
    card.addEventListener('pointercancel', endDrag)
  })

  // Botón para reorganizar el mazo a su posición original
  resetBtn?.addEventListener('click', () => {
    applyLayout()
    // El apilado vuelve a su base: si no, cada reorganización arrastra el
    // z-index acumulado de todos los arrastres anteriores.
    highestZ = 20
    cardStates.forEach((st, i) => {
      st.el.classList.remove('is-flying', 'is-dragging', 'is-flipped')
      st.el.style.zIndex = String(10 + i)
    })
  })
}

/* ---------------- Killua en pixel art: sprite, chispas y salto ---------------- */

type Spark = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }

type PixelKillua = {
  /** Está a media animación de salto; el clic no debe encadenar brincos. */
  readonly airborne: boolean
  /** Un brinco con chispas, ignorado si ya está en el aire o acaba de saltar. */
  hop(): void
}

/** Sin canvas no hay mascota, pero el resto del teclado sigue funcionando igual. */
const NO_KILLUA: PixelKillua = { airborne: false, hop() {} }

/**
 * Mascota del bloque de teclados. Expone solo lo que el resto necesita, y se
 * ocupa por dentro del canvas, de las chispas y de parar el bucle cuando no
 * se está viendo: es decoración, y no tiene por qué gastar batería mientras
 * el usuario lee otra sección.
 */
function createPixelKillua(canvas: HTMLCanvasElement | null): PixelKillua {
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return NO_KILLUA

  const W_PX = 76           // debe coincidir con width/height del <canvas>
  const H_PX = 84
  const SPRITE_W = 34
  const SPRITE_H = 76
  const GLOW = '#6fe3ff'    // --cyan
  const GRAVITY = 0.35
  const HOP_IMPULSE = -4.5
  const HOP_COOLDOWN_MS = 600

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(W_PX * dpr)
  canvas.height = Math.round(H_PX * dpr)
  ctx.scale(dpr, dpr)
  ctx.imageSmoothingEnabled = false

  const sprite = new Image()
  sprite.decoding = 'async'
  sprite.src = '/killua-pixel.png'

  const sparks: Spark[] = []
  let jumpOffset = 0
  let jumpVel = 0
  let lastHop = 0
  let lastFrame = performance.now()
  let raf: number | null = null

  const spawn = (count: number, spread: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = spread * (1 + Math.random() * 2.5)
      sparks.push({
        x: W_PX / 2 + (Math.random() - 0.5) * 16,
        y: H_PX / 2 + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 10 + Math.random() * 10,
      })
    }
  }

  const render = (time: number) => {
    // Normalizado a 60 fps y acotado, para que un frame perdido no dé un salto.
    const dt = Math.min((time - lastFrame) / 16.67, 2)
    lastFrame = time
    ctx.clearRect(0, 0, W_PX, H_PX)

    if (jumpOffset !== 0 || jumpVel !== 0) {
      jumpOffset += jumpVel * dt
      jumpVel += GRAVITY * dt
      if (jumpOffset > 0) {
        jumpOffset = 0
        jumpVel = 0
      }
    }

    // Chispa ambiental ocasional: el aura eléctrica en reposo.
    if (Math.random() < 0.12) {
      sparks.push({
        x: W_PX / 2 + (Math.random() - 0.5) * 26,
        y: H_PX / 2 + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        life: 0,
        maxLife: 10 + Math.random() * 8,
      })
    }

    ctx.fillStyle = GLOW
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i]
      sp.x += sp.vx * dt
      sp.y += sp.vy * dt
      sp.life += dt
      if (sp.life >= sp.maxLife) {
        sparks.splice(i, 1)
        continue
      }
      ctx.globalAlpha = Math.max(0, 1 - sp.life / sp.maxLife)
      ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 2, 2)
    }
    ctx.globalAlpha = 1

    if (sprite.complete && sprite.naturalWidth > 0) {
      ctx.save()
      ctx.translate(W_PX / 2, H_PX / 2 + jumpOffset)
      ctx.shadowColor = GLOW
      ctx.shadowBlur = 10
      ctx.drawImage(sprite, -SPRITE_W / 2, -SPRITE_H / 2 + 2, SPRITE_W, SPRITE_H)
      ctx.restore()
    }

    raf = requestAnimationFrame(render)
  }

  /*
   * Solo se anima si está a la vez en pantalla y en una pestaña activa.
   * Hacen falta las dos condiciones: volver a la pestaña no debe reanudar
   * un canvas que quedó fuera de la ventana.
   */
  let onScreen = true
  const sync = () => {
    const shouldRun = onScreen && !document.hidden
    if (shouldRun && raf === null) {
      lastFrame = performance.now()
      raf = requestAnimationFrame(render)
    } else if (!shouldRun && raf !== null) {
      cancelAnimationFrame(raf)
      raf = null
    }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      sync()
    }, { threshold: 0.05 }).observe(canvas)
  }
  document.addEventListener('visibilitychange', sync)
  sync()

  const airborne = () => jumpOffset !== 0 || jumpVel !== 0

  return {
    get airborne() { return airborne() },
    hop() {
      const now = performance.now()
      if (airborne() || now - lastHop < HOP_COOLDOWN_MS) return
      lastHop = now
      jumpVel = HOP_IMPULSE
      spawn(6, 1)
    },
  }
}

/* ---------------- Sonido sintetizado de los switches ---------------- */

const SWITCH_PROFILES = {
  linear: { label: 'Linear (Thock)', freqStart: 580, freqEnd: 110, duration: 0.042, type: 'triangle' as OscillatorType, gain: 0.16 },
  clicky: { label: 'Clicky (Crisp)', freqStart: 1800, freqEnd: 160, duration: 0.032, type: 'square' as OscillatorType, gain: 0.12 },
  tactile: { label: 'Tactile (Pop)', freqStart: 720, freqEnd: 140, duration: 0.048, type: 'sine' as OscillatorType, gain: 0.2 },
} as const

type SwitchProfile = keyof typeof SWITCH_PROFILES
const SWITCH_ORDER = Object.keys(SWITCH_PROFILES) as SwitchProfile[]

/**
 * Cada pulsación es un oscilador de vida muy corta con una caída
 * exponencial. El AudioContext se crea en la primera pulsación real, que es
 * cuando existe el gesto de usuario que los navegadores exigen.
 */
function createSwitchAudio() {
  let ctx: AudioContext | null = null
  let profile: SwitchProfile = 'linear'
  let enabled = true

  return {
    get label() { return SWITCH_PROFILES[profile].label },
    get enabled() { return enabled },
    toggle() { enabled = !enabled },
    /** Rota entre los tres perfiles y devuelve la etiqueta del nuevo. */
    nextProfile() {
      profile = SWITCH_ORDER[(SWITCH_ORDER.indexOf(profile) + 1) % SWITCH_ORDER.length]
      return SWITCH_PROFILES[profile].label
    },
    play() {
      if (!enabled) return
      try {
        const AudioClass = window.AudioContext
          ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctx ??= new AudioClass()
        if (ctx.state === 'suspended') void ctx.resume()

        const now = ctx.currentTime
        const prof = SWITCH_PROFILES[profile]
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = prof.type
        // Una pizca de variación de tono evita que suene a metrónomo.
        osc.frequency.setValueAtTime(prof.freqStart + (Math.random() - 0.5) * 80, now)
        osc.frequency.exponentialRampToValueAtTime(prof.freqEnd, now + prof.duration)
        gain.gain.setValueAtTime(prof.gain, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + prof.duration)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + prof.duration + 0.005)
      } catch { /* El audio es opcional: si el navegador lo bloquea, se sigue tecleando. */ }
    },
  }
}

/* ---------------- Modo libre: terminal de escritura y telemetría ---------------- */

/**
 * Segundo modo del bloque de teclados: se escribe libremente y se ve el
 * texto, las pulsaciones y una cadencia instantánea. No comparte estado con
 * el test de velocidad, así que se gobierna a sí mismo y solo expone las
 * cuatro cosas que el teclado necesita de él.
 */
function createFreeSandbox({ onEveryTenKeys, announce }: {
  onEveryTenKeys: () => void
  announce: (text: string) => void
}) {
  const box = document.getElementById('free-sim-box')
  const textEl = document.getElementById('free-sim-text')
  const placeholder = document.getElementById('free-sim-placeholder')
  const clearBtn = document.getElementById('free-sim-clear-btn')
  const countEl = document.getElementById('kb-free-count')
  const lastKeyEl = document.getElementById('kb-free-last-key')
  const wpmEl = document.getElementById('kb-free-wpm')
  const profilePill = document.getElementById('kb-free-sound-pill')

  /** Ventana móvil sobre la que se calcula la cadencia en vivo. */
  const WINDOW_MS = 8000
  const WINDOW_MINUTES = WINDOW_MS / 60_000

  let text = ''
  let keystrokes = 0
  let recent: number[] = []

  const render = () => {
    if (textEl) textEl.textContent = text
    placeholder?.classList.toggle('hidden', text.length > 0)
  }

  const setLastKey = (label: string) => {
    if (lastKeyEl) lastKeyEl.textContent = label
  }

  box?.addEventListener('click', () => box.focus())
  clearBtn?.addEventListener('click', (event) => {
    event.stopPropagation()
    text = ''
    keystrokes = 0
    recent = []
    render()
    if (countEl) countEl.textContent = '0'
    if (wpmEl) wpmEl.textContent = '0 WPM'
    setLastKey('—')
    announce(say('¡Pizarra limpia! ¿Listo para escribir otra vez?', 'Board cleared! Ready to type again?'))
  })

  return {
    /** El teclado global necesita saber si el foco está aquí dentro. */
    element: box,
    showProfile(label: string) {
      if (profilePill) profilePill.textContent = `🔊 ${label}`
    },
    type(char: string, code: string) {
      text += char
      render()

      keystrokes += 1
      const now = performance.now()
      recent.push(now)
      recent = recent.filter((t) => now - t <= WINDOW_MS)

      if (countEl) countEl.textContent = String(keystrokes)
      if (wpmEl) wpmEl.textContent = `${Math.round(recent.length / 5 / WINDOW_MINUTES)} WPM`
      setLastKey(`[ ${code === 'Space' ? 'SPACE' : char.toUpperCase() || code.replace('Key', '')} ]`)

      if (keystrokes % 10 === 0) onEveryTenKeys()
    },
    backspace() {
      if (text.length === 0) return
      text = text.slice(0, -1)
      render()
      setLastKey('[ BACKSPACE ]')
    },
  }
}

/* ---------------- Archivo interactivo de builds ---------------- */

/** Límites de la órbita: fuera de ellos el modelo deja de leerse como teclado. */
const BX_TILT = { min: 24, max: 78, home: 56 }
const BX_SPIN = { min: -84, max: 24, home: -29 }
const BX_ZOOM = { min: .68, max: 1.65 }

/** Un build abierto: sus elementos y el estado de su cámara y su despiece. */
type BuildPanel = ReturnType<typeof createBuildPanel>

function createBuildPanel(panel: HTMLElement, root: HTMLElement) {
  const q = <T extends HTMLElement>(selector: string) => panel.querySelector<T>(selector)
  const all = <T extends HTMLElement>(selector: string) => [...panel.querySelectorAll<T>(selector)]

  const stage = q('[data-bx-stage]')
  const model = q('[data-bx-model]')
  const readout = q('[data-bx-readout]')
  const chipIndex = q('[data-bx-chip-index]')
  const chipLabel = q('[data-bx-chip-label]')
  const chipSpec = q('[data-bx-chip-spec]')
  const scrub = q('[data-bx-scrub]')
  const range = q<HTMLInputElement>('[data-bx-range]')
  const rangeOut = q('[data-bx-range-out]')
  const partButtons = all<HTMLButtonElement>('[data-bx-part-button]')
  const partLayers = all('[data-bx-part]')

  /** Ficha de cada pieza, leída del propio listado: el texto vive en el HTML. */
  const partDetails = new Map(partButtons.map((button, index) => [
    button.dataset.bxPartButton ?? '',
    {
      index: pad(index + 1),
      label: button.querySelector('strong')?.textContent ?? '',
      spec: button.querySelector('small')?.textContent ?? '',
    },
  ]))

  let tilt = BX_TILT.home
  let spin = BX_SPIN.home
  let zoom = 1
  /** 0 montado, 1 totalmente separado. Es el único origen de la explosión. */
  let spread = 0
  let pinnedPart: string | null = null

  const renderCamera = () => {
    model?.style.setProperty('--rx', `${tilt}deg`)
    model?.style.setProperty('--rz', `${spin}deg`)
    model?.style.setProperty('--zoom', String(zoom))
    if (readout) readout.textContent = `${Math.round(zoom * 100)}% · ${Math.round(tilt)}° / ${Math.round(spin)}°`
  }

  const renderSpread = () => {
    const percent = Math.round(spread * 100)
    // Vive en la raíz: el alto del escenario y el encuadre del modelo lo leen.
    root.style.setProperty('--spread', String(spread))
    root.classList.toggle('is-exploded', spread > 0)
    root.classList.toggle('is-spread', spread > .12)
    if (range) {
      range.value = String(percent)
      range.style.setProperty('--fill', `${percent}%`)
    }
    if (rangeOut) rangeOut.textContent = `${percent}%`
  }

  const setActivePart = (partId: string | null) => {
    root.classList.toggle('has-active', Boolean(partId))
    for (const layer of partLayers) layer.classList.toggle('is-active', layer.dataset.bxPart === partId)
    for (const button of partButtons) button.setAttribute('aria-pressed', String(button.dataset.bxPartButton === pinnedPart))

    const detail = partId ? partDetails.get(partId) : null
    if (!detail) return
    if (chipIndex) chipIndex.textContent = detail.index
    if (chipLabel) chipLabel.textContent = detail.label
    if (chipSpec) chipSpec.textContent = detail.spec
  }

  return {
    element: panel,
    stage,
    readout,
    scrub,

    get spread() { return spread },
    get camera() { return { tilt, spin } },

    setSpread(next: number) {
      spread = Math.max(0, Math.min(1, next))
      renderSpread()
    },
    /** Órbita absoluta desde un punto de partida: es la que usa el arrastre. */
    orbitFrom(baseTilt: number, baseSpin: number, deltaTilt: number, deltaSpin: number) {
      tilt = Math.max(BX_TILT.min, Math.min(BX_TILT.max, baseTilt + deltaTilt))
      spin = Math.max(BX_SPIN.min, Math.min(BX_SPIN.max, baseSpin + deltaSpin))
      renderCamera()
    },
    /** Órbita relativa a la posición actual: es la que usan las flechas. */
    orbit(deltaTilt: number, deltaSpin: number) {
      this.orbitFrom(tilt, spin, deltaTilt, deltaSpin)
    },
    zoomBy(factor: number) {
      zoom = Math.max(BX_ZOOM.min, Math.min(BX_ZOOM.max, zoom * factor))
      renderCamera()
    },
    resetCamera() {
      tilt = BX_TILT.home
      spin = BX_SPIN.home
      zoom = 1
      renderCamera()
      readout?.classList.remove('is-visible')
    },
    previewPart(partId: string | null) {
      setActivePart(partId ?? pinnedPart)
    },
    togglePart(partId: string) {
      pinnedPart = pinnedPart === partId ? null : partId
      setActivePart(pinnedPart)
    },
    clearPart() {
      pinnedPart = null
      setActivePart(null)
    },
  }
}

/**
 * Explorador de builds: portada fotográfica y modelo 3D por capas.
 *
 * El componente renderiza un panel por build, así que aquí no hay nada
 * atado al Neo65: al abrir una tarjeta se engancha el panel correspondiente
 * y todo el estado —cámara, despiece, pieza fijada— vive dentro de él.
 */
function initKeyboardBuildExplorer() {
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
  const openButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-bx-open]')]

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

  /** La apertura y el listado de piezas crecen con cada build. */
  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement

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

/* ---------------- Teclado mecánico dinámico con MonkeyType Killua Speed Trial ---------------- */
function initKeyboard() {
  const kb = document.getElementById('kb')
  if (!kb) return
  /** Cada tecla dibujada, indexada por el código que reporta el teclado real. */
  const keys = new Map<string, HTMLElement>()
  for (const el of kb.querySelectorAll<HTMLElement>('[data-code]')) {
    if (el.dataset.code) keys.set(el.dataset.code, el)
  }

  const monkeyWordsEl = document.getElementById('monkey-words')
  const monkeyBox = document.getElementById('monkey-box')
  const monkeyRestartBtn = document.getElementById('monkey-restart-btn')
  const killuaSpeech = document.getElementById('killua-typing-speech')
  const wpmEl = document.getElementById('kb-wpm')
  const accEl = document.getElementById('kb-acc')
  const comboEl = document.getElementById('kb-combo')
  const timerEl = document.getElementById('kb-timer')
  const switchTypeBtn = document.getElementById('kb-switch-type')
  const soundToggle = document.getElementById('kb-sound-toggle')
  const soundLabel = document.getElementById('kb-sound-label')

  const killuaCanvas = document.getElementById('kb-pixel-killua') as HTMLCanvasElement | null
  const killua = createPixelKillua(killuaCanvas)
  const audio = createSwitchAudio()

  const KILLUA_QUIPS_ES = [
    '¡Oye! ¡No me toques la cara, mejor concéntrate en teclear a la velocidad del rayo!',
    '¡No me desconcentres! ¡Demuéstrame si puedes superar 80 WPM!',
    '¿Crees que tus dedos son tan rápidos como mis garras de asesino? ¡Sigue tecleando!',
    '¡Ouch! ¡Deja de hacer clic en mí y concéntrate en las palabras!',
  ]
  const KILLUA_QUIPS_EN = [
    "Hey! Don't poke me, focus on typing at lightning speed!",
    "Don't distract me! Let's see if you can pass 80 WPM!",
    "You think your fingers are faster than my assassin claws? Keep typing!",
    "Ouch! Stop clicking on me and hit the keyboard!",
  ]
  let quipIdx = 0

  killuaCanvas?.addEventListener('click', () => {
    if (killua.airborne) return
    killua.hop()
    audio.play()
    const quips = say(KILLUA_QUIPS_ES, KILLUA_QUIPS_EN)
    setKilluaSpeech(quips[quipIdx % quips.length])
    quipIdx++
  })

  // Pool de frases dinámicas en inglés estilo Killua / Godspeed / Tech
  const QUOTES = [
    "lightning never strikes twice unless godspeed is activated",
    "assassination techniques require absolute silence and total aura control",
    "distributed systems scale when state is minimized and throughput is optimized",
    "mechanical switches tuned with krytox lube create the purest sound feedback",
    "hunter license granted to those who master both mind and reaction speed",
    "typesafe functional architectures reduce runtime anomalies to zero",
    "nobody can react faster than electrical signals sent directly from the brain",
    "always keep your code clean and your blade razor sharp",
  ]

  let currentQuote = ''
  let targetChars: string[] = []
  let charIndex = 0
  let correctCount = 0
  let totalTyped = 0
  let combo = 0
  let startTime = 0
  let isRunning = false
  let timerInterval: number | null = null
  let remainingSec = 30
  let activeMode: 'speed' | 'sim' | 'photos' = 'speed'

  const setKilluaSpeech = (text: string) => {
    if (killuaSpeech) killuaSpeech.textContent = `"${text}"`
  }

  const loadNewQuote = () => {
    const nextQuotes = QUOTES.filter((q) => q !== currentQuote)
    currentQuote = nextQuotes[Math.floor(Math.random() * nextQuotes.length)] || QUOTES[0]
    targetChars = currentQuote.split('')
    charIndex = 0
    correctCount = 0
    totalTyped = 0
    combo = 0
    isRunning = false
    remainingSec = 30
    if (timerInterval) clearInterval(timerInterval)

    if (wpmEl) wpmEl.textContent = '0'
    if (accEl) accEl.textContent = '100%'
    if (comboEl) comboEl.textContent = 'x0'
    if (timerEl) timerEl.textContent = '⏱️ 30s'

    setKilluaSpeech(say(
      '¿Crees que puedes teclear más rápido que mi Godspeed? ¡A ver cuánto WPM alcanzas!',
      "You think you can type faster than my Godspeed lightning? Let's see your WPM!",
    ))

    renderMonkeyWords()
  }

  /*
   * Los <span> de cada carácter se guardan al pintarlos. Antes cada
   * pulsación hacía dos querySelector sobre el frase completa; ahora es
   * un acceso por índice, que es lo que el bucle de tecleo necesita.
   */
  let charSpans: HTMLElement[] = []

  const renderMonkeyWords = () => {
    if (!monkeyWordsEl) return
    charSpans = []

    const fragment = document.createDocumentFragment()
    const words = currentQuote.split(' ')

    const addChar = (char: string, parent: Node) => {
      const span = document.createElement('span')
      span.className = charSpans.length === 0 ? 'monkey-char current' : 'monkey-char'
      span.dataset.idx = String(charSpans.length)
      span.textContent = char
      parent.appendChild(span)
      charSpans.push(span)
    }

    words.forEach((word, wordIdx) => {
      const wordEl = document.createElement('span')
      wordEl.className = 'monkey-word'
      for (const char of word) addChar(char, wordEl)
      fragment.appendChild(wordEl)
      if (wordIdx < words.length - 1) addChar(' ', fragment)
    })

    monkeyWordsEl.replaceChildren(fragment)
  }

  const startTestIfNeeded = () => {
    if (!isRunning) {
      isRunning = true
      startTime = performance.now()
      if (timerInterval) clearInterval(timerInterval)
      timerInterval = window.setInterval(() => {
        remainingSec--
        if (timerEl) timerEl.textContent = `⏱️ ${remainingSec}s`
        if (remainingSec <= 0) finishTest()
      }, 1000)
    }
  }

  const updateLiveStats = () => {
    const elapsedMinutes = (performance.now() - startTime) / 60000
    if (elapsedMinutes > 0) {
      const wpm = Math.max(0, Math.round((correctCount / 5) / elapsedMinutes))
      if (wpmEl) wpmEl.textContent = String(wpm)
    }
    const acc = totalTyped > 0 ? Math.round((correctCount / totalTyped) * 100) : 100
    if (accEl) accEl.textContent = `${acc}%`
    if (comboEl) comboEl.textContent = `x${combo}`
  }

  const finishTest = () => {
    isRunning = false
    if (timerInterval) clearInterval(timerInterval)
    const elapsedMinutes = Math.max(0.1, (performance.now() - startTime) / 60000)
    const finalWpm = Math.round((correctCount / 5) / elapsedMinutes)
    const finalAcc = totalTyped > 0 ? Math.round((correctCount / totalTyped) * 100) : 100

    if (finalWpm >= 85) {
      setKilluaSpeech(say(
        `⚡ ¡Impresionante! ${finalWpm} WPM con ${finalAcc}% de precisión. ¡Casi tan rápido como mi Narukami!`,
        `⚡ Incredible! ${finalWpm} WPM with ${finalAcc}% accuracy! Almost as fast as my lightning!`,
      ))
    } else {
      setKilluaSpeech(say(
        `⚡ ${finalWpm} WPM y ${finalAcc}% de precisión. ¡Buen intento, pero Godspeed sigue invicto! Pulsa reiniciar para otra ronda.`,
        `⚡ ${finalWpm} WPM & ${finalAcc}% acc. Nice try, but Godspeed remains undefeated! Hit restart to try again.`,
      ))
    }
  }

  const handleCharInput = (inputChar: string) => {
    if (charIndex >= targetChars.length) return
    startTestIfNeeded()

    const expected = targetChars[charIndex]
    totalTyped++

    const isCorrect = inputChar.toLowerCase() === expected.toLowerCase()
    const currentCharEl = charSpans[charIndex]

    if (currentCharEl) {
      currentCharEl.classList.remove('current')
      currentCharEl.classList.toggle('correct', isCorrect)
      currentCharEl.classList.toggle('incorrect', !isCorrect)
    }
    if (isCorrect) {
      correctCount++
      combo++
    } else {
      combo = 0
    }

    charIndex++
    charSpans[charIndex]?.classList.add('current')

    updateLiveStats()

    if (charIndex >= targetChars.length) {
      finishTest()
    }
  }

  const handleBackspace = () => {
    if (charIndex === 0) return
    charSpans[charIndex]?.classList.remove('current')
    charIndex--
    const prevCharEl = charSpans[charIndex]
    if (prevCharEl) {
      prevCharEl.classList.remove('correct', 'incorrect')
      prevCharEl.classList.add('current')
    }
  }

  const kbSpeedModeWrap = document.getElementById('kb-speed-mode-wrap')
  const kbFreeModeWrap = document.getElementById('kb-free-mode-wrap')
  // Envueltas en función: así el orden de declaración dentro de initKeyboard
  // deja de importar y reordenar el fichero no puede romperlo en silencio.
  const sandbox = createFreeSandbox({
    onEveryTenKeys: () => killua.hop(),
    announce: (text) => setKilluaSpeech(text),
  })

  const press = (code: string, down: boolean, keyEl?: HTMLElement) => {
    const key = keyEl || keys.get(code)
    if (!key) return
    key.classList.toggle('is-down', down)
    if (down) audio.play()
  }

  /*
   * Qué hace cada tecla en cada modo. Antes estaba escrito dos veces, una
   * para el teclado físico y otra para el clic sobre las teclas en pantalla,
   * con el riesgo de que las dos copias se separasen.
   */
  const dispatchKey = (code: string, char: string, fromHardware: boolean) => {
    if (activeMode === 'speed') {
      if (code === 'Backspace') handleBackspace()
      else if (code === 'Space') handleCharInput(' ')
      else if (char.length === 1) handleCharInput(char)
      return
    }
    if (activeMode !== 'sim') return
    if (code === 'Backspace') sandbox.backspace()
    else if (code === 'Space') sandbox.type(' ', 'Space')
    // El Enter del teclado real inserta un espacio; la tecla dibujada escribe su glifo.
    else if (code === 'Enter' && fromHardware) sandbox.type(' ', 'Enter')
    else if (char.length === 1) sandbox.type(char, code)
  }

  /** Escribir en un campo de la página no debe pilotar el teclado de adorno. */
  const isForeignField = (target: EventTarget | null) => {
    const el = target as HTMLElement | null
    return ['INPUT', 'TEXTAREA'].includes(el?.tagName ?? '')
      && target !== monkeyBox && target !== sandbox.element
  }

  /*
   * El bloque solo secuestra el espacio y el retroceso cuando está de
   * verdad en juego: con el foco dentro del archivo, o con el panel a la
   * vista. Antes bastaba con estar en modo Speed Trial —el modo por
   * defecto—, así que la barra espaciadora dejaba de hacer scroll en toda
   * la página desde el primer render.
   */
  let panelOnScreen = false
  const interactivePanel = document.getElementById('kb-panel-interactive')
  if (interactivePanel && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => { panelOnScreen = entry.isIntersecting },
      { threshold: 0.35 },
    ).observe(interactivePanel)
  }

  window.addEventListener('keydown', (e) => {
    if (isForeignField(e.target) || activeMode === 'photos') return

    const insideArchive = (e.target as HTMLElement)?.closest('#archive') !== null
    const engaged = document.activeElement === monkeyBox
      || document.activeElement === sandbox.element
      || insideArchive
      || panelOnScreen

    /*
     * El tabulador nunca se bloquea: es la única forma de recorrer la
     * página con el teclado y no le pertenece a este widget.
     */
    if (engaged && (e.code === 'Space' || e.code === 'Backspace')) e.preventDefault()

    press(e.code, true)

    const printable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey ? e.key : ''
    dispatchKey(e.code, printable, true)
  })

  window.addEventListener('keyup', (e) => {
    if (isForeignField(e.target)) return
    press(e.code, false)
  })

  window.addEventListener('blur', () => keys.forEach((k) => k.classList.remove('is-down')))

  keys.forEach((el, code) => {
    const trigger = () => {
      press(code, true, el)
      dispatchKey(code, el.dataset.char ?? '', false)
    }
    const release = () => press(code, false, el)

    el.addEventListener('mousedown', trigger)
    el.addEventListener('mouseup', release)
    el.addEventListener('mouseleave', release)
    el.addEventListener('touchstart', (e) => { e.preventDefault(); trigger() }, { passive: false })
    el.addEventListener('touchend', release)
  })

  monkeyRestartBtn?.addEventListener('click', () => loadNewQuote())
  monkeyBox?.addEventListener('click', () => monkeyBox.focus())

  switchTypeBtn?.addEventListener('click', () => {
    const label = audio.nextProfile()
    switchTypeBtn.textContent = label
    sandbox.showProfile(label)
    audio.play()
  })

  soundToggle?.addEventListener('click', () => {
    audio.toggle()
    // Las dos etiquetas viajan en data-*: la traducción vive solo en i18n/ui.
    const label = soundToggle.dataset[audio.enabled ? 'on' : 'off']
    if (soundLabel && label) soundLabel.textContent = label
  })

  // Switcher de pestañas: Speed Trial vs Simulador vs Fotos
  const tabSpeed = document.getElementById('kb-tab-speed')
  const tabSim = document.getElementById('kb-tab-sim')
  const tabPhotos = document.getElementById('kb-tab-photos')
  const panelPhotos = document.getElementById('kb-panel-photos')

  /*
   * Patrón ARIA de pestañas completo: además del estado visual, el grupo
   * mantiene un único punto de tabulación y las flechas recorren los tres
   * modos, que es como un lector de pantalla espera navegar un `tablist`.
   */
  const setTabActive = (activeBtn: HTMLElement | null, inactiveBtns: (HTMLElement | null)[]) => {
    activeBtn?.classList.add('active')
    activeBtn?.setAttribute('aria-selected', 'true')
    activeBtn?.removeAttribute('tabindex')

    inactiveBtns.forEach((btn) => {
      btn?.classList.remove('active')
      btn?.setAttribute('aria-selected', 'false')
      btn?.setAttribute('tabindex', '-1')
    })
  }

  tabSpeed?.addEventListener('click', () => {
    activeMode = 'speed'
    setTabActive(tabSpeed, [tabSim, tabPhotos])
    interactivePanel?.classList.remove('hidden')
    panelPhotos?.classList.add('hidden')
    kbSpeedModeWrap?.classList.remove('hidden')
    kbFreeModeWrap?.classList.add('hidden')
    loadNewQuote()
  })

  tabSim?.addEventListener('click', () => {
    activeMode = 'sim'
    setTabActive(tabSim, [tabSpeed, tabPhotos])
    interactivePanel?.classList.remove('hidden')
    panelPhotos?.classList.add('hidden')
    kbSpeedModeWrap?.classList.add('hidden')
    kbFreeModeWrap?.classList.remove('hidden')
    setKilluaSpeech(say('Modo libre activado. ¡Escribe lo que quieras para probar la acústica y el tacto!', 'Free sandbox mode active! Type anything to test switch sound and response!'))
    sandbox.showProfile(audio.label)
  })

  tabPhotos?.addEventListener('click', () => {
    activeMode = 'photos'
    setTabActive(tabPhotos, [tabSpeed, tabSim])
    interactivePanel?.classList.add('hidden')
    panelPhotos?.classList.remove('hidden')
  })

  const tabs = [tabSpeed, tabSim, tabPhotos].filter((tab): tab is HTMLElement => tab !== null)
  const TAB_STEPS: Record<string, (index: number) => number> = {
    ArrowLeft: (i) => i - 1,
    ArrowRight: (i) => i + 1,
    Home: () => 0,
    End: () => tabs.length - 1,
  }
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('keydown', (event) => {
      const step = TAB_STEPS[event.key]
      if (!step) return
      event.preventDefault()
      const next = tabs[(step(index) + tabs.length) % tabs.length]
      next.focus()
      next.click()
    })
  }

  loadNewQuote()
}

/* ---------------- Email: Copiar al portapapeles ---------------- */
function initMail() {
  const btn = document.getElementById('copy-mail') as HTMLButtonElement | null
  if (!btn) return

  const idleLabel = btn.dataset.label ?? 'Copiar email'
  const doneLabel = btn.dataset.done ?? '¡Copiado! ✓'
  const CONFIRM_CLASSES = ['border-[color:var(--cyan)]', 'text-[color:var(--cyan)]', 'shadow-[0_0_15px_rgba(111,227,255,0.35)]']
  const CONFIRM_MS = 2400

  /*
   * El icono y la etiqueta son dos nodos estables: confirmar la copia solo
   * cambia su texto. Antes se reescribía el HTML del botón interpolando la
   * etiqueta, y dos clics seguidos dejaban dos temporizadores compitiendo
   * por restaurarlo.
   */
  const icon = document.createElement('span')
  const label = document.createElement('span')
  const setState = (glyph: string, text: string) => {
    icon.textContent = glyph
    label.textContent = text
  }
  setState('📋', idleLabel)
  btn.replaceChildren(icon, label)
  btn.hidden = false

  let resetTimer: number | undefined
  btn.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard) return
      await navigator.clipboard.writeText(btn.dataset.mail ?? '')
    } catch {
      // Sin permiso de portapapeles no se confirma nada: el enlace mailto
      // sigue al lado y decir "copiado" sin haber copiado sería mentir.
      return
    }

    setState('✓', doneLabel)
    btn.classList.add(...CONFIRM_CLASSES)

    window.clearTimeout(resetTimer)
    resetTimer = window.setTimeout(() => {
      setState('📋', idleLabel)
      btn.classList.remove(...CONFIRM_CLASSES)
    }, CONFIRM_MS)
  })
}

/* ---------------- Reloj de hora local de Barcelona ---------------- */

/**
 * La abreviatura de zona y el desfase UTC estaban escritos a mano como
 * "CEST" y "UTC+2", que solo son ciertos media parte del año. Los dos salen
 * ahora de la propia zona horaria, así que no pueden contradecirse entre sí
 * ni con la hora que acompañan.
 */
function initClock() {
  const clock = document.getElementById('local-time')
  const offset = document.getElementById('local-offset')
  if (!clock) return

  const TIME_ZONE = 'Europe/Madrid'
  let time: Intl.DateTimeFormat
  let zone: Intl.DateTimeFormat
  let utcOffset: Intl.DateTimeFormat
  try {
    // Construir un formateador es caro: se hace una vez, no una vez por segundo.
    const at = (extra: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat('es-ES', { timeZone: TIME_ZONE, ...extra })
    time = at({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    zone = at({ timeZoneName: 'short' })        // CET en invierno, CEST en verano
    utcOffset = at({ timeZoneName: 'shortOffset' }) // GMT+1 / GMT+2
  } catch {
    clock.textContent = 'Barcelona, Spain'
    return
  }

  /** El nombre de zona llega mezclado con la fecha; solo interesa esa parte. */
  const zoneNameFrom = (format: Intl.DateTimeFormat, now: Date) =>
    format.formatToParts(now).find((p) => p.type === 'timeZoneName')?.value ?? ''

  const update = () => {
    const now = new Date()
    clock.textContent = `${time.format(now)} ${zoneNameFrom(zone, now)} · Barcelona`
    if (offset) offset.textContent = zoneNameFrom(utcOffset, now).replace('GMT', 'UTC')
  }

  /*
   * Un reloj que nadie mira no tiene por qué despertar la pestaña cada
   * segundo: se detiene al ocultarla y se pone en hora al volver, así que
   * lo que se ve es siempre correcto y en segundo plano no cuesta nada.
   */
  let timer: number | null = null
  const stop = () => {
    if (timer !== null) window.clearInterval(timer)
    timer = null
  }
  const start = () => {
    update()
    if (timer === null) timer = window.setInterval(update, 1000)
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()))
  start()
}

/* ---------------- Contacto: señal escrita al entrar en pantalla ---------------- */
function initContactSignal() {
  const target = document.querySelector<HTMLElement>('[data-contact-type]')
  if (!target) return

  const message = target.dataset.contactMessage ?? target.textContent ?? ''
  if (reduce) return

  let hasPlayed = false
  const play = () => {
    if (hasPlayed) return
    hasPlayed = true
    target.textContent = ''
    let index = 0
    const type = () => {
      target.textContent += message[index] ?? ''
      index += 1
      if (index < message.length) window.setTimeout(type, 24)
    }
    type()
  }

  new IntersectionObserver((entries, observer) => {
    if (entries[0]?.isIntersecting) {
      play()
      observer.disconnect()
    }
  }, { threshold: 0.45 }).observe(target)
}

/* ---------------- Easter Egg: Killua Mini-Game Platformer ---------------- */

/**
 * El platformer es la pieza más pesada del sitio y solo la ve quien la
 * busca, así que viaja en su propio chunk y se descarga con el primer
 * intento de abrirlo. El resto de la página no paga su peso.
 */
function initGameMode() {
  let gameRunning = false

  const launch = async () => {
    if (gameRunning) return
    gameRunning = true
    try {
      const { startGameMode } = await import('./game-mode')
      startGameMode(() => { gameRunning = false })
    } catch {
      // Si el chunk no llega, el portfolio sigue intacto: solo falta el juego.
      gameRunning = false
    }
  }

  for (const id of ['gm-trigger', 'nav-game-btn']) {
    document.getElementById(id)?.addEventListener('click', () => void launch())
  }

  window.addEventListener('keydown', (e) => {
    // Permite atajo Alt+G, Ctrl+G o Cmd+G
    if ((e.altKey || e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g' && !gameRunning) {
      e.preventDefault()
      void launch()
    }
  })
}

// Inicialización de todas las capas
revealOnScroll({ reduce, rootMargin: '0px 0px -6% 0px', threshold: 0.04 })
initHeader()
initTypewriter()
initPortrait()
initJobList()
initProjectCarousel()
initProjectDeck()
initProfileWorkbench()
initEducationSlider()
initCertsSlider()
initMomentCards()
initKeyboard()
initKeyboardBuildExplorer()
initMail()
initClock()
initContactSignal()
initGameMode()

export {}
