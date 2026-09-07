#!/usr/bin/env node
/**
 * The archive's cards must stay inside the stage.
 *
 * A slow drag used to skip the clamp (desktop only) and a flick bounced
 * against a hardcoded 160 px, so a 340 px photograph walked out of a 420 px
 * stage and covered the keyboards. These checks hold the arithmetic that
 * both gestures now share.
 */
import { bounceAxis, confine, paintedBox, pointInRotatedBox, travelLimit } from '../src/scripts/v2/moment-bounds.ts'

let pass = 0
let fail = 0
const check = (cond, msg) => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`) }
  else { fail++; console.error(`  ✗ ${msg}`) }
}
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol

const stage = { width: 250, height: 340, stageWidth: 900, stageHeight: 420 }

console.log('\n· Painted box')
const upright = paintedBox(250, 340, 0)
check(near(upright.width, 250) && near(upright.height, 340), 'unrotated, the painted box is the card')
const sideways = paintedBox(250, 340, 90)
check(near(sideways.width, 340) && near(sideways.height, 250), 'at 90°, width and height swap')

console.log('\n· Travel limit')
const limit = travelLimit(stage, 0)
check(
  near(limit.y, (420 - 340) / 2 - 8),
  `the vertical limit is the real gap (${limit.y}), not a hardcoded 160`,
)
check(limit.y < 160, 'that gap is smaller than the old 160 px bounce')
check(limit.y >= 0 && limit.x >= 0, 'the limit never goes negative')

const laptop = travelLimit({ ...stage, stageWidth: 1100, stageHeight: 460 }, 0)
const dragged = confine(440, 200, laptop)
check(dragged.y === laptop.y, 'a slow drag past the top/bottom stops at the stage')
check(Math.abs(dragged.x) <= laptop.x, 'and the same clamp holds left/right')

const flung = bounceAxis(200, 8, limit.y, 0.45)
check(flung.pos === limit.y && flung.vel < 0, 'a flick that overshoots bounces on the same limit as the drag')

const inside = confine(10, 4, limit)
check(inside.x === 10 && inside.y === 4, 'inside the stage nothing is touched')

const rotated = travelLimit(stage, 25)
const uprightLimit = travelLimit(stage, 0)
check(rotated.y <= uprightLimit.y, 'rotation shrinks the vertical room, so the clamp tightens')

console.log('\n· Painted hit')
check(pointInRotatedBox(0, 0, 0, 0, 100, 100, 0), 'the centre of an upright card is on the card')
check(!pointInRotatedBox(60, 0, 0, 0, 100, 100, 0), 'past the edge is not')
check(pointInRotatedBox(0, 40, 0, 0, 100, 100, 90), '90° maps a point below the centre onto the card\'s local x')
check(!pointInRotatedBox(0, 60, 0, 0, 100, 100, 90), 'and past that rotated edge is still out')
const aabbCorner = 50 * Math.SQRT2
check(
  !pointInRotatedBox(aabbCorner, aabbCorner, 0, 0, 100, 100, 45),
  'a 45° AABB corner is empty space, not the photograph',
)
check(pointInRotatedBox(aabbCorner, 0, 0, 0, 100, 100, 45), 'the vertex of the rotated square still counts')

console.log(`\n${'─'.repeat(52)}`)
if (fail > 0) {
  console.error(`❌ ${fail} fallo(s) sobre ${pass + fail}`)
  process.exit(1)
}
console.log(`✅ ${pass} moment-card bound checks passed`)
