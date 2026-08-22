/**
 * Movimiento de Killua: el trozo del juego que es solo aritmética.
 *
 * Vive aparte del bucle porque es lo único que se puede comprobar sin canvas
 * ni ventana. Todo lo que entra son números y todo lo que sale son números:
 * ni lee el DOM, ni pinta, ni guarda estado entre llamadas. El bucle sigue
 * decidiendo *cuándo* aplicar cada cosa; aquí solo está el *cuánto*.
 *
 * Las constantes están calibradas a mano y son la razón de que el salto se
 * sienta como se siente: cambiarlas cambia el juego, así que viven aquí y no
 * repartidas por el bucle.
 */

/** Caja del personaje, en píxeles del propio juego. */
export const BODY = { width: 28, height: 62 }

export const PHYSICS = {
  gravity: 0.40,
  jumpForce: -8.8,
  doubleJumpForce: -8.4,
  /** Soltar el salto a media subida lo recorta: da control sobre la altura. */
  jumpCut: 0.45,
  maxRun: 3.0,
  maxRunGodspeed: 4.4,
  accelGround: 0.52,
  accelAir: 0.28,
  frictionGround: 0.85,
  frictionAir: 0.94,
  maxFall: 9.0,
  fastFall: 12.0,
  /** Margen para saltar justo después de dejar el borde. */
  coyoteMs: 140,
  /** Margen para pulsar salto justo antes de aterrizar. */
  bufferMs: 140,
} as const

/** Multiplicador de aceleración en suelo con el aura activa. */
const GODSPEED_GROUND_BOOST = 1.3

export type Horizontal = {
  left: boolean
  right: boolean
  grounded: boolean
  godspeed: boolean
  /** Fotogramas de 60 Hz transcurridos: normaliza monitores más rápidos. */
  frameScale: number
}

/**
 * Velocidad horizontal del siguiente fotograma.
 *
 * Sin dirección pulsada la velocidad se frena por rozamiento, y el rozamiento
 * se eleva a `frameScale` en lugar de multiplicarse: a 144 Hz un frenado lineal
 * dejaría al personaje resbalando el doble que a 60 Hz.
 */
export function nextVelocityX(vx: number, input: Horizontal): number {
  const { left, right, grounded, godspeed, frameScale } = input
  const maxRun = godspeed ? PHYSICS.maxRunGodspeed : PHYSICS.maxRun
  const accel = grounded
    ? (godspeed ? PHYSICS.accelGround * GODSPEED_GROUND_BOOST : PHYSICS.accelGround)
    : PHYSICS.accelAir

  if (left) return Math.max(vx - accel * frameScale, -maxRun)
  if (right) return Math.min(vx + accel * frameScale, maxRun)
  return vx * Math.pow(grounded ? PHYSICS.frictionGround : PHYSICS.frictionAir, frameScale)
}

export type Vertical = {
  godspeed: boolean
  jumpHeld: boolean
  fastFallHeld: boolean
  frameScale: number
}

/**
 * Velocidad vertical del siguiente fotograma.
 *
 * Con el aura activa y el salto mantenido, la gravedad se reduce a la mitad
 * mientras se cae: es lo que convierte el Godspeed en planeo y no solo en
 * correr más.
 */
export function nextVelocityY(vy: number, input: Vertical): number {
  const { godspeed, jumpHeld, fastFallHeld, frameScale } = input
  const floating = godspeed && jumpHeld && vy > 0
  const gravity = floating ? PHYSICS.gravity * 0.5 : PHYSICS.gravity
  const limit = fastFallHeld ? PHYSICS.fastFall : PHYSICS.maxFall
  return Math.min(vy + gravity * frameScale, limit)
}

/** Recorte del salto al soltar la tecla durante la subida. */
export function cutJump(vy: number, jumpHeld: boolean): number {
  const rising = vy < 0 && vy > PHYSICS.jumpForce * 0.9
  return !jumpHeld && rising ? vy * PHYSICS.jumpCut : vy
}

/** El personaje no se sale de la ventana: topa y pierde el impulso. */
export function clampToStage(x: number, vx: number, stageWidth: number) {
  if (x < 0) return { x: 0, vx: 0 }
  if (x + BODY.width > stageWidth) return { x: stageWidth - BODY.width, vx: 0 }
  return { x, vx }
}

/**
 * ¿Aterriza este fotograma sobre la repisa?
 *
 * Compara con la posición del fotograma anterior y no solo con la actual: a
 * velocidad de caída alta el personaje pasa de estar encima a estar debajo sin
 * que ningún fotograma lo pille dentro de la plataforma.
 *
 * `inset` es cuánto se estrecha la repisa por cada lado antes de considerarla
 * pisable. Cada tipo usa el suyo —las del DOM son elementos reales y perdonan
 * menos que las dibujadas— y era la única diferencia entre tres comprobaciones
 * por lo demás idénticas.
 */
export function landsOn(
  body: { x: number, y: number, vy: number },
  ledge: { x: number, y: number, w: number },
  frameScale: number,
  inset: number,
): boolean {
  const bottom = body.y + BODY.height
  const previousBottom = bottom - body.vy * frameScale
  return body.x + BODY.width > ledge.x + inset
    && body.x < ledge.x + ledge.w - inset
    && previousBottom <= ledge.y + 6
    && bottom >= ledge.y - 2
}

/** Cuánto se estrecha cada tipo de repisa antes de contarla como suelo. */
export const LEDGE_INSET = { moving: 2, custom: 3, dom: 4 } as const
