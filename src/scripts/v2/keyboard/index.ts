/**
 * The drawn mechanical keyboard and its two modes: the MonkeyType-style speed
 * trial and free play. Only the block's governance lives here — which key is
 * pressed, which mode we are in and which tab is in charge; the mascot, the
 * sound and the writing pad are pieces of their own with their own modules.
 */
import { isSpanish, say } from '../dom'
import { createPixelKillua } from './killua'
import { createSwitchAudio } from './switch-audio'
import { createFreeSandbox } from './sandbox'
import { createSpeedTrial } from './speed-trial'

export function initKeyboard() {
  const kb = document.getElementById('kb')
  if (!kb) return
  /** Every drawn key, indexed by the code the real keyboard reports. */
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
  const audio = createSwitchAudio(isSpanish() ? 'es' : 'en')

  const setKilluaSpeech = (text: string) => {
    if (killuaSpeech) killuaSpeech.textContent = `"${text}"`
  }

  /* What the mascot says when someone pokes its face instead of typing. */
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
   * Both modes expose the same surface — a key, a backspace and the box that
   * takes focus — so the dispatcher treats them alike and never has to know how
   * each one works out its own business.
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
   * What each key does in each mode. It used to be written twice, once for the
   * physical keyboard and once for clicks on the on-screen keys, with the risk
   * of the two copies drifting apart.
   */
  const dispatchKey = (code: string, char: string, fromHardware: boolean) => {
    if (activeMode === 'speed') {
      if (trial.waiting) return
      if (code === 'Backspace') trial.backspace()
      else if (code === 'Space') trial.type(' ')
      else if (char.length === 1) trial.type(char)
      return
    }
    if (activeMode !== 'sim') return
    if (code === 'Backspace') sandbox.backspace()
    else if (code === 'Space') sandbox.type(' ', 'Space')
    // The real keyboard's Enter inserts a space; the drawn key writes its glyph.
    else if (code === 'Enter' && fromHardware) sandbox.type(' ', 'Enter')
    else if (char.length === 1) sandbox.type(char, code)
  }

  /** Typing into a field on the page must not drive the decorative keyboard. */
  const isForeignField = (target: EventTarget | null) => {
    const el = target as HTMLElement | null
    return ['INPUT', 'TEXTAREA'].includes(el?.tagName ?? '')
      && target !== trial.element && target !== sandbox.element
  }

  /*
   * The block only hijacks space and backspace when it is genuinely in play:
   * with focus inside the archive, or with the panel in view. It used to be
   * enough to be in Speed Trial — the default mode — so the spacebar stopped
   * scrolling the whole page from the very first render.
   */
  let panelOnScreen = false
  const interactivePanel = document.getElementById('kb-panel-interactive')
  if (interactivePanel && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => { panelOnScreen = entry.isIntersecting },
      { threshold: 0.35 },
    ).observe(interactivePanel)
  }

  const gameOwnsKeys = () => document.documentElement.classList.contains('game-mode-active')

  const applyGameMode = (active: boolean) => {
    if (active) trial.pause()
    else trial.resume()
  }
  document.addEventListener('game-mode-change', (event) => {
    const active = (event as CustomEvent<{ active?: boolean }>).detail?.active
    applyGameMode(active ?? gameOwnsKeys())
  })

  window.addEventListener('keydown', (e) => {
    /*
     * Killua's platformer and this widget share WASD, arrows and space.
     * preventDefault in the game does not stop this listener, so while the
     * overlay is up the archive must not light keys, type, or steal Space.
     */
    if (gameOwnsKeys()) return
    if (isForeignField(e.target) || activeMode === 'photos') return

    const insideArchive = (e.target as HTMLElement)?.closest('#archive') !== null
    const trialLive = activeMode === 'speed' && !trial.waiting
    const engaged = document.activeElement === trial.element
      || document.activeElement === sandbox.element
      || insideArchive
      || (panelOnScreen && (activeMode === 'sim' || trialLive))

    /*
     * Tab is never blocked: it is the only way to walk the page from the
     * keyboard and it does not belong to this widget.
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
      if (gameOwnsKeys()) return
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
    // Both labels travel in data-*: the translation lives only in i18n/ui.
    const label = soundToggle.dataset[audio.enabled ? 'on' : 'off']
    if (soundLabel && label) soundLabel.textContent = label
  })

  // Tab switcher: Speed Trial vs Simulator vs Photos
  const tabSpeed = document.getElementById('kb-tab-speed')
  const tabSim = document.getElementById('kb-tab-sim')
  const tabPhotos = document.getElementById('kb-tab-photos')
  const panelPhotos = document.getElementById('kb-panel-photos')

  /*
   * The full ARIA tabs pattern: beyond the visual state, the group keeps a
   * single tab stop and the arrow keys walk the three modes, which is how a
   * screen reader expects to navigate a `tablist`.
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
