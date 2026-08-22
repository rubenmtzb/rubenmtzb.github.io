/**
 * Easter egg: launcher for Killua's platformer.
 *
 * The platformer is the heaviest piece on the site and only whoever looks for it
 * ever sees it, so it travels in its own chunk and downloads on the first
 * attempt to open it. The rest of the page does not pay its weight.
 */
export function initGameMode() {
  let gameRunning = false

  const launch = async () => {
    if (gameRunning) return
    gameRunning = true
    try {
      const { startGameMode } = await import('../game-mode')
      startGameMode(() => { gameRunning = false })
    } catch {
      // If the chunk never arrives, the portfolio is untouched: only the game is missing.
      gameRunning = false
    }
  }

  for (const id of ['gm-trigger', 'nav-game-btn']) {
    document.getElementById(id)?.addEventListener('click', () => void launch())
  }

  window.addEventListener('keydown', (e) => {
    // Permite atajo Alt+G, Ctrl+G o Cmd+G
    if ((e.altKey || e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g' && !gameRunning) {
      e.preventDefault()
      void launch()
    }
  })
}
