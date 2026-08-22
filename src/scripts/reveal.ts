/**
 * Reveal on scroll — a primitive shared by the V1 and the V2.
 *
 * Both surfaces marked `.reveal` with the same observer written out twice, and
 * differed only in margin and threshold. The logic lives here once; each
 * surface brings its own calibration.
 *
 * With no JavaScript, no IntersectionObserver, or with "reduce motion" on, the
 * elements are marked all at once: the reveal is an ornament, never a
 * requirement for reading the content.
 */
export function revealOnScroll({ reduce, rootMargin, threshold }: {
  reduce: boolean
  rootMargin: string
  threshold: number
}) {
  /*
   * A signal for the safety net in the <head>: from here on the reveal has
   * someone to trigger it, so it no longer needs to reveal itself.
   */
  document.documentElement.classList.add('enhanced')

  const targets = document.querySelectorAll<HTMLElement>('.reveal')

  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'))
    return
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    },
    { rootMargin, threshold },
  )
  targets.forEach((el) => io.observe(el))
}
