/**
 * The keyboard block's first mode: the speed trial.
 *
 * It is free play's counterpart, so it exposes the same surface — a key, a
 * backspace and the box that takes focus — and keeps inside everything that
 * concerns only itself: the current phrase, the clock and the statistics. The
 * keyboard using it does not know how WPM are computed, just as it does not
 * know how the other mode's pad is painted.
 */
import { say } from '../dom'

/*
 * Both collections hold roughly the same difficulty and use only characters
 * available on the HHKB being shown. That way a Spanish page offers Spanish
 * phrases without forcing a change of physical layout or of the rules each
 * keystroke is compared against.
 */
const QUOTES_EN = [
  "lightning never strikes twice unless godspeed is activated",
  "assassination techniques require absolute silence and total aura control",
  "distributed systems scale when state is minimized and throughput is optimized",
  "mechanical switches tuned with krytox lube create the purest sound feedback",
  "hunter license granted to those who master both mind and reaction speed",
  "typesafe functional architectures reduce runtime anomalies to zero",
  "nobody can react faster than electrical signals sent directly from the brain",
  "always keep your code clean and your blade razor sharp",
]

const QUOTES_ES = [
  'los rayos no caen dos veces salvo cuando godspeed esta activo',
  'las tecnicas de asesinato exigen silencio absoluto y control total del aura',
  'los sistemas distribuidos escalan cuando el estado se reduce y el flujo se optimiza',
  'los interruptores mecanicos con lubricante krytox dan el sonido mas puro',
  'la licencia de cazador llega a quien domina mente y velocidad de reaccion',
  'las arquitecturas funcionales tipadas reducen los fallos en ejecucion a cero',
  'nadie reacciona mas rapido que las senales electricas del cerebro',
  'manten tu codigo limpio y tu hoja siempre afilada',
]

/** A round's duration, in seconds. */
const ROUND_SECONDS = 30

/** The WPM from which the mascot acknowledges the result. */
const GODSPEED_WPM = 85

export function createSpeedTrial({ announce }: { announce: (text: string) => void }) {
  const quotes = say(QUOTES_ES, QUOTES_EN)
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
   * The round is over and the score is final.
   *
   * Without this, typing on after time ran out restarted the clock: the
   * countdown fell into negative numbers and the origin of the WPM calculation
   * moved, so earlier keystrokes stopped counting. Until a restart, the board
   * accepts nothing.
   */
  let over = false

  /*
   * Each character's <span> is stored as it is painted. Every keystroke used to
   * run two querySelector calls over the whole phrase; now it is an access by
   * index, which is what the typing loop actually needs.
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
    over = true
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

  /** Loads another phrase and returns the score to zero. */
  const restart = () => {
    const others = quotes.filter((quote) => quote !== currentQuote)
    currentQuote = others[Math.floor(Math.random() * others.length)] || quotes[0]
    targetChars = currentQuote.split('')
    charIndex = 0
    correctCount = 0
    totalTyped = 0
    combo = 0
    isRunning = false
    over = false
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
    /** The global keyboard needs to know whether focus is in here. */
    element: box,
    restart,
    type(inputChar: string) {
      if (over) return
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
      if (over || charIndex === 0) return
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
