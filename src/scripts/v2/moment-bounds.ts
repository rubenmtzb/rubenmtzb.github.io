/**
 * How far a moment card may travel and still stay inside its stage.
 *
 * The cards are centred in the stage and then translated. The limit is the
 * free gap around the *painted* box — rotation grows the AABB — so a slow
 * drag and a flick bounce against the same numbers. A hardcoded 160 px let
 * a 340 px card walk out of a 420 px stage; this is that arithmetic, alone.
 */

export type CardBox = {
  width: number
  height: number
  stageWidth: number
  stageHeight: number
}

export type Travel = { x: number; y: number }

/** How much of the stage the rotated card actually paints. */
export function paintedBox(width: number, height: number, rotation: number) {
  const radians = Math.abs(rotation % 180) * Math.PI / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  }
}

/**
 * Max |x| and |y| the card's centre may travel.
 *
 * `pad` is a small inset so the glow does not sit flush on the stage edge.
 */
export function travelLimit(box: CardBox, rotation: number, pad = 8): Travel {
  const painted = paintedBox(box.width, box.height, rotation)
  return {
    x: Math.max(0, (box.stageWidth - painted.width) / 2 - pad),
    y: Math.max(0, (box.stageHeight - painted.height) / 2 - pad),
  }
}

export function confine(x: number, y: number, limit: Travel) {
  return {
    x: Math.max(-limit.x, Math.min(limit.x, x)),
    y: Math.max(-limit.y, Math.min(limit.y, y)),
  }
}

/** One axis of a bounce: the position is clipped and the velocity flips. */
export function bounceAxis(pos: number, vel: number, limit: number, bounce: number) {
  if (pos > limit) return { pos: limit, vel: -vel * bounce }
  if (pos < -limit) return { pos: -limit, vel: -vel * bounce }
  return { pos, vel }
}

/**
 * Whether a pointer sits on the painted rectangle, not on its AABB.
 *
 * CSS `rotate` is clockwise. The AABB of a turned card is a larger box that
 * includes empty corners; those used to light a card the cursor was not on.
 */
export function pointInRotatedBox(
  px: number,
  py: number,
  cx: number,
  cy: number,
  width: number,
  height: number,
  rotationDeg: number,
) {
  const dx = px - cx
  const dy = py - cy
  const radians = rotationDeg * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const localX = dx * cos + dy * sin
  const localY = -dx * sin + dy * cos
  const slack = 1e-6
  return Math.abs(localX) <= width / 2 + slack && Math.abs(localY) <= height / 2 + slack
}
