#!/usr/bin/env node
/**
 * Comprobaciones sobre el movimiento del Modo Juego.
 *
 * El platformer es lo único del sitio que ningún verificador tocaba: se dibuja
 * en un canvas, y sin canvas no arranca. Su parte numérica, en cambio, no
 * necesita ni ventana ni lienzo, así que vive aparte y se comprueba aquí.
 *
 * No se comprueba que el juego «se sienta bien» —eso son las constantes, y se
 * calibran jugando— sino que las reglas se cumplan: que la velocidad tenga
 * techo, que el rozamiento no dependa de los hercios del monitor, que soltar
 * el salto lo recorte solo mientras se sube y que un aterrizaje no se cuele
 * entre dos fotogramas.
 */
import {
  BODY,
  LEDGE_INSET,
  PHYSICS,
  clampToStage,
  cutJump,
  landsOn,
  nextVelocityX,
  nextVelocityY,
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

console.log('\n· Carrera')
check(
  nextVelocityX(0, { ...run(), right: true }) === PHYSICS.accelGround,
  'arrancar desde parado acelera un paso completo',
)
let vx = 0
for (let i = 0; i < 200; i++) vx = nextVelocityX(vx, { ...run(), right: true })
check(vx === PHYSICS.maxRun, `la velocidad tiene techo (${vx})`)
let vxAura = 0
for (let i = 0; i < 200; i++) vxAura = nextVelocityX(vxAura, { ...run(true, true), right: true })
check(vxAura === PHYSICS.maxRunGodspeed && vxAura > vx, 'con el aura el techo es más alto')
check(
  nextVelocityX(-1, { ...run(), left: true }) >= -PHYSICS.maxRun,
  'el techo también aplica hacia la izquierda',
)
check(
  nextVelocityX(1, { ...run(false), right: true }) - 1 === PHYSICS.accelAir
    && PHYSICS.accelAir < PHYSICS.accelGround,
  'en el aire se acelera menos que en el suelo',
)

console.log('\n· Rozamiento')
check(near(nextVelocityX(2, run()), 2 * PHYSICS.frictionGround), 'sin dirección, el suelo frena')
check(
  near(nextVelocityX(2, run(false)), 2 * PHYSICS.frictionAir)
    && PHYSICS.frictionAir > PHYSICS.frictionGround,
  'el aire frena menos que el suelo',
)
/*
 * La razón de que el rozamiento se eleve a `frameScale` en vez de
 * multiplicarse: dos fotogramas de 60 Hz tienen que dejar la misma velocidad
 * que uno de 30 Hz, o el personaje resbala distinto según el monitor.
 */
const dosPasos = nextVelocityX(nextVelocityX(3, run()), run())
const unPasoLargo = nextVelocityX(3, { ...run(true, false, 2) })
check(near(dosPasos, unPasoLargo), `el frenado no depende de los hercios (${dosPasos.toFixed(6)})`)

console.log('\n· Salto y caída')
check(
  cutJump(PHYSICS.jumpForce / 2, false) === (PHYSICS.jumpForce / 2) * PHYSICS.jumpCut,
  'soltar el salto a media subida lo recorta',
)
check(cutJump(PHYSICS.jumpForce / 2, true) === PHYSICS.jumpForce / 2, 'mantenerlo pulsado no lo recorta')
check(cutJump(3, false) === 3, 'cayendo no hay nada que recortar')
check(
  cutJump(PHYSICS.jumpForce, false) === PHYSICS.jumpForce,
  'el impulso inicial no se recorta: el recorte empieza pasado el arranque',
)
let vy = 0
for (let i = 0; i < 200; i++) vy = nextVelocityY(vy, { godspeed: false, jumpHeld: false, fastFallHeld: false, frameScale: 1 })
check(vy === PHYSICS.maxFall, `la caída tiene velocidad terminal (${vy})`)
let vyFast = 0
for (let i = 0; i < 200; i++) vyFast = nextVelocityY(vyFast, { godspeed: false, jumpHeld: false, fastFallHeld: true, frameScale: 1 })
check(vyFast === PHYSICS.fastFall && vyFast > vy, 'pulsar abajo levanta el límite de caída')
check(
  near(
    nextVelocityY(2, { godspeed: true, jumpHeld: true, fastFallHeld: false, frameScale: 1 }) - 2,
    PHYSICS.gravity / 2,
  ),
  'con el aura y el salto mantenido, cayendo, la gravedad es la mitad: planea',
)
check(
  near(nextVelocityY(-2, { godspeed: true, jumpHeld: true, fastFallHeld: false, frameScale: 1 }) + 2, PHYSICS.gravity),
  'pero subiendo la gravedad es la normal',
)

console.log('\n· Límites del escenario')
check(clampToStage(-5, -3, 800).x === 0 && clampToStage(-5, -3, 800).vx === 0, 'el borde izquierdo detiene')
check(
  clampToStage(790, 3, 800).x === 800 - BODY.width && clampToStage(790, 3, 800).vx === 0,
  'el borde derecho detiene',
)
check(clampToStage(300, 2, 800).x === 300, 'en medio no toca nada')

console.log('\n· Aterrizaje')
const ledge = { x: 100, y: 400, w: 120 }
const onTop = { x: 140, y: 400 - BODY.height, vy: 4 }
check(landsOn(onTop, ledge, 1, LEDGE_INSET.moving), 'cayendo sobre la repisa, aterriza')
check(
  !landsOn({ ...onTop, x: ledge.x + ledge.w }, ledge, 1, LEDGE_INSET.moving),
  'pasando de largo por el lado, no',
)
/*
 * El caso que justifica mirar el fotograma anterior: a velocidad alta el
 * cuerpo salta por encima de la plataforma entera en un solo paso.
 */
const veloz = { x: 140, y: 400 - BODY.height + 30, vy: 40 }
check(landsOn(veloz, ledge, 1, LEDGE_INSET.moving), 'a velocidad alta el aterrizaje no se cuela entre fotogramas')
check(
  !landsOn({ x: 140, y: 400 - BODY.height + 30, vy: 0 }, ledge, 1, LEDGE_INSET.moving),
  'pero atravesándola desde abajo sin caer, no aterriza',
)
/* Justo en el punto donde el margen ancho ya no llega y el estrecho sí. */
const borde = { x: ledge.x + ledge.w - LEDGE_INSET.dom, y: 400 - BODY.height, vy: 4 }
check(
  landsOn(borde, ledge, 1, LEDGE_INSET.moving) && !landsOn(borde, ledge, 1, LEDGE_INSET.dom),
  'un margen más estricto rechaza el mismo borde: los tres tipos no son intercambiables',
)

console.log(`\n${'─'.repeat(52)}`)
if (fail > 0) {
  console.error(`❌ ${fail} fallo(s) sobre ${pass + fail}`)
  process.exit(1)
}
console.log(`✅ ${pass} comprobaciones del movimiento superadas`)
