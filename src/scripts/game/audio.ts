/**
 * Game Mode's sound: a tiny synthesiser, without a single file.
 *
 * Everything that sounds — the bolt, the double jump, the aura and the voice
 * bleeps — are very short-lived oscillators created on the spot. There are no
 * downloads and no assets: the easter egg must not cost a kilobyte to anyone
 * who never opens it.
 *
 * The context is created on the first playback, which is when the user gesture
 * browsers demand actually exists, and every call is wrapped: if the browser
 * blocks audio, the game carries on in silence.
 */

/** What the game can ask of the synthesiser. */
export type GameAudio = ReturnType<typeof createGameAudio>

export type BleepMood = 'normal' | 'alert' | 'godspeed' | 'success'

export function createGameAudio() {
let audioCtx: AudioContext | null = null
const getAudio = () => {
  if (!audioCtx) {
    const AudioClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = new AudioClass()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

const playBoltSound = () => {
  try {
    const ac = getAudio()
    const now = ac.currentTime
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(540, now)
    osc.frequency.exponentialRampToValueAtTime(1450, now + 0.12)
    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(now)
    osc.stop(now + 0.16)
  } catch { /* Audio opcional */ }
}

const playDoubleJumpSound = () => {
  try {
    const ac = getAudio()
    const now = ac.currentTime
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.16)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(now)
    osc.stop(now + 0.2)
  } catch { /* Audio opcional */ }
}

const playGodspeedSound = () => {
  try {
    const ac = getAudio()
    const now = ac.currentTime
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.42)
    gain.gain.setValueAtTime(0.26, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(now)
    osc.stop(now + 0.5)

    const osc2 = ac.createOscillator()
    const gain2 = ac.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(90, now)
    osc2.frequency.linearRampToValueAtTime(45, now + 0.58)
    gain2.gain.setValueAtTime(0.28, now)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.58)
    osc2.connect(gain2)
    gain2.connect(ac.destination)
    osc2.start(now)
    osc2.stop(now + 0.6)
  } catch { /* Audio opcional */ }
}

const playVoiceBleep = (mood: BleepMood = 'normal') => {
  try {
    const ac = getAudio()
    const now = ac.currentTime
    const blipCount = mood === 'godspeed' ? 5 : mood === 'alert' ? 4 : 3
    const baseFreq = mood === 'godspeed' ? 640 : mood === 'alert' ? 560 : 480

    for (let i = 0; i < blipCount; i++) {
      const startTime = now + i * 0.05
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'triangle'
      const freq = baseFreq + (i % 2 === 0 ? 70 : -35) + (Math.random() * 30 - 15)
      osc.frequency.setValueAtTime(freq, startTime)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, startTime + 0.038)

      gain.gain.setValueAtTime(0.09, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.042)

      osc.connect(gain)
      gain.connect(ac.destination)
      osc.start(startTime)
      osc.stop(startTime + 0.045)
    }
  } catch { /* Audio opcional */ }
}

  return {
    playBoltSound,
    playDoubleJumpSound,
    playGodspeedSound,
    playVoiceBleep,
    /* Leaving the game closes the context: without this it stays alive and the
       browser ends up denying audio to the next run. */
    close() {
      if (audioCtx && audioCtx.state !== 'closed') void audioCtx.close()
      audioCtx = null
    },
  }
}
