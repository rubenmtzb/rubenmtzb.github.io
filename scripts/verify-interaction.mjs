#!/usr/bin/env node
/**
 * Verificación de la capa de interacción.
 *
 * verify-dist.mjs comprueba que el HTML de build es correcto SIN JavaScript.
 * Aquí se comprueba lo contrario: se ejecuta el bundle real contra ese mismo
 * HTML, con el mínimo de APIs de navegador simuladas, y se afirma que la
 * interacción hace lo que debe.
 *
 * Se pasa por las dos portadas, porque buena parte del script elige textos
 * según `document.documentElement.lang` y un fallo ahí solo se ve en una.
 *
 * No sustituye a un navegador —no hay layout, ni canvas, ni audio— pero sí
 * cubre lo que se puede romper al reorganizar el script: que arranque entero,
 * que los carruseles avancen con un único elemento activo, que las pestañas
 * cambien de panel y que el teclado registre aciertos, fallos y borrados.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseHTML } from 'linkedom'

const DIST = 'dist'
const PAGES = [
  { file: 'index.html', lang: 'en', soundOff: 'Sound disabled', soundOn: 'Sound enabled' },
  { file: 'es/index.html', lang: 'es', soundOff: 'Sonido desactivado', soundOn: 'Sonido activado' },
]

const bundleName = readdirSync(join(DIST, '_astro'))
  .find((f) => f.startsWith('V2Layout') && f.endsWith('.js'))
if (!bundleName) {
  console.error('✗ no hay bundle de la V2 en dist/_astro: ¿se ha construido el sitio?')
  process.exit(1)
}
const bundleUrl = pathToFileURL(join(process.cwd(), DIST, '_astro', bundleName)).href

let pass = 0
let fail = 0

/**
 * Ejecuta el bundle contra una página y devuelve las herramientas para
 * interrogar el DOM resultante. Cada llamada monta un entorno nuevo y salta
 * la caché de módulos, para que las dos portadas no compartan estado.
 */
async function run(page, runIndex) {
  const { window, document } = parseHTML(readFileSync(join(DIST, page.file), 'utf8'))

  /* APIs de navegador que linkedom no trae. Los temporizadores y los
     fotogramas se tragan a propósito: interesa el estado inmediato tras cada
     interacción, no las animaciones. El audio y el canvas fallan a propósito
     para ejercitar los caminos degradados. */
  const noop = () => {}
  Object.assign(window, {
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: noop,
    setTimeout: () => 0,
    setInterval: () => 0,
    clearTimeout: noop,
    clearInterval: noop,
    getComputedStyle: () => ({ gap: '24px' }),
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback }
      observe(el) { this.callback([{ isIntersecting: true, target: el }], this) }
      unobserve() {} disconnect() {}
    },
    ResizeObserver: class { observe() {} disconnect() {} },
    AudioContext: class { constructor() { throw new Error('sin salida de audio en Node') } },
    Image: class { set src(_value) {} get complete() { return false } },
    devicePixelRatio: 1,
    innerWidth: 1440,
    innerHeight: 900,
    scrollY: 0,
    performance,
  })
  for (const canvas of document.querySelectorAll('canvas')) canvas.getContext = () => null

  /* linkedom fija event.target al objeto del despacho y no deja
     sobrescribirlo, pero en un navegador un keydown apunta al elemento con
     foco. Se capturan los listeners de window y se invocan con un evento
     propio, que es la única forma de reproducir aquí ese detalle. */
  const keyListeners = []
  const addEventListener = window.addEventListener.bind(window)
  window.addEventListener = (type, handler, opts) => {
    if (type === 'keydown' || type === 'keyup') keyListeners.push({ type, handler })
    else addEventListener(type, handler, opts)
  }

  for (const k of ['document', 'Event', 'Node', 'HTMLElement', 'CustomEvent']) {
    Object.defineProperty(globalThis, k, { value: window[k], configurable: true, writable: true })
  }
  Object.assign(globalThis, {
    window,
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
    getComputedStyle: window.getComputedStyle,
    IntersectionObserver: window.IntersectionObserver,
    ResizeObserver: window.ResizeObserver,
    Image: window.Image,
    setTimeout: window.setTimeout,
    setInterval: window.setInterval,
    clearTimeout: window.clearTimeout,
    clearInterval: window.clearInterval,
  })

  // El sufijo salta la caché de módulos de Node: cada página parte de cero.
  await import(`${bundleUrl}?run=${runIndex}`)

  const el = (id) => document.getElementById(id)
  return {
    document,
    el,
    all: (sel) => [...document.querySelectorAll(sel)],
    fire(node, type, init = {}) {
      const ev = new window.Event(type, { bubbles: true, cancelable: true })
      Object.assign(ev, init)
      node.dispatchEvent(ev)
      return ev
    },
    key(type, { target = document.body, ...rest }) {
      const ev = { type, target, preventDefault: noop, stopPropagation: noop, repeat: false, ...rest }
      for (const l of keyListeners) if (l.type === type) l.handler(ev)
    },
  }
}

function suite(page, dom) {
  const { el, all, fire, key, document } = dom
  const check = (cond, msg) => {
    if (cond) { pass++; console.log(`  ✓ ${msg}`) }
    else { fail++; console.error(`  ✗ ${msg}`) }
  }

  console.log(`\n· Revelado (${page.lang})`)
  const reveals = all('.reveal')
  check(reveals.length > 0 && reveals.every((r) => r.classList.contains('is-in')),
    `las ${reveals.length} secciones .reveal quedan visibles`)

  console.log('\n· Navegación móvil')
  const mobileNav = el('mobile-nav')
  const mobileLinks = mobileNav ? [...mobileNav.querySelectorAll('[data-nav]')] : []
  check(mobileLinks.length === 4, 'el menú compacto conserva las cuatro áreas')
  if (mobileNav && mobileLinks[0]) {
    mobileNav.open = true
    fire(mobileLinks[0], 'click')
    check(mobileNav.open === false, 'el menú compacto se cierra al navegar')
  }

  console.log('\n· Carruseles')
  const carousels = [
    { name: 'proyectos', slides: '.project-slide', next: 'proj-next', dots: '[data-dot-index]' },
    { name: 'formación', slides: '.edu-slide', next: 'edu-next', dots: '[data-edu-dot]', counter: 'edu-counter' },
    { name: 'certificaciones', slides: '.cert-slide', next: 'certs-next', dots: '[data-cert-dot]', counter: 'certs-counter' },
  ]
  for (const c of carousels) {
    const slides = all(c.slides)
    const activeIndex = () => slides.findIndex((s) => s.classList.contains('is-active'))
    const activeCount = () => slides.filter((s) => s.classList.contains('is-active')).length

    check(slides.length > 1 && activeCount() === 1 && activeIndex() === 0,
      `${c.name}: ${slides.length} slides, arranca en el primero y solo uno activo`)

    fire(el(c.next), 'click')
    check(activeCount() === 1 && activeIndex() === 1, `${c.name}: "siguiente" avanza sin dejar dos activos`)

    const dots = all(c.dots)
    const activeDots = dots.filter((d) => d.classList.contains('is-active'))
    check(activeDots.length === 1 && dots.indexOf(activeDots[0]) === 1,
      `${c.name}: el indicador acompaña al slide`)

    if (c.counter) {
      const expected = `02 / ${String(slides.length).padStart(2, '0')}`
      check(el(c.counter).textContent === expected, `${c.name}: contador "${el(c.counter).textContent}"`)
    }

    for (let i = 1; i < slides.length; i++) fire(el(c.next), 'click')
    check(activeIndex() === 0, `${c.name}: da la vuelta al llegar al final`)
  }

  console.log('\n· Pestañas de experiencia')
  const jobTabs = all('.job-tab')
  const jobPanels = all('.job-panel')
  check(jobPanels.filter((p) => p.classList.contains('is-active')).length === 1, 'arranca con un panel activo')
  fire(jobTabs[1], 'click')
  check(jobPanels[1].classList.contains('is-active') && !jobPanels[0].classList.contains('is-active'),
    'al pulsar la segunda empresa cambia el panel')
  check(jobTabs[1].getAttribute('aria-selected') === 'true' && jobTabs[0].getAttribute('aria-selected') === 'false',
    'aria-selected sigue al estado visual')
  const linkedExperienceChips = all('#job-panels a.project-tech-chip')
  const contextualExperienceChips = all('#job-panels span.project-tech-label')
  check(linkedExperienceChips.length > 0, 'las tecnologías reconocidas conservan logo, color y enlace')
  check(
    contextualExperienceChips.length > 0
      && contextualExperienceChips.every((chip) => chip.querySelector('.project-tech-marker') && !chip.closest('a')),
    'los conceptos sin enlace mantienen el mismo patrón visual',
  )

  console.log('\n· Workbench de perfil')
  const files = all('[data-profile-tab]')
  const panels = all('[data-profile-panel]')
  fire(files[1], 'click')
  check(panels[1].hidden === false && panels[0].hidden === true, 'cambiar de fichero cambia el panel')
  check(el('profile-tab-label').textContent === 'engineering.md', 'la etiqueta de la pestaña se actualiza')

  console.log('\n· Titular con máquina de escribir')
  const typed = el('hero-typewriter')
  check(typed.childNodes.length === 2, 'el titular queda como dos nodos estables (texto + nombre)')
  check(typed.textContent.trim() === '', 'empieza vacío y se escribe con temporizadores')

  console.log('\n· Speed trial')
  const spans = () => all('#monkey-words .monkey-char')
  check(spans().length > 20, `la frase se pinta carácter a carácter (${spans().length} spans)`)
  check(spans().filter((s) => s.classList.contains('current')).length === 1, 'hay exactamente un cursor')

  const quote = spans().map((s) => s.textContent).join('')
  key('keydown', { code: 'KeyX', key: quote[0], target: el('monkey-box') })
  check(spans()[0].classList.contains('correct'), 'la primera letra correcta se marca como acertada')
  check(spans()[1].classList.contains('current'), 'el cursor avanza')
  key('keydown', { code: 'KeyZ', key: '±', target: el('monkey-box') })
  check(spans()[1].classList.contains('incorrect'), 'una letra errónea se marca como fallo')
  key('keydown', { code: 'Backspace', key: 'Backspace', target: el('monkey-box') })
  check(spans()[1].classList.contains('current') && !spans()[1].classList.contains('incorrect'),
    'el retroceso limpia la marca y devuelve el cursor')

  // El teclado dibujado comparte la tabla de teclas con el físico.
  const drawnKey = (code) => document.querySelector(`#kb [data-code="${code}"]`)
  const before = spans().filter((s) => s.classList.contains('correct')).length
  fire(drawnKey(`Key${quote[1].toUpperCase()}`) ?? drawnKey('KeyA'), 'mousedown')
  check(spans().filter((s) => s.classList.contains('correct')).length === before + 1,
    'pulsar una tecla dibujada cuenta igual que el teclado físico')

  console.log('\n· Modo libre')
  fire(el('kb-tab-sim'), 'click')
  check(el('kb-free-mode-wrap').classList.contains('hidden') === false, 'la pestaña muestra el sandbox')
  key('keydown', { code: 'KeyH', key: 'h', target: el('free-sim-box') })
  key('keydown', { code: 'KeyI', key: 'i', target: el('free-sim-box') })
  check(el('free-sim-text').textContent === 'hi', `el texto libre se acumula ("${el('free-sim-text').textContent}")`)
  check(el('kb-free-count').textContent === '2', 'el contador de pulsaciones sube')
  check(el('kb-free-last-key').textContent === '[ I ]', `última tecla "${el('kb-free-last-key').textContent}"`)
  // El Enter físico inserta un espacio; la tecla dibujada escribe su glifo.
  key('keydown', { code: 'Enter', key: 'Enter', target: el('free-sim-box') })
  check(el('free-sim-text').textContent === 'hi ', 'Enter en el teclado físico inserta un espacio')
  fire(drawnKey('Enter'), 'mousedown')
  check(el('free-sim-text').textContent === 'hi ⏎', 'la tecla dibujada escribe su propio glifo')
  fire(el('free-sim-clear-btn'), 'click')
  check(el('free-sim-text').textContent === '' && el('kb-free-count').textContent === '0',
    'limpiar deja el sandbox a cero')

  console.log('\n· Controles de teclado')
  fire(el('kb-switch-type'), 'click')
  check(el('kb-switch-type').textContent === 'Clicky (Crisp)', `rota el perfil de switch ("${el('kb-switch-type').textContent}")`)
  check(el('kb-free-sound-pill').textContent.includes('Clicky'), 'la píldora del sandbox refleja el perfil')
  fire(el('kb-sound-toggle'), 'click')
  check(el('kb-sound-label').textContent === page.soundOff, `el toggle usa i18n ("${el('kb-sound-label').textContent}")`)
  fire(el('kb-sound-toggle'), 'click')
  check(el('kb-sound-label').textContent === page.soundOn, 'y vuelve al estado inicial')

  console.log('\n· Archivo de builds')
  fire(el('kb-tab-photos'), 'click')
  check(el('kb-panel-photos').classList.contains('hidden') === false && el('kb-panel-interactive').classList.contains('hidden'),
    'la pestaña de fotos abre el archivo y oculta el speed trial')

  const buildGallery = document.querySelector('[data-bx-gallery]')
  const buildViewer = document.querySelector('[data-bx-viewer]')
  const buildRoot = document.querySelector('[data-kb-build-explorer]')
  const buildOpen = document.querySelector('[data-bx-open]')
  const buildClose = document.querySelector('[data-bx-close]')
  const buildPhoto = document.querySelector('[data-bx-photo-view]')
  const buildPhotoPrevious = document.querySelector('[data-bx-photo-prev]')
  const buildPhotoNext = document.querySelector('[data-bx-photo-next]')
  const buildPhotoCounter = document.querySelector('[data-bx-photo-counter]')
  const buildPhotoSlides = [...document.querySelectorAll('[data-bx-photo-slide]')]
  const buildAssembled = document.querySelector('[data-bx-assembled-view]')
  const buildExplode = document.querySelector('[data-bx-explode]')
  const firstBuildPart = document.querySelector('[data-bx-part-button]')
  const firstBuildLayer = document.querySelector('[data-bx-part="keycaps"]')
  const buildStage = document.querySelector('[data-bx-stage]')
  const buildModel = document.querySelector('[data-bx-model]')

  check(buildOpen && buildViewer?.hidden === true, 'la galería contiene el Neo65 y el visor comienza cerrado')
  fire(buildOpen, 'click')
  check(buildGallery.hidden === true && buildViewer.hidden === false, 'abrir el Neo65 entra en el visor')
  check(buildRoot.classList.contains('is-photo-view') && buildPhoto.getAttribute('aria-pressed') === 'true',
    'la fotografía original es la vista principal del build')
  fire(buildPhotoNext, 'click')
  check(buildPhotoSlides[0].hidden && !buildPhotoSlides[1].hidden && buildPhotoCounter.textContent === '02 / 04',
    'la flecha siguiente recorre los ángulos y actualiza el contador')
  fire(buildPhotoPrevious, 'click')
  check(!buildPhotoSlides[0].hidden && buildPhotoCounter.textContent === '01 / 04',
    'la flecha anterior vuelve a la portada oscura')
  fire(buildAssembled, 'click')
  check(!buildRoot.classList.contains('is-photo-view') && buildAssembled.getAttribute('aria-pressed') === 'true',
    'la vista montada revela el modelo técnico sin perder la fotografía')
  fire(buildExplode, 'click')
  check(buildRoot.classList.contains('is-exploded') && buildExplode.getAttribute('aria-pressed') === 'true',
    'el control de explosión separa las capas y actualiza su estado accesible')

  fire(firstBuildLayer, 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 100, clientY: 100 })
  fire(buildStage, 'pointerup', { pointerId: 1, clientX: 100, clientY: 100 })
  check(firstBuildPart.getAttribute('aria-pressed') === 'true', 'un clic corto sobre una capa la fija')
  fire(firstBuildPart, 'click')

  const modelStyle = buildModel.getAttribute('style')
  fire(firstBuildLayer, 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 2, clientX: 100, clientY: 100 })
  fire(buildStage, 'pointermove', { pointerId: 2, clientX: 145, clientY: 78 })
  fire(buildStage, 'pointerup', { pointerId: 2, clientX: 145, clientY: 78 })
  check(buildModel.getAttribute('style') !== modelStyle && !buildStage.classList.contains('is-dragging'),
    'arrastrar desde una capa orbita y libera el puntero al terminar')
  check(firstBuildPart.getAttribute('aria-pressed') === 'false', 'orbitar no fija accidentalmente la capa')
  check(fire(buildStage, 'selectstart').defaultPrevented, 'el visor bloquea la selección nativa durante la interacción')

  fire(firstBuildPart, 'click')
  check(buildRoot.classList.contains('has-active') && firstBuildPart.getAttribute('aria-pressed') === 'true',
    'seleccionar una pieza la aísla y mantiene pulsado su control')

  const buildRange = document.querySelector('[data-bx-range]')
  const buildRangeOut = document.querySelector('[data-bx-range-out]')
  buildRange.value = '40'
  fire(buildRange, 'input')
  check(buildRoot.style.getPropertyValue('--spread') === '0.4' && buildRangeOut.textContent === '40%',
    'el deslizador separa las capas de forma continua')
  check(buildExplode.getAttribute('aria-pressed') === 'false' && buildAssembled.getAttribute('aria-pressed') === 'false',
    'a media separación ningún preset se declara activo')
  check(el('kb-panel-photos').querySelector('[data-bx-status]').textContent.includes('40%'),
    'el rótulo de estado dice en qué punto está la separación')

  const buildDots = [...document.querySelectorAll('[data-bx-photo-dot]')]
  fire(buildPhoto, 'click')
  fire(buildDots[2], 'click')
  check(buildDots[2].getAttribute('aria-current') === 'true' && buildDots[0].getAttribute('aria-current') === 'false'
    && buildPhotoCounter.textContent === '03 / 04',
    'los puntos saltan directamente a una toma concreta')

  fire(buildAssembled, 'click')
  const beforeOrbit = buildModel.getAttribute('style')
  fire(buildStage, 'keydown', { key: 'ArrowRight' })
  check(buildModel.getAttribute('style') !== beforeOrbit, 'las flechas orbitan el modelo sin ratón')
  fire(buildStage, 'keydown', { key: 'PageUp' })
  check(Number(buildRoot.style.getPropertyValue('--spread')) > 0, 'avanzar página separa las capas desde el teclado')

  fire(buildRoot, 'keydown', { key: 'Escape' })
  check(buildGallery.hidden === false && buildViewer.hidden === true, 'Escape sale del visor')

  fire(buildOpen, 'click')
  fire(buildClose, 'click')
  check(buildGallery.hidden === false && buildViewer.hidden === true && !buildRoot.classList.contains('is-exploded'),
    'volver a la galería restablece el visor')
  check(buildRoot.style.getPropertyValue('--spread') === '0' && !buildRoot.classList.contains('has-active'),
    'y deja el despiece y el aislamiento a cero')

  console.log('\n· Contacto')
  check(el('copy-mail').hidden === false, 'el botón de copiar email lo revela el JS')
  check(el('copy-mail').textContent.trim().startsWith('📋'), 'el botón conserva su icono tras montarlo')
  check(el('local-time').textContent.includes('Barcelona'), `el reloj se rellena ("${el('local-time').textContent}")`)
  check(/^UTC[+-]\d+$/.test(el('local-offset').textContent), `el desfase se deriva de la zona ("${el('local-offset').textContent}")`)
}

for (const [i, page] of PAGES.entries()) {
  console.log(`\n${'═'.repeat(52)}\n${page.file} — ${bundleName}\n${'═'.repeat(52)}`)
  let dom
  try {
    dom = await run(page, i)
    pass++
    console.log('\n· Arranque\n  ✓ el bundle se ejecuta entero sin lanzar')
  } catch (err) {
    fail++
    console.error(`\n· Arranque\n  ✗ el bundle lanzó: ${err.message}`)
    continue
  }
  suite(page, dom)
}

console.log(`\n${'─'.repeat(52)}`)
if (fail === 0) {
  console.log(`✅ ${pass} comprobaciones de interacción superadas`)
  process.exit(0)
}
console.error(`❌ ${fail} fallo(s) sobre ${pass + fail}`)
process.exit(1)
