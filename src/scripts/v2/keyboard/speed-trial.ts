/**
 * Primer modo del bloque de teclados: la prueba de velocidad.
 *
 * Es la pareja del modo libre, así que expone la misma superficie —una tecla,
 * un retroceso y la caja que recibe el foco— y guarda dentro todo lo que solo
 * le incumbe: la frase en curso, el cronómetro y las estadísticas. El teclado
 * que la usa no sabe cómo se calculan las WPM, igual que no sabe cómo se pinta
 * la pizarra del otro modo.
 */
import { say } from '../dom'

/** Frases del test. Van en inglés a propósito: es el idioma que se teclea. */
const QUOTES = [
  "lightning never strikes twice unless godspeed is activated",
  "assassination techniques require absolute silence and total aura control",
  "distributed systems scale when state is minimized and throughput is optimized",
  "mechanical switches tuned with krytox lube create the purest sound feedback",
  "hunter license granted to those who master both mind and reaction speed",
  "typesafe functional architectures reduce runtime anomalies to zero",
  "nobody can react faster than electrical signals sent directly from the brain",
  "always keep your code clean and your blade razor sharp",
]

/** Duración de una ronda, en segundos. */
const ROUND_SECONDS = 30

/** WPM a partir de las cuales la mascota reconoce el resultado. */
const GODSPEED_WPM = 85

export function createSpeedTrial({ announce }: { announce: (text: string) => void }) {
  const wordsEl = document.getElementById('monkey-words')
  const box = document.getElementById('monkey-box')
  const restartBtn = document.getElementById('monkey-restart-btn')
  const wpmEl = document.getElementById('kb-wpm')
  const accEl = document.getElementById('kb-acc')
  const comboEl = document.getElementById('kb-combo')
  const timerEl = document.getElementById('kb-timer')

  let currentQuote = ''
  let targetChars: string[] = []
  let charIndex = 0
  let correctCount = 0
  let totalTyped = 0
  let combo = 0
  let startTime = 0
  let isRunning = false
  let timerInterval: number | null = null
  let remainingSec = ROUND_SECONDS

  /*
   * Los <span> de cada carácter se guardan al pintarlos. Antes cada
   * pulsación hacía dos querySelector sobre la frase completa; ahora es
   * un acceso por índice, que es lo que el bucle de tecleo necesita.
   */
  let charSpans: HTMLElement[] = []

  const render = () => {
    if (!wordsEl) return
    charSpans = []

    const fragment = document.createDocumentFragment()
    const words = currentQuote.split(' ')

    const addChar = (char: string, parent: Node) => {
      const span = document.createElement('span')
      span.className = charSpans.length === 0 ? 'monkey-char current' : 'monkey-char'
      span.dataset.idx = String(charSpans.length)
      span.textContent = char
      parent.appendChild(span)
      charSpans.push(span)
    }

    words.forEach((word, wordIdx) => {
      const wordEl = document.createElement('span')
      wordEl.className = 'monkey-word'
      for (const char of word) addChar(char, wordEl)
      fragment.appendChild(wordEl)
      if (wordIdx < words.length - 1) addChar(' ', fragment)
    })

    wordsEl.replaceChildren(fragment)
  }

  const accuracy = () => (totalTyped > 0 ? Math.round((correctCount / totalTyped) * 100) : 100)
  const wpmSince = (minutes: number) => Math.max(0, Math.round((correctCount / 5) / minutes))

  const finish = () => {
    isRunning = false
    if (timerInterval) clearInterval(timerInterval)
    const elapsedMinutes = Math.max(0.1, (performance.now() - startTime) / 60000)
    const finalWpm = wpmSince(elapsedMinutes)
    const finalAcc = accuracy()

    announce(finalWpm >= GODSPEED_WPM
      ? say(
        `⚡ ¡Impresionante! ${finalWpm} WPM con ${finalAcc}% de precisión. ¡Casi tan rápido como mi Narukami!`,
        `⚡ Incredible! ${finalWpm} WPM with ${finalAcc}% accuracy! Almost as fast as my lightning!`,
      )
      : say(
        `⚡ ${finalWpm} WPM y ${finalAcc}% de precisión. ¡Buen intento, pero Godspeed sigue invicto! Pulsa reiniciar para otra ronda.`,
        `⚡ ${finalWpm} WPM & ${finalAcc}% acc. Nice try, but Godspeed remains undefeated! Hit restart to try again.`,
      ))
  }

  const startIfNeeded = () => {
    if (isRunning) return
    isRunning = true
    startTime = performance.now()
    if (timerInterval) clearInterval(timerInterval)
    timerInterval = window.setInterval(() => {
      remainingSec--
      if (timerEl) timerEl.textContent = `⏱️ ${remainingSec}s`
      if (remainingSec <= 0) finish()
    }, 1000)
  }

  const updateLiveStats = () => {
    const elapsedMinutes = (performance.now() - startTime) / 60000
    if (elapsedMinutes > 0 && wpmEl) wpmEl.textContent = String(wpmSince(elapsedMinutes))
    if (accEl) accEl.textContent = `${accuracy()}%`
    if (comboEl) comboEl.textContent = `x${combo}`
  }

  /** Carga otra frase y devuelve el marcador a cero. */
  const restart = () => {
    const others = QUOTES.filter((quote) => quote !== currentQuote)
    currentQuote = others[Math.floor(Math.random() * others.length)] || QUOTES[0]
    targetChars = currentQuote.split('')
    charIndex = 0
    correctCount = 0
    totalTyped = 0
    combo = 0
    isRunning = false
    remainingSec = ROUND_SECONDS
    if (timerInterval) clearInterval(timerInterval)

    if (wpmEl) wpmEl.textContent = '0'
    if (accEl) accEl.textContent = '100%'
    if (comboEl) comboEl.textContent = 'x0'
    if (timerEl) timerEl.textContent = `⏱️ ${ROUND_SECONDS}s`

    announce(say(
      '¿Crees que puedes teclear más rápido que mi Godspeed? ¡A ver cuánto WPM alcanzas!',
      "You think you can type faster than my Godspeed lightning? Let's see your WPM!",
    ))

    render()
  }

  restartBtn?.addEventListener('click', () => restart())
  box?.addEventListener('click', () => box.focus())

  return {
    /** El teclado global necesita saber si el foco está aquí dentro. */
    element: box,
    restart,
    type(inputChar: string) {
      if (charIndex >= targetChars.length) return
      startIfNeeded()

      const expected = targetChars[charIndex]
      totalTyped++

      const isCorrect = inputChar.toLowerCase() === expected.toLowerCase()
      const currentCharEl = charSpans[charIndex]

      if (currentCharEl) {
        currentCharEl.classList.remove('current')
        currentCharEl.classList.toggle('correct', isCorrect)
        currentCharEl.classList.toggle('incorrect', !isCorrect)
      }
      if (isCorrect) {
        correctCount++
        combo++
      } else {
        combo = 0
      }

      charIndex++
      charSpans[charIndex]?.classList.add('current')

      updateLiveStats()

      if (charIndex >= targetChars.length) finish()
    },
    backspace() {
      if (charIndex === 0) return
      charSpans[charIndex]?.classList.remove('current')
      charIndex--
      const prevCharEl = charSpans[charIndex]
      if (prevCharEl) {
        prevCharEl.classList.remove('correct', 'incorrect')
        prevCharEl.classList.add('current')
      }
    },
  }
}
