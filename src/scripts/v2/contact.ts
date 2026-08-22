/**
 * The contact block's three layers: copying the email to the clipboard, the
 * Barcelona clock, and the signal that types itself once it enters the screen.
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
   * The icon and the label are two stable nodes: confirming the copy only
   * changes their text. The button's HTML used to be rewritten by interpolating
   * the label, and two clicks in a row left two timers competing to restore it.
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
      // With no clipboard permission nothing is confirmed: the mailto link is
      // right there, and saying "copied" without copying would be a lie.
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
 * The zone abbreviation and the UTC offset used to be hand-written as "CEST"
 * and "UTC+2", which are only true for half the year. Both now come from the
 * time zone itself, so they cannot contradict each other or the time they
 * accompany.
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
    // Building a formatter is expensive: do it once, not once per second.
    const at = (extra: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat('es-ES', { timeZone: TIME_ZONE, ...extra })
    time = at({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    zone = at({ timeZoneName: 'short' })        // CET en invierno, CEST en verano
    utcOffset = at({ timeZoneName: 'shortOffset' }) // GMT+1 / GMT+2
  } catch {
    clock.textContent = say('Barcelona, España', 'Barcelona, Spain')
    return
  }

  /** The zone name arrives mixed into the date; only that part matters. */
  const zoneNameFrom = (format: Intl.DateTimeFormat, now: Date) =>
    format.formatToParts(now).find((p) => p.type === 'timeZoneName')?.value ?? ''

  const update = () => {
    const now = new Date()
    clock.textContent = `${time.format(now)} ${zoneNameFrom(zone, now)} · Barcelona`
    if (offset) offset.textContent = zoneNameFrom(utcOffset, now).replace('GMT', 'UTC')
  }

  /*
   * A clock nobody is watching has no business waking the tab every second: it
   * stops when the tab is hidden, when the block is off screen, and resets
   * itself on return, so what is on screen is always right and the background
   * costs nothing.
   */
  let timer: number | null = null
  let onScreen = false
  const stop = () => {
    if (timer !== null) window.clearInterval(timer)
    timer = null
  }
  const start = () => {
    update()
    if (timer === null) timer = window.setInterval(update, 1000)
  }
  const sync = () => {
    if (onScreen && !document.hidden) start()
    else stop()
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = Boolean(entries[0]?.isIntersecting)
      sync()
    }, { rootMargin: '200px', threshold: 0 }).observe(clock)
  } else {
    onScreen = true
    start()
  }
  document.addEventListener('visibilitychange', sync)
}

/* ---------------- Contact: signal typed on entering the screen ---------------- */
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
