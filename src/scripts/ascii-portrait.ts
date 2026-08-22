/**
 * Retrato ASCII — pieza visual interactiva del hero.
 *
 * Cada carácter es una partícula viva que entra desde el espacio,
 * respira orgánicamente, produce destellos eléctricos sutiles
 * (estilo Killua) y responde al cursor o toque apartándose con física elástica.
 *
 * Totalmente responsive para móviles, tablets y monitores grandes.
 */

const CHARS = ' .:-=+*#%@'.split('')
/** Puntero "en ninguna parte": lo bastante lejos para no repeler ninguna partícula. */
const OFFSCREEN = -9999
const ACCENT_BASE = [91, 155, 255] as const // --blue-bright
const ACCENT_GLOW = [111, 227, 255] as const // --cyan

type Particle = {
  x: number; y: number
  tx: number; ty: number
  vx: number; vy: number
  char: string
  alpha: number
  cur: number
  delay: number
  shimmer: number
  isSparkle: boolean
}

type ParticleRaw = {
  x: number; y: number
  char: string
  alpha: number
  isSparkle: boolean
}

const memoryCache: Record<number, ParticleRaw[]> = {}

/** Cuerpo del glifo según el lado del retrato. Lo usan el muestreo y el pintado. */
const fontFor = (size: number) => (size <= 230 ? 4.8 : size <= 280 ? 5.4 : size <= 320 ? 6.2 : 7.2)

const sizeFor = (w: number) => {
  if (w <= 400) return Math.min(210, Math.round(w - 56))
  if (w <= 520) return 230
  if (w <= 768) return 260
  if (w <= 1024) return 300
  return 340
}

export function initAsciiPortrait(canvas: HTMLCanvasElement, src: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let size = sizeFor(window.innerWidth)
  let particles: Particle[] = []
  let start = 0
  let raf: number | null = null
  let running = false
  let ready = false
  const pointer = { x: OFFSCREEN, y: OFFSCREEN, tx: OFFSCREEN, ty: OFFSCREEN, active: false }

  /*
   * El puntero se anota en coordenadas de ventana y se traduce a coordenadas
   * del retrato dentro del bucle. Medir la caja del canvas en cada
   * `pointermove` obligaba a recalcular el diseño muchas más veces de las que
   * el navegador llega a pintar; ahora se mide una vez por fotograma, que es
   * la única frecuencia a la que el resultado se puede ver.
   */
  let pending: { x: number, y: number } | null = null

  const resolvePointer = () => {
    if (!pending) return
    const rect = canvas.getBoundingClientRect()
    pointer.tx = ((pending.x - rect.left) / rect.width) * size
    pointer.ty = ((pending.y - rect.top) / rect.height) * size
    /*
     * Al entrar en el retrato, el cursor no tiene posición anterior útil: viene
     * de fuera del canvas. Anclarlo al primer punto evita que la interpolación
     * arrastre la repulsión desde OFFSCREEN y hace que el vacío nazca bajo el
     * puntero, también al entrar desde abajo o por un lateral.
     */
    if (!pointer.active) {
      pointer.x = pointer.tx
      pointer.y = pointer.ty
    }
    pointer.active = true
    pending = null
  }

  const createParticlesFromRaw = (raw: ParticleRaw[]) => {
    return raw.map((p) => ({
      x: p.x + (Math.random() - 0.5) * (size * 0.7),
      y: p.y + (Math.random() - 0.5) * (size * 0.7),
      tx: p.x,
      ty: p.y,
      vx: 0,
      vy: 0,
      char: p.char,
      alpha: p.alpha,
      cur: 0,
      delay: Math.random() * 0.4,
      shimmer: Math.random() * Math.PI * 2,
      isSparkle: p.isSparkle,
    }))
  }

  /* ---------- Muestreo de la imagen ---------- */
  const build = (img: HTMLImageElement) => {
    if (memoryCache[size]) {
      particles = createParticlesFromRaw(memoryCache[size])
      ready = true
      start = performance.now()
      return
    }

    const off = document.createElement('canvas')
    off.width = size
    off.height = size
    const octx = off.getContext('2d')
    if (!octx) return

    // Encaje manteniendo proporción
    const scale = 0.94
    const aspect = img.width / img.height
    let dh = size * scale
    let dw = dh * aspect
    if (dw > size * scale) { dw = size * scale; dh = dw / aspect }
    octx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh)

    const data = octx.getImageData(0, 0, size, size).data
    const font = fontFor(size)
    const colGap = font * 0.62
    const rowGap = font * 1.05
    const rawList: ParticleRaw[] = []

    for (let y = 0; y < size; y += rowGap) {
      for (let x = 0; x < size; x += colGap) {
        const i = (Math.floor(y) * size + Math.floor(x)) * 4
        if (data[i + 3] < 128) continue
        const b = (data[i] + data[i + 1] + data[i + 2]) / 765

        // Curva para destacar pelo y silueta
        if (b < 0.34) continue
        const norm = (b - 0.34) / 0.66
        const weight = norm ** 1.4

        rawList.push({
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          char: CHARS[Math.min(CHARS.length - 1, Math.floor(norm * CHARS.length))],
          alpha: Number((0.2 + weight * 0.8).toFixed(3)),
          isSparkle: norm > 0.75 && Math.random() < 0.25,
        })
      }
    }

    memoryCache[size] = rawList
    particles = createParticlesFromRaw(rawList)
    ready = true
    start = performance.now()
  }

  /* ---------- Dibujo ---------- */
  const draw = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== Math.round(size * dpr)) {
      canvas.width = Math.round(size * dpr)
      canvas.height = Math.round(size * dpr)
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    ctx.clearRect(0, 0, size, size)
    if (!ready) { if (running) raf = requestAnimationFrame(draw); return }

    const t = (performance.now() - start) / 1000
    ctx.font = `${fontFor(size)}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    resolvePointer()
    pointer.x += (pointer.tx - pointer.x) * 0.18
    pointer.y += (pointer.ty - pointer.y) * 0.18

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const age = reduce ? 99 : t - p.delay
      if (age < 0) continue

      const fade = Math.min(age / 1.4, 1)
      const eased = 1 - (1 - fade) ** 2
      const settling = age < 3
      const alive = pointer.active || settling

      // Pulso orgánico y destellos eléctricos sutiles
      const breath = alive ? Math.sin(t * 2.2 + p.shimmer) * 0.1 : Math.sin(t * 1.2 + p.shimmer) * 0.05
      const sparkle = p.isSparkle && alive ? Math.max(0, Math.sin(t * 6 + p.shimmer * 2)) * 0.35 : 0
      p.cur = Math.max(0, Math.min(1, p.alpha * eased + breath + sparkle))

      if (reduce) {
        p.x = p.tx
        p.y = p.ty
      } else {
        // Repulsión elástica del puntero
        if (pointer.active) {
          const dx = p.x - pointer.x
          const dy = p.y - pointer.y
          const d = Math.hypot(dx, dy)
          const reach = size * 0.24
          if (d < reach && d > 0) {
            const f = ((1 - d / reach) ** 2) * 5.2
            p.vx += (dx / d) * f
            p.vy += (dy / d) * f
          }
        }

        // Atracción a la posición original
        const move = Math.min(age / 2.2, 1)
        const pull = 0.015 + (1 - (1 - move) ** 3) * 0.085
        p.vx += (p.tx - p.x) * pull
        p.vy += (p.ty - p.y) * pull

        if (alive) {
          p.vx += Math.sin(t * 0.6 + p.ty * 0.08) * 0.16
          p.vy += Math.cos(t * 0.6 + p.tx * 0.08) * 0.16
          p.vx *= 0.91
          p.vy *= 0.91
        } else {
          p.vx *= 0.84
          p.vy *= 0.84
          if (age > 3.5 && Math.abs(p.tx - p.x) < 0.05 && Math.abs(p.ty - p.y) < 0.05) {
            p.x = p.tx
            p.y = p.ty
            p.vx = 0
            p.vy = 0
          }
        }

        p.x += p.vx
        p.y += p.vy
      }

      const color = sparkle > 0.15 ? ACCENT_GLOW : ACCENT_BASE
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${p.cur.toFixed(3)})`
      ctx.fillText(p.char, p.x, p.y)
    }

    if (running) raf = requestAnimationFrame(draw)
  }

  /*
   * Se anima solo si está a la vez en pantalla y en una pestaña activa.
   * Hacen falta las dos condiciones: volver a la pestaña no debe reanudar
   * un canvas que entretanto quedó fuera de la ventana.
   */
  let onScreen = true
  const sync = () => {
    const shouldRun = onScreen && !document.hidden && !reduce
    if (shouldRun && !running) {
      running = true
      raf = requestAnimationFrame(draw)
    } else if (!shouldRun && running) {
      running = false
      if (raf !== null) cancelAnimationFrame(raf)
      raf = null
    }
  }

  /* ---------- Entradas de ratón y táctil ---------- */

  const releasePointer = () => {
    pending = null
    pointer.active = false
    pointer.tx = OFFSCREEN
    pointer.ty = OFFSCREEN
  }

  const trackAt = (x: number, y: number) => { pending = { x, y } }

  canvas.addEventListener('pointermove', (e) => trackAt(e.clientX, e.clientY), { passive: true })
  canvas.addEventListener('pointerleave', releasePointer, { passive: true })
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) trackAt(e.touches[0].clientX, e.touches[0].clientY)
  }, { passive: true })
  canvas.addEventListener('touchend', releasePointer, { passive: true })

  const img = new Image()
  img.decoding = 'async'
  img.src = src
  img.onload = () => {
    build(img)
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    if (reduce) {
      // Sin movimiento: un único fotograma con las partículas ya asentadas.
      draw()
      return
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting
        sync()
      }, { threshold: 0.05 }).observe(canvas)
    }
    sync()
  }

  let resizeTimer: number | null = null
  window.addEventListener('resize', () => {
    if (resizeTimer !== null) clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      const next = sizeFor(window.innerWidth)
      if (next === size) return
      size = next
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
      if (!img.complete) return
      build(img)
      /* Con el bucle parado —"reduce motion"— nadie va a repintar el retrato
         al nuevo tamaño, así que la reconstrucción se queda sin pintar y el
         navegador escala el bitmap anterior. Un fotograma basta. */
      if (!running) draw()
    }, 100)
  })

  document.addEventListener('visibilitychange', sync)
}
