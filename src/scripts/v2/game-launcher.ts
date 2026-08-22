/**
 * Easter egg: lanzador del platformer de Killua.
 *
 * El platformer es la pieza más pesada del sitio y solo la ve quien la
 * busca, así que viaja en su propio chunk y se descarga con el primer
 * intento de abrirlo. El resto de la página no paga su peso.
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
      // Si el chunk no llega, el portfolio sigue intacto: solo falta el juego.
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
