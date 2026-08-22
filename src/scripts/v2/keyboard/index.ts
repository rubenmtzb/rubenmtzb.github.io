/**
 * Teclado mecánico dibujado, con sus dos modos: el test de velocidad tipo
 * MonkeyType y el modo libre. Aquí solo vive el gobierno del bloque —qué
 * tecla se pulsa, en qué modo estamos y qué pestaña manda—; la mascota, el
 * sonido y la pizarra de escritura son piezas propias con su propio módulo.
 */
import { say } from '../dom'
import { createPixelKillua } from './killua'
import { createSwitchAudio } from './switch-audio'
import { createFreeSandbox } from './sandbox'

export function initKeyboard() {
  const kb = document.getElementById('kb')
  if (!kb) return
  /** Cada tecla dibujada, indexada por el código que reporta el teclado real. */
  const keys = new Map<string, HTMLElement>()
  for (const el of kb.querySelectorAll<HTMLElement>('[data-code]')) {
    if (el.dataset.code) keys.set(el.dataset.code, el)
  }

  const monkeyWordsEl = document.getElementById('monkey-words')
  const monkeyBox = document.getElementById('monkey-box')
  const monkeyRestartBtn = document.getElementById('monkey-restart-btn')
  const killuaSpeech = document.getElementById('killua-typing-speech')
  const wpmEl = document.getElementById('kb-wpm')
  const accEl = document.getElementById('kb-acc')
  const comboEl = document.getElementById('kb-combo')
  const timerEl = document.getElementById('kb-timer')
  const switchTypeBtn = document.getElementById('kb-switch-type')
  const soundToggle = document.getElementById('kb-sound-toggle')
  const soundLabel = document.getElementById('kb-sound-label')

  const killuaCanvas = document.getElementById('kb-pixel-killua') as HTMLCanvasElement | null
  const killua = createPixelKillua(killuaCanvas)
  const audio = createSwitchAudio()

  const KILLUA_QUIPS_ES = [
    '¡Oye! ¡No me toques la cara, mejor concéntrate en teclear a la velocidad del rayo!',
    '¡No me desconcentres! ¡Demuéstrame si puedes superar 80 WPM!',
    '¿Crees que tus dedos son tan rápidos como mis garras de asesino? ¡Sigue tecleando!',
    '¡Ouch! ¡Deja de hacer clic en mí y concéntrate en las palabras!',
  ]
  const KILLUA_QUIPS_EN = [
    "Hey! Don't poke me, focus on typing at lightning speed!",
    "Don't distract me! Let's see if you can pass 80 WPM!",
    "You think your fingers are faster than my assassin claws? Keep typing!",
    "Ouch! Stop clicking on me and hit the keyboard!",
  ]
  let quipIdx = 0

  killuaCanvas?.addEventListener('click', () => {
    if (killua.airborne) return
    killua.hop()
    audio.play()
    const quips = say(KILLUA_QUIPS_ES, KILLUA_QUIPS_EN)
    setKilluaSpeech(quips[quipIdx % quips.length])
    quipIdx++
  })

  // Pool de frases dinámicas en inglés estilo Killua / Godspeed / Tech
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

  let currentQuote = ''
  let targetChars: string[] = []
  let charIndex = 0
  let correctCount = 0
  let totalTyped = 0
  let combo = 0
  let startTime = 0
  let isRunning = false
  let timerInterval: number | null = null
  let remainingSec = 30
  let activeMode: 'speed' | 'sim' | 'photos' = 'speed'

  const setKilluaSpeech = (text: string) => {
    if (killuaSpeech) killuaSpeech.textContent = `"${text}"`
  }

  const loadNewQuote = () => {
    const nextQuotes = QUOTES.filter((q) => q !== currentQuote)
    currentQuote = nextQuotes[Math.floor(Math.random() * nextQuotes.length)] || QUOTES[0]
    targetChars = currentQuote.split('')
    charIndex = 0
    correctCount = 0
    totalTyped = 0
    combo = 0
    isRunning = false
    remainingSec = 30
    if (timerInterval) clearInterval(timerInterval)

    if (wpmEl) wpmEl.textContent = '0'
    if (accEl) accEl.textContent = '100%'
    if (comboEl) comboEl.textContent = 'x0'
    if (timerEl) timerEl.textContent = '⏱️ 30s'

    setKilluaSpeech(say(
      '¿Crees que puedes teclear más rápido que mi Godspeed? ¡A ver cuánto WPM alcanzas!',
      "You think you can type faster than my Godspeed lightning? Let's see your WPM!",
    ))

    renderMonkeyWords()
  }

  /*
   * Los <span> de cada carácter se guardan al pintarlos. Antes cada
   * pulsación hacía dos querySelector sobre el frase completa; ahora es
   * un acceso por índice, que es lo que el bucle de tecleo necesita.
   */
  let charSpans: HTMLElement[] = []

  const renderMonkeyWords = () => {
    if (!monkeyWordsEl) return
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

    monkeyWordsEl.replaceChildren(fragment)
  }

  const startTestIfNeeded = () => {
    if (!isRunning) {
      isRunning = true
      startTime = performance.now()
      if (timerInterval) clearInterval(timerInterval)
      timerInterval = window.setInterval(() => {
        remainingSec--
        if (timerEl) timerEl.textContent = `⏱️ ${remainingSec}s`
        if (remainingSec <= 0) finishTest()
      }, 1000)
    }
  }

  const updateLiveStats = () => {
    const elapsedMinutes = (performance.now() - startTime) / 60000
    if (elapsedMinutes > 0) {
      const wpm = Math.max(0, Math.round((correctCount / 5) / elapsedMinutes))
      if (wpmEl) wpmEl.textContent = String(wpm)
    }
    const acc = totalTyped > 0 ? Math.round((correctCount / totalTyped) * 100) : 100
    if (accEl) accEl.textContent = `${acc}%`
    if (comboEl) comboEl.textContent = `x${combo}`
  }

  const finishTest = () => {
    isRunning = false
    if (timerInterval) clearInterval(timerInterval)
    const elapsedMinutes = Math.max(0.1, (performance.now() - startTime) / 60000)
    const finalWpm = Math.round((correctCount / 5) / elapsedMinutes)
    const finalAcc = totalTyped > 0 ? Math.round((correctCount / totalTyped) * 100) : 100

    if (finalWpm >= 85) {
      setKilluaSpeech(say(
        `⚡ ¡Impresionante! ${finalWpm} WPM con ${finalAcc}% de precisión. ¡Casi tan rápido como mi Narukami!`,
        `⚡ Incredible! ${finalWpm} WPM with ${finalAcc}% accuracy! Almost as fast as my lightning!`,
      ))
    } else {
      setKilluaSpeech(say(
        `⚡ ${finalWpm} WPM y ${finalAcc}% de precisión. ¡Buen intento, pero Godspeed sigue invicto! Pulsa reiniciar para otra ronda.`,
        `⚡ ${finalWpm} WPM & ${finalAcc}% acc. Nice try, but Godspeed remains undefeated! Hit restart to try again.`,
      ))
    }
  }

  const handleCharInput = (inputChar: string) => {
    if (charIndex >= targetChars.length) return
    startTestIfNeeded()

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

    if (charIndex >= targetChars.length) {
      finishTest()
    }
  }

  const handleBackspace = () => {
    if (charIndex === 0) return
    charSpans[charIndex]?.classList.remove('current')
    charIndex--
    const prevCharEl = charSpans[charIndex]
    if (prevCharEl) {
      prevCharEl.classList.remove('correct', 'incorrect')
      prevCharEl.classList.add('current')
    }
  }

  const kbSpeedModeWrap = document.getElementById('kb-speed-mode-wrap')
  const kbFreeModeWrap = document.getElementById('kb-free-mode-wrap')
  // Envueltas en función: así el orden de declaración dentro de initKeyboard
  // deja de importar y reordenar el fichero no puede romperlo en silencio.
  const sandbox = createFreeSandbox({
    onEveryTenKeys: () => killua.hop(),
    announce: (text) => setKilluaSpeech(text),
  })

  const press = (code: string, down: boolean, keyEl?: HTMLElement) => {
    const key = keyEl || keys.get(code)
    if (!key) return
    key.classList.toggle('is-down', down)
    if (down) audio.play()
  }

  /*
   * Qué hace cada tecla en cada modo. Antes estaba escrito dos veces, una
   * para el teclado físico y otra para el clic sobre las teclas en pantalla,
   * con el riesgo de que las dos copias se separasen.
   */
  const dispatchKey = (code: string, char: string, fromHardware: boolean) => {
    if (activeMode === 'speed') {
      if (code === 'Backspace') handleBackspace()
      else if (code === 'Space') handleCharInput(' ')
      else if (char.length === 1) handleCharInput(char)
      return
    }
    if (activeMode !== 'sim') return
    if (code === 'Backspace') sandbox.backspace()
    else if (code === 'Space') sandbox.type(' ', 'Space')
    // El Enter del teclado real inserta un espacio; la tecla dibujada escribe su glifo.
    else if (code === 'Enter' && fromHardware) sandbox.type(' ', 'Enter')
    else if (char.length === 1) sandbox.type(char, code)
  }

  /** Escribir en un campo de la página no debe pilotar el teclado de adorno. */
  const isForeignField = (target: EventTarget | null) => {
    const el = target as HTMLElement | null
    return ['INPUT', 'TEXTAREA'].includes(el?.tagName ?? '')
      && target !== monkeyBox && target !== sandbox.element
  }

  /*
   * El bloque solo secuestra el espacio y el retroceso cuando está de
   * verdad en juego: con el foco dentro del archivo, o con el panel a la
   * vista. Antes bastaba con estar en modo Speed Trial —el modo por
   * defecto—, así que la barra espaciadora dejaba de hacer scroll en toda
   * la página desde el primer render.
   */
  let panelOnScreen = false
  const interactivePanel = document.getElementById('kb-panel-interactive')
  if (interactivePanel && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => { panelOnScreen = entry.isIntersecting },
      { threshold: 0.35 },
    ).observe(interactivePanel)
  }

  window.addEventListener('keydown', (e) => {
    if (isForeignField(e.target) || activeMode === 'photos') return

    const insideArchive = (e.target as HTMLElement)?.closest('#archive') !== null
    const engaged = document.activeElement === monkeyBox
      || document.activeElement === sandbox.element
      || insideArchive
      || panelOnScreen

    /*
     * El tabulador nunca se bloquea: es la única forma de recorrer la
     * página con el teclado y no le pertenece a este widget.
     */
    if (engaged && (e.code === 'Space' || e.code === 'Backspace')) e.preventDefault()

    press(e.code, true)

    const printable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey ? e.key : ''
    dispatchKey(e.code, printable, true)
  })

  window.addEventListener('keyup', (e) => {
    if (isForeignField(e.target)) return
    press(e.code, false)
  })

  window.addEventListener('blur', () => keys.forEach((k) => k.classList.remove('is-down')))

  keys.forEach((el, code) => {
    const trigger = () => {
      press(code, true, el)
      dispatchKey(code, el.dataset.char ?? '', false)
    }
    const release = () => press(code, false, el)

    el.addEventListener('mousedown', trigger)
    el.addEventListener('mouseup', release)
    el.addEventListener('mouseleave', release)
    el.addEventListener('touchstart', (e) => { e.preventDefault(); trigger() }, { passive: false })
    el.addEventListener('touchend', release)
  })

  monkeyRestartBtn?.addEventListener('click', () => loadNewQuote())
  monkeyBox?.addEventListener('click', () => monkeyBox.focus())

  switchTypeBtn?.addEventListener('click', () => {
    const label = audio.nextProfile()
    switchTypeBtn.textContent = label
    sandbox.showProfile(label)
    audio.play()
  })

  soundToggle?.addEventListener('click', () => {
    audio.toggle()
    // Las dos etiquetas viajan en data-*: la traducción vive solo en i18n/ui.
    const label = soundToggle.dataset[audio.enabled ? 'on' : 'off']
    if (soundLabel && label) soundLabel.textContent = label
  })

  // Switcher de pestañas: Speed Trial vs Simulador vs Fotos
  const tabSpeed = document.getElementById('kb-tab-speed')
  const tabSim = document.getElementById('kb-tab-sim')
  const tabPhotos = document.getElementById('kb-tab-photos')
  const panelPhotos = document.getElementById('kb-panel-photos')

  /*
   * Patrón ARIA de pestañas completo: además del estado visual, el grupo
   * mantiene un único punto de tabulación y las flechas recorren los tres
   * modos, que es como un lector de pantalla espera navegar un `tablist`.
   */
  const setTabActive = (activeBtn: HTMLElement | null, inactiveBtns: (HTMLElement | null)[]) => {
    activeBtn?.classList.add('active')
    activeBtn?.setAttribute('aria-selected', 'true')
    activeBtn?.removeAttribute('tabindex')

    inactiveBtns.forEach((btn) => {
      btn?.classList.remove('active')
      btn?.setAttribute('aria-selected', 'false')
      btn?.setAttribute('tabindex', '-1')
    })
  }

  tabSpeed?.addEventListener('click', () => {
    activeMode = 'speed'
    setTabActive(tabSpeed, [tabSim, tabPhotos])
    interactivePanel?.classList.remove('hidden')
    panelPhotos?.classList.add('hidden')
    kbSpeedModeWrap?.classList.remove('hidden')
    kbFreeModeWrap?.classList.add('hidden')
    loadNewQuote()
  })

  tabSim?.addEventListener('click', () => {
    activeMode = 'sim'
    setTabActive(tabSim, [tabSpeed, tabPhotos])
    interactivePanel?.classList.remove('hidden')
    panelPhotos?.classList.add('hidden')
    kbSpeedModeWrap?.classList.add('hidden')
    kbFreeModeWrap?.classList.remove('hidden')
    setKilluaSpeech(say('Modo libre activado. ¡Escribe lo que quieras para probar la acústica y el tacto!', 'Free sandbox mode active! Type anything to test switch sound and response!'))
    sandbox.showProfile(audio.label)
  })

  tabPhotos?.addEventListener('click', () => {
    activeMode = 'photos'
    setTabActive(tabPhotos, [tabSpeed, tabSim])
    interactivePanel?.classList.add('hidden')
    panelPhotos?.classList.remove('hidden')
  })

  const tabs = [tabSpeed, tabSim, tabPhotos].filter((tab): tab is HTMLElement => tab !== null)
  const TAB_STEPS: Record<string, (index: number) => number> = {
    ArrowLeft: (i) => i - 1,
    ArrowRight: (i) => i + 1,
    Home: () => 0,
    End: () => tabs.length - 1,
  }
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('keydown', (event) => {
      const step = TAB_STEPS[event.key]
      if (!step) return
      event.preventDefault()
      const next = tabs[(step(index) + tabs.length) % tabs.length]
      next.focus()
      next.click()
    })
  }

  loadNewQuote()
}
