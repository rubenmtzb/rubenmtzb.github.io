/* Pestañas interactivas de experiencia. */

export function initJobList() {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.job-tab'))
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.job-panel'))
  const indicator = document.getElementById('job-indicator')
  if (tabs.length === 0 || panels.length === 0) return

  let activeIndex = 0

  const moveIndicator = (tab: HTMLButtonElement) => {
    if (!indicator) return
    const isMobile = window.innerWidth < 1024
    if (isMobile) {
      indicator.style.transform = `translateX(${tab.offsetLeft}px)`
      indicator.style.width = `${tab.offsetWidth}px`
      indicator.style.height = '2px'
      indicator.style.top = 'auto'
      indicator.style.bottom = '0'
      indicator.style.left = '0'
    } else {
      indicator.style.transform = `translateY(${tab.offsetTop}px)`
      indicator.style.height = `${tab.offsetHeight}px`
      indicator.style.width = '3px'
      indicator.style.top = '0'
      indicator.style.bottom = 'auto'
      indicator.style.left = '0'
    }
  }

  const selectTab = (index: number) => {
    activeIndex = (index + tabs.length) % tabs.length
    tabs.forEach((tab, i) => {
      const selected = i === activeIndex
      tab.setAttribute('aria-selected', String(selected))
      tab.tabIndex = selected ? 0 : -1
      tab.classList.toggle('is-active', selected)
      tab.classList.toggle('text-[color:var(--blue-bright)]', selected)
      tab.classList.toggle('font-semibold', selected)
      tab.classList.toggle('text-[color:var(--fg-3)]', !selected)
    })

    panels.forEach((panel, i) => {
      panel.classList.toggle('is-active', i === activeIndex)
    })

    const currentTab = tabs[activeIndex]
    if (currentTab) moveIndicator(currentTab)
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(i))
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        selectTab(activeIndex + 1)
        tabs[activeIndex]?.focus()
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        selectTab(activeIndex - 1)
        tabs[activeIndex]?.focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        selectTab(0)
        tabs[0]?.focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        selectTab(tabs.length - 1)
        tabs[tabs.length - 1]?.focus()
      }
    })
  })

  /* Recolocar el indicador mide la pestaña activa, así que un
     redimensionado continuo costaba un recálculo de diseño por evento. */
  let indicatorFrame: number | null = null
  window.addEventListener('resize', () => {
    if (indicatorFrame !== null) return
    indicatorFrame = requestAnimationFrame(() => {
      indicatorFrame = null
      const currentTab = tabs[activeIndex]
      if (currentTab) moveIndicator(currentTab)
    })
  }, { passive: true })

  selectTab(0)
}
