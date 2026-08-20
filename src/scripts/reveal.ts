/**
 * Revelado al hacer scroll — primitiva compartida por la V1 y la V2.
 *
 * Las dos superficies marcaban `.reveal` con el mismo observador escrito dos
 * veces, y solo se diferenciaban en el margen y el umbral. La lógica vive
 * aquí una sola vez; cada superficie aporta su calibración.
 *
 * Sin JavaScript, sin IntersectionObserver o con "reduce motion" activo, los
 * elementos se marcan de golpe: el revelado es un adorno, nunca un requisito
 * para leer el contenido.
 */
export function revealOnScroll({ reduce, rootMargin, threshold }: {
  reduce: boolean
  rootMargin: string
  threshold: number
}) {
  const targets = document.querySelectorAll<HTMLElement>('.reveal')

  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'))
    return
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    },
    { rootMargin, threshold },
  )
  targets.forEach((el) => io.observe(el))
}
