/* Deck secundario de proyectos: rejilla desplazable con contador. */
import { pad } from './dom'

export function initProjectDeck() {
  const deck = document.getElementById('project-deck')
  if (!deck) return

  const viewport = deck.querySelector<HTMLElement>('.project-deck-viewport')
  const track = deck.querySelector<HTMLElement>('.project-deck-track')
  const cards = Array.from(deck.querySelectorAll<HTMLElement>('.project-grid-card'))
  const prevBtn = document.getElementById('project-deck-prev') as HTMLButtonElement | null
  const nextBtn = document.getElementById('project-deck-next') as HTMLButtonElement | null
  const counter = document.getElementById('project-deck-counter')
  if (!viewport || !track || cards.length === 0) return

  let startIndex = 0
  let visibleCount = 1

  const update = () => {
    const cardWidth = cards[0].getBoundingClientRect().width
    const gap = Number.parseFloat(getComputedStyle(track).gap) || 0
    visibleCount = Math.max(1, Math.round((viewport.clientWidth + gap) / (cardWidth + gap)))
    const maxIndex = Math.max(0, cards.length - visibleCount)
    // El índice se acota por los dos lados: nada puede dejarlo en negativo.
    startIndex = Math.max(0, Math.min(startIndex, maxIndex))
    track.style.transform = `translateX(-${startIndex * (cardWidth + gap)}px)`
    if (counter) {
      const end = Math.min(cards.length, startIndex + visibleCount)
      counter.textContent = `${pad(startIndex + 1)}–${pad(end)} / ${pad(cards.length)}`
    }
    if (prevBtn) prevBtn.disabled = startIndex === 0
    if (nextBtn) nextBtn.disabled = startIndex === maxIndex
  }

  prevBtn?.addEventListener('click', () => {
    startIndex -= 1
    update()
  })
  nextBtn?.addEventListener('click', () => {
    startIndex += 1
    update()
  })
  deck.addEventListener('keydown', (event) => {
    if (event.target !== deck) return
    if (event.key === 'ArrowLeft' && startIndex > 0) {
      event.preventDefault()
      startIndex -= 1
      update()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      startIndex += 1
      update()
    }
  })

  new ResizeObserver(update).observe(viewport)
  update()
}
