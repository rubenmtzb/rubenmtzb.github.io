/* Efecto máquina de escribir alternante del titular (rubén <-> rubenitx). */
import { reduce, say } from './dom'

export function initTypewriter() {
  const el = document.getElementById('hero-typewriter')
  if (!el) return

  const NAME_CLASS = 'text-[color:var(--blue-bright)] font-extrabold'
  const ALIAS_CLASS = 'text-[color:var(--cyan)] font-mono font-bold'

  const prefix = say('hola, me llamo ', 'hi there, my name is ')
  const names = [
    { text: say('rubén.', 'ruben.'), cls: NAME_CLASS },
    { text: 'rubenitx.', cls: ALIAS_CLASS },
  ]

  /*
   * El prefijo y el nombre son dos nodos estables: escribir letra a letra
   * solo cambia el texto de un nodo, en lugar de reconstruir el HTML del
   * titular en cada fotograma.
   */
  const prefixNode = document.createTextNode('')
  const nameNode = document.createElement('span')
  el.replaceChildren(prefixNode, nameNode)

  if (reduce) {
    prefixNode.data = prefix
    nameNode.className = names[0].cls
    nameNode.textContent = names[0].text
    return
  }

  let nameIndex = 0
  let charIdx = 0
  let deleting = false
  let prefixDone = false
  const after = (ms: number): void => { window.setTimeout(tick, ms) }

  function tick(): void {
    const current = names[nameIndex]

    if (!prefixDone) {
      charIdx += 1
      prefixNode.data = prefix.slice(0, charIdx)
      if (charIdx < prefix.length) return after(35 + Math.random() * 25)
      prefixDone = true
      charIdx = 0
      return after(200)
    }

    nameNode.className = current.cls
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

  after(300)
}
