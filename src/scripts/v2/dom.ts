/**
 * Primitives shared by the V2's interaction layer.
 *
 * Everything here is used by several features at once: reading the preferences
 * a single time, picking copy by language, numbering the counters, and the two
 * gestures — pointer and swipe — that the carousels and the archive's covers
 * have in common.
 */

/** Preferences and language are read once: they do not change during the session. */
export const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const isSpanish = document.documentElement.lang === 'es'

/** Picks between the Spanish and the English variant by the document's language. */
export const say = <T,>(es: T, en: T): T => (isSpanish ? es : en)

/** Two-digit numbering: "01 / 04". Shared by both counters. */
export const pad = (n: number) => String(n).padStart(2, '0')

export const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))

/**
 * A light that follows the pointer, shared by the project carousel and by the
 * build archive's covers.
 *
 * `pointermove` fires far more often than the browser ever paints — a 1,000 Hz
 * mouse is seventeen events per frame — and each one measured the element's
 * box, which forces a layout recalculation. Here it is batched into a frame:
 * the effect is the same and the measuring drops to one.
 */
export function trackPointer(el: HTMLElement, prefix: string) {
  let latest: PointerEvent | null = null
  let frame: number | null = null

  const paint = () => {
    frame = null
    if (!latest) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty(`${prefix}-x`, `${latest.clientX - rect.left}px`)
    el.style.setProperty(`${prefix}-y`, `${latest.clientY - rect.top}px`)
  }

  el.addEventListener('pointermove', (event) => {
    latest = event
    if (frame === null) frame = requestAnimationFrame(paint)
  }, { passive: true })
}

/**
 * Horizontal swipe gesture. The three carousels share it, so the threshold and
 * the direction are defined in a single place.
 */
export function onSwipe(el: HTMLElement, handler: (direction: 1 | -1) => void, threshold = 50) {
  let startX = 0
  el.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX }, { passive: true })
  el.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX
    if (Math.abs(dx) > threshold) handler(dx < 0 ? 1 : -1)
  }, { passive: true })
}
