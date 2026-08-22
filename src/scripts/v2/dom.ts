/**
 * Primitivas compartidas por la capa de interacción de la V2.
 *
 * Todo lo que hay aquí lo usan varias funcionalidades a la vez: leer las
 * preferencias una sola vez, elegir texto por idioma, numerar los contadores
 * y los dos gestos —puntero y deslizamiento— que comparten los carruseles y
 * las portadas del archivo.
 */

/** Preferencias e idioma se leen una sola vez: no cambian durante la sesión. */
export const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const isSpanish = document.documentElement.lang === 'es'

/** Elige entre la variante castellana y la inglesa según el idioma del documento. */
export const say = <T,>(es: T, en: T): T => (isSpanish ? es : en)

/** Numeración de dos dígitos: "01 / 04". La comparten los dos contadores. */
export const pad = (n: number) => String(n).padStart(2, '0')

export const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))

/**
 * Luz que sigue al puntero, compartida por el carrusel de proyectos y por
 * las portadas del archivo de builds.
 *
 * `pointermove` se dispara muchas más veces de las que el navegador llega a
 * pintar —un ratón de 1.000 Hz son diecisiete eventos por fotograma— y cada
 * uno medía la caja del elemento, que obliga a recalcular el diseño. Aquí se
 * agrupa en un fotograma: el efecto es el mismo y la medición pasa a ser una.
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
 * Gesto de deslizamiento horizontal. Lo comparten los tres carruseles,
 * así que el umbral y la dirección se definen en un único sitio.
 */
export function onSwipe(el: HTMLElement, handler: (direction: 1 | -1) => void, threshold = 50) {
  let startX = 0
  el.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX }, { passive: true })
  el.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX
    if (Math.abs(dx) > threshold) handler(dx < 0 ? 1 : -1)
  }, { passive: true })
}
