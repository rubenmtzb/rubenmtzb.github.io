/* Killua en pixel art: sprite, chispas y salto. */

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
export function createPixelKillua(canvas: HTMLCanvasElement | null): PixelKillua {
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
