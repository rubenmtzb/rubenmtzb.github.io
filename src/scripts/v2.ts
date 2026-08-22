/**
 * Mejora progresiva de la V2.
 *
 * Todo lo que se arranca aquí es interactividad opcional: el HTML de build ya
 * es 100 % accesible, semántico e indexable sin JavaScript. Quitar este script
 * no quita contenido, solo movimiento.
 *
 * Este fichero es únicamente el orden de arranque. Cada capa vive en su propio
 * módulo dentro de `./v2/`, se inicializa sola y no sabe nada de las demás: la
 * única dependencia compartida son las primitivas de `./v2/dom`.
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

/** Retrato ASCII del hero. Sin canvas no se monta y el resto sigue igual. */
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
