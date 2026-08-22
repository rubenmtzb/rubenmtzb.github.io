/**
 * Killua's movement: the part of the game that is only arithmetic.
 *
 * It lives apart from the loop because it is the only piece that can be checked
 * without a canvas or a window. Everything going in is numbers and everything
 * coming out is numbers: it reads no DOM, paints nothing and keeps no state
 * between calls. The loop still decides *when* to apply each thing; only the
 * *how much* lives here.
 *
 * The constants are hand-calibrated and they are the reason the jump feels the
 * way it feels: changing them changes the game, so they live here rather than
 * scattered through the loop.
 */

/** The character's box, in the game's own pixels. */
export const BODY = { width: 28, height: 62 }

export const PHYSICS = {
  gravity: 0.40,
  jumpForce: -8.8,
  doubleJumpForce: -8.4,
  /** Releasing jump mid-rise cuts it short: it gives control over height. */
  jumpCut: 0.45,
  maxRun: 3.0,
  maxRunGodspeed: 4.4,
  accelGround: 0.52,
  accelAir: 0.28,
  frictionGround: 0.85,
  frictionAir: 0.94,
  maxFall: 9.0,
  fastFall: 12.0,
  /** Grace window for jumping just after leaving the edge. */
  coyoteMs: 140,
  /** Grace window for pressing jump just before landing. */
  bufferMs: 140,
} as const

/** Ground acceleration multiplier while the aura is active. */
const GODSPEED_GROUND_BOOST = 1.3

export type Horizontal = {
  left: boolean
  right: boolean
  grounded: boolean
  godspeed: boolean
  /** Elapsed 60 Hz frames: normalises faster monitors. */
  frameScale: number
}

/**
 * Horizontal velocity for the next frame.
 *
 * With no direction held, friction slows the character down, and friction is
 * raised to `frameScale` instead of multiplied by it: at 144 Hz a linear
 * slowdown would leave him sliding twice as far as at 60 Hz.
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
 * Vertical velocity for the next frame.
 *
 * With the aura active and jump held, gravity is halved while falling: that is
 * what turns Godspeed into a glide and not just into running faster.
 */
export function nextVelocityY(vy: number, input: Vertical): number {
  const { godspeed, jumpHeld, fastFallHeld, frameScale } = input
  const floating = godspeed && jumpHeld && vy > 0
  const gravity = floating ? PHYSICS.gravity * 0.5 : PHYSICS.gravity
  const limit = fastFallHeld ? PHYSICS.fastFall : PHYSICS.maxFall
  return Math.min(vy + gravity * frameScale, limit)
}

/** How much the jump is cut when the key is released while rising. */
export function cutJump(vy: number, jumpHeld: boolean): number {
  const rising = vy < 0 && vy > PHYSICS.jumpForce * 0.9
  return !jumpHeld && rising ? vy * PHYSICS.jumpCut : vy
}

/** The character never leaves the viewport: he hits the edge and loses momentum. */
export function clampToStage(x: number, vx: number, stageWidth: number) {
  if (x < 0) return { x: 0, vx: 0 }
  if (x + BODY.width > stageWidth) return { x: stageWidth - BODY.width, vx: 0 }
  return { x, vx }
}

/**
 * Does this frame land on the ledge?
 *
 * It compares against the previous frame's position and not only the current
 * one: at high falling speed the character goes from above to below without any
 * single frame catching him inside the platform.
 *
 * `inset` is how much the ledge narrows on each side before it counts as
 * steppable. Each kind uses its own — the DOM ones are real elements and
 * forgive less than the drawn ones — and it was the only difference between
 * three otherwise identical checks.
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

/** How much each kind of ledge narrows before it counts as ground. */
export const LEDGE_INSET = { moving: 2, custom: 3, dom: 4 } as const
