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
  jumpForce: -9.6,
  doubleJumpForce: -9.2,
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

/**
 * Keep the sprite inside the visible stage, including its glow. Zero let him
 * rest flush against the viewport so a squash frame or a moving ledge could
 * paint him off-screen, which read as slipping through the side.
 */
export const STAGE_PAD = 10

/**
 * How far is too far.
 *
 * The page is full of DOM ledges, so falling past the last *drawn* platform is
 * not a death: he just lands on a heading further down and cannot climb back.
 * These two distances are what turn that softlock into a retry.
 */
export const PIT = {
  /** Falling this far without landing, with no aura to glide on. */
  freeFall: 420,
  /**
   * The current orb is this far above: the route was missed, even on the ground.
   * It has to be more than a single screen-shelf — Identity and Experience share
   * a viewport, and dying for stepping onto the heading below felt cheap.
   */
  missedOrb: 560,
  /** One tap of Down may skip a single ledge, not a whole section. */
  dropSafe: 160,
  /** A stair still under the feet means the route is there. */
  floorCatch: 200,
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
export function clampToStage(x: number, vx: number, stageWidth: number, pad = 0) {
  const min = pad
  const max = stageWidth - BODY.width - pad
  if (max <= min) {
    return { x: Math.max(0, (stageWidth - BODY.width) / 2), vx: 0 }
  }
  if (x < min) return { x: min, vx: 0 }
  if (x > max) return { x: max, vx: 0 }
  return { x, vx }
}

/**
 * A ledge that sits inside the stage, never hanging off a side.
 *
 * Rescue platforms used to be pinned to x=25 / w-110, which left a gap between
 * the wall and the ledge: walking to the edge was a fall that looked like
 * slipping through the screen.
 */
export function placeLedge(x: number, width: number, stageWidth: number, pad = STAGE_PAD) {
  const inner = Math.max(BODY.width + 8, stageWidth - pad * 2)
  const w = Math.min(width, inner)
  const min = pad
  const max = Math.max(min, stageWidth - w - pad)
  return { x: Math.max(min, Math.min(max, x)), w }
}

/**
 * Did this fall leave the route?
 *
 * Going step by step is the game: a tap of Down may skip one ledge, and a
 * stair still under the feet is not a pit. Launching a whole section — holding
 * Down through empty air, or landing far below the current orb — is a retry.
 * That speed brake is the point; it is not a false death.
 */
export function fellOffRoute(
  body: { y: number; grounded: boolean },
  route: {
    lastGroundY: number
    orbY: number | null
    godspeed: boolean
    dropping?: boolean
    floorBelow?: number | null
    reach?: number
  },
): boolean {
  const reach = route.reach ?? PIT.missedOrb
  const fallen = body.y - route.lastGroundY
  if (body.grounded && route.orbY !== null && route.orbY < body.y - reach) return true
  if (route.godspeed || body.grounded) return false
  if (route.dropping && fallen < PIT.dropSafe) return false
  if (route.floorBelow != null && route.floorBelow - (body.y + BODY.height) < PIT.floorCatch) return false
  return fallen > PIT.freeFall
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
