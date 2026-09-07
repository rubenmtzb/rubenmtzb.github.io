/* Moment cards: draggable, flippable in 3D and with toss physics. */
import { clamp } from './dom'
import { bounceAxis, confine, pointInRotatedBox, travelLimit, type CardBox } from './moment-bounds'

export function initMomentCards() {
  const stage = document.getElementById('moments-stage')
  if (!stage) return

  /* Constants of the toss physics, hand-calibrated. */
  const DRAG_THRESHOLD_PX = 4      // below this it is a click, not a drag
  const FLICK_WINDOW_MS = 120      // final stretch of the gesture that sets the velocity
  const FLICK_MIN_SPEED = 1.2      // below this the card settles instead of flying
  const THROW_BOOST = 1.35
  const MAX_THROW_SPEED = 28
  const MAX_SPIN = 3.5
  const FRICTION = 0.92
  const SPIN_FRICTION = 0.93
  const BOUNCE = 0.45
  const REST_SPEED = 0.15          // below this it counts as stopped
  const MOBILE_SCALE = 0.42        // el abanico se cierra en pantallas estrechas

  const cards = Array.from(stage.querySelectorAll<HTMLElement>('.moment-card'))
  const resetBtn = document.getElementById('moments-reset-btn')
  let highestZ = 20
  /** The single card currently showing its back on desktop hover. */
  let peeked: HTMLElement | null = null

  /*
   * Safari and Chromium can start a photograph's native drag before the card
   * crosses its own threshold. That gesture competes with Pointer Events and
   * leaves the ghost image moving instead of the whole card.
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
      z: 10,
      w: 0,
      h: 0,
    }
  })

  const maxOriginX = Math.max(1, ...cardStates.map((state) => Math.abs(state.origX)))
  cardStates.forEach((st, i) => {
    st.z = 10 + i
    st.el.style.zIndex = String(st.z)
  })

  /**
   * The box of a card and of the stage holding it.
   *
   * Neither changes while a gesture lasts — rotating and translating do not
   * affect flow — so both are measured once at the start and the rest of the
   * drag and the toss works off those numbers. Measuring inside the loop forced
   * a layout recalculation on every frame and for every card.
   */
  const measure = (card: HTMLElement): CardBox => ({
    width: card.offsetWidth,
    height: card.offsetHeight,
    stageWidth: stage.clientWidth,
    stageHeight: stage.clientHeight,
  })

  const place = (x: number, y: number, box: CardBox, rotation: number) =>
    confine(x, y, travelLimit(box, rotation))

  let hoverPeek: HTMLElement | null = null
  let focusPeek: HTMLElement | null = null

  const setPeeked = (card: HTMLElement | null) => {
    if (peeked === card) return
    peeked?.classList.remove('is-peeked')
    peeked = card
    peeked?.classList.add('is-peeked')
  }

  const syncPeek = () => setPeeked(hoverPeek || focusPeek)

  /**
   * Painted rectangle, not the AABB. The outer card only translates and
   * rotates in Z, so this stays valid while the inner face spins in Y.
   */
  const pointOnCard = (st: (typeof cardStates)[number], x: number, y: number) => {
    const box = st.el.getBoundingClientRect()
    const width = st.w > 0 ? st.w : box.width
    const height = st.h > 0 ? st.h : box.height
    if (width === 0 || height === 0) return false
    return pointInRotatedBox(
      x,
      y,
      (box.left + box.right) / 2,
      (box.top + box.bottom) / 2,
      width,
      height,
      st.rot,
    )
  }

  const topmostAt = (x: number, y: number) => {
    let top: HTMLElement | null = null
    let topZ = -Infinity
    for (const st of cardStates) {
      if (!pointOnCard(st, x, y)) continue
      if (st.z >= topZ) {
        topZ = st.z
        top = st.el
      }
    }
    return top
  }

  // Apply the adaptive starting position for the screen's width
  const applyLayout = () => {
    hoverPeek = null
    setPeeked(null)
    const isMobile = window.innerWidth <= 768

    /* Everything is measured first and written afterwards: interleaving reads
       and writes forced one layout recalculation per card. */
    const boxes = cardStates.map((st) => measure(st.el))
    const mobileBounds = boxes[0] ? travelLimit(boxes[0], 0) : { x: 0, y: 0 }
    const scaleFactor = isMobile ? Math.min(MOBILE_SCALE, mobileBounds.x / maxOriginX) : 1

    cardStates.forEach((st, index) => {
      if (st.animId) cancelAnimationFrame(st.animId)
      const at = place(
        isMobile ? st.origX * scaleFactor : st.origX,
        isMobile ? st.origY * scaleFactor : st.origY,
        boxes[index],
        st.origRot,
      )
      st.x = at.x
      st.y = at.y
      st.rot = st.origRot
      st.vx = 0
      st.vy = 0
      st.rotVel = 0
      st.w = boxes[index].width
      st.h = boxes[index].height
      if (!isMobile) st.el.classList.remove('is-flipped', 'is-peeked')
      st.el.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) rotate(${st.rot}deg)`
    })
    if (focusPeek) syncPeek()
  }

  applyLayout()

  /*
   * `applyLayout` measures every card, so during a continuous resize it cost
   * one reflow per event. It is now batched into a frame: the result is
   * identical and the work becomes one pass per frame.
   */
  let layoutFrame: number | null = null
  window.addEventListener('resize', () => {
    if (layoutFrame !== null) return
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = null
      applyLayout()
    })
  }, { passive: true })

  /*
   * The window listener is what keeps a peeked card stable through the 3D
   * flip — hit-testing on the stage itself falls through at 90°. It must
   * not measure every card on every move across the rest of the page:
   * skip while the deck is off-screen, and skip while the pointer is
   * outside the stage's box.
   */
  let stageOnScreen = true
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        stageOnScreen = entry.isIntersecting
        if (!stageOnScreen) {
          hoverPeek = null
          syncPeek()
        }
      },
      { threshold: 0 },
    ).observe(stage)
  }

  let dragLock = 0
  const pointInStage = (x: number, y: number) => {
    const box = stage.getBoundingClientRect()
    if (box.width === 0) return true
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || window.innerWidth <= 768) return
    if ((event.buttons ?? 0) !== 0 || dragLock > 0) return
    if (!stageOnScreen) return
    const x = event.clientX
    const y = event.clientY
    const hovered = hoverPeek && cardStates.find((st) => st.el === hoverPeek)
    if (hovered && pointOnCard(hovered, x, y)) return
    if (!pointInStage(x, y)) {
      hoverPeek = null
      syncPeek()
      return
    }
    hoverPeek = topmostAt(x, y)
    syncPeek()
  }, { passive: true })

  cardStates.forEach((st) => {
    const card = st.el
    let isDragging = false
    let startPointerX = 0
    let startPointerY = 0
    let startCardX = 0
    let startCardY = 0
    /** Rotation when the gesture began: the working one derives from it, never from itself. */
    let startCardRot = 0
    let hasMoved = false
    /** Measurement of the gesture in flight: taken on pointer down and never repeated. */
    let box: CardBox = measure(card)

    type PosSample = { x: number; y: number; time: number }
    let pointerHistory: PosSample[] = []

    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      if (st.animId) cancelAnimationFrame(st.animId)

      isDragging = true
      dragLock++
      hasMoved = false
      box = measure(card)
      startPointerX = e.clientX
      startPointerY = e.clientY
      startCardX = st.x
      startCardY = st.y
      startCardRot = st.rot
      pointerHistory = [{ x: e.clientX, y: e.clientY, time: performance.now() }]

      card.classList.remove('is-flying')
      hoverPeek = null
      setPeeked(null)
      try { card.setPointerCapture(e.pointerId) } catch { /* Capture improves the gesture, but must never abort it. */ }
    })

    card.addEventListener('pointermove', (e) => {
      if (!isDragging) return
      const dx = e.clientX - startPointerX
      const dy = e.clientY - startPointerY

      if (!hasMoved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        hasMoved = true
        highestZ += 2
        st.z = highestZ
        card.style.zIndex = String(st.z)
        card.classList.add('is-dragging')
      }

      if (hasMoved) {
        const isNarrow = window.innerWidth <= 768
        /*
         * The tilt is always computed from the gesture's initial rotation and
         * stored in the state. It used to live only in the drag's transform, so
         * releasing without momentum snapped the card back to its original
         * angle.
         */
        st.rot = isNarrow
          ? clamp(startCardRot + dx * 0.1, 16)
          : startCardRot + clamp(dx * 0.1, 16)
        const at = place(startCardX + dx, startCardY + dy, box, st.rot)
        st.x = at.x
        st.y = at.y

        const now = performance.now()
        pointerHistory.push({ x: e.clientX, y: e.clientY, time: now })
        if (pointerHistory.length > 5) pointerHistory.shift()

        card.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) rotate(${st.rot}deg)`
      }
    })

    const endDrag = (e: PointerEvent) => {
      if (!isDragging) return
      isDragging = false
      dragLock = Math.max(0, dragLock - 1)
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

      // Thrown hard enough to carry momentum
      if (hasMoved && speed > FLICK_MIN_SPEED) {
        card.classList.add('is-flying')
        st.vx = clamp(vx * THROW_BOOST, MAX_THROW_SPEED)
        st.vy = clamp(vy * THROW_BOOST, MAX_THROW_SPEED)
        st.rotVel = clamp(st.vx * 0.18, MAX_SPIN)

        /* The whole flight resolves off the gesture's measurement: inside the
           loop nothing touches layout again, only the transform. Rotation
           still changes the painted box, so the limit is recomputed each
           frame from that same measurement. */
        const isNarrow = window.innerWidth <= 768

        const animateThrow = () => {
          st.x += st.vx
          st.y += st.vy
          st.rot += st.rotVel
          if (isNarrow) st.rot = clamp(st.rot, 16)

          st.vx *= FRICTION
          st.vy *= FRICTION
          st.rotVel *= SPIN_FRICTION

          const limit = travelLimit(box, st.rot)
          const bouncedX = bounceAxis(st.x, st.vx, limit.x, BOUNCE)
          st.x = bouncedX.pos
          if (bouncedX.vel !== st.vx) {
            st.vx = bouncedX.vel
            st.rotVel = -st.rotVel * 0.5
          }
          const bouncedY = bounceAxis(st.y, st.vy, limit.y, BOUNCE)
          st.y = bouncedY.pos
          st.vy = bouncedY.vel

          card.style.transform = `translate3d(${Math.round(st.x)}px, ${Math.round(st.y)}px, 0) rotate(${st.rot.toFixed(1)}deg)`

          if (Math.hypot(st.vx, st.vy) > REST_SPEED) {
            st.animId = requestAnimationFrame(animateThrow)
          } else {
            st.vx = 0
            st.vy = 0
            st.rotVel = 0
            const settled = place(st.x, st.y, box, st.rot)
            st.x = settled.x
            st.y = settled.y
            card.style.transform = `translate3d(${Math.round(st.x)}px, ${Math.round(st.y)}px, 0) rotate(${st.rot.toFixed(1)}deg)`
            card.classList.remove('is-flying')
          }
        }

        st.animId = requestAnimationFrame(animateThrow)
      } else {
        if (!hasMoved && window.innerWidth <= 768) card.classList.toggle('is-flipped')
        const settled = place(st.x, st.y, box, st.rot)
        st.x = settled.x
        st.y = settled.y
        card.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) rotate(${st.rot}deg)`
      }
      syncPeek()
    }

    card.addEventListener('pointerup', endDrag)
    card.addEventListener('pointercancel', endDrag)

    card.addEventListener('focus', () => {
      focusPeek = card
      syncPeek()
    })
    card.addEventListener('blur', () => {
      if (focusPeek === card) focusPeek = null
      syncPeek()
    })
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      event.stopPropagation()
      card.classList.toggle('is-flipped')
    })
  })

  // Button that rearranges the deck back to its original position
  resetBtn?.addEventListener('click', () => {
    applyLayout()
    highestZ = 20
    cardStates.forEach((st, i) => {
      st.z = 10 + i
      st.el.classList.remove('is-flying', 'is-dragging', 'is-flipped', 'is-peeked')
      st.el.style.zIndex = String(st.z)
    })
    syncPeek()
  })
}
