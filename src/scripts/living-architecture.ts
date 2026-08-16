/**
 * Living Architecture — el elemento WOW de la V2.
 *
 * Un sistema que se ensambla: los nodos entran por capas, las aristas se
 * dibujan entre ellos y los paquetes de datos empiezan a circular. El
 * cursor ejerce atracción sobre los nodos cercanos y enciende las rutas
 * que pasan por ellos.
 *
 * Regla del WOW: aquí no se dibuja ni un solo texto que queramos
 * posicionar. El H1, el posicionamiento y la navegación son HTML de
 * Astro; esto es decoración encima. El canvas va aria-hidden.
 *
 * Coste controlado: pausa con document.hidden y fuera de viewport, y con
 * prefers-reduced-motion pinta un fotograma estático y no arranca el
 * bucle.
 */

type Node = {
  id: string
  layer: number
  slot: number
  /** Posición objetivo en coordenadas normalizadas 0..1 */
  tx: number
  ty: number
  /** Posición actual (animada desde el origen del ensamblaje) */
  x: number
  y: number
  r: number
  delay: number
  /** Desplazamiento por proximidad del cursor */
  ox: number
  oy: number
  energy: number
}

type Edge = { from: number; to: number; delay: number }
type Packet = { edge: number; t: number; speed: number }

const LAYERS: Array<{ id: string; nodes: string[] }> = [
  { id: 'client', nodes: ['browser', 'mobile'] },
  { id: 'frontend', nodes: ['ui'] },
  { id: 'api', nodes: ['gateway'] },
  { id: 'service', nodes: ['svc-a', 'svc-b'] },
  { id: 'worker', nodes: ['batch', 'queue'] },
  { id: 'data', nodes: ['db', 'cache'] },
]

const CONNECTIONS: Array<[string, string]> = [
  ['browser', 'ui'],
  ['mobile', 'ui'],
  ['ui', 'gateway'],
  ['gateway', 'svc-a'],
  ['gateway', 'svc-b'],
  ['svc-a', 'queue'],
  ['svc-b', 'batch'],
  ['svc-a', 'db'],
  ['svc-b', 'db'],
  ['queue', 'batch'],
  ['batch', 'db'],
  ['svc-a', 'cache'],
]

const ACCENT = [0, 255, 136] as const

export function initLivingArchitecture(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ---------- Construcción del grafo ---------- */
  const nodes: Node[] = []
  const index = new Map<string, number>()

  LAYERS.forEach((layer, li) => {
    const count = layer.nodes.length
    layer.nodes.forEach((id, si) => {
      // Reparto horizontal por capa; las capas con un solo nodo se centran.
      const tx = count === 1 ? 0.5 : 0.5 + (si - (count - 1) / 2) * 0.26
      const ty = 0.1 + (li / (LAYERS.length - 1)) * 0.8
      index.set(id, nodes.length)
      nodes.push({
        id,
        layer: li,
        slot: si,
        tx,
        ty,
        x: tx,
        y: ty,
        r: count === 1 ? 9 : 7,
        delay: li * 130 + si * 70,
        ox: 0,
        oy: 0,
        energy: 0,
      })
    })
  })

  const edges: Edge[] = CONNECTIONS.map(([a, b]) => {
    const from = index.get(a)!
    const to = index.get(b)!
    return { from, to, delay: Math.max(nodes[from].delay, nodes[to].delay) + 220 }
  })

  const packets: Packet[] = edges.map((_, i) => ({
    edge: i,
    t: Math.random(),
    speed: 0.0022 + Math.random() * 0.0026,
  }))

  /* ---------- Estado ---------- */
  let w = 0
  let h = 0
  let dpr = 1
  let start = performance.now()
  let raf: number | null = null
  let running = false
  const pointer = { x: -1, y: -1, active: false }

  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = rect.width
    h = rect.height
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const px = (n: Node) => n.x * w + n.ox
  const py = (n: Node) => n.y * h + n.oy

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

  /** Curva suave entre dos nodos: da sensación de cableado, no de caja. */
  const edgePath = (a: Node, b: Node) => {
    const ax = px(a)
    const ay = py(a)
    const bx = px(b)
    const by = py(b)
    const mid = (ay + by) / 2
    return { ax, ay, bx, by, c1x: ax, c1y: mid, c2x: bx, c2y: mid }
  }

  const pointOnEdge = (e: Edge, t: number) => {
    const p = edgePath(nodes[e.from], nodes[e.to])
    const u = 1 - t
    const x =
      u * u * u * p.ax + 3 * u * u * t * p.c1x + 3 * u * t * t * p.c2x + t * t * t * p.bx
    const y =
      u * u * u * p.ay + 3 * u * u * t * p.c1y + 3 * u * t * t * p.c2y + t * t * t * p.by
    return { x, y }
  }

  const draw = (now: number) => {
    const elapsed = now - start
    ctx.clearRect(0, 0, w, h)

    // Ensamblaje: cada nodo viaja desde el centro hacia su posición.
    for (const n of nodes) {
      const p = reduce ? 1 : Math.min(Math.max((elapsed - n.delay) / 900, 0), 1)
      const e = easeOut(p)
      n.x = 0.5 + (n.tx - 0.5) * e
      n.y = 0.5 + (n.ty - 0.5) * e

      // Atracción del cursor: los nodos cercanos se acercan y se encienden.
      let target = 0
      if (pointer.active && !reduce) {
        const dx = pointer.x - n.x * w
        const dy = pointer.y - n.y * h
        const dist = Math.hypot(dx, dy)
        const reach = Math.min(w, h) * 0.28
        if (dist < reach) {
          const force = 1 - dist / reach
          target = force
          n.ox += (dx * force * 0.12 - n.ox) * 0.12
          n.oy += (dy * force * 0.12 - n.oy) * 0.12
        }
      }
      if (target === 0) {
        n.ox += (0 - n.ox) * 0.1
        n.oy += (0 - n.oy) * 0.1
      }
      n.energy += (target - n.energy) * 0.12
    }

    // Aristas
    for (const e of edges) {
      const p = reduce ? 1 : Math.min(Math.max((elapsed - e.delay) / 700, 0), 1)
      if (p <= 0) continue
      const a = nodes[e.from]
      const b = nodes[e.to]
      const path = edgePath(a, b)
      const heat = Math.max(a.energy, b.energy)

      ctx.beginPath()
      ctx.moveTo(path.ax, path.ay)
      ctx.bezierCurveTo(path.c1x, path.c1y, path.c2x, path.c2y, path.bx, path.by)
      ctx.strokeStyle = `rgba(${ACCENT[0]}, ${ACCENT[1]}, ${ACCENT[2]}, ${(0.09 + heat * 0.3) * p})`
      ctx.lineWidth = 1 + heat * 0.8
      ctx.stroke()
    }

    // Paquetes de datos recorriendo las rutas
    if (!reduce) {
      for (const pk of packets) {
        const e = edges[pk.edge]
        if (elapsed < e.delay + 500) continue
        pk.t += pk.speed
        if (pk.t > 1) pk.t -= 1
        const pt = pointOnEdge(e, pk.t)
        const heat = Math.max(nodes[e.from].energy, nodes[e.to].energy)
        const glow = 0.35 + heat * 0.5
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 1.9 + heat, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${ACCENT[0]}, ${ACCENT[1]}, ${ACCENT[2]}, ${glow})`
        ctx.fill()
      }
    }

    // Nodos
    for (const n of nodes) {
      const p = reduce ? 1 : Math.min(Math.max((elapsed - n.delay) / 900, 0), 1)
      if (p <= 0) continue
      const x = px(n)
      const y = py(n)
      const r = n.r * (0.6 + 0.4 * easeOut(p)) + n.energy * 3

      // Halo
      const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5)
      halo.addColorStop(0, `rgba(${ACCENT[0]}, ${ACCENT[1]}, ${ACCENT[2]}, ${(0.16 + n.energy * 0.3) * p})`)
      halo.addColorStop(1, 'rgba(0, 255, 136, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(x, y, r * 4.5, 0, Math.PI * 2)
      ctx.fill()

      // Núcleo
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = '#0d1117'
      ctx.fill()
      ctx.lineWidth = 1.4
      ctx.strokeStyle = `rgba(${ACCENT[0]}, ${ACCENT[1]}, ${ACCENT[2]}, ${(0.55 + n.energy * 0.45) * p})`
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(x, y, r * 0.34, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${ACCENT[0]}, ${ACCENT[1]}, ${ACCENT[2]}, ${(0.7 + n.energy * 0.3) * p})`
      ctx.fill()
    }

    if (running) raf = requestAnimationFrame(draw)
  }

  const play = () => {
    if (running || reduce) return
    running = true
    raf = requestAnimationFrame(draw)
  }
  const pause = () => {
    running = false
    if (raf !== null) cancelAnimationFrame(raf)
    raf = null
  }

  /* ---------- Entradas ---------- */
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect()
    pointer.x = e.clientX - rect.left
    pointer.y = e.clientY - rect.top
    pointer.active = true
  })
  canvas.addEventListener('pointerleave', () => {
    pointer.active = false
  })

  window.addEventListener('resize', () => {
    resize()
    if (!running) draw(performance.now())
  })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause()
    else play()
  })

  // Solo consume CPU mientras está a la vista.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) play()
        else pause()
      },
      { threshold: 0.05 },
    ).observe(canvas)
  } else {
    play()
  }

  resize()
  start = performance.now()
  draw(performance.now())
}
