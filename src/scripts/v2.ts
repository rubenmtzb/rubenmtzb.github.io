/**
 * The V2's progressive enhancement.
 *
 * Everything started here is optional interactivity: the built HTML is already
 * fully accessible, semantic and indexable without JavaScript. Removing this
 * script removes motion, not content.
 *
 * This file is nothing but the boot order. Each layer lives in its own module
 * under `./v2/`, initialises itself and knows nothing about the others: the
 * only shared dependency is the set of primitives in `./v2/dom`.
 */
import { initAsciiPortrait } from './ascii-portrait'
import { revealOnScroll } from './reveal'
import { reduce } from './v2/dom'
import { initHeader } from './v2/header'
import { initTypewriter } from './v2/typewriter'
import { initJobList } from './v2/job-list'
import { initProjectCarousel, initEducationSlider, initCertsSlider } from './v2/carousels'
import { initProjectDeck } from './v2/project-deck'
import { initCaseOrigin } from './v2/case-origin'
import { initProfileWorkbench } from './v2/profile-workbench'
import { initMomentCards } from './v2/moment-cards'
import { initKeyboard } from './v2/keyboard'
import { initKeyboardBuildExplorer } from './v2/build-explorer'
import { initMail, initClock, initContactSignal } from './v2/contact'
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
initGameMode()

export {}
