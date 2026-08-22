/* Moment cards: arrastrables, volteables en 3D y con física de lanzamiento. */
import { clamp } from './dom'

export function initMomentCards() {
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

  /*
   * Safari y Chromium pueden iniciar el arrastre nativo de una fotografía
   * antes de que la tarjeta supere su umbral. Ese gesto compite con Pointer
   * Events y deja moviéndose la imagen fantasma en vez de la carta completa.
   */
  stage.addEventListener('dragstart', (event) => event.preventDefault())

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
      try { card.setPointerCapture(e.pointerId) } catch { /* La captura mejora el gesto, pero no debe abortarlo. */ }
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
