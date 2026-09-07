#!/usr/bin/env node
/**
 * Checks over Game Mode's movement.
 *
 * The platformer was the one thing on the site no verifier touched: it is drawn
 * on a canvas, and without a canvas it does not start. Its numeric half, on the
 * other hand, needs neither window nor canvas, so it lives apart and is checked
 * here.
 *
 * What is checked is not that the game "feels right" — that is the constants,
 * and they are calibrated by playing — but that the rules hold: that velocity
 * has a ceiling, that friction does not depend on the monitor's hertz, that
 * releasing jump cuts it short only while rising, and that a landing cannot slip
 * between two frames.
 */
import {
  BODY,
  LEDGE_INSET,
  PHYSICS,
  PIT,
  STAGE_PAD,
  clampToStage,
  cutJump,
  fellOffRoute,
  landsOn,
  nextVelocityX,
  nextVelocityY,
  placeLedge,
} from '../src/scripts/game/physics.ts'

let pass = 0
let fail = 0
const check = (cond, msg) => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`) }
  else { fail++; console.error(`  ✗ ${msg}`) }
}
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol

const run = (grounded = true, godspeed = false, frameScale = 1) =>
  ({ left: false, right: false, grounded, godspeed, frameScale })

console.log('\n· Running')
check(
  nextVelocityX(0, { ...run(), right: true }) === PHYSICS.accelGround,
  'starting from a standstill accelerates a full step',
)
let vx = 0
for (let i = 0; i < 200; i++) vx = nextVelocityX(vx, { ...run(), right: true })
check(vx === PHYSICS.maxRun, `velocity has a ceiling (${vx})`)
let vxAura = 0
for (let i = 0; i < 200; i++) vxAura = nextVelocityX(vxAura, { ...run(true, true), right: true })
check(vxAura === PHYSICS.maxRunGodspeed && vxAura > vx, 'with the aura the ceiling is higher')
check(
  nextVelocityX(-1, { ...run(), left: true }) >= -PHYSICS.maxRun,
  'the ceiling applies leftwards too',
)
check(
  nextVelocityX(1, { ...run(false), right: true }) - 1 === PHYSICS.accelAir
    && PHYSICS.accelAir < PHYSICS.accelGround,
  'in the air acceleration is lower than on the ground',
)

console.log('\n· Friction')
check(near(nextVelocityX(2, run()), 2 * PHYSICS.frictionGround), 'with no direction held, the ground slows him down')
check(
  near(nextVelocityX(2, run(false)), 2 * PHYSICS.frictionAir)
    && PHYSICS.frictionAir > PHYSICS.frictionGround,
  'the air slows him down less than the ground',
)
/*
 * The reason friction is raised to `frameScale` instead of multiplied by it: two
 * 60 Hz frames have to leave the same velocity as one 30 Hz frame, or the
 * character slides differently depending on the monitor.
 */
const dosPasos = nextVelocityX(nextVelocityX(3, run()), run())
const unPasoLargo = nextVelocityX(3, { ...run(true, false, 2) })
check(near(dosPasos, unPasoLargo), `the slowdown does not depend on hertz (${dosPasos.toFixed(6)})`)

console.log('\n· Jumping and falling')
check(
  cutJump(PHYSICS.jumpForce / 2, false) === (PHYSICS.jumpForce / 2) * PHYSICS.jumpCut,
  'releasing jump mid-rise cuts it short',
)
check(cutJump(PHYSICS.jumpForce / 2, true) === PHYSICS.jumpForce / 2, 'holding it down does not cut it')
check(cutJump(3, false) === 3, 'while falling there is nothing to cut')
check(
  cutJump(PHYSICS.jumpForce, false) === PHYSICS.jumpForce,
  'the initial impulse is not cut: the cut starts once past the launch',
)
let vy = 0
for (let i = 0; i < 200; i++) vy = nextVelocityY(vy, { godspeed: false, jumpHeld: false, fastFallHeld: false, frameScale: 1 })
check(vy === PHYSICS.maxFall, `the fall has a terminal velocity (${vy})`)
let vyFast = 0
for (let i = 0; i < 200; i++) vyFast = nextVelocityY(vyFast, { godspeed: false, jumpHeld: false, fastFallHeld: true, frameScale: 1 })
check(vyFast === PHYSICS.fastFall && vyFast > vy, 'holding down raises the falling limit')
check(
  near(
    nextVelocityY(2, { godspeed: true, jumpHeld: true, fastFallHeld: false, frameScale: 1 }) - 2,
    PHYSICS.gravity / 2,
  ),
  'with the aura and jump held, while falling, gravity is halved: he glides',
)
check(
  near(nextVelocityY(-2, { godspeed: true, jumpHeld: true, fastFallHeld: false, frameScale: 1 }) + 2, PHYSICS.gravity),
  'but while rising gravity is the normal one',
)

console.log('\n· Stage bounds')
check(clampToStage(-5, -3, 800).x === 0 && clampToStage(-5, -3, 800).vx === 0, 'the left edge stops him')
check(
  clampToStage(790, 3, 800).x === 800 - BODY.width && clampToStage(790, 3, 800).vx === 0,
  'the right edge stops him',
)
check(clampToStage(300, 2, 800).x === 300, 'in the middle nothing is touched')
check(
  clampToStage(-5, -3, 800, STAGE_PAD).x === STAGE_PAD
    && clampToStage(790, 3, 800, STAGE_PAD).x === 800 - BODY.width - STAGE_PAD,
  'a pad keeps the sprite off the glass',
)
const tucked = placeLedge(25, 85, 800)
check(tucked.x >= STAGE_PAD && tucked.x + tucked.w <= 800 - STAGE_PAD, 'a ledge never hangs off a side')
const overflow = placeLedge(-40, 200, 100)
check(overflow.x >= STAGE_PAD && overflow.x + overflow.w <= 100 - STAGE_PAD, 'on a narrow stage the ledge shrinks to fit')

console.log('\n· Falling off the route')
check(
  !fellOffRoute({ y: 100, grounded: true }, { lastGroundY: 100, orbY: 80, godspeed: false }),
  'on the route, standing still is not a death',
)
check(
  !fellOffRoute({ y: 500, grounded: true }, { lastGroundY: 500, orbY: 200, godspeed: false }),
  'a shelf below the orb, still climbable, is not a death',
)
check(
  fellOffRoute({ y: 720, grounded: true }, { lastGroundY: 720, orbY: 100, godspeed: false }),
  'landing a whole section below the orb is the speed brake',
)
check(
  !fellOffRoute({ y: 220, grounded: false }, { lastGroundY: 180, orbY: 100, godspeed: false }),
  'diving past an orb in the air is not a death until he lands',
)
check(
  fellOffRoute({ y: 550, grounded: false }, { lastGroundY: 100, orbY: 500, godspeed: false }),
  'a long drop with no landing is a pit',
)
check(
  !fellOffRoute({ y: 550, grounded: false }, { lastGroundY: 100, orbY: 500, godspeed: true }),
  'the aura may glide through a long drop',
)
check(
  !fellOffRoute({ y: 220, grounded: false }, { lastGroundY: 100, orbY: 180, godspeed: false, dropping: true }),
  'a tap of Down may skip one ledge',
)
check(
  fellOffRoute({ y: 550, grounded: false }, { lastGroundY: 100, orbY: 500, godspeed: false, dropping: true }),
  'holding Down through a whole section is still a pit',
)
check(
  !fellOffRoute({ y: 550, grounded: false }, { lastGroundY: 100, orbY: 500, godspeed: false, floorBelow: 600 }),
  'a stair still under him means he is on the route',
)
check(
  fellOffRoute({ y: 550, grounded: false }, { lastGroundY: 100, orbY: 500, godspeed: false, floorBelow: 900 }),
  'a floor too far below does not save a reckless drop',
)
check(
  !fellOffRoute({ y: 200, grounded: false }, { lastGroundY: 100, orbY: 180, godspeed: false }),
  'a short fall between stairs is not a pit',
)
check(PIT.missedOrb > PIT.freeFall && PIT.freeFall > 300, 'missing the route is a longer drop than a pit')

console.log('\n· Landing')
const ledge = { x: 100, y: 400, w: 120 }
const onTop = { x: 140, y: 400 - BODY.height, vy: 4 }
check(landsOn(onTop, ledge, 1, LEDGE_INSET.moving), 'falling onto the ledge, he lands')
check(
  !landsOn({ ...onTop, x: ledge.x + ledge.w }, ledge, 1, LEDGE_INSET.moving),
  'passing by on the side does not count',
)
/*
 * The case that justifies looking at the previous frame: at high speed the body
 * jumps clean over the whole platform in a single step.
 */
const veloz = { x: 140, y: 400 - BODY.height + 30, vy: 40 }
check(landsOn(veloz, ledge, 1, LEDGE_INSET.moving), 'at high speed a landing does not slip between frames')
check(
  !landsOn({ x: 140, y: 400 - BODY.height + 30, vy: 0 }, ledge, 1, LEDGE_INSET.moving),
  'but crossing it from below without falling is no landing',
)
/* Exactly at the point where the wide inset no longer reaches and the narrow one does. */
const borde = { x: ledge.x + ledge.w - LEDGE_INSET.dom, y: 400 - BODY.height, vy: 4 }
check(
  landsOn(borde, ledge, 1, LEDGE_INSET.moving) && !landsOn(borde, ledge, 1, LEDGE_INSET.dom),
  'a stricter inset rejects the same edge: the three kinds are not interchangeable',
)

console.log(`\n${'─'.repeat(52)}`)
if (fail > 0) {
  console.error(`❌ ${fail} fallo(s) sobre ${pass + fail}`)
  process.exit(1)
}
console.log(`✅ ${pass} movement checks passed`)
