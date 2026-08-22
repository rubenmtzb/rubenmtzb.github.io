/**
 * Free play: writing pad and telemetry.
 *
 * The keyboard block's second mode: you type freely and see the text, the
 * keystrokes and a live cadence. It shares no state with the speed trial, so it
 * governs itself and exposes only the four things the keyboard needs from it.
 */
import { say } from '../dom'

export function createFreeSandbox({ onEveryTenKeys, announce }: {
  onEveryTenKeys: () => void
  announce: (text: string) => void
}) {
  const box = document.getElementById('free-sim-box')
  const textEl = document.getElementById('free-sim-text')
  const placeholder = document.getElementById('free-sim-placeholder')
  const clearBtn = document.getElementById('free-sim-clear-btn')
  const countEl = document.getElementById('kb-free-count')
  const lastKeyEl = document.getElementById('kb-free-last-key')
  const wpmEl = document.getElementById('kb-free-wpm')
  const profilePill = document.getElementById('kb-free-sound-pill')

  /** Sliding window the live cadence is computed over. */
  const WINDOW_MS = 8000
  const WINDOW_MINUTES = WINDOW_MS / 60_000

  let text = ''
  let keystrokes = 0
  let recent: number[] = []

  const render = () => {
    if (textEl) textEl.textContent = text
    placeholder?.classList.toggle('hidden', text.length > 0)
  }

  const setLastKey = (label: string) => {
    if (lastKeyEl) lastKeyEl.textContent = label
  }

  box?.addEventListener('click', () => box.focus())
  clearBtn?.addEventListener('click', (event) => {
    event.stopPropagation()
    text = ''
    keystrokes = 0
    recent = []
    render()
    if (countEl) countEl.textContent = '0'
    if (wpmEl) wpmEl.textContent = '0 WPM'
    setLastKey('—')
    announce(say('¡Pizarra limpia! ¿Listo para escribir otra vez?', 'Board cleared! Ready to type again?'))
  })

  return {
    /** The global keyboard needs to know whether focus is in here. */
    element: box,
    showProfile(label: string) {
      if (profilePill) profilePill.textContent = `🔊 ${label}`
    },
    type(char: string, code: string) {
      text += char
      render()

      keystrokes += 1
      const now = performance.now()
      recent.push(now)
      recent = recent.filter((t) => now - t <= WINDOW_MS)

      if (countEl) countEl.textContent = String(keystrokes)
      if (wpmEl) wpmEl.textContent = `${Math.round(recent.length / 5 / WINDOW_MINUTES)} WPM`
      setLastKey(`[ ${code === 'Space' ? 'SPACE' : char.toUpperCase() || code.replace('Key', '')} ]`)

      if (keystrokes % 10 === 0) onEveryTenKeys()
    },
    backspace() {
      if (text.length === 0) return
      text = text.slice(0, -1)
      render()
      setLastKey('[ BACKSPACE ]')
    },
  }
}
