/** Keep the canonical alternate route in HTML; add browsing context only in JS. */
export function initLanguageSwitch() {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[data-language-switch]'))
    .flatMap((link) => {
      const href = link.getAttribute('href')
      if (!href?.startsWith('/') || href.startsWith('//')) return []
      const target = new URL(href, window.location.origin)
      if (target.origin !== window.location.origin) return []
      return [{ link, pathname: target.pathname }]
    })

  const sync = () => {
    for (const { link, pathname } of links) {
      link.setAttribute('href', `${pathname}${window.location.search}${window.location.hash}`)
    }
  }

  sync()
  window.addEventListener('hashchange', sync)
  window.addEventListener('popstate', sync)
  for (const { link } of links) link.addEventListener('click', sync)
}
