/**
 * Workbench de perfil: ficheros, paneles y línea de comando.
 *
 * La caja de comando y el explorador de ficheros son dos vías al mismo sitio,
 * así que el nombre del fichero y las palabras que lo abren se declaran juntos:
 * lo que se ve escrito en la pestaña es literalmente lo que se puede teclear.
 */
import { isSpanish } from './dom'

/**
 * Un panel por fila: cómo se llama su fichero en cada idioma y qué palabras lo
 * abren desde la línea de comando. `identity` cierra la lista porque es el
 * destino por defecto de cualquier comando que no reconozca ningún otro.
 */
const PANELS = [
  {
    id: 'focus',
    file: { en: 'engineering.md', es: 'ingenieria.md' },
    words: ['focus', 'engineering', 'enfoque', 'ingenier', 'arquitect'],
  },
  {
    id: 'learning',
    file: { en: 'learning.log', es: 'aprendizaje.log' },
    words: ['learning', 'education', 'aprendizaje', 'estudio', 'formaci'],
  },
  {
    id: 'identity',
    file: { en: 'identity.json', es: 'identidad.json' },
    words: [],
  },
] as const

export function initProfileWorkbench() {
  const workbench = document.getElementById('profile-workbench')
  if (!workbench) return

  const files = Array.from(workbench.querySelectorAll<HTMLButtonElement>('[data-profile-tab]'))
  const panels = Array.from(workbench.querySelectorAll<HTMLElement>('[data-profile-panel]'))
  const tabLabel = document.getElementById('profile-tab-label')
  const command = document.getElementById('profile-command') as HTMLFormElement | null
  const input = document.getElementById('profile-command-input') as HTMLInputElement | null
  const names: Record<string, string> = Object.fromEntries(
    PANELS.map((panel) => [panel.id, isSpanish ? panel.file.es : panel.file.en]),
  )

  const select = (tab: string) => {
    if (!(tab in names)) return
    files.forEach((file) => {
      const isActive = file.dataset.profileTab === tab
      file.classList.toggle('is-active', isActive)
      file.setAttribute('aria-selected', String(isActive))
    })
    panels.forEach((panel) => {
      const isActive = panel.dataset.profilePanel === tab
      panel.hidden = !isActive
      panel.classList.toggle('is-active', isActive)
    })
    if (tabLabel) tabLabel.textContent = names[tab]
  }

  files.forEach((file) => file.addEventListener('click', () => select(file.dataset.profileTab ?? 'identity')))
  command?.addEventListener('submit', (event) => {
    event.preventDefault()
    const value = input?.value.trim().toLowerCase() ?? ''
    const match = PANELS.find((panel) => panel.words.some((word) => value.includes(word)))
    if (match) select(match.id)
    else if (value) select('identity')
    if (input) input.value = ''
  })
}
