/**
 * De qué showcase se salió hacia una ficha de proyecto.
 *
 * La ficha se enlaza desde dos sitios —el carrusel destacado y la rejilla— y
 * cada enlace lleva su origen en `?from=`, que la propia ficha usa para volver.
 * El botón Atrás del navegador no pasa por ahí: reabre la entrada del historial
 * tal y como se dejó, y esa entrada apunta a la portada sin ancla, así que
 * devolvía al principio de la página en lugar de al bloque de donde se salió.
 *
 * Antes de navegar se reescribe la entrada actual con el ancla del origen. No
 * añade una entrada nueva —`replaceState`, no `pushState`—, así que el
 * historial conserva exactamente los mismos pasos que antes.
 */
export function initCaseOrigin() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-case-origin]')) {
    link.addEventListener('click', (event) => {
      /* Un clic con modificador abre en otra pestaña: esta página no se va a
         ninguna parte y su historial no debe tocarse. */
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const origin = link.dataset.caseOrigin
      if (!origin || !document.getElementById(origin)) return

      const url = new URL(window.location.href)
      url.hash = origin
      history.replaceState(history.state, '', url)
    })
  }
}
