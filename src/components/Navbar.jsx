import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import LanguageToggle from './LanguageToggle'

const NAV_ITEMS = [
  { id: 'home', en: 'Home', es: 'Inicio' },
  { id: 'about', en: 'About', es: 'Sobre mí' },
  { id: 'stack', en: 'Stack', es: 'Stack' },
  { id: 'experience', en: 'Experience', es: 'Experiencia' },
  { id: 'projects', en: 'Projects', es: 'Proyectos' },
  { id: 'education', en: 'Education', es: 'Formación' },
  { id: 'certifications', en: 'Certs', es: 'Certs' },
  { id: 'contact', en: 'Contact', es: 'Contacto' },
]

const translations = {
  en: {
    homeButtonLabel: 'Go to home section',
    openMenuLabel: 'Open menu',
    closeMenuLabel: 'Close menu',
  },
  es: {
    homeButtonLabel: 'Ir a la sección de inicio',
    openMenuLabel: 'Abrir menú',
    closeMenuLabel: 'Cerrar menú',
  },
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId)

  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export default function Navbar() {
  const { language } = useLanguage()
  const t = translations[language]
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isNavigatingRef = useRef(false)

  useEffect(() => {
    const sectionIds = NAV_ITEMS.map((item) => item.id)
    const lastSectionId = sectionIds[sectionIds.length - 1]
    const sectionElements = new Map()
    let frameId = null
    let lastScrolled = null
    let lastActiveId = ''

    const syncNavbarState = () => {
      frameId = null

      const nextScrolled = window.scrollY > 24
      if (nextScrolled !== lastScrolled) {
        lastScrolled = nextScrolled
        setIsScrolled(nextScrolled)
      }

      // Skip scroll-spy while a nav click is animating
      if (isNavigatingRef.current) return

      const triggerLine = window.innerHeight * 0.25
      let nextActiveId = sectionIds[0]

      for (const id of sectionIds) {
        const section = sectionElements.get(id) ?? document.getElementById(id)

        if (section) {
          sectionElements.set(id, section)
        }

        if (section && section.getBoundingClientRect().top <= triggerLine) {
          nextActiveId = id
        }
      }

      // Only snap to last section if user has actually scrolled
      if (window.scrollY > 100 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
        nextActiveId = lastSectionId
      }

      if (nextActiveId !== lastActiveId) {
        lastActiveId = nextActiveId
        setActiveSection(nextActiveId)
      }
    }

    const scheduleNavbarSync = () => {
      if (frameId !== null) {
        return
      }

      frameId = window.requestAnimationFrame(syncNavbarState)
    }

    scheduleNavbarSync()
    window.addEventListener('scroll', scheduleNavbarSync, { passive: true })
    window.addEventListener('resize', scheduleNavbarSync)

    return () => {
      window.removeEventListener('scroll', scheduleNavbarSync)
      window.removeEventListener('resize', scheduleNavbarSync)

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleNavigate = (sectionId) => {
    isNavigatingRef.current = true
    setActiveSection(sectionId)
    setIsMenuOpen(false)
    scrollToSection(sectionId)
    // Re-enable scroll-spy after smooth scroll finishes
    setTimeout(() => { isNavigatingRef.current = false }, 1000)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <nav
        className={[
          'mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl px-4 py-3 transition-all duration-300 sm:px-6',
          isScrolled
            ? 'bg-black/70 backdrop-blur-md border border-green-500/20 shadow-[0_0_30px_rgba(0,255,136,0.08)]'
            : 'border border-transparent bg-black/20',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={() => handleNavigate('home')}
          className="text-left font-mono text-lg font-bold uppercase tracking-[0.4em] text-green-300 text-glow-green transition hover:text-green-200"
          aria-label={t.homeButtonLabel}
        >
          RMB
        </button>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={[
                  'relative isolate whitespace-nowrap rounded-full px-2.5 py-2 text-xs uppercase tracking-[0.2em] transition duration-300',
                  isActive ? 'text-white' : 'text-green-500/45 hover:text-green-200/90',
                ].join(' ')}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-section-pill"
                    className="pointer-events-none absolute inset-0 rounded-full border border-green-300/70 bg-[linear-gradient(135deg,rgba(0,255,136,0.24),rgba(0,255,136,0.08))] shadow-[0_0_0_1px_rgba(134,239,172,0.12),0_0_18px_rgba(0,255,136,0.28),0_0_36px_rgba(0,255,136,0.14)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  >
                    <span className="absolute inset-[1px] rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%)] opacity-80" />
                    <span className="absolute inset-x-3 bottom-[3px] h-px rounded-full bg-green-100/95 shadow-[0_0_10px_rgba(167,243,208,0.95),0_0_16px_rgba(0,255,136,0.55)]" />
                  </motion.span>
                )}
                <span
                  className={
                    isActive
                      ? 'relative z-10 font-semibold text-white drop-shadow-[0_0_10px_rgba(167,243,208,0.45)]'
                      : 'relative z-10'
                  }
                >
                  {item[language]}
                </span>
              </button>
            )
          })}
          <div className="ml-2 border-l border-green-500/20 pl-3">
            <LanguageToggle />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
          className="inline-flex items-center justify-center rounded-xl border border-green-500/20 bg-black/40 p-2 text-green-300 transition hover:border-green-400/40 hover:text-green-200 lg:hidden"
          aria-label={isMenuOpen ? t.closeMenuLabel : t.openMenuLabel}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mx-auto mt-3 max-h-[calc(100vh-6rem)] w-full max-w-6xl overflow-y-auto rounded-2xl border border-green-500/20 bg-black/80 backdrop-blur-md lg:hidden"
          >
            <div className="space-y-1 p-3">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={[
                      'flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm uppercase tracking-[0.3em] transition',
                      isActive
                        ? 'border border-green-400/30 bg-green-500/10 text-green-200'
                        : 'text-green-400/70 hover:bg-green-500/5 hover:text-green-300',
                    ].join(' ')}
                  >
                    <span>{item[language]}</span>
                    <span className="text-xs text-green-500/60">/{item.id}</span>
                  </button>
                )
              })}
            </div>
            <div className="border-t border-green-500/20 p-3">
              <LanguageToggle />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
