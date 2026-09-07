#!/usr/bin/env node
/**
 * Verification of the interaction layer.
 *
 * verify-dist.mjs checks that the built HTML is correct WITHOUT JavaScript. Here
 * the opposite is checked: the real bundle is executed against that same HTML,
 * with the bare minimum of browser APIs simulated, and the interaction is
 * asserted to do what it should.
 *
 * Both language home pages are put through it, because a good part of the script
 * picks copy by `document.documentElement.lang` and a fault there only shows on
 * one of them.
 *
 * It is no substitute for a browser — there is no layout, no canvas and no audio
 * — but it does cover what reorganising the script can break: that it boots in
 * full, that the carousels advance with a single active element, that the tabs
 * switch panels, and that the keyboard records hits, misses and deletions.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseHTML } from 'linkedom'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { verifyMotion } from './verify-motion.mjs'

const DIST = 'dist'
const languageSourceOnly = process.argv.includes('--language-source')
const PAGES = [
  {
    file: 'index.html',
    lang: 'en',
    soundOff: 'Sound disabled',
    soundOn: 'Sound enabled',
    speedTrialLabel: 'Speed Trial',
    speedTrialStarts: [
      'lightning never',
      'assassination techniques',
      'distributed systems',
      'mechanical switches',
      'hunter license',
      'typesafe functional',
      'nobody can',
      'always keep',
    ],
  },
  {
    file: 'es/index.html',
    lang: 'es',
    soundOff: 'Sonido desactivado',
    soundOn: 'Sonido activado',
    speedTrialLabel: 'Prueba de velocidad',
    speedTrialStarts: [
      'los rayos',
      'las tecnicas',
      'los sistemas',
      'los interruptores',
      'la licencia de',
      'las arquitecturas',
      'nadie reacciona',
      'manten tu',
    ],
  },
]

const bundleName = languageSourceOnly ? null : readdirSync(join(DIST, '_astro'))
  .find((f) => f.startsWith('V2Layout') && f.endsWith('.js'))
if (!languageSourceOnly && !bundleName) {
  console.error('✗ no V2 bundle in dist/_astro: has the site been built?')
  process.exit(1)
}
const bundleUrl = bundleName ? pathToFileURL(join(process.cwd(), DIST, '_astro', bundleName)).href : null

let pass = 0
let fail = 0

async function languageSuite() {
  console.log('\n· Language source regressions')
  const check = (cond, msg) => {
    if (cond) { pass++; console.log(`  ✓ ${msg}`) }
    else { fail++; console.error(`  ✗ ${msg}`) }
  }
  const read = (file) => readFileSync(file, 'utf8')
  const json = (file) => JSON.parse(read(file))
  const moduleUrls = new Map()
  const sourceModuleUrl = (file) => {
    if (moduleUrls.has(file)) return moduleUrls.get(file)
    let code = ts.transpileModule(read(file), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText
    for (const match of [...code.matchAll(/\bfrom\s+(['"])(\.[^'"]+)\1/g)]) {
      const target = sourceModuleUrl(join(dirname(file), `${match[2]}.ts`))
      code = code.replace(match[0], `from ${JSON.stringify(target)}`)
    }
    const url = `data:text/javascript,${encodeURIComponent(code)}`
    moduleUrls.set(file, url)
    return url
  }
  const { initLanguageSwitch } = await import(sourceModuleUrl('src/scripts/language-switch.ts'))
  const { createSwitchAudio } = await import(sourceModuleUrl('src/scripts/v2/keyboard/switch-audio.ts'))
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const priorDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  try {
    const routes = [
      ['/', '/es/'], ['/es/', '/'], ['/v1/', '/v1/es/'], ['/v1/es/', '/v1/'],
      ...['finance-core', 'youtube-transcriber', 'sars-cov-2'].flatMap((slug) => [
        [`/work/${slug}/`, `/es/work/${slug}/`],
        [`/es/work/${slug}/`, `/work/${slug}/`],
      ]),
    ]
    for (const [route, alternate] of routes) {
      const { document, window: domWindow } = parseHTML(`<html><body>
        <a data-language-switch href="${alternate}">Language</a>
        <a data-language-switch href="https://example.invalid/es/">External</a>
        <a data-language-switch href="//example.invalid/es/">Protocol relative</a>
        <a data-language-switch href="/\\example.invalid/es/">Backslash host</a>
        <a href="/unrelated/">Unrelated</a>
        </body></html>`)
      const listeners = new Map()
      const browserWindow = {
        location: new URL(`https://portfolio.example${route}?from=project-carousel&next=https%3A%2F%2Fexample.invalid#demo`),
        addEventListener(type, handler) { listeners.set(type, handler) },
      }
      Object.defineProperties(globalThis, {
        window: { configurable: true, writable: true, value: browserWindow },
        document: { configurable: true, writable: true, value: document },
      })
      const link = document.querySelector('a')
      check(link.getAttribute('href') === alternate, `${route}: no-JS alternate stays canonical`)
      initLanguageSwitch()
      check(link.getAttribute('href') === `${alternate}${browserWindow.location.search}#demo`,
        `${route}: switching preserves query and section without interpreting query URLs`)
      browserWindow.location.hash = '#contact'
      listeners.get('hashchange')()
      check(link.getAttribute('href').endsWith('#contact'), `${route}: a later hash change is preserved`)
      browserWindow.location.search = '?from=project-deck'
      listeners.get('popstate')()
      check(link.getAttribute('href') === `${alternate}?from=project-deck#contact`,
        `${route}: back/forward refreshes case origin`)
      browserWindow.location.search = '?from=project-carousel'
      link.dispatchEvent(new domWindow.Event('click'))
      check(link.getAttribute('href') === `${alternate}?from=project-carousel#contact`,
        `${route}: click refreshes context changed via history APIs`)
      check(document.querySelectorAll('a')[1].getAttribute('href') === 'https://example.invalid/es/'
        && document.querySelectorAll('a')[2].getAttribute('href') === '//example.invalid/es/'
        && document.querySelectorAll('a')[3].getAttribute('href') === '/\\example.invalid/es/'
        && document.querySelectorAll('a')[4].getAttribute('href') === '/unrelated/',
        `${route}: external, disguised-host and unrelated links are not rewritten`)
    }
  } finally {
    if (priorWindow) Object.defineProperty(globalThis, 'window', priorWindow)
    else delete globalThis.window
    if (priorDocument) Object.defineProperty(globalThis, 'document', priorDocument)
    else delete globalThis.document
  }
  for (const file of ['src/components/v1/Nav.astro', 'src/components/v2/Nav.astro', 'src/layouts/CaseLayout.astro']) {
    const source = read(file)
    check(source.includes('data-language-switch') && source.includes('initLanguageSwitch()')
      && source.includes('href={other.path}'), `${file}: progressive helper leaves canonical SSR links intact`)
  }
  for (const [lang, expected] of [
    ['en', ['Linear (Thock)', 'Clicky (Crisp)', 'Tactile (Pop)']],
    ['es', ['Lineal (sonido grave)', 'Con clic (sonido nítido)', 'Táctil (sonido seco)']],
  ]) {
    const audio = createSwitchAudio(lang)
    check(audio.label === expected[0] && audio.nextProfile() === expected[1]
      && audio.label === expected[1] && audio.nextProfile() === expected[2]
      && audio.nextProfile() === expected[0], `${lang}: all runtime switch labels cycle in the chosen language`)
  }
  const keyboardView = read('src/components/v2/OutsideTheCode.astro')
  check(keyboardView.includes('keyboardSwitchLabels(lang)')
    && (keyboardView.match(/\{switchLabels.linear\}/g) ?? []).length === 2,
    'SSR switch selector and sandbox pill use the same translated initial profile')

  const notFound = read('src/pages/404.astro')
  const localize404 = new Function('location', 'document', notFound.match(/<script is:inline>([\s\S]*?)<\/script>/)[1])
  for (const [pathname, lang] of [
    ['/missing/', 'en'], ['/es/missing/', 'es'], ['/v1/es/missing/', 'es'],
    ['/v1/es', 'es'], ['/es', 'es'], ['/v1/esoteric/', 'en'],
  ]) {
    const { document } = parseHTML(`<html lang="en"><body><a class="skip-link">Skip to content</a>${notFound.match(/<main[\s\S]*?<\/main>/)[0]}</body></html>`)
    localize404({ pathname }, document)
    check(document.documentElement.lang === lang
      && document.querySelector('#not-found-cv').getAttribute('href') === (lang === 'es' ? '/es/cv/' : '/cv/'),
      `${pathname}: 404 language and CV destination are correct`)
  }
  const gameControls = read('src/scripts/game-mode.ts').match(/<div class="gm-mobile-controls[\s\S]*?(?=\n\s*`\n)/)[0]
  for (const [spanish, expected] of [[false, ['Left', 'Right', 'Down', 'Jump']], [true, ['Izquierda', 'Derecha', 'Abajo', 'Saltar']]]) {
    const { document } = parseHTML(new Function('isSpanish', `return \`${gameControls}\``)(spanish))
    check(['left', 'right', 'down', 'jump'].every((key, i) =>
      document.querySelector(`#gm-btn-${key}`).getAttribute('aria-label') === expected[i]),
    `${spanish ? 'es' : 'en'}: rendered mobile game controls have localized accessible names`)
  }

  const uiSource = read('src/i18n/ui.ts')
  const caseSource = read('src/components/CaseStudy.astro')
  for (const [key, en, es] of [
    ['v2.case.input', 'INPUT', 'ENTRADA'],
    ['v2.case.process', 'PROCESS', 'PROCESO'],
    ['v2.case.output', 'OUTPUT', 'SALIDA'],
    ['v2.mutation.explorer', 'GENOMIC EXPLORER', 'EXPLORADOR GENÓMICO'],
  ]) check(uiSource.includes(`'${key}': '${en}'`) && uiSource.includes(`'${key}': '${es}'`)
    && caseSource.includes(`t(lang, '${key}')`), `${key}: both translations are consumed by the case diagram`)
  check(uiSource.includes("'v2.case.download': 'Download this video'")
    && uiSource.includes("'v2.case.download': 'Descargar este vídeo'"),
    'both demo download labels identify only the current recording')
  check(uiSource.includes("'v2.case.transcript': 'Texto con marcas de tiempo'"),
    'the transcript flow label consistently names timestamps')

  const projects = json('src/content/projects.json')
  const project = (id) => projects.find((entry) => entry.id === id)
  const education = json('src/content/education.json')
  const uocEnglish = education.find((entry) => entry.id === 'en:uoc')
  const uocSpanish = education.find((entry) => entry.id === 'es:uoc')
  check(uocEnglish.title === "Bachelor's Degree in Computer Engineering"
    && uocSpanish.title === 'Grado en Ingeniería Informática'
    && [uocEnglish, uocSpanish].every((entry) => entry.inProgress && entry.end === null),
    'UOC uses its official English degree name without implying completion')
  check(project('es:portfolio').link === 'https://rubenitx.me/es/'
    && new URL(project('en:portfolio').link).pathname === '/', 'the portfolio Visit destination follows the record language')
  check(project('es:youtube-transcriber').caseStudy.demo.caption.includes('al pulsar el botón de reproducción')
    && !/\bpipeline\b|\bfallback\b/.test(project('es:youtube-transcriber').imageAlt),
    'Spanish Transcriber instructions and alternate text use translated editorial labels')
  check(json('src/content/keyboards.json').find((entry) => entry.key === 'neo65').summary.es
    === '65 % · Montaje con juntas · Hotswap · Conexión por cable',
    'Neo65 distinguishes hotswap switches from the wired connection')
  const climbing = json('src/content/personal.json').find((entry) => entry.key === 'climbing').alt
  check(climbing.en.includes('climbing wall') && !climbing.en.includes('bouldering')
    && climbing.en.includes('roped in') && climbing.es.includes('cuerda'), 'climbing alt text describes roped climbing consistently')
  const keyboardCopy = read('src/i18n/keyboards.ts')
  check(keyboardCopy.includes("source: 'Part reference'") && keyboardCopy.includes("source: 'Referencia de la pieza'"),
    'part documentation links no longer promise a purchasing destination')
  for (const [key, asset] of [['financial-architecture', 'finance-core-es.svg'], ['youtube-transcriber', 'youtube-transcriber-es.png']]) {
    check(project(`es:${key}`).image.endsWith(asset) && existsSync(`src/assets/projects/${asset}`)
      && project(`en:${key}`).image !== project(`es:${key}`).image, `${key}: Spanish artwork is available and selected only for Spanish`)
  }
  const financeArt = read('src/assets/projects/finance-core-es.svg')
  const transcriberArt = read('scripts/artwork/youtube-transcriber-cover-es.svg')
  check(['CUENTAS', 'GASTOS', 'OBJETIVOS DE AHORRO', 'CÓDIGO PRIVADO'].every((label) => financeArt.includes(`>${label}<`) || financeArt.includes(` / ${label}<`))
    && !/>PRIVATE \/ DEMO<|>OVERVIEW<|>ACCOUNTS<|>SAVINGS GOALS</.test(financeArt),
    'Finance artwork translates its authored interface labels')
  check(transcriberArt.includes('>SUBTÍTULOS<') && transcriberArt.includes('>SIN SUBTÍTULOS<')
    && transcriberArt.includes('SUBTÍTULOS PRIMERO') && transcriberArt.includes('The system boundary is the request.')
    && transcriberArt.includes('El l&#237;mite del sistema es la petici&#243;n.'),
    'Transcriber artwork translates chrome while retaining its intentional bilingual example')

  const caption = read('public/media/finance-core-demo.es.vtt')
  const validation = json('public/media/finance-core-demo-validation.json')
  const metadata = json('public/media/finance-core-demo.json')
  const cues = [...caption.matchAll(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\n([^\n]+)/g)]
  const time = (value) => value.split(':').reduce((sum, part) => sum * 60 + Number(part), 0)
  check(!caption.includes('wallets') && caption.includes('carteras conectadas')
    && read('scripts/media/render-finance-demo-v2.mjs').includes(cues[12][3]),
    'current Spanish crypto caption and its generator use the same translated wording')
  check(cues.length === metadata.chapters.length && cues.every((cue, i) =>
    Math.abs(time(cue[1]) - metadata.chapters[i].start) < .001
    && Math.abs(time(cue[2]) - metadata.chapters[i].end) < .001)
    && createHash('sha256').update(caption).digest('hex') === validation.subtitles.es.sha256,
    'caption checksum matches its validation record and all original chapter timings remain unchanged')
}

/**
 * Runs the bundle against a page and returns the tools for interrogating the
 * resulting DOM. Every call builds a fresh environment and bypasses the module
 * cache, so the two home pages share no state.
 */
async function run(page, runIndex) {
  const { window, document } = parseHTML(readFileSync(join(DIST, page.file), 'utf8'))

  /* Browser APIs linkedom does not ship. Timers and frames are swallowed on
     purpose: what matters is the immediate state after each interaction, not the
     animations. Audio and canvas fail on purpose, to exercise the degraded
     paths. */
  const noop = () => {}
  /*
   * Intervals are recorded instead of discarded. They still never fire on their
   * own — what matters is still the immediate state after each interaction — but
   * this way a test can exhaust the speed trial's clock by hand, which is the
   * only way to reach the end of a round without typing the whole phrase.
   */
  const intervals = new Map()
  const viewportEntries = new Map()
  let nextIntervalId = 1
  const fetchFromDist = async (input) => {
    const href = typeof input === 'string' ? input : String(input?.url ?? input)
    const path = href.replace(/^https?:\/\/[^/]+/, '')
    const file = path.endsWith('/') ? `${path.replace(/^\//, '')}index.html` : path.replace(/^\//, '')
    const full = join(DIST, file)
    if (!existsSync(full)) return { ok: false, status: 404, text: async () => '' }
    return { ok: true, status: 200, text: async () => readFileSync(full, 'utf8') }
  }
  Object.assign(window, {
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    fetch: fetchFromDist,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: noop,
    setTimeout: () => 0,
    setInterval: (fn) => { intervals.set(nextIntervalId, fn); return nextIntervalId++ },
    clearTimeout: noop,
    clearInterval: (id) => { intervals.delete(id) },
    getComputedStyle: () => ({ gap: '24px' }),
    IntersectionObserver: class {
      constructor(callback, options) { this.callback = callback; this.options = options; this.disconnected = false }
      observe(el) {
        if (el.matches('.project-cover-title')) viewportEntries.set(el, this)
        else this.callback([{ isIntersecting: true, target: el }], this)
      }
      unobserve() {}
      disconnect() { this.disconnected = true }
    },
    ResizeObserver: class { observe() {} disconnect() {} },
    AudioContext: class { constructor() { throw new Error('no audio output in Node') } },
    Image: class { set src(_value) {} get complete() { return false } },
    devicePixelRatio: 1,
    innerWidth: 1440,
    innerHeight: 900,
    scrollY: 0,
    performance,
  })
  for (const canvas of document.querySelectorAll('canvas')) canvas.getContext = () => null

  /* linkedom plays nothing. Samples arrive in a fetched fragment, so the
     prototype is patched: play/pause/duration have to exist on audio nodes
     created after this harness runs. */
  const AudioProto = window.HTMLAudioElement?.prototype ?? window.HTMLElement.prototype
  const head = new WeakMap()
  Object.defineProperty(AudioProto, 'duration', {
    configurable: true,
    get() { return Number(this.closest?.('[data-duration]')?.dataset.duration ?? 0) },
  })
  Object.defineProperty(AudioProto, 'currentTime', {
    configurable: true,
    get() { return head.get(this) ?? 0 },
    set(value) { head.set(this, value) },
  })
  AudioProto.play = function play() { this.dispatchEvent(new window.Event('play')); return Promise.resolve() }
  AudioProto.pause = function pause() { this.dispatchEvent(new window.Event('pause')) }

  /* linkedom pins event.target to the dispatching object and will not let it be
     overwritten, but in a browser a keydown points at the focused element. The
     window listeners are captured and invoked with an event of our own, which is
     the only way to reproduce that detail here. */
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
    fetch: fetchFromDist,
  })

  // The suffix bypasses Node's module cache: every page starts from scratch.
  await import(`${bundleUrl}?run=${runIndex}`)

  for (const audio of document.querySelectorAll('audio')) {
    const own = { head: 0 }
    Object.defineProperties(audio, {
      duration: { configurable: true, get: () => Number(audio.closest('[data-duration]')?.dataset.duration ?? 0) },
      currentTime: { configurable: true, get: () => own.head, set: (value) => { own.head = value } },
    })
    audio.play = () => { audio.dispatchEvent(new window.Event('play')); return Promise.resolve() }
    audio.pause = () => { audio.dispatchEvent(new window.Event('pause')) }
  }

  const el = (id) => document.getElementById(id)
  return {
    document,
    el,
    all: (sel) => [...document.querySelectorAll(sel)],
    intersect(node, isIntersecting) {
      const observer = viewportEntries.get(node)
      if (observer && !observer.disconnected) observer.callback([{ isIntersecting, target: node }], observer)
      return observer?.options
    },
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
    /** Runs the live intervals for as many ticks as asked for. */
    tick(times = 1) {
      for (let i = 0; i < times; i++) for (const fn of [...intervals.values()]) fn()
    },
  }
}

function suite(page, dom) {
  const { el, all, fire, key, tick, document } = dom
  const check = (cond, msg) => {
    if (cond) { pass++; console.log(`  ✓ ${msg}`) }
    else { fail++; console.error(`  ✗ ${msg}`) }
  }

  console.log(`\n· Revelado (${page.lang})`)
  const reveals = all('.reveal')
  check(reveals.length > 0 && reveals.every((r) => r.classList.contains('is-in')),
    `all ${reveals.length} .reveal sections end up visible`)

  console.log('\n· Mobile navigation')
  const mobileNav = el('mobile-nav')
  const mobileLinks = mobileNav ? [...mobileNav.querySelectorAll('[data-nav]')] : []
  check(mobileLinks.length === 4, 'the compact menu keeps all four areas')
  if (mobileNav && mobileLinks[0]) {
    mobileNav.open = true
    fire(mobileLinks[0], 'click')
    check(mobileNav.open === false, 'the compact menu closes on navigating')
  }

  console.log('\n· Carousels')
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
      `${c.name}: ${slides.length} slides, starts on the first with only one active`)

    fire(el(c.next), 'click')
    check(activeCount() === 1 && activeIndex() === 1, `${c.name}: "next" advances without leaving two active`)

    const dots = all(c.dots)
    const activeDots = dots.filter((d) => d.classList.contains('is-active'))
    check(activeDots.length === 1 && dots.indexOf(activeDots[0]) === 1,
      `${c.name}: the indicator follows the slide`)

    if (c.counter) {
      const expected = `02 / ${String(slides.length).padStart(2, '0')}`
      check(el(c.counter).textContent === expected, `${c.name}: counter "${el(c.counter).textContent}"`)
    }

    for (let i = 1; i < slides.length; i++) fire(el(c.next), 'click')
    check(activeIndex() === 0, `${c.name}: wraps around on reaching the end`)
  }

  const projectSlides = all('.project-slide')
  const projectCarousel = el('project-carousel')
  check(projectSlides[0]?.dataset.project === 'youtube-transcriber',
    'the showcase starts with the inspectable Transcriber app')
  const projectTitle = projectSlides[0]?.querySelector('.project-cover-title')
  check(!projectTitle?.classList.contains('has-entered'), 'the first title does not animate during carousel boot')
  const visibilityOptions = dom.intersect(projectTitle, false)
  check(!projectTitle?.classList.contains('has-entered')
    && visibilityOptions?.rootMargin === '-72px 0px -12% 0px',
  'the title remains pending outside the visible viewport, not in the prefetch margin')
  dom.intersect(projectTitle, true)
  check(projectTitle?.classList.contains('has-entered'), 'entering the viewport enables the title animation')
  dom.intersect(projectTitle, false)
  check(projectTitle?.classList.contains('has-entered'), 'the one-shot reveal does not reset on leaving the viewport')
  fire(projectCarousel, 'keydown', { key: 'End' })
  check(projectSlides.at(-1)?.classList.contains('is-active')
    && projectSlides.filter((slide) => slide.getAttribute('aria-hidden') === 'false').length === 1,
  'End selects the final project and exposes exactly one slide to assistive technology')
  fire(projectCarousel, 'keydown', { key: 'Home' })
  check(projectSlides[0]?.classList.contains('is-active'), 'Home restores the first project')
  const repoLink = projectSlides[0]?.querySelector('.project-repo-link')
  fire(repoLink, 'keydown', { key: 'ArrowRight' })
  check(projectSlides[0]?.classList.contains('is-active'), 'arrow keys inside a project link do not navigate the carousel')
  check(all('#project-deck .project-reference').length === 1
    && !el('project-deck-next') && !el('project-deck-prev'),
  'the compact portfolio source remains visible without another carousel')
  const gameLevels = readFileSync('src/scripts/game/levels.ts', 'utf8')
  check(['#project-carousel', '#project-deck .project-reference'].every(selector =>
    document.querySelector(selector) && gameLevels.includes(`selector: '${selector}'`))
    && !gameLevels.includes('.project-grid-card'),
  'Game Mode project targets still resolve after compacting the source reference')

  console.log('\n· Draggable personal photos')
  const momentCard = document.querySelector('.moment-card')
  const momentImage = momentCard?.querySelector('.moment-img')
  const momentReset = el('moments-reset-btn')
  const momentOrigin = momentCard?.style.transform
  check(momentCard && momentImage?.getAttribute('draggable') === 'false',
    'the photographs explicitly disable the native drag')
  const nativeDrag = fire(momentImage, 'dragstart')
  check(nativeDrag.defaultPrevented, 'the deck cancels any native dragstart that reaches an image')
  fire(momentImage, 'pointerdown', {
    pointerId: 7,
    pointerType: 'mouse',
    button: 0,
    clientX: 100,
    clientY: 100,
  })
  fire(momentCard, 'pointermove', {
    pointerId: 7,
    pointerType: 'mouse',
    clientX: 112,
    clientY: 108,
  })
  check(momentCard.classList.contains('is-dragging') && momentCard.style.transform !== momentOrigin,
    'dragging from the photo itself moves the whole card')
  fire(momentCard, 'pointerup', {
    pointerId: 7,
    pointerType: 'mouse',
    clientX: 112,
    clientY: 108,
  })
  check(!momentCard.classList.contains('is-dragging'), 'releasing ends the gesture without leaving the card captured')
  fire(momentReset, 'click')
  check(momentCard.style.transform === momentOrigin
    && !momentCard.classList.contains('is-dragging', 'is-flying'),
  'rearranging keeps the original reset after dragging a photo')

  const momentCards = all('.moment-card')
  momentCards.forEach((card, i) => {
    card.getBoundingClientRect = () => ({
      x: 100, y: 100, left: 100, top: 100, right: 200, bottom: 240, width: 100, height: 140, toJSON: () => {},
    })
    Object.defineProperty(card, 'offsetWidth', { configurable: true, get: () => 100 })
    Object.defineProperty(card, 'offsetHeight', { configurable: true, get: () => 140 })
    card.style.zIndex = String(10 + i)
  })
  fire(document, 'pointermove', { pointerType: 'mouse', clientX: 150, clientY: 150 })
  const peeked = momentCards.filter((card) => card.classList.contains('is-peeked'))
  check(
    peeked.length === 1 && peeked[0] === momentCards[momentCards.length - 1],
    'overlapping photos peek only the top card',
  )
  fire(document, 'pointermove', { pointerType: 'mouse', clientX: 160, clientY: 170 })
  check(
    momentCards.filter((card) => card.classList.contains('is-peeked')).length === 1
      && momentCards[momentCards.length - 1].classList.contains('is-peeked'),
    'moving inside the top card does not flip the stack',
  )
  fire(document, 'pointermove', { pointerType: 'mouse', clientX: 10, clientY: 10 })
  check(momentCards.every((card) => !card.classList.contains('is-peeked')),
    'leaving the stack unpeeks')

  fire(momentCards[0], 'focus')
  check(momentCards[0].classList.contains('is-peeked'), 'keyboard focus peeks the card')
  fire(momentCards[0], 'keydown', { key: 'Enter' })
  check(momentCards[0].classList.contains('is-flipped'), 'Enter pins the back face')
  fire(momentCards[0], 'keydown', { key: ' ' })
  check(!momentCards[0].classList.contains('is-flipped'), 'Space unpins it')
  fire(momentCards[0], 'blur')
  check(!momentCards[0].classList.contains('is-peeked'), 'blur unpeeks when the pointer is elsewhere')

  console.log('\n· Experience tabs')
  const jobTabs = all('.job-tab')
  const jobPanels = all('.job-panel')
  check(jobPanels.filter((p) => p.classList.contains('is-active')).length === 1, 'it starts with one active panel')
  fire(jobTabs[1], 'click')
  check(jobPanels[1].classList.contains('is-active') && !jobPanels[0].classList.contains('is-active'),
    'pressing the second company switches the panel')
  check(jobTabs[1].getAttribute('aria-selected') === 'true' && jobTabs[0].getAttribute('aria-selected') === 'false',
    'aria-selected follows the visual state')
  const linkedExperienceChips = all('#job-panels a.project-tech-chip')
  const contextualExperienceChips = all('#job-panels span.project-tech-label')
  check(linkedExperienceChips.length > 0, 'recognised technologies keep their logo, colour and link')
  check(
    contextualExperienceChips.length > 0
      && contextualExperienceChips.every((chip) => chip.querySelector('.project-tech-marker') && !chip.closest('a')),
    'concepts with no link keep the same visual pattern',
  )

  console.log('\n· Profile workbench')
  const files = all('[data-profile-tab]')
  const panels = all('[data-profile-panel]')
  fire(files[1], 'click')
  check(panels[1].hidden === false && panels[0].hidden === true, 'changing file changes the panel')
  check(
    el('profile-tab-label').textContent === (page.lang === 'es' ? 'ingenieria.md' : 'engineering.md'),
    'the tab label updates',
  )

  /*
   * The placeholder lists the accepted commands, so exactly those get typed: if
   * any of them opened a different panel, the box would be promising something
   * it does not deliver.
   */
  const runCommand = (value) => {
    el('profile-command-input').value = value
    fire(el('profile-command'), 'submit')
    return el('profile-tab-label').textContent
  }
  const advertised = el('profile-command-input').getAttribute('placeholder')
  const commands = advertised.replace(/^[^:]*:\s*/, '').split(',').map((c) => c.trim())
  const expected = page.lang === 'es'
    ? ['identidad.json', 'ingenieria.md', 'aprendizaje.log']
    : ['identity.json', 'engineering.md', 'learning.log']
  check(commands.length === 3, `the placeholder advertises three commands ("${advertised}")`)
  commands.forEach((commandText, index) => {
    check(runCommand(commandText) === expected[index],
      `"${commandText}" opens ${expected[index]}`)
  })
  fire(files[0], 'click')

  console.log('\n· Typewriter headline')
  const typed = el('hero-typewriter')
  check(typed.childNodes.length === 2, 'the headline is left as two stable nodes (text + name)')
  check(typed.textContent.trim() === '', 'it starts empty and gets typed out by timers')

  console.log('\n· Speed trial')
  const spans = () => all('#monkey-words .monkey-char')
  check(spans().length > 20, `the phrase is painted character by character (${spans().length} spans)`)
  check(spans().filter((s) => s.classList.contains('current')).length === 1, 'there is exactly one cursor')

  const quote = spans().map((s) => s.textContent).join('')
  check(
    page.speedTrialStarts.some((start) => quote.startsWith(start)),
    `the trial phrase matches the ${page.lang} language ("${quote}")`,
  )
  check(
    el('kb-tab-speed').textContent.includes(page.speedTrialLabel),
    `the speed mode uses the ${page.lang} label ("${el('kb-tab-speed').textContent.trim()}")`,
  )
  key('keydown', { code: 'KeyX', key: quote[0], target: el('monkey-box') })
  check(!spans()[0].classList.contains('correct'), 'typing does nothing until the trial is started')
  fire(el('monkey-start-btn'), 'click')
  check(el('monkey-box').classList.contains('is-live'), 'Comenzar puts the board live')
  key('keydown', { code: 'KeyX', key: quote[0], target: el('monkey-box') })
  check(spans()[0].classList.contains('correct'), 'the first correct letter is marked as a hit')
  check(spans()[1].classList.contains('current'), 'the cursor advances')
  key('keydown', { code: 'KeyZ', key: '±', target: el('monkey-box') })
  check(spans()[1].classList.contains('incorrect'), 'a wrong letter is marked as a miss')
  key('keydown', { code: 'Backspace', key: 'Backspace', target: el('monkey-box') })
  check(spans()[1].classList.contains('current') && !spans()[1].classList.contains('incorrect'),
    'backspace clears the mark and moves the cursor back')

  // The drawn keyboard shares its key mapping with the physical one.
  const drawnKey = (code) => document.querySelector(`#kb [data-code="${code}"]`)
  const before = spans().filter((s) => s.classList.contains('correct')).length
  fire(drawnKey(`Key${quote[1].toUpperCase()}`) ?? drawnKey('KeyA'), 'mousedown')
  check(spans().filter((s) => s.classList.contains('correct')).length === before + 1,
    'pressing a drawn key counts the same as the physical keyboard')

  /*
   * Once time is up the score is final. Without that closure, typing on
   * restarted the clock: the countdown went negative and the origin of the WPM
   * calculation moved, so what had already been typed stopped counting.
   */
  const marked = () => spans().filter((s) => s.classList.contains('correct') || s.classList.contains('incorrect')).length
  tick(30)
  check(el('kb-timer').textContent === '⏱️ 0s', `the countdown reaches zero ("${el('kb-timer').textContent}")`)
  const atEnd = marked()
  key('keydown', { code: 'KeyQ', key: quote[atEnd] ?? 'a', target: el('monkey-box') })
  check(marked() === atEnd, 'once the round is over the board stops accepting keystrokes')
  tick(5)
  check(el('kb-timer').textContent === '⏱️ 0s', 'and the clock does not carry on into negative numbers')

  fire(el('monkey-restart-btn'), 'click')
  check(el('kb-timer').textContent === '⏱️ 30s' && marked() === 0, 'restarting returns the round to zero')
  fire(el('monkey-start-btn'), 'click')
  key('keydown', { code: 'KeyW', key: spans()[0].textContent, target: el('monkey-box') })
  check(spans()[0].classList.contains('correct'), 'and it counts what gets typed once more')

  console.log('\n· Free play')
  fire(el('kb-tab-sim'), 'click')
  check(el('kb-free-mode-wrap').classList.contains('hidden') === false, 'the tab shows the sandbox')
  key('keydown', { code: 'KeyH', key: 'h', target: el('free-sim-box') })
  key('keydown', { code: 'KeyI', key: 'i', target: el('free-sim-box') })
  check(el('free-sim-text').textContent === 'hi', `the free text accumulates ("${el('free-sim-text').textContent}")`)
  check(el('kb-free-count').textContent === '2', 'the keystroke counter goes up')
  check(el('kb-free-last-key').textContent === '[ I ]', `last key "${el('kb-free-last-key').textContent}"`)
  // The physical Enter inserts a space; the drawn key writes its glyph.
  key('keydown', { code: 'Enter', key: 'Enter', target: el('free-sim-box') })
  check(el('free-sim-text').textContent === 'hi ', 'Enter on the physical keyboard inserts a space')
  fire(drawnKey('Enter'), 'mousedown')
  check(el('free-sim-text').textContent === 'hi ⏎', 'the drawn key writes its own glyph')
  fire(el('free-sim-clear-btn'), 'click')
  check(el('free-sim-text').textContent === '' && el('kb-free-count').textContent === '0',
    'clearing returns the sandbox to zero')

  console.log('\n· Keyboard controls')
  const profileLabels = page.lang === 'es'
    ? ['Con clic (sonido nítido)', 'Táctil (sonido seco)', 'Lineal (sonido grave)']
    : ['Clicky (Crisp)', 'Tactile (Pop)', 'Linear (Thock)']
  check(el('kb-switch-type').textContent.trim() === profileLabels[2],
    'the initial switch selector is localized')
  for (const label of profileLabels) {
    fire(el('kb-switch-type'), 'click')
    check(el('kb-switch-type').textContent === label
      && el('kb-free-sound-pill').textContent === `🔊 ${label}`,
      `selector and sandbox pill share the localized profile "${label}"`)
  }
  fire(el('kb-sound-toggle'), 'click')
  check(el('kb-sound-label').textContent === page.soundOff, `the toggle uses i18n ("${el('kb-sound-label').textContent}")`)
  fire(el('kb-sound-toggle'), 'click')
  check(el('kb-sound-label').textContent === page.soundOn, 'and it returns to the initial state')

  console.log('\n· Game mode does not share the keyboard')
  const setGameMode = (on) => {
    document.documentElement.classList.toggle('game-mode-active', on)
    document.dispatchEvent(new window.CustomEvent('game-mode-change', { detail: { active: on } }))
  }
  fire(el('kb-tab-speed'), 'click')
  fire(el('monkey-start-btn'), 'click')
  const liveQuote = spans().map((s) => s.textContent).join('')
  key('keydown', { code: 'KeyX', key: liveQuote[0], target: el('monkey-box') })
  const hitsBeforeGame = spans().filter((s) => s.classList.contains('correct')).length
  tick(2)
  const timerBeforePause = el('kb-timer').textContent
  setGameMode(true)
  key('keydown', { code: 'KeyX', key: liveQuote[1] ?? 'a', target: el('monkey-box') })
  check(spans().filter((s) => s.classList.contains('correct')).length === hitsBeforeGame,
    'with game mode on, typing does not mark the speed trial')
  const drawnProbe = drawnKey('KeyQ')
  drawnProbe.classList.remove('is-down')
  key('keydown', { code: 'KeyQ', key: 'q' })
  check(!drawnProbe.classList.contains('is-down'), 'with game mode on, keys do not light up')
  fire(drawnProbe, 'mousedown')
  check(spans().filter((s) => s.classList.contains('correct')).length === hitsBeforeGame,
    'and clicking a drawn key is ignored too')
  tick(5)
  check(el('kb-timer').textContent === timerBeforePause, 'and the trial clock is frozen')
  setGameMode(false)
  key('keydown', { code: 'KeyX', key: liveQuote[1] ?? 'a', target: el('monkey-box') })
  check(spans().filter((s) => s.classList.contains('correct')).length === hitsBeforeGame + 1,
    'leaving game mode returns typing to the trial')
  tick(1)
  check(el('kb-timer').textContent !== timerBeforePause, 'and the clock runs again')

  console.log('\n· Build archive')
  fire(el('kb-tab-photos'), 'click')
  check(el('kb-panel-photos').classList.contains('hidden') === false && el('kb-panel-interactive').classList.contains('hidden'),
    'the photos tab opens the archive and hides the speed trial')

  const buildGallery = document.querySelector('[data-bx-gallery]')
  const buildViewer = document.querySelector('[data-bx-viewer]')
  const buildRoot = document.querySelector('[data-kb-build-explorer]')
  const buildOpen = document.querySelector('[data-bx-open]')
  const buildClose = document.querySelector('[data-bx-close]')
  const buildCards = [...document.querySelectorAll('.bx-build-card')]
  const firstBuildCarousel = document.querySelector('[data-bx-card-carousel]')
  const buildCardPrevious = firstBuildCarousel.querySelector('[data-bx-card-prev]')
  const buildCardNext = firstBuildCarousel.querySelector('[data-bx-card-next]')
  const buildCardCounter = firstBuildCarousel.querySelector('[data-bx-card-counter]')
  const buildCardSlides = [...firstBuildCarousel.querySelectorAll('[data-bx-card-slide]')]
  const buildCardDots = [...firstBuildCarousel.querySelectorAll('[data-bx-card-dot]')]
  const hhkbBuildOpen = document.querySelector('[data-bx-open="hhkb-professional-hybrid-type-s"]')
  const hhkbCarousel = hhkbBuildOpen.closest('.bx-build-card').querySelector('[data-bx-card-carousel]')
  const evoBuildOpen = document.querySelector('[data-bx-open="evo75"]')
  const evoCarousel = evoBuildOpen.closest('.bx-build-card').querySelector('[data-bx-card-carousel]')
  const evoSlides = [...evoCarousel.querySelectorAll('[data-bx-card-slide]')]
  const evoImages = [...evoCarousel.querySelectorAll('img')]
  const evoNext = evoCarousel.querySelector('[data-bx-card-next]')
  const evoPrevious = evoCarousel.querySelector('[data-bx-card-prev]')
  const evoCounter = evoCarousel.querySelector('[data-bx-card-counter]')
  const evoDots = [...evoCarousel.querySelectorAll('[data-bx-card-dot]')]
  const corneBuildOpen = document.querySelector('[data-bx-open="corne-v4"]')
  const corneCard = corneBuildOpen.closest('.bx-build-card')
  const corneCarousel = corneBuildOpen.closest('.bx-build-card').querySelector('[data-bx-card-carousel]')
  const buildAssembled = document.querySelector('[data-bx-assembled-view]')
  const buildExplode = document.querySelector('[data-bx-explode]')
  const firstBuildPart = document.querySelector('[data-bx-part-button]')
  const firstBuildLayer = document.querySelector('[data-bx-part="keycaps"]')
  const buildStage = document.querySelector('[data-bx-stage]')
  const buildModel = document.querySelector('[data-bx-model]')
  const neoPanel = document.querySelector('[data-bx-build="neo65"]')
  const otherBuildPanels = [...document.querySelectorAll('[data-bx-build]:not([data-bx-build="neo65"])')]

  check(buildOpen && buildViewer?.hidden === true, 'the gallery holds the Neo65 and the viewer starts closed')
  check(neoPanel.querySelectorAll('.bx-model-key').length === 67
    && neoPanel.querySelectorAll('.bx-key-art').length === 13
    && neoPanel.querySelectorAll('.bx-model-key small').length === 12,
  'the Neo65 reproduces its 67 keycaps, novelties and double legends')
  check(otherBuildPanels.every((panel) =>
    panel.querySelector('.bx-key-art, .is-neo-blue, .is-neo-red') === null),
  'the Neo65 colorway and novelties do not leak into the other models')
  check(buildCards.length === 4
    && buildCards.filter((card) => card.classList.contains('is-complete')).length === 3
    && buildCards.filter((card) => card.classList.contains('is-in-progress')).length === 1
    && buildCards.filter((card) => card.classList.contains('is-scaffold')).length === 0
    && buildCards.filter((card) => card.classList.contains('is-planning')).length === 0,
  'the archive presents three finished builds and the Corne V4 in progress')
  const archiveStatus = buildRoot.querySelector('[data-bx-status]').textContent.toUpperCase()
  check(archiveStatus.includes(page.lang === 'es' ? '04 MONTAJES' : '04 BUILDS')
    && archiveStatus.includes(page.lang === 'es' ? '03 COMPLETOS' : '03 COMPLETED'),
  'the header distinguishes the total builds from the finished ones')
  check(corneCard.classList.contains('is-in-progress')
    && corneCard.textContent.includes(page.lang === 'es' ? 'EN CONSTRUCCIÓN' : 'BUILD IN PROGRESS')
    && !corneCard.textContent.includes(page.lang === 'es' ? 'MONTAJE REAL' : 'REAL BUILD'),
  'the Corne card states that the physical build is still in progress')
  check(hhkbCarousel.querySelectorAll('[data-bx-card-slide]').length === 1
    && hhkbCarousel.querySelector('[data-bx-card-prev]') === null
    && hhkbCarousel.querySelector('[data-bx-card-next]') === null
    && hhkbCarousel.querySelector('[data-bx-card-dot]') === null,
  'the HHKB uses its single real photo with no redundant carousel controls')
  check(evoSlides.length === 2
    && evoImages.length === 2
    && evoImages.every((image, index) => image.getAttribute('src').includes(`evo${index + 1}.`))
    && evoImages.every((image) => image.getAttribute('alt').includes('EVO75')),
  'the EVO75 replaces the Neo65 placeholders with its two real photographs')
  fire(evoNext, 'click')
  check(evoSlides[0].hidden && !evoSlides[1].hidden
    && evoCounter.textContent === '02 / 02'
    && evoDots[1].getAttribute('aria-current') === 'true'
    && evoCarousel.textContent.includes(page.lang === 'es' ? 'PESO TRASERO' : 'REAR WEIGHT'),
  'the EVO75 carousel walks the assembled view and the rear weight')
  fire(evoPrevious, 'click')
  check(!evoSlides[0].hidden && evoCounter.textContent === '01 / 02',
    'the EVO75 returns to its assembled photograph without enlarging the image')
  check(corneCarousel.querySelectorAll('[data-bx-card-slide]').length === 1
    && corneCarousel.querySelectorAll('img').length === 1
    && corneCarousel.querySelector('img').getAttribute('src').includes('corne.')
    && corneCarousel.querySelector('img').getAttribute('alt').includes('Corne V4')
    && corneCarousel.querySelector('[data-bx-card-prev]') === null
    && corneCarousel.querySelector('[data-bx-card-next]') === null,
  'the Corne V4 uses its single real photograph with no redundant controls')
  fire(buildCardNext, 'click')
  check(buildCardSlides.length === 2 && buildCardSlides[0].hidden && !buildCardSlides[1].hidden
    && buildCardCounter.textContent === '02 / 02' && buildCardDots[1].getAttribute('aria-current') === 'true',
  'the cover walks both new photographs and updates its accessible state')
  fire(buildCardPrevious, 'click')
  check(!buildCardSlides[0].hidden && buildCardCounter.textContent === '01 / 02',
    'the previous arrow returns to the Neo65 main image')
  check(document.querySelector('[data-bx-photo-view]') === null,
    'the detail view does not duplicate the photographs in a third mode')
  fire(buildOpen, 'click')
  check(buildGallery.hidden === true && buildViewer.hidden === false, 'opening the Neo65 enters the viewer')
  check(buildAssembled.getAttribute('aria-pressed') === 'true' && buildRoot.style.getPropertyValue('--spread') === '0',
    'the build enters straight into the assembled view')
  fire(buildExplode, 'click')
  check(buildRoot.classList.contains('is-exploded') && buildExplode.getAttribute('aria-pressed') === 'true',
    'the explode control pulls the layers apart and updates its accessible state')

  fire(firstBuildLayer, 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 1, clientX: 100, clientY: 100 })
  fire(buildStage, 'pointerup', { pointerId: 1, clientX: 100, clientY: 100 })
  check(firstBuildPart.getAttribute('aria-pressed') === 'true', 'a short click on a layer pins it')
  fire(firstBuildPart, 'click')

  const modelStyle = buildModel.getAttribute('style')
  fire(firstBuildLayer, 'pointerdown', { pointerType: 'mouse', button: 0, pointerId: 2, clientX: 100, clientY: 100 })
  fire(buildStage, 'pointermove', { pointerId: 2, clientX: 145, clientY: 78 })
  fire(buildStage, 'pointerup', { pointerId: 2, clientX: 145, clientY: 78 })
  check(buildModel.getAttribute('style') !== modelStyle && !buildStage.classList.contains('is-dragging'),
    'dragging from a layer orbits and releases the pointer when it ends')
  check(firstBuildPart.getAttribute('aria-pressed') === 'false', 'orbiting does not accidentally pin the layer')
  check(fire(buildStage, 'selectstart').defaultPrevented, 'the viewer blocks the native selection during the interaction')

  fire(firstBuildPart, 'click')
  check(buildRoot.classList.contains('has-active') && firstBuildPart.getAttribute('aria-pressed') === 'true',
    'selecting a part isolates it and keeps its control pressed')

  /*
   * The parts list is a compact index and does not show the spec: the model's
   * chip shows it when a layer is selected. When the `<small>` that held it
   * disappeared from the markup, the chip went blank with nothing to say so,
   * which is why it is checked here that the data really arrives.
   */
  const chipSpec = () => document.querySelector('[data-bx-build]:not([hidden]) [data-bx-chip-spec]').textContent.trim()
  const chipLabel = () => document.querySelector('[data-bx-build]:not([hidden]) [data-bx-chip-label]').textContent.trim()
  const openParts = [...document.querySelectorAll('[data-bx-build]:not([hidden]) [data-bx-part-button]')]
  check(openParts.every((part) => (part.dataset.bxPartSpec ?? '').trim().length > 0),
    `all ${openParts.length} parts of the build carry their spec in the markup`)
  const named = openParts.find((part) => part !== firstBuildPart) ?? firstBuildPart
  fire(named, 'click')
  check(chipSpec() === named.dataset.bxPartSpec && chipLabel() === named.querySelector('strong').textContent,
    `the chip describes the selected part ("${chipLabel()} — ${chipSpec()}")`)
  fire(named, 'click')

  const buildRange = document.querySelector('[data-bx-range]')
  const buildRangeOut = document.querySelector('[data-bx-range-out]')
  buildRange.value = '40'
  fire(buildRange, 'input')
  check(buildRoot.style.getPropertyValue('--spread') === '0.4' && buildRangeOut.textContent === '40%',
    'the slider pulls the layers apart continuously')
  check(buildExplode.getAttribute('aria-pressed') === 'false' && buildAssembled.getAttribute('aria-pressed') === 'false',
    'at half explode no preset declares itself active')
  check(el('kb-panel-photos').querySelector('[data-bx-status]').textContent.includes('40%'),
    'the status label says where the explode currently stands')

  fire(buildAssembled, 'click')
  const beforeOrbit = buildModel.getAttribute('style')
  fire(buildStage, 'keydown', { key: 'ArrowRight' })
  check(buildModel.getAttribute('style') !== beforeOrbit, 'the arrow keys orbit the model without a mouse')
  fire(buildStage, 'keydown', { key: 'PageUp' })
  check(Number(buildRoot.style.getPropertyValue('--spread')) > 0, 'page down pulls the layers apart from the keyboard')

  fire(buildRoot, 'keydown', { key: 'Escape' })
  check(buildGallery.hidden === false && buildViewer.hidden === true, 'Escape leaves the viewer')

  fire(buildOpen, 'click')
  fire(buildClose, 'click')
  check(buildGallery.hidden === false && buildViewer.hidden === true && !buildRoot.classList.contains('is-exploded'),
    'returning to the gallery resets the viewer')
  check(buildRoot.style.getPropertyValue('--spread') === '0' && !buildRoot.classList.contains('has-active'),
    'and leaves the explode and the isolation at zero')

  fire(hhkbBuildOpen, 'click')
  const hhkbPanel = document.querySelector('[data-bx-build="hhkb-professional-hybrid-type-s"]')
  const hhkbPartIds = [...hhkbPanel.querySelectorAll('[data-bx-part]')]
    .map((part) => part.getAttribute('data-bx-part'))
  check(hhkbPanel.hidden === false
    && hhkbPanel.getAttribute('data-layout') === 'hhkb'
    && hhkbPartIds.length === 7
    && ['keycaps', 'sliders', 'housing', 'domes', 'springs', 'pcb', 'case'].every((id) => hhkbPartIds.includes(id)),
  'the HHKB uses the seven real layers of its Topre architecture')
  check(hhkbPanel.querySelectorAll('.bx-model-key').length === 60
    && hhkbPanel.querySelectorAll('.bx-topre-slider').length === 60
    && hhkbPanel.querySelectorAll('.bx-topre-dome').length === 60
    && hhkbPanel.querySelectorAll('.bx-topre-spring').length === 60
    && hhkbPanel.querySelectorAll('.bx-cap-pad').length === 60,
  'the HHKB model depicts its 60 keys, sliders, domes, springs and capacitive pads')
  const hhkbLegends = [...hhkbPanel.querySelectorAll('.bx-model-key > span')]
  check(hhkbPanel.querySelectorAll('.bx-model-key.is-wasabi').length === 38
    && hhkbPanel.querySelectorAll('.bx-model-key.is-snow').length === 22
    && hhkbLegends.length === 12
    && hhkbLegends.every((legend) => legend.parentElement.classList.contains('is-snow')),
  'the HHKB keeps 38 Wasabi keycaps, 22 Snow, and leaves everything blank but the number row')
  check(hhkbPanel.querySelectorAll('.bx-model-key small').length === 12
    && hhkbPanel.querySelectorAll('.bx-key-function').length === 12
    && hhkbPanel.querySelector('.bx-key-function').textContent === 'F1'
    && [...hhkbPanel.querySelectorAll('.bx-key-function')].at(-1).textContent === 'F12'
    && [...document.querySelectorAll('[data-bx-build]:not([data-layout="hhkb"])')]
      .every((panel) => panel.querySelector('.bx-key-function') === null),
  'the twelve marked keys carry symbol and F1–F12 function on the HHKB alone')
  check(hhkbPanel.querySelector('.bx-prototype-note') === null
    && hhkbPanel.querySelector('.bx-detail-status')
    && hhkbPanel.querySelectorAll('.bx-model-key.is-wasabi').length > 0
    && (hhkbPanel.textContent.includes('hand-lubed') || hhkbPanel.textContent.includes('lubricadas a mano')),
  'the detail presents the finished build, the Snow/Wasabi mix and the hand lubing')
  fire(buildClose, 'click')

  fire(evoBuildOpen, 'click')
  const evoPanel = document.querySelector('[data-bx-build="evo75"]')
  const evoPartIds = [...evoPanel.querySelectorAll('[data-bx-part]')]
    .map((part) => part.getAttribute('data-bx-part'))
  check(evoPanel.hidden === false
    && evoPanel.getAttribute('data-layout') === 'evo75'
    && evoPartIds.length === 10
    && ['keycaps', 'top-case', 'switches', 'plate', 'mount', 'pcb', 'dampening', 'battery', 'bottom-case', 'weight']
      .every((id) => evoPartIds.includes(id)),
  'the EVO75 uses ten layers of its own stock architecture')
  check(evoPanel.querySelectorAll('.bx-model-key').length === 80
    && evoPanel.querySelectorAll('.bx-switch').length === 80
    && evoPanel.querySelectorAll('.bx-socket').length === 80
    && evoPanel.querySelectorAll('.bx-evo-leaf').length === 8
    && evoPanel.querySelectorAll('.bx-evo-cell').length === 2,
  'the EVO75 model depicts 80 keys, switches and sockets, eight feet and two batteries')
  check(evoPanel.querySelector('.bx-prototype-note') === null
    && evoPanel.querySelectorAll('.bx-model-key.is-evo-red').length === 3
    && evoPanel.querySelectorAll('.bx-evo-grille').length === 2
    && (evoPanel.textContent.includes('factory preassembled') || evoPanel.textContent.includes('premontado de fábrica'))
    /* The internal pairing stopped being an unknown: the one actually fitted is
       named, and the alternative is no longer offered as if it were still open. */
    && evoPanel.textContent.includes('Neo Rye')
    && (evoPanel.textContent.includes('polypropylene') || evoPanel.textContent.includes('polipropileno'))
    && !/unrecorded|no registrad|Amber/i.test(evoPanel.textContent),
  'the EVO75 detail keeps the real colorway, states the factory condition and names the fitted pairing')
  fire(buildClose, 'click')

  fire(corneBuildOpen, 'click')
  const cornePanel = document.querySelector('[data-bx-build="corne-v4"]')
  const cornePartIds = [...cornePanel.querySelectorAll('[data-bx-part]')]
    .map((part) => part.getAttribute('data-bx-part'))
  check(cornePanel.hidden === false
    && cornePanel.getAttribute('data-layout') === 'corne'
    && cornePartIds.length === 8
    && ['keycaps', 'switches', 'plate', 'pcb', 'interconnect', 'spacers', 'bottom-case', 'feet']
      .every((id) => cornePartIds.includes(id)),
  'the Corne V4 uses the eight parts of its own wired split architecture')
  check(cornePanel.querySelectorAll('.bx-model-key').length === 42
    && cornePanel.querySelectorAll('.bx-switch').length === 42
    && cornePanel.querySelectorAll('.bx-socket').length === 42
    && cornePanel.querySelectorAll('.bx-corne-mcu').length === 2
    && cornePanel.querySelectorAll('.bx-corne-standoff').length === 8
    && cornePanel.querySelectorAll('.bx-corne-foot').length === 8,
  'the Corne model depicts 42 keys, two RP2040s, eight standoffs and eight feet')
  check(cornePanel.querySelector('.bx-prototype-note') === null
    && cornePanel.querySelector('.bx-corne-cable')
    && cornePanel.textContent.includes(page.lang === 'es' ? 'EN CONSTRUCCIÓN' : 'BUILD IN PROGRESS')
    && (cornePanel.textContent.includes('no batteries') || cornePanel.textContent.includes('no lleva baterías'))
    && (cornePanel.textContent.includes('Direct GPIO') || cornePanel.textContent.includes('GPIO directo')),
  'the Corne detail documents TRRS, direct matrix and the absence of native wireless')
  fire(buildClose, 'click')

  console.log('\n· Sound samples')
  const clipRow = (clip) => document.querySelector(`[data-bx-clip="${clip}"]`)
  const clipPart = (clip, sel) => clipRow(clip).querySelector(sel)
  const played = (clip) => clipRow(clip).style.getPropertyValue('--played')
  const neoToggle = clipPart('neo65', '[data-bx-clip-toggle]')
  const hhkbToggle = clipPart('hhkb', '[data-bx-clip-toggle]')
  const neoSeek = clipPart('neo65', '[data-bx-clip-seek]')
  const neoAudio = clipPart('neo65', '[data-bx-clip-audio]')
  const neoNow = clipPart('neo65', '[data-bx-clip-now]')

  check(document.querySelectorAll('[data-bx-clip]').length === 3
    && [...document.querySelectorAll('[data-bx-clip]')].every((c) => c.closest('[data-bx-build]'))
    && played('neo65') === '0.00%' && neoNow.textContent === '0:00',
    'every build carries its sample inside its card, and starts at zero')

  fire(neoToggle, 'click')
  check(clipRow('neo65').classList.contains('is-playing')
    && neoToggle.getAttribute('aria-label') === neoToggle.dataset.pause,
    'pressing plays the sample and the button switches to offering pause')

  fire(hhkbToggle, 'click')
  check(clipRow('hhkb').classList.contains('is-playing')
    && !clipRow('neo65').classList.contains('is-playing')
    && neoToggle.getAttribute('aria-label') === neoToggle.dataset.play,
    'starting another sample stops the previous one: they are compared one at a time')

  fire(hhkbToggle, 'click')
  check(!clipRow('hhkb').classList.contains('is-playing'),
    'pressing again pauses the sample that was playing')

  neoSeek.value = '500'
  fire(neoSeek, 'input')
  check(played('neo65') === '50.00%'
    && neoNow.textContent === '0:05'
    && Math.abs(neoAudio.currentTime - 5.385) < 0.01
    && neoSeek.getAttribute('aria-valuetext') === '0:05',
    'dragging the playhead moves playback, waveform and time together')

  fire(neoToggle, 'click')
  fire(neoAudio, 'ended')
  check(!clipRow('neo65').classList.contains('is-playing')
    && played('neo65') === '0.00%'
    && neoAudio.currentTime === 0,
    'when the sample ends the row switches off and returns to the start')

  check(clipPart('neo65', 'source').getAttribute('type') === 'audio/mp4'
    && clipRow('neo65').querySelectorAll('source').length === 2,
    'every sample offers AAC first and MP3 as a fallback')

  fire(neoToggle, 'click')
  fire(buildClose, 'click')
  check(!clipRow('neo65').classList.contains('is-playing'),
    'leaving the build silences its sample: a keyboard nobody is looking at stops playing')

  fire(neoToggle, 'click')
  fire(evoBuildOpen, 'click')
  check(!clipRow('neo65').classList.contains('is-playing'),
    'switching build silences it too')
  fire(buildClose, 'click')

  console.log('\n· Mascot note')
  const quipRow = clipRow('neo65').closest('[data-bx-build]')
  const quip = quipRow.querySelector('[data-bx-quip]')
  const quipPoke = quip.querySelector('[data-bx-quip-next]')
  const quipText = quip.querySelector('[data-bx-quip-text]')
  const quipLines = JSON.parse(quipPoke.dataset.quips)

  check(quipLines.length >= 2 && quipLines.includes(quipText.textContent),
    'the mascot starts by saying one of its notes')

  const saidFirst = quipText.textContent
  fire(quipPoke, 'click')
  check(quipText.textContent !== saidFirst && quipLines.includes(quipText.textContent),
    'pressing it moves to the next note, and it stays its own')

  const quipAudio = quipRow.querySelector('[data-bx-clip-audio]')
  fire(quipAudio, 'play')
  check(quip.classList.contains('is-listening')
    && quipText.textContent === quipPoke.dataset.listen,
    'when the sample plays it falls quiet and starts listening')

  fire(quipAudio, 'pause')
  check(!quip.classList.contains('is-listening') && quipLines.includes(quipText.textContent),
    'on stopping it goes back to its note')

  /* The Corne has neither a take nor notes: it is the control proving the
     ornament depends on the content and does not just show up. */
  check(document.querySelector('[data-bx-build="corne-v4"] [data-bx-quip]') === null
    && document.querySelectorAll('[data-bx-quip]').length === 3,
    'the mascot peeks out on the three recorded builds and on no other')

  console.log('\n· Card as target')
  const neoCard = document.querySelector('[data-bx-open="neo65"].bx-build-card')
  const neoCardPhoto = neoCard.querySelector('.bx-card-photo, .bx-card-slide')
  const neoCardTitle = neoCard.querySelector('.bx-card-id strong')

  fire(neoCardPhoto, 'click')
  check(buildViewer.hidden === false && document.querySelector('[data-bx-build="neo65"]').hidden === false,
    'pressing the photograph opens the build, without going through the button')
  fire(buildClose, 'click')

  fire(neoCardTitle, 'click')
  check(buildViewer.hidden === false && document.querySelector('[data-bx-build="neo65"]').hidden === false,
    'pressing the title enters too')
  fire(buildClose, 'click')

  /* The carousel's controls stay its own: they move the photo and open nothing. */
  const evoCardNext = evoCarousel.querySelector('[data-bx-card-next]')
  fire(evoCardNext, 'click')
  check(buildViewer.hidden === true && evoCounter.textContent.trim() === '02 / 02',
    'the carousel arrow changes photo without opening the build')

  fire(evoCarousel.querySelector('[data-bx-card-dot="0"]'), 'click')
  check(buildViewer.hidden === true && evoCounter.textContent.trim() === '01 / 02',
    'the carousel dots do not open the build either')

  console.log('\n· Contact')
  check(el('copy-mail').hidden === false, 'the copy-email button is revealed by the JS')
  check(el('copy-mail').textContent.trim().startsWith('📋'), 'the button keeps its icon after mounting')
  check(el('local-time').textContent.includes('Barcelona'), `the clock fills in ("${el('local-time').textContent}")`)
  check(/^UTC[+-]\d+$/.test(el('local-offset').textContent), `the offset is derived from the zone ("${el('local-offset').textContent}")`)
}

async function demoFullscreenSuite() {
  console.log('\n· Demo fullscreen enhancement')
  const check = (condition, label) => {
    if (condition) { pass++; console.log(`  ✓ ${label}`) }
    else { fail++; console.error(`  ✗ ${label}`) }
  }
  const source = readFileSync('src/components/CaseDemo.astro', 'utf8').match(/<script>([\s\S]*?)<\/script>/)?.[1]
  if (!source) throw new Error('CaseDemo must expose its fullscreen enhancement for verification')
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  const previousDocument = globalThis.document
  try {
    for (const mode of ['standard', 'webkit', 'unsupported', 'rejected']) {
      let listener
      let requests = 0
      let reject = mode === 'rejected'
      const video = { currentTime: 17, paused: true }
      if (mode === 'webkit') video.webkitEnterFullscreen = () => { requests++ }
      else video.requestFullscreen = async () => {
        requests++
        if (reject) throw new Error('Fullscreen permission denied')
      }
      const expand = { hidden: true, addEventListener: (event, callback) => {
        if (event !== 'click') throw new Error(`Unexpected fullscreen trigger: ${event}`)
        listener = callback
      } }
      const error = { hidden: true }
      globalThis.document = {
        fullscreenEnabled: ['standard', 'rejected'].includes(mode),
        querySelector: selector => ({
          '#demo video': video, '[data-demo-fullscreen]': expand, '[data-demo-error]': error,
        })[selector],
      }
      await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}#${mode}`)
      check(requests === 0 && video.paused, `${mode}: initialization never starts playback or fullscreen`)
      if (mode === 'unsupported') {
        check(expand.hidden && !listener, 'unsupported fullscreen leaves only native controls and the current download')
        continue
      }
      check(!expand.hidden && typeof listener === 'function', `${mode}: an available API reveals the explicit control`)
      await listener()
      check(requests === 1 && error.hidden === !reject, `${mode}: success stays quiet and rejection is surfaced`)
      check(video.currentTime === 17 && video.paused, `${mode}: expanding never resets or auto-plays the movie`)
      if (reject) {
        reject = false
        await listener()
        check(requests === 2 && error.hidden, 'a successful retry clears the fullscreen error')
      }
    }
  } finally {
    globalThis.document = previousDocument
  }
}

await languageSuite()
await demoFullscreenSuite()
pass += await verifyMotion()

for (const [i, page] of (languageSourceOnly ? [] : PAGES).entries()) {
  console.log(`\n${'═'.repeat(52)}\n${page.file} — ${bundleName}\n${'═'.repeat(52)}`)
  let dom
  try {
    dom = await run(page, i)
    pass++
    console.log('\n· Boot\n  ✓ the bundle runs all the way through without throwing')
  } catch (err) {
    fail++
    console.error(`\n· Arranque\n  ✗ el bundle lanzó: ${err.message}`)
    continue
  }
  suite(page, dom)
}

console.log(`\n${'─'.repeat(52)}`)
if (fail === 0) {
  console.log(`✅ ${pass} interaction checks passed`)
  process.exit(0)
}
console.error(`❌ ${fail} fallo(s) sobre ${pass + fail}`)
process.exit(1)
