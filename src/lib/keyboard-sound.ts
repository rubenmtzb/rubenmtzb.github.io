/**
 * Geometría de la envolvente de las muestras de sonido.
 *
 * La envolvente viaja ya calculada desde el contenido —una altura por barra,
 * en escala de decibelios y con el mismo suelo para las tres tomas— así que
 * aquí solo se convierte en geometría. El cliente no decodifica
 * audio ni mide nada en tiempo real: pinta un trazo y desplaza un recorte
 * por encima conforme avanza la reproducción.
 *
 * Las 160 barras salen en un único `path` de segmentos verticales en lugar de
 * un elemento por barra. Con el trazo redondeado cada segmento se ve como una
 * barra, y el silencio —un segmento de altura mínima— queda en una línea a
 * media altura en vez de en un hueco.
 */

const WAVE_STEP = 3
const WAVE_HEIGHT = 100
const WAVE_FLOOR = 2

/**
 * La escala en decibelios deja el pico real por debajo del techo de la caja,
 * así que se estira hasta que la barra más alta lo toca. La ganancia se saca
 * del conjunto de las tomas y no de cada una: las alturas siguen midiéndose
 * con la misma vara —que es lo que las hace comparables entre teclados— y se
 * recalcula sola si mañana entra otra muestra.
 */
export function createWaveform(allPeaks: number[][]) {
  /* La ganancia sale del conjunto y no de cada toma: es lo que hace que las
     alturas de dos teclados se puedan comparar entre sí. */
  const gain = WAVE_HEIGHT / Math.max(1, ...allPeaks.flat())

  return {
    height: WAVE_HEIGHT,
    path: (peaks: number[]) =>
      peaks
        .map((peak, index) => {
          const top = Math.round((WAVE_HEIGHT - Math.max(WAVE_FLOOR, peak * gain)) / 2)
          return `M${index * WAVE_STEP} ${top}V${WAVE_HEIGHT - top}`
        })
        .join(''),
    width: (peaks: number[]) => (peaks.length - 1) * WAVE_STEP,
  }
}

/** El nivel es una medida: se escribe con signo menos, no con guion. */
export const dbfs = (level: number) => `${level.toFixed(1).replace('-', '\u2212')} dBFS`

/** Duración en boca de reloj: los cortes no llegan al minuto, pero da igual. */
export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`
