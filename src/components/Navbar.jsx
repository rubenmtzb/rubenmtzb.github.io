import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'stack', label: 'Stack' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
]

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId)

  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24)

    handleScroll()
    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const sections = NAV_ITEMS
      .map((item) => document.getElementById(item.id))
      .filter(Boolean)

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting)

        if (visibleEntries.length > 0) {
          const currentEntry = visibleEntries.sort(
            (entryA, entryB) => entryB.intersectionRatio - entryA.intersectionRatio,
          )[0]

          setActiveSection(currentEntry.target.id)
        }
      },
      {
        rootMargin: '-35% 0px -45% 0px',
        threshold: [0.2, 0.35, 0.55, 0.75],
      },
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleNavigate = (sectionId) => {
    setActiveSection(sectionId)
    setIsMenuOpen(false)
    scrollToSection(sectionId)
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
          aria-label="Go to home section"
        >
          RMB
        </button>

        <div className="hidden items-center gap-2 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className="relative rounded-full px-3 py-2 text-sm uppercase tracking-[0.25em] text-green-400/70 transition hover:text-green-300"
              >
                {isActive && (
                  <motion.span
                    layoutId="active-section-pill"
                    className="absolute inset-0 rounded-full border border-green-400/40 bg-green-500/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  />
                )}
                <span className={isActive ? 'relative z-10 text-green-200' : 'relative z-10'}>{item.label}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
          className="inline-flex items-center justify-center rounded-xl border border-green-500/20 bg-black/40 p-2 text-green-300 transition hover:border-green-400/40 hover:text-green-200 md:hidden"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
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
            className="mx-auto mt-3 w-full max-w-6xl overflow-hidden rounded-2xl border border-green-500/20 bg-black/80 backdrop-blur-md md:hidden"
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
                    <span>{item.label}</span>
                    <span className="text-xs text-green-500/60">/{item.id}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
