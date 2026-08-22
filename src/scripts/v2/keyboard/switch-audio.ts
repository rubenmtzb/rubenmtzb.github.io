/* Sonido sintetizado de los switches. */

const SWITCH_PROFILES = {
  linear: { label: 'Linear (Thock)', freqStart: 580, freqEnd: 110, duration: 0.042, type: 'triangle' as OscillatorType, gain: 0.16 },
  clicky: { label: 'Clicky (Crisp)', freqStart: 1800, freqEnd: 160, duration: 0.032, type: 'square' as OscillatorType, gain: 0.12 },
  tactile: { label: 'Tactile (Pop)', freqStart: 720, freqEnd: 140, duration: 0.048, type: 'sine' as OscillatorType, gain: 0.2 },
} as const

type SwitchProfile = keyof typeof SWITCH_PROFILES
const SWITCH_ORDER = Object.keys(SWITCH_PROFILES) as SwitchProfile[]

/**
 * Cada pulsación es un oscilador de vida muy corta con una caída
 * exponencial. El AudioContext se crea en la primera pulsación real, que es
 * cuando existe el gesto de usuario que los navegadores exigen.
 */
export function createSwitchAudio() {
  let ctx: AudioContext | null = null
  let profile: SwitchProfile = 'linear'
  let enabled = true

  return {
    get label() { return SWITCH_PROFILES[profile].label },
    get enabled() { return enabled },
    toggle() { enabled = !enabled },
    /** Rota entre los tres perfiles y devuelve la etiqueta del nuevo. */
    nextProfile() {
      profile = SWITCH_ORDER[(SWITCH_ORDER.indexOf(profile) + 1) % SWITCH_ORDER.length]
      return SWITCH_PROFILES[profile].label
    },
    play() {
      if (!enabled) return
      try {
        const AudioClass = window.AudioContext
          ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctx ??= new AudioClass()
        if (ctx.state === 'suspended') void ctx.resume()

        const now = ctx.currentTime
        const prof = SWITCH_PROFILES[profile]
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = prof.type
        // Una pizca de variación de tono evita que suene a metrónomo.
        osc.frequency.setValueAtTime(prof.freqStart + (Math.random() - 0.5) * 80, now)
        osc.frequency.exponentialRampToValueAtTime(prof.freqEnd, now + prof.duration)
        gain.gain.setValueAtTime(prof.gain, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + prof.duration)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + prof.duration + 0.005)
      } catch { /* El audio es opcional: si el navegador lo bloquea, se sigue tecleando. */ }
    },
  }
}
