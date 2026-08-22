/* Workbench de perfil: ficheros, paneles y línea de comando. */

export function initProfileWorkbench() {
  const workbench = document.getElementById('profile-workbench')
  if (!workbench) return

  const files = Array.from(workbench.querySelectorAll<HTMLButtonElement>('[data-profile-tab]'))
  const panels = Array.from(workbench.querySelectorAll<HTMLElement>('[data-profile-panel]'))
  const tabLabel = document.getElementById('profile-tab-label')
  const command = document.getElementById('profile-command') as HTMLFormElement | null
  const input = document.getElementById('profile-command-input') as HTMLInputElement | null
  const names: Record<string, string> = {
    identity: 'identity.json',
    focus: 'engineering.md',
    learning: 'learning.log',
  }

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
    if (value.includes('focus') || value.includes('engineering') || value.includes('arquitect')) select('focus')
    else if (value.includes('learning') || value.includes('education') || value.includes('estudio') || value.includes('formaci')) select('learning')
    else if (value) select('identity')
    if (input) input.value = ''
  })
}
