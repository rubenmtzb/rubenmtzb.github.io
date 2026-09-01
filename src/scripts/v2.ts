/**
 * The V2's progressive enhancement.
 *
 * Everything started here is optional interactivity: the built HTML is already
 * fully accessible, semantic and indexable without JavaScript. Removing this
 * script removes motion, not content.
 *
 * The hero boots first. Below-the-fold chunks start downloading in parallel so
 * they are warm when the visitor arrives, but their `init` only runs once the
 * section is close — wiring four keyboard models and the typing trial on first
 * paint was work nobody could see yet.
 *
 * Images that were held as lazy are warmed as soon as their section is close:
 * paging a carousel must not wait on a download that only starts on the click.
 */
import { initAsciiPortrait } from './ascii-portrait'
import { revealOnScroll } from './reveal'
import { reduce, warmImages, whenNear } from './v2/dom'
import { initHeader } from './v2/header'
import { initTypewriter } from './v2/typewriter'
import { initJobList } from './v2/job-list'
import { initGameMode } from './v2/game-launcher'

/** The hero's ASCII portrait. With no canvas it never mounts and the rest is unaffected. */
function initPortrait() {
  const canvas = document.getElementById('ascii') as HTMLCanvasElement | null
  if (canvas) initAsciiPortrait(canvas, '/avatar.png')
}

revealOnScroll({ reduce, rootMargin: '0px 0px -6% 0px', threshold: 0.04 })
initHeader()
initTypewriter()
initPortrait()
initJobList()
initGameMode()

const modelsHref = document.querySelector('[data-bx-models-src]')?.getAttribute('data-bx-models-src')
if (modelsHref) {
  const prefetch = () => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = 'document'
    link.href = modelsHref
    document.head.appendChild(link)
  }
  const idle = window.requestIdleCallback
  if (typeof idle === 'function') idle(prefetch, { timeout: 1800 })
  else window.setTimeout(prefetch, 1)
}

const work = document.getElementById('work')
const about = document.getElementById('about')
const archive = document.getElementById('archive')
const contact = document.getElementById('contact')

if (work) whenNear(work, () => warmImages(work), '800px')
if (about) whenNear(about, () => warmImages(about), '800px')
if (archive) whenNear(archive, () => warmImages(archive), '1400px')
if (contact) whenNear(contact, () => warmImages(contact), '400px')

/*
 * Chunks are not even requested until the section is close. Starting every
 * `import()` on boot competed with the hero for the connection. Tests fire
 * IntersectionObserver synchronously, so the promises below are still
 * populated before the module's final await.
 */
const pending: Promise<void>[] = []

const boot = (el: Element | null, margin: string, task: () => Promise<void>) => {
  const run = () => { pending.push(task()) }
  if (el) whenNear(el, run, margin)
  else pending.push(task())
}

boot(work, '500px', async () => {
  const [{ initProjectCarousel }, { initProjectDeck }, { initCaseOrigin }] = await Promise.all([
    import('./v2/carousels'),
    import('./v2/project-deck'),
    import('./v2/case-origin'),
  ])
  initProjectCarousel()
  initProjectDeck()
  initCaseOrigin()
})

boot(about, '600px', async () => {
  const [{ initEducationSlider, initCertsSlider }, { initProfileWorkbench }] = await Promise.all([
    import('./v2/carousels'),
    import('./v2/profile-workbench'),
  ])
  initEducationSlider()
  initCertsSlider()
  initProfileWorkbench()
})

boot(archive, '900px', async () => {
  const [{ initMomentCards }, { initKeyboard }, { initKeyboardBuildExplorer }] = await Promise.all([
    import('./v2/moment-cards'),
    import('./v2/keyboard'),
    import('./v2/build-explorer'),
  ])
  initMomentCards()
  initKeyboard()
  await initKeyboardBuildExplorer()
})

boot(contact, '400px', async () => {
  const { initMail, initClock, initContactSignal } = await import('./v2/contact')
  initMail()
  initClock()
  initContactSignal()
})

await Promise.all(pending)

export {}
