/** Keep decorative CSS timelines, including their current phase, asleep out of view. */
export function initAmbientMotion() {
  const targets = Array.from(document.querySelectorAll<HTMLElement>(
    '.animate-ping, .animate-pulse, .intro-cursor, .contact-type-cursor, .header-killua-peeker, .contact-handshake-packet, .kb-bolt, .kb-pill-fx, .kb-pill-fx b',
  ))
  const observable = 'IntersectionObserver' in window
  const visible = new Set<Element>(observable ? [] : targets)
  const sync = (el: Element) => {
    el.toggleAttribute('data-motion-paused', document.hidden || !visible.has(el))
  }

  if (observable) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target)
        else visible.delete(entry.target)
        sync(entry.target)
      }
    })
    for (const el of targets) {
      observer.observe(el)
    }
  }
  targets.forEach(sync)
  document.addEventListener('visibilitychange', () => targets.forEach(sync))
}
