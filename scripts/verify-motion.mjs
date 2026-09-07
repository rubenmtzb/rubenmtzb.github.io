import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { parseHTML } from 'linkedom'
import ts from 'typescript'

const moduleUrl = (file, suffix) => {
  let code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  code = code.replace("from './dom'", `from ${JSON.stringify(moduleUrlForDom(suffix))}`)
  return `data:text/javascript,${encodeURIComponent(code)}#${suffix}`
}
const moduleUrlForDom = suffix => {
  const code = ts.transpileModule(readFileSync('src/scripts/v2/dom.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  return `data:text/javascript,${encodeURIComponent(code)}#${suffix}`
}

export async function verifyMotion() {
  const keys = ['window', 'document', 'IntersectionObserver', 'performance', 'Image', 'requestAnimationFrame', 'cancelAnimationFrame']
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  let checks = 0
  const check = (condition, message) => { assert.ok(condition, message); checks++ }
  try {
    for (const mode of ['normal', 'fallback', 'reduce']) {
      const { document, window: dom } = parseHTML(`<html><body>
        <span id="hero-typewriter" data-prefix="Hello, " data-name="Rubén." data-alias="rubenitx.">Hello, Rubén.</span>
        <span class="intro-cursor">|</span><span class="animate-ping"></span>
        <canvas id="ascii"></canvas></body></html>`)
      let now = 0
      let nextId = 1
      const timers = new Map()
      const frames = new Map()
      const observers = new Map()
      const windowListeners = new Map()
      const imageInstances = []
      const Observer = class {
        constructor(callback) { this.callback = callback }
        observe(el) { observers.set(el, this.callback) }
      }
      const window = {
        innerWidth: 1440, devicePixelRatio: 1,
        matchMedia: () => ({ matches: mode === 'reduce' }),
        setTimeout: (fn, delay) => { const id = nextId++; timers.set(id, { fn, delay }); return id },
        clearTimeout: id => timers.delete(id),
        addEventListener: (type, fn) => {
          const handlers = windowListeners.get(type) ?? []
          handlers.push(fn); windowListeners.set(type, handlers)
        },
        ...(mode === 'fallback' ? {} : { IntersectionObserver: Observer }),
      }
      const enter = (el, visible) => observers.get(el)([{ target: el, isIntersecting: visible }])
      const hidden = value => {
        Object.defineProperty(document, 'hidden', { configurable: true, value })
        document.dispatchEvent(new dom.Event('visibilitychange'))
      }
      const tick = () => {
        const [id, timer] = timers.entries().next().value
        timers.delete(id); now += timer.delay; timer.fn()
      }
      const frame = () => {
        const [id, fn] = frames.entries().next().value
        frames.delete(id); now += 16.67; fn(now)
      }
      Object.defineProperties(globalThis, {
        window: { configurable: true, writable: true, value: window },
        document: { configurable: true, writable: true, value: document },
        performance: { configurable: true, value: { now: () => now } },
        IntersectionObserver: { configurable: true, value: Observer },
        requestAnimationFrame: { configurable: true, value: fn => { const id = nextId++; frames.set(id, fn); return id } },
        cancelAnimationFrame: { configurable: true, value: id => frames.delete(id) },
        Image: { configurable: true, value: class {
          constructor() { this.width = 32; this.height = 32; this.complete = true; imageInstances.push(this) }
        } },
      })
      hidden(false)
      const { initTypewriter } = await import(moduleUrl('src/scripts/v2/typewriter.ts', mode))
      initTypewriter()
      const headline = document.getElementById('hero-typewriter')
      if (mode === 'reduce') {
        check(headline.textContent === 'Hello, Rubén.' && timers.size === 0, 'reduced motion keeps the complete headline without timers')
      } else {
        if (mode === 'normal') {
          check(timers.size === 0, 'an offscreen headline schedules no timer')
          check(headline.textContent === 'Hello, Rubén.', 'offscreen initialization preserves the accessible SSR headline')
          enter(headline, true)
        }
        check(timers.size === 1, `${mode}: visible headline schedules one timer`)
        for (let i = 0; i < 8; i++) tick()
        check(headline.textContent.startsWith('Hello, '), `${mode}: the approved typewriter still types`)
        const text = headline.textContent
        const delay = timers.values().next().value.delay
        now += delay / 2
        hidden(true)
        check(timers.size === 0 && headline.textContent === text, `${mode}: hidden tabs freeze the current text`)
        if (mode === 'normal') enter(headline, false)
        hidden(false)
        if (mode === 'normal') {
          check(timers.size === 0, 'tab return does not wake an offscreen headline')
          enter(headline, true)
        }
        check(timers.size === 1 && Math.abs(timers.values().next().value.delay - delay / 2) < .001,
          `${mode}: return preserves the remaining letter delay`)
        hidden(false)
        check(timers.size === 1, `${mode}: repeated visibility events cannot duplicate the timer`)
        hidden(true)
      }

      const { initAmbientMotion } = await import(moduleUrl('src/scripts/v2/ambient-motion.ts', mode))
      hidden(false)
      initAmbientMotion()
      const cursor = document.querySelector('.intro-cursor')
      if (mode !== 'fallback') {
        check(cursor.hasAttribute('data-motion-paused'), `${mode}: offscreen CSS effects start paused`)
        enter(cursor, true)
      }
      check(!cursor.hasAttribute('data-motion-paused'), `${mode}: visible CSS timelines are not disabled`)
      hidden(true)
      check(cursor.hasAttribute('data-motion-paused'), `${mode}: hidden tabs pause CSS motion`)
      if (mode !== 'fallback') enter(cursor, false)
      hidden(false)
      if (mode !== 'fallback') {
        check(cursor.hasAttribute('data-motion-paused'), `${mode}: hidden-to-visible does not resume offscreen CSS`)
        enter(cursor, true)
      }
      check(!cursor.hasAttribute('data-motion-paused'), `${mode}: CSS resumes when visible again`)
      hidden(true)

      const originalCreate = document.createElement.bind(document)
      let stamps = 0
      let paints = 0
      document.createElement = tag => {
        const el = originalCreate(tag)
        if (tag === 'canvas') {
          stamps++
          el.getContext = () => ({
            drawImage() {}, fillText() {},
            getImageData: () => ({ data: new Uint8ClampedArray(el.width * el.height * 4).fill(255) }),
          })
        }
        return el
      }
      const canvas = document.getElementById('ascii')
      canvas.getContext = () => ({ setTransform() {}, clearRect() {}, drawImage() { paints++ } })
      canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 340, height: 340 })
      const { initAsciiPortrait } = await import(moduleUrl('src/scripts/ascii-portrait.ts', mode))
      initAsciiPortrait(canvas, '/avatar.png')
      imageInstances.at(-1).onload()
      if (mode === 'reduce') {
        check(paints > 0 && frames.size === 0, 'reduced motion paints one complete portrait without a loop')
      } else {
        check(frames.size === 0, `${mode}: a hidden portrait schedules no frame`)
        if (mode === 'normal') enter(canvas, true)
        hidden(false)
        check(frames.size === 1, `${mode}: visible portrait resumes one loop`)
        for (let i = 0; i < 600 && frames.size; i++) frame()
        check(frames.size === 0 && paints > 0, `${mode}: the portrait settles and stops`)
        check(stamps <= 662, `${mode}: glyph cache is bounded by two colours and 33 alpha levels`)
        hidden(true); hidden(false)
        check(frames.size === 0, `${mode}: a settled portrait stays asleep on tab return`)
      }
      window.innerWidth = 390
      for (const handler of windowListeners.get('resize')) handler()
      // Other widgets remain paused: only the portrait's debounced resize runs.
      while (timers.size) {
        const entry = [...timers.entries()].find(([, timer]) => timer.delay === 100)
        if (!entry) break
        timers.delete(entry[0]); now += 100; entry[1].fn()
      }
      if (mode === 'reduce') {
        check(canvas.width === 210 && frames.size === 0, 'reduced-motion resize repaints the correct new backing size once')
      } else {
        check(frames.size === 1, `${mode}: resizing a settled portrait restarts its entrance`)
        frame()
        check(canvas.width === 210, `${mode}: resizing invalidates old glyph dimensions`)
        if (mode === 'normal') {
          enter(canvas, false)
          check(frames.size === 0, 'offscreen portrait cancels the in-flight frame')
          hidden(true); hidden(false)
          check(frames.size === 0, 'tab return does not restart an offscreen portrait')
          enter(canvas, true)
          check(frames.size === 1, 'unfinished portrait resumes when scrolled back')
        }
      }
    }
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
  console.log(`  ✓ ${checks} motion lifecycle and glyph-cache checks`)
  return checks
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await verifyMotion()
