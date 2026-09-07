/**
 * Copy for the keyboard build explorer.
 *
 * It lives outside `ui.ts` because it is not the site's vocabulary but a single
 * view's, and it has a shape of its own: a build's status label is looked up by
 * status, not by a flat key.
 *
 * The two languages are declared as two objects rather than a run of ternaries.
 * That way they read side by side — which is how a translation gets reviewed —
 * and the Spanish is typed against the English: forgetting a string is a type
 * error, not a sentence that shows up in the wrong language.
 */
import type { Lang } from './ui'

const EN = {
  laboratory: 'Laboratory // Build archive',
  archiveSummary: (total: string, complete: string) => `${total} builds // ${complete} completed`,
  buildNumber: (number: string) => `Build ${number}`,
  archiveLabel: 'Archive',
  intro: 'A growing archive: completed builds, models in preparation and the next keyboard at concept stage.',
  inspect: 'Inspect',
  openDraft: 'Open draft',
  allBuilds: 'All builds',
  buildNavigation: 'Build navigation',
  previousBuild: 'Previous build',
  nextBuild: 'Next build',
  view: 'Keyboard view',
  assembled: 'Assembled',
  exploded: 'Exploded',
  separation: 'Separation',
  model: 'Interactive layered model',
  cover: 'Build photo cover',
  previous: 'Previous image',
  next: 'Next image',
  goTo: 'Go to image',
  images: 'images',
  order: 'Assembly order',
  pieces: 'parts',
  sheet: 'Spec sheet',
  source: 'Part reference',
  title: 'My build photos',
  /** A build's status label. The key is the status the card displays. */
  status: {
    complete: 'REAL BUILD',
    'in-progress': 'BUILD IN PROGRESS',
    scaffold: 'LAYER DRAFT',
    planning: 'IN PROGRESS',
  },
  prototype: 'PROTOTYPE MODEL // NEO65 LAYER BASE',
  prototypePart: 'Temporary reference geometry · pending replacement',
  prototypeOrder: 'Prototype layers',
  hintWide: 'Drag or use the arrow keys to orbit · scroll to zoom · double-click to reset',
  hintNarrow: 'Drag to orbit · tap a part to isolate',
  soundTitle: 'Sound test',
  soundRef: 'Opens with three reference snaps, identical across every take.',
  quipNext: 'Have Killua say something else',
  quipListen: 'Shhh… listen to how the typing comes in after the snaps.',
  play: 'Play sample',
  pause: 'Pause sample',
  seek: 'Position within the sample',
  typing: 'Typing',
  soundPending: 'NO TAKE YET',
  soundPendingNote: 'To be recorded once the build is assembled',
  noAudio: 'Your browser cannot play this sample.',
}

const ES: typeof EN = {
  laboratory: 'Laboratorio // Archivo de montajes',
  archiveSummary: (total: string, complete: string) => `${total} montajes // ${complete} completos`,
  buildNumber: (number: string) => `Montaje ${number}`,
  archiveLabel: 'Archivo',
  intro: 'Un archivo en crecimiento: montajes terminados, modelos en preparación y el próximo teclado en fase de concepto.',
  inspect: 'Inspeccionar',
  openDraft: 'Abrir borrador',
  allBuilds: 'Todos los montajes',
  buildNavigation: 'Navegación entre montajes',
  previousBuild: 'Montaje anterior',
  nextBuild: 'Montaje siguiente',
  view: 'Vista del teclado',
  assembled: 'Montado',
  exploded: 'Explosionado',
  separation: 'Separación',
  model: 'Modelo interactivo por capas',
  cover: 'Portada fotográfica del montaje',
  previous: 'Imagen anterior',
  next: 'Imagen siguiente',
  goTo: 'Ir a la imagen',
  images: 'imágenes',
  order: 'Orden de montaje',
  pieces: 'piezas',
  sheet: 'Ficha técnica',
  source: 'Referencia de la pieza',
  title: 'Fotos de mis montajes',
  status: {
    complete: 'MONTAJE REAL',
    'in-progress': 'EN CONSTRUCCIÓN',
    scaffold: 'CAPAS EN PREP.',
    planning: 'EN PROCESO',
  },
  prototype: 'MODELO PROVISIONAL // BASE DE CAPAS NEO65',
  prototypePart: 'Geometría temporal de referencia · pendiente de sustituir',
  prototypeOrder: 'Capas provisionales',
  hintWide: 'Arrastra o usa las flechas para orbitar · rueda para ampliar · doble clic para restablecer',
  hintNarrow: 'Arrastra para orbitar · toca una pieza para aislarla',
  soundTitle: 'Prueba de sonido',
  soundRef: 'Abre con tres chasquidos de referencia, iguales en las tres tomas.',
  quipNext: 'Que Killua cuente otra cosa',
  quipListen: 'Chsss… escucha cómo entra el tecleo después de los chasquidos.',
  play: 'Reproducir muestra',
  pause: 'Pausar muestra',
  seek: 'Posición dentro de la muestra',
  typing: 'Tecleo',
  soundPending: 'SIN TOMA',
  soundPendingNote: 'Se grabará cuando el montaje esté terminado',
  noAudio: 'Tu navegador no puede reproducir esta muestra.',
}

type KeyboardCopy = typeof EN

export const keyboardCopy = (lang: Lang): KeyboardCopy => (lang === 'es' ? ES : EN)
