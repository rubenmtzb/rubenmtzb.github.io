/**
 * Geometry of the sound samples' envelope.
 *
 * The envelope arrives already computed from the content — one height per bar,
 * on a decibel scale and with the same floor across all three takes — so all
 * that happens here is turning it into geometry. The browser decodes no audio
 * and measures nothing at runtime: it paints a stroke and slides a clip over it
 * as playback advances.
 *
 * The 160 bars come out as a single `path` of vertical segments rather than one
 * element per bar. With a rounded cap each segment reads as a bar, and silence
 * — a segment of minimum height — lands as a line at mid-height instead of a
 * gap.
 */

const WAVE_STEP = 3
const WAVE_HEIGHT = 100
const WAVE_FLOOR = 2

/**
 * The decibel scale leaves the real peak below the box's ceiling, so it is
 * stretched until the tallest bar touches it. The gain is taken from all the
 * takes together and not from each one: the heights keep being measured with
 * the same yardstick — which is what makes them comparable between keyboards —
 * and it recomputes itself the day another sample arrives.
 */
/** The envelope's stroke, with the gain shared by every sample. */
export type Waveform = ReturnType<typeof createWaveform>

export function createWaveform(allPeaks: number[][]) {
  /* The gain comes from the set and not from each take: that is what makes two
     keyboards' heights comparable with each other. */
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

/** The level is a measurement: it takes a minus sign, not a hyphen. */
export const dbfs = (level: number) => `${level.toFixed(1).replace('-', '\u2212')} dBFS`

/** Duration as a clock reads it. The clips never reach a minute, but still. */
export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`
