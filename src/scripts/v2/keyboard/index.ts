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
import { createSpeedTrial } from './speed-trial'

export function initKeyboard() {
  const kb = document.getElementById('kb')
  if (!kb) return
  /** Cada tecla dibujada, indexada por el código que reporta el teclado real. */
  const keys = new Map<string, HTMLElement>()
  for (const el of kb.querySelectorAll<HTMLElement>('[data-code]')) {
    if (el.dataset.code) keys.set(el.dataset.code, el)
  }

  const killuaSpeech = document.getElementById('killua-typing-speech')
  const switchTypeBtn = document.getElementById('kb-switch-type')
  const soundToggle = document.getElementById('kb-sound-toggle')
  const soundLabel = document.getElementById('kb-sound-label')

  const killuaCanvas = document.getElementById('kb-pixel-killua') as HTMLCanvasElement | null
  const killua = createPixelKillua(killuaCanvas)
  const audio = createSwitchAudio()

  const setKilluaSpeech = (text: string) => {
    if (killuaSpeech) killuaSpeech.textContent = `"${text}"`
  }

  /* Lo que suelta la mascota cuando alguien le toca la cara en vez de teclear. */
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

  let activeMode: 'speed' | 'sim' | 'photos' = 'speed'

  /*
   * Los dos modos exponen la misma superficie —una tecla, un retroceso y la
   * caja que recibe el foco—, así que el despachador trata a los dos igual y
   * no tiene que saber cómo calcula cada uno lo suyo.
   */
  const trial = createSpeedTrial({ announce: setKilluaSpeech })
  const sandbox = createFreeSandbox({
    onEveryTenKeys: () => killua.hop(),
    announce: setKilluaSpeech,
  })

  const kbSpeedModeWrap = document.getElementById('kb-speed-mode-wrap')
  const kbFreeModeWrap = document.getElementById('kb-free-mode-wrap')

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
      if (code === 'Backspace') trial.backspace()
      else if (code === 'Space') trial.type(' ')
      else if (char.length === 1) trial.type(char)
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
      && target !== trial.element && target !== sandbox.element
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
    const engaged = document.activeElement === trial.element
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
    trial.restart()
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

  trial.restart()
}
