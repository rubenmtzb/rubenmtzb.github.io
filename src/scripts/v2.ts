/**
 * The V2's progressive enhancement.
 *
 * Everything started here is optional interactivity: the built HTML is already
 * fully accessible, semantic and indexable without JavaScript. Removing this
 * script removes motion, not content.
 *
 * The hero boots first. Below-the-fold chunks download and initialise once
 * their section is close, before the visitor arrives.
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
import { initAmbientMotion } from './v2/ambient-motion'

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
initAmbientMotion()

const modelsHref = document.querySelector('[data-bx-models-src]')?.getAttribute('data-bx-models-src')
const archive = document.getElementById('archive')
if (modelsHref && archive) {
  const prefetch = () => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = 'document'
    link.href = modelsHref
    document.head.appendChild(link)
  }
  whenNear(archive, prefetch, '1400px')
}

const work = document.getElementById('work')
const about = document.getElementById('about')
const contact = document.getElementById('contact')
const projectCarousel = document.getElementById('project-carousel')

if (projectCarousel) whenNear(projectCarousel, () => warmImages(projectCarousel), '800px')
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
  const [{ initProjectCarousel }, { initCaseOrigin }] = await Promise.all([
    import('./v2/carousels'),
    import('./v2/case-origin'),
  ])
  initProjectCarousel()
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
