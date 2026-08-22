/**
 * Which showcase a case study was entered from.
 *
 * The case study is linked from two places — the featured carousel and the grid
 * — and every link carries its origin in `?from=`, which the case study itself
 * uses to go back. The browser's Back button does not go through that: it
 * reopens the history entry exactly as it was left, and that entry points at the
 * home page with no anchor, so it returned to the top of the page instead of to
 * the block the visitor left from.
 *
 * Before navigating, the current entry is rewritten with the origin's anchor. It
 * adds no new entry — `replaceState`, not `pushState` — so the history keeps
 * exactly the same steps as before.
 */
export function initCaseOrigin() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-case-origin]')) {
    link.addEventListener('click', (event) => {
      /* A modified click opens in another tab: this page is not going anywhere
         and its history must not be touched. */
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const origin = link.dataset.caseOrigin
      if (!origin || !document.getElementById(origin)) return

      const url = new URL(window.location.href)
      url.hash = origin
      history.replaceState(history.state, '', url)
    })
  }
}
