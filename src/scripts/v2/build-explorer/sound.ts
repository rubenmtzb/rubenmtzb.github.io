/**
 * Sound samples, one per build card.
 *
 * Everything drawn — the envelope and the reference stretch — arrives already
 * resolved in the HTML, so nothing is decoded or measured here: a clip slides
 * over a stroke and the time gets written.
 *
 * Progress is tracked with `requestAnimationFrame` and not with `timeupdate`,
 * which only fires four times a second and leaves the playhead stuttering.
 * There is a single live loop, the one belonging to whichever sample is
 * playing.
 *
 * It returns the muter because the cards are hidden without telling the audio:
 * leaving a build has to shut it up, or the keyboard you hear stops being the
 * keyboard you are looking at.
 */
import { pad } from '../dom'

export function createBuildSound(rack: HTMLElement) {
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${pad(Math.floor(seconds % 60))}`

  /** Only one sample plays at a time: hearing two at once compares nothing. */
  let current: { row: HTMLElement, audio: HTMLAudioElement, paint: (ratio: number) => void } | null = null
  let frame = 0

  const follow = () => {
    if (!current) return
    const { audio, paint } = current
    paint(audio.duration > 0 ? audio.currentTime / audio.duration : 0)
    frame = requestAnimationFrame(follow)
  }

  const release = () => {
    cancelAnimationFrame(frame)
    frame = 0
    current?.row.classList.remove('is-playing')
    current = null
  }

  for (const row of rack.querySelectorAll<HTMLElement>('[data-bx-clip]')) {
    const audio = row.querySelector<HTMLAudioElement>('[data-bx-clip-audio]')
    const toggle = row.querySelector<HTMLButtonElement>('[data-bx-clip-toggle]')
    const seek = row.querySelector<HTMLInputElement>('[data-bx-clip-seek]')
    const readout = row.querySelector<HTMLElement>('[data-bx-clip-now]')
    /* With no audio output the row just sits still: the rest of the panel never notices. */
    if (!audio || !toggle || !seek) continue

    /* The duration ships in the markup because with `preload="none"` the file
       does not yet exist for the browser when the first 0:00 must be written. */
    const declared = Number(row.dataset.duration) || 0
    const length = () => (audio.duration > 0 ? audio.duration : declared)

    const paint = (ratio: number) => {
      const at = Math.min(1, Math.max(0, ratio))
      row.style.setProperty('--played', `${(at * 100).toFixed(2)}%`)
      seek.value = String(Math.round(at * 1000))
      const stamp = clock(at * length())
      if (readout) readout.textContent = stamp
      seek.setAttribute('aria-valuetext', stamp)
    }

    /* Scrubbing before the first playback: it is stored and applied as soon as
       the file declares how long it is. */
    let pending = -1

    audio.addEventListener('loadedmetadata', () => {
      if (pending >= 0) audio.currentTime = pending * audio.duration
      pending = -1
      paint(audio.duration > 0 ? audio.currentTime / audio.duration : 0)
    })

    /* The label names the action, so it changes with the button's state. */
    const label = (state: 'play' | 'pause') => {
      const text = toggle.dataset[state]
      if (text) toggle.setAttribute('aria-label', text)
    }

    audio.addEventListener('play', () => {
      if (current && current.audio !== audio) current.audio.pause()
      cancelAnimationFrame(frame)
      current = { row, audio, paint }
      row.classList.add('is-playing')
      label('pause')
      frame = requestAnimationFrame(follow)
    })
    audio.addEventListener('pause', () => {
      label('play')
      if (current?.audio === audio) release()
    })
    audio.addEventListener('ended', () => {
      release()
      audio.currentTime = 0
      paint(0)
    })

    toggle.addEventListener('click', () => {
      if (current?.audio === audio) return audio.pause()
      const started = audio.play()
      /* If the playback policy rejects it, the row does not stay lit. */
      if (started && typeof started.catch === 'function') started.catch(() => release())
    })

    seek.addEventListener('input', () => {
      const ratio = Number(seek.value) / 1000
      paint(ratio)
      if (audio.duration > 0) audio.currentTime = ratio * audio.duration
      else pending = ratio
    })

    paint(0)
  }

  /*
   * The note peeking over the sample. It lives outside the row — it is the row's
   * sibling — so it is wired up through the build's panel: the mascot reacts to
   * its own keyboard's audio and not to somebody else's.
   */
  for (const quip of rack.querySelectorAll<HTMLElement>('[data-bx-quip]')) {
    const poke = quip.querySelector<HTMLButtonElement>('[data-bx-quip-next]')
    const bubble = quip.querySelector<HTMLElement>('[data-bx-quip-text]')
    if (!poke || !bubble) continue

    let lines: string[] = []
    try {
      const parsed: unknown = JSON.parse(poke.dataset.quips ?? '[]')
      if (Array.isArray(parsed)) lines = parsed.filter((line): line is string => typeof line === 'string')
    } catch {
      /* An unreadable note must not take the player down with it. */
    }
    if (lines.length === 0) continue

    const speak = (line: string) => {
      bubble.textContent = line
      /* Restarts the entrance: without the reflow the hop would only play once. */
      bubble.style.animation = 'none'
      void bubble.offsetWidth
      bubble.style.animation = ''
    }

    /* Starts on a random one: entering the card twice does not repeat. */
    let index = Math.floor(Math.random() * lines.length)
    if (index > 0) speak(lines[index])

    poke.addEventListener('click', () => {
      quip.classList.remove('is-listening')
      index = (index + 1) % lines.length
      speak(lines[index])
    })

    const audio = quip.closest('[data-bx-build]')?.querySelector<HTMLAudioElement>('[data-bx-clip-audio]')
    if (!audio) continue

    const listen = poke.dataset.listen
    audio.addEventListener('play', () => {
      if (!listen) return
      quip.classList.add('is-listening')
      speak(listen)
    })
    const backToQuip = () => {
      if (!quip.classList.contains('is-listening')) return
      quip.classList.remove('is-listening')
      speak(lines[index])
    }
    audio.addEventListener('pause', backToQuip)
    audio.addEventListener('ended', backToQuip)
  }

  /* `pause` fires the event, which is what turns the row off and releases the loop. */
  return { silence: () => current?.audio.pause() }
}
