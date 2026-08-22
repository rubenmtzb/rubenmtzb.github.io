/**
 * Las tres capas del bloque de contacto: copiar el email al portapapeles, el
 * reloj de Barcelona y la señal que se escribe sola al entrar en pantalla.
 */
import { reduce, say } from './dom'

export function initMail() {
  const btn = document.getElementById('copy-mail') as HTMLButtonElement | null
  if (!btn) return

  const idleLabel = btn.dataset.label ?? say('Copiar correo', 'Copy email')
  const doneLabel = btn.dataset.done ?? say('¡Copiado! ✓', 'Copied! ✓')
  const CONFIRM_CLASSES = ['border-[color:var(--cyan)]', 'text-[color:var(--cyan)]', 'shadow-[0_0_15px_rgba(111,227,255,0.35)]']
  const CONFIRM_MS = 2400

  /*
   * El icono y la etiqueta son dos nodos estables: confirmar la copia solo
   * cambia su texto. Antes se reescribía el HTML del botón interpolando la
   * etiqueta, y dos clics seguidos dejaban dos temporizadores compitiendo
   * por restaurarlo.
   */
  const icon = document.createElement('span')
  const label = document.createElement('span')
  const setState = (glyph: string, text: string) => {
    icon.textContent = glyph
    label.textContent = text
  }
  setState('📋', idleLabel)
  btn.replaceChildren(icon, label)
  btn.hidden = false

  let resetTimer: number | undefined
  btn.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard) return
      await navigator.clipboard.writeText(btn.dataset.mail ?? '')
    } catch {
      // Sin permiso de portapapeles no se confirma nada: el enlace mailto
      // sigue al lado y decir "copiado" sin haber copiado sería mentir.
      return
    }

    setState('✓', doneLabel)
    btn.classList.add(...CONFIRM_CLASSES)

    window.clearTimeout(resetTimer)
    resetTimer = window.setTimeout(() => {
      setState('📋', idleLabel)
      btn.classList.remove(...CONFIRM_CLASSES)
    }, CONFIRM_MS)
  })
}

/* ---------------- Reloj de hora local de Barcelona ---------------- */

/**
 * La abreviatura de zona y el desfase UTC estaban escritos a mano como
 * "CEST" y "UTC+2", que solo son ciertos media parte del año. Los dos salen
 * ahora de la propia zona horaria, así que no pueden contradecirse entre sí
 * ni con la hora que acompañan.
 */
export function initClock() {
  const clock = document.getElementById('local-time')
  const offset = document.getElementById('local-offset')
  if (!clock) return

  const TIME_ZONE = 'Europe/Madrid'
  let time: Intl.DateTimeFormat
  let zone: Intl.DateTimeFormat
  let utcOffset: Intl.DateTimeFormat
  try {
    // Construir un formateador es caro: se hace una vez, no una vez por segundo.
    const at = (extra: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat('es-ES', { timeZone: TIME_ZONE, ...extra })
    time = at({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    zone = at({ timeZoneName: 'short' })        // CET en invierno, CEST en verano
    utcOffset = at({ timeZoneName: 'shortOffset' }) // GMT+1 / GMT+2
  } catch {
    clock.textContent = say('Barcelona, España', 'Barcelona, Spain')
    return
  }

  /** El nombre de zona llega mezclado con la fecha; solo interesa esa parte. */
  const zoneNameFrom = (format: Intl.DateTimeFormat, now: Date) =>
    format.formatToParts(now).find((p) => p.type === 'timeZoneName')?.value ?? ''

  const update = () => {
    const now = new Date()
    clock.textContent = `${time.format(now)} ${zoneNameFrom(zone, now)} · Barcelona`
    if (offset) offset.textContent = zoneNameFrom(utcOffset, now).replace('GMT', 'UTC')
  }

  /*
   * Un reloj que nadie mira no tiene por qué despertar la pestaña cada
   * segundo: se detiene al ocultarla y se pone en hora al volver, así que
   * lo que se ve es siempre correcto y en segundo plano no cuesta nada.
   */
  let timer: number | null = null
  const stop = () => {
    if (timer !== null) window.clearInterval(timer)
    timer = null
  }
  const start = () => {
    update()
    if (timer === null) timer = window.setInterval(update, 1000)
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()))
  start()
}

/* ---------------- Contacto: señal escrita al entrar en pantalla ---------------- */
export function initContactSignal() {
  const target = document.querySelector<HTMLElement>('[data-contact-type]')
  if (!target) return

  const message = target.dataset.contactMessage ?? target.textContent ?? ''
  if (reduce) return

  let hasPlayed = false
  const play = () => {
    if (hasPlayed) return
    hasPlayed = true
    target.textContent = ''
    let index = 0
    const type = () => {
      target.textContent += message[index] ?? ''
      index += 1
      if (index < message.length) window.setTimeout(type, 24)
    }
    type()
  }

  new IntersectionObserver((entries, observer) => {
    if (entries[0]?.isIntersecting) {
      play()
      observer.disconnect()
    }
  }, { threshold: 0.45 }).observe(target)
}
