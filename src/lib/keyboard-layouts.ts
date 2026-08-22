/**
 * Distribuciones de teclado y geometría del modelo por capas.
 *
 * Cada modelo se declara una vez, fila a fila, en unidades de tecla: es la
 * misma unidad con la que se describe un teclado real, así que la tabla se
 * puede contrastar con la unidad física sin traducir nada. De ahí salen tanto
 * la lista de teclas que dibuja cada capa como la hoja de posiciones.
 *
 * Vive fuera del componente porque son datos, no vista: la tabla del EVO75 no
 * cambia porque cambie el marcado que la pinta.
 */

type KeyVariant =
  | 'neo-blue'
  | 'neo-red'
  | 'snow'
  | 'wasabi'
  | 'evo-white'
  | 'evo-grey'
  | 'evo-red'
  | 'corne-white'
export type KeyArtwork = 'spade' | 'planet' | 'rocket' | 'comet' | 'constellation' | 'eclipse'
type KeyDetail = {
  secondary?: string
  functionLegend?: string
  artwork?: KeyArtwork
}
type KeyDefinition = [
  width: number,
  label: string,
  variant?: KeyVariant,
  gapBefore?: number,
  yOffset?: number,
  rotation?: number,
  detail?: KeyDetail,
]
type KeyRow = { offset?: number, keys: KeyDefinition[] }

const neoLegend = (label: string, secondary: string): KeyDefinition =>
  [1, label, undefined, undefined, undefined, undefined, { secondary }]

const neoNovelty = (
  width: number,
  variant: Extract<KeyVariant, 'neo-blue' | 'neo-red'>,
  artwork: KeyArtwork,
  gapBefore?: number,
): KeyDefinition =>
  [width, '', variant, gapBefore, undefined, undefined, { artwork }]

const hhkbLegend = (
  label: string,
  secondary: string,
  functionLegend: string,
): KeyDefinition =>
  [1, label, 'snow', undefined, undefined, undefined, { secondary, functionLegend }]

const ANSI65_ROWS: KeyRow[] = [
  { keys: [
    neoNovelty(1, 'neo-red', 'spade'),
    neoLegend('1', '!'), neoLegend('2', '@'), neoLegend('3', '#'),
    neoLegend('4', '$'), neoLegend('5', '%'), neoLegend('6', '^'),
    neoLegend('7', '&'), neoLegend('8', '*'), neoLegend('9', '('),
    neoLegend('0', ')'), neoLegend('-', '_'), neoLegend('=', '+'),
    neoNovelty(2, 'neo-blue', 'planet'),
    neoNovelty(1, 'neo-red', 'eclipse'),
  ] },
  { keys: [
    neoNovelty(1.5, 'neo-blue', 'rocket'),
    [1, 'Q'], [1, 'W'], [1, 'E'], [1, 'R'], [1, 'T'], [1, 'Y'],
    [1, 'U'], [1, 'I'], [1, 'O'], [1, 'P'], [1, '['], [1, ']'],
    neoNovelty(1.5, 'neo-red', 'planet'),
    neoNovelty(1, 'neo-blue', 'comet'),
  ] },
  { keys: [
    neoNovelty(1.75, 'neo-blue', 'planet'),
    [1, 'A'], [1, 'S'], [1, 'D'], [1, 'F'], [1, 'G'], [1, 'H'],
    [1, 'J'], [1, 'K'], [1, 'L'], [1, ';'], [1, "'"],
    neoNovelty(2.25, 'neo-blue', 'rocket'),
    neoNovelty(1, 'neo-blue', 'constellation'),
  ] },
  { keys: [
    [2.25, '⇧', 'neo-blue'],
    [1, 'Z'], [1, 'X'], [1, 'C'], [1, 'V'], [1, 'B'], [1, 'N'],
    [1, 'M'], [1, ','], [1, '.'], [1, '/'],
    neoNovelty(1.75, 'neo-blue', 'comet'),
    [1, '↑', 'neo-blue'],
    [1, '→', 'neo-blue'],
  ] },
  { keys: [
    neoNovelty(1.25, 'neo-blue', 'constellation'),
    [1.25, '⌘', 'neo-blue'],
    [1.25, '≡', 'neo-blue'],
    [6.25, ''],
    neoNovelty(1.25, 'neo-blue', 'rocket'),
    neoNovelty(1.25, 'neo-blue', 'comet'),
    [1, '←', 'neo-blue', .5],
    [1, '↓', 'neo-blue'],
    [1, '→', 'neo-blue'],
  ] },
]

/**
 * Distribución HHKB US de 60 teclas. La mezcla reproduce la unidad real:
 * alfas y espacio Wasabi; fila numérica y modificadores principalmente Snow.
 * El set es blank salvo por las doce teclas numéricas, que llevan símbolo,
 * carácter principal y la función F1–F12 impresa en el frente.
 */
const HHKB_ROWS: KeyRow[] = [
  { keys: [
    [1, '', 'wasabi'],
    hhkbLegend('1', '!', 'F1'),
    hhkbLegend('2', '@', 'F2'),
    hhkbLegend('3', '#', 'F3'),
    hhkbLegend('4', '$', 'F4'),
    hhkbLegend('5', '%', 'F5'),
    hhkbLegend('6', '^', 'F6'),
    hhkbLegend('7', '&', 'F7'),
    hhkbLegend('8', '*', 'F8'),
    hhkbLegend('9', '(', 'F9'),
    hhkbLegend('0', ')', 'F10'),
    hhkbLegend('-', '_', 'F11'),
    hhkbLegend('=', '+', 'F12'),
    [1, '', 'wasabi'],
    [1, '', 'wasabi'],
  ] },
  { keys: [[1.5, '', 'snow'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1.5, '', 'snow']] },
  { keys: [[1.75, '', 'snow'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [2.25, '', 'snow']] },
  { keys: [[2.25, '', 'snow'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1, '', 'wasabi'], [1.75, '', 'wasabi'], [1, '', 'snow']] },
  { offset: 1.5, keys: [[1.5, '', 'snow'], [1.5, '', 'snow'], [6, '', 'wasabi'], [1.5, '', 'snow'], [1.5, '', 'snow']] },
]

/**
 * Distribución ANSI de 80 teclas del EVO75. Los huecos reproducen la fila F,
 * el bloque de navegación y las flechas separados que aparecen en la unidad.
 */
const EVO75_ROWS: KeyRow[] = [
  { keys: [[1, 'Esc', 'evo-red'], [1, 'F1', 'evo-grey', .75], [1, 'F2', 'evo-grey'], [1, 'F3', 'evo-grey'], [1, 'F4', 'evo-grey'], [1, 'F5', 'evo-grey', .25], [1, 'F6', 'evo-grey'], [1, 'F7', 'evo-grey'], [1, 'F8', 'evo-grey'], [1, 'F9', 'evo-grey', .25], [1, 'F10', 'evo-grey'], [1, 'F11', 'evo-grey'], [1, 'F12', 'evo-grey'], [1, 'Del', 'evo-red', .75]] },
  { keys: [[1, '`', 'evo-grey'], [1, '1', 'evo-white'], [1, '2', 'evo-white'], [1, '3', 'evo-white'], [1, '4', 'evo-white'], [1, '5', 'evo-white'], [1, '6', 'evo-white'], [1, '7', 'evo-white'], [1, '8', 'evo-white'], [1, '9', 'evo-white'], [1, '0', 'evo-white'], [1, '-', 'evo-white'], [1, '=', 'evo-white'], [2, 'Back', 'evo-grey'], [1, 'Home', 'evo-grey', .25]] },
  { keys: [[1.5, 'Tab', 'evo-grey'], [1, 'Q', 'evo-white'], [1, 'W', 'evo-white'], [1, 'E', 'evo-white'], [1, 'R', 'evo-white'], [1, 'T', 'evo-white'], [1, 'Y', 'evo-white'], [1, 'U', 'evo-white'], [1, 'I', 'evo-white'], [1, 'O', 'evo-white'], [1, 'P', 'evo-white'], [1, '[', 'evo-white'], [1, ']', 'evo-white'], [1.5, '\\', 'evo-white'], [1, 'PgUp', 'evo-grey', .25]] },
  { keys: [[1.75, 'Caps', 'evo-grey'], [1, 'A', 'evo-white'], [1, 'S', 'evo-white'], [1, 'D', 'evo-white'], [1, 'F', 'evo-white'], [1, 'G', 'evo-white'], [1, 'H', 'evo-white'], [1, 'J', 'evo-white'], [1, 'K', 'evo-white'], [1, 'L', 'evo-white'], [1, ';', 'evo-white'], [1, "'", 'evo-white'], [2.25, 'Enter', 'evo-red'], [1, 'PgDn', 'evo-grey', .25]] },
  { keys: [[2.25, 'Shift', 'evo-grey'], [1, 'Z', 'evo-white'], [1, 'X', 'evo-white'], [1, 'C', 'evo-white'], [1, 'V', 'evo-white'], [1, 'B', 'evo-white'], [1, 'N', 'evo-white'], [1, 'M', 'evo-white'], [1, ',', 'evo-white'], [1, '.', 'evo-white'], [1, '/', 'evo-white'], [1.75, 'Shift', 'evo-grey'], [1, '↑', 'evo-grey', .25]] },
  { keys: [[1.25, 'Ctrl', 'evo-grey'], [1.25, 'Super', 'evo-grey'], [1.25, 'Alt', 'evo-grey'], [6.25, '', 'evo-white'], [1.25, 'Alt', 'evo-grey'], [1.25, 'Fn', 'evo-grey'], [1, '←', 'evo-grey', .75], [1, '↓', 'evo-grey'], [1, '→', 'evo-grey']] },
]

/** Corne estándar 3×6 + 3 por mitad, con stagger y pulgares espejados. */
const CORNE_ROWS: KeyRow[] = [
  { keys: [[1, '', 'corne-white', 0, .35], [1, '', 'corne-white', 0, .35], [1, '', 'corne-white', 0, .05], [1, '', 'corne-white', 0, -.15], [1, '', 'corne-white', 0, .05], [1, '', 'corne-white', 0, .3], [1, '', 'corne-white', 3.5, .3], [1, '', 'corne-white', 0, .05], [1, '', 'corne-white', 0, -.15], [1, '', 'corne-white', 0, .05], [1, '', 'corne-white', 0, .35], [1, '', 'corne-white', 0, .35]] },
  { keys: [[1, '', 'corne-white', 0, .35], [1, '', 'corne-white', 0, .35], [1, '', 'corne-white', 0, .05], [1, '', 'corne-white', 0, -.15], [1, '', 'corne-white', 0, .05], [1, '', 'corne-white', 0, .3], [1, '', 'corne-white', 3.5, .3], [1, '', 'corne-white', 0, .05], [1, '', 'corne-white', 0, -.15], [1, '', 'corne-white', 0, .05], [1, '', 'corne-white', 0, .35], [1, '', 'corne-white', 0, .35]] },
  { keys: [[1, '', 'corne-white', 0, .35], [1, '', 'corne-white', 0, .35], [1, '', 'corne-white', 0, .05], [1, '', 'corne-white', 0, -.15], [1, '', 'corne-white', 0, .05], [1, '', 'corne-white', 0, .3], [1, '', 'corne-white', 3.5, .3], [1, '', 'corne-white', 0, .05], [1, '', 'corne-white', 0, -.15], [1, '', 'corne-white', 0, .05], [1, '', 'corne-white', 0, .35], [1, '', 'corne-white', 0, .35]] },
  { offset: 3, keys: [[1, '', 'corne-white', 0, 0, -8], [1.1, '', 'corne-white', 0, -.04, -16], [1.4, '', 'corne-white', 0, .08, -25], [1.4, '', 'corne-white', 3, .08, 25], [1.1, '', 'corne-white', 0, -.04, 16], [1, '', 'corne-white', 0, 0, 8]] },
]

export const MODEL_LAYOUTS = {
  ansi65: { units: 16, rows: ANSI65_ROWS },
  hhkb: { units: 15, rows: HHKB_ROWS },
  evo75: { units: 16.25, rows: EVO75_ROWS },
  corne: { units: 15.5, rows: CORNE_ROWS },
}

export const modelKeys = ({ rows }: Layout) =>
  rows.flatMap((row, rowIndex) => {
    let x = row.offset ?? 0
    return row.keys.map(([width, label, variant, gapBefore = 0, yOffset = 0, rotation = 0, detail]) => {
      x += gapBefore
      const key = { x, y: rowIndex + yOffset, width, label, variant, rotation, ...detail }
      x += width
      return key
    })
  })

/** Cuatro decimales: sobre un modelo de 502 px son cinco milésimas de píxel. */
const percent = (value: number) => `${Number(value.toFixed(4))}%`

/** Nombre estable de la posición: lo comparten todas las capas del modelo. */
export const keyClass = (index: number) => `bx-k${index}`

/** Nombre de un modelo. Es el mismo vocabulario que valida el esquema. */
export type LayoutName = keyof typeof MODEL_LAYOUTS
type Layout = typeof MODEL_LAYOUTS[LayoutName]

const layoutGeometry = (name: LayoutName, layout: Layout) => {
  const scope = `.bx-build-panel[data-layout='${name}']`
  const rowHeight = 100 / layout.rows.length
  const positions = modelKeys(layout).map((key, index) => {
    const rotation = key.rotation === 0 ? '' : `;--kr:${key.rotation}deg`
    return `${scope} .${keyClass(index)}{--x:${percent((key.x / layout.units) * 100)};`
      + `--y:${percent(key.y * rowHeight)};`
      + `--w:${percent((key.width / layout.units) * 100)}${rotation}}`
  })
  return `${scope}{--row-h:${percent(rowHeight)}}${positions.join('')}`
}

/**
 * Geometría de las teclas, emitida como hoja de estilo y no como atributo
 * `style` por elemento.
 *
 * Cada modelo dibuja las mismas teclas en todas sus capas —el hueco de la
 * espuma, el socket de la PCB, el switch, la tecla—, así que la posición de
 * la tecla 12 del EVO75 se repetía idéntica una decena de veces por panel y
 * con toda su precisión en coma flotante. Eran 1.486 atributos y 213 kB de
 * HTML para decir tres números por tecla. Aquí cada posición se escribe una
 * vez por modelo y el elemento se limita a nombrarla.
 *
 * Solo viajan los tres valores que distinguen una tecla de otra: la altura de
 * fila es constante dentro de un modelo, así que se declara una vez en el
 * panel y el CSS deriva de ella la altura de la tecla, del switch y del
 * socket en lugar de recibirlas ya multiplicadas.
 *
 * Solo entran los modelos pedidos: un build que nadie usa no deja reglas
 * sueltas en la página.
 */
export const keyGeometry = (names: LayoutName[]) =>
  [...new Set(names)].map((name) => layoutGeometry(name, MODEL_LAYOUTS[name])).join('')
