/**
 * Muestras de sonido, una por ficha de build.
 *
 * Todo lo que se dibuja —la envolvente y el tramo de referencia— llega ya
 * resuelto en el HTML, así que aquí no se decodifica ni se mide nada: se
 * mueve un recorte por encima de un trazo y se escribe la hora.
 *
 * El avance se sigue con `requestAnimationFrame` y no con `timeupdate`, que
 * solo llega cuatro veces por segundo y deja el cabezal a tirones. Hay un
 * único bucle vivo, el de la muestra que esté sonando.
 *
 * Devuelve el silenciador porque las fichas se ocultan sin avisar al audio:
 * salir de un build tiene que apagarlo, o el teclado que suena deja de ser el
 * teclado que se está mirando.
 */
import { pad } from '../dom'

export function createBuildSound(rack: HTMLElement) {
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${pad(Math.floor(seconds % 60))}`

  /** Solo suena una muestra a la vez: comparar dos a la vez no compara nada. */
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
    /* Sin salida de audio la fila se queda quieta: el resto del panel no se entera. */
    if (!audio || !toggle || !seek || typeof audio.play !== 'function') continue

    /* La duración va en el marcado porque con `preload="none"` el fichero aún
       no existe para el navegador cuando hay que escribir el primer 0:00. */
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

    /* Arrastrar antes de la primera reproducción: se guarda y se aplica en
       cuanto el fichero declara cuánto dura. */
    let pending = -1

    audio.addEventListener('loadedmetadata', () => {
      if (pending >= 0) audio.currentTime = pending * audio.duration
      pending = -1
      paint(audio.duration > 0 ? audio.currentTime / audio.duration : 0)
    })

    /* El rótulo nombra la acción, así que cambia con el estado del botón. */
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
      /* Si la política de reproducción lo rechaza, la fila no se queda encendida. */
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
   * El apunte asomado sobre la muestra. Vive fuera de la fila —es hermano de
   * ella— así que se engancha por el panel del build: la mascota reacciona al
   * audio de su propio teclado y no al de otro.
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
      /* Un apunte ilegible no puede llevarse por delante el reproductor. */
    }
    if (lines.length === 0) continue

    const speak = (line: string) => {
      bubble.textContent = line
      /* Rearranca la entrada: sin el reflujo el salto solo se vería una vez. */
      bubble.style.animation = 'none'
      void bubble.offsetWidth
      bubble.style.animation = ''
    }

    /* Arranca por uno cualquiera: entrar dos veces en la ficha no repite. */
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

  /* `pause` dispara el evento, que es quien apaga la fila y suelta el bucle. */
  return { silence: () => current?.audio.pause() }
}
