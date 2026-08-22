/**
 * The V2's progressive enhancement.
 *
 * Everything started here is optional interactivity: the built HTML is already
 * fully accessible, semantic and indexable without JavaScript. Removing this
 * script removes motion, not content.
 *
 * This file is the boot order. The hero's layers are the entry graph — they
 * have to run before the first paint of the interaction — and everything that
 * lives below the fold travels in its own chunk. Those chunks start downloading
 * immediately, in parallel, so a section is already wired when someone reaches
 * it; they are simply not parsed on the critical path.
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

const work = document.getElementById('work')
if (work) whenNear(work, () => warmImages(work), '800px')
const about = document.getElementById('about')
if (about) whenNear(about, () => warmImages(about), '800px')
const archive = document.getElementById('archive')
if (archive) whenNear(archive, () => warmImages(archive), '1400px')
const contact = document.getElementById('contact')
if (contact) whenNear(contact, () => warmImages(contact), '400px')

const [
  { initProjectCarousel, initEducationSlider, initCertsSlider },
  { initProjectDeck },
  { initCaseOrigin },
  { initProfileWorkbench },
  { initMomentCards },
  { initKeyboard },
  { initKeyboardBuildExplorer },
  { initMail, initClock, initContactSignal },
] = await Promise.all([
  import('./v2/carousels'),
  import('./v2/project-deck'),
  import('./v2/case-origin'),
  import('./v2/profile-workbench'),
  import('./v2/moment-cards'),
  import('./v2/keyboard'),
  import('./v2/build-explorer'),
  import('./v2/contact'),
])

initProjectCarousel()
initProjectDeck()
initCaseOrigin()
initProfileWorkbench()
initEducationSlider()
initCertsSlider()
initMomentCards()
initKeyboard()
initKeyboardBuildExplorer()
initMail()
initClock()
initContactSignal()

export {}
