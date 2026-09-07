/* The headline's alternating typewriter effect (rubén <-> rubenitx). */
import { reduce } from './dom'

export function initTypewriter() {
  const el = document.getElementById('hero-typewriter')
  if (!el) return

  const NAME_CLASS = 'text-[color:var(--blue-bright)] font-extrabold'
  const ALIAS_CLASS = 'text-[color:var(--cyan)] font-mono font-bold'

  /*
   * Prefix and name come from the markup the build already painted, so the
   * animation types the same sentence the HTML showed — the dictionary and the
   * profile, not a second copy that can drift and flash a different greeting.
   */
  const prefix = el.dataset.prefix ?? ''
  const names = [
    { text: el.dataset.name ?? '', cls: NAME_CLASS },
    { text: el.dataset.alias ?? 'rubenitx.', cls: ALIAS_CLASS },
  ]
  if (!prefix || !names[0].text) return

  /*
   * The prefix and the name are two stable nodes: typing letter by letter only
   * changes one node's text instead of rebuilding the headline's HTML on every
   * frame.
   */
  const prefixNode = document.createTextNode('')
  const nameNode = document.createElement('span')

  if (reduce) {
    el.replaceChildren(prefixNode, nameNode)
    prefixNode.data = prefix
    nameNode.className = names[0].cls
    nameNode.textContent = names[0].text
    return
  }

  let nameIndex = 0
  let charIdx = 0
  let deleting = false
  let prefixDone = false
  let timer: number | null = null
  let onScreen = !('IntersectionObserver' in window)
  let remaining = 300
  let due = 0
  let mounted = false
  const after = (ms: number): void => {
    remaining = ms
    if (!onScreen || document.hidden) return
    due = performance.now() + ms
    timer = window.setTimeout(tick, ms)
  }

  function tick(): void {
    timer = null
    const current = names[nameIndex]

    if (!prefixDone) {
      charIdx += 1
      prefixNode.data = prefix.slice(0, charIdx)
      if (charIdx < prefix.length) return after(35 + Math.random() * 25)
      prefixDone = true
      charIdx = 0
      return after(200)
    }

    if (nameNode.className !== current.cls) nameNode.className = current.cls
    charIdx += deleting ? -1 : 1
    nameNode.textContent = current.text.slice(0, charIdx)

    if (!deleting && charIdx >= current.text.length) {
      deleting = true
      return after(2400)
    }
    if (deleting && charIdx <= 0) {
      deleting = false
      nameIndex = (nameIndex + 1) % names.length
      return after(350)
    }
    return after(deleting ? 32 + Math.random() * 20 : 50 + Math.random() * 35)
  }

  const sync = () => {
    if (onScreen && !document.hidden) {
      if (!mounted) {
        el.replaceChildren(prefixNode, nameNode)
        mounted = true
      }
      if (timer === null) after(remaining)
    } else if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
      remaining = Math.max(0, due - performance.now())
    }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      sync()
    }).observe(el)
  }
  document.addEventListener('visibilitychange', sync)
  sync()
}
