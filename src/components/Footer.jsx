import { ArrowUp, Mail } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { GithubIcon, LinkedinIcon } from './BrandIcons'

const translations = {
  en: {
    builtWith: 'rubenitx.me — Built with React + Tailwind',
    tagline: 'Building solid architectures, fueled by coffee. ☕',
    copyright: '© 2026 Rubén Martínez Bernabe',
    backToTop: 'Back to top',
  },
  es: {
    builtWith: 'rubenitx.me — Construido con React + Tailwind',
    tagline: 'Construyendo arquitecturas sólidas, impulsado por café. ☕',
    copyright: '© 2026 Rubén Martínez Bernabe',
    backToTop: 'Volver arriba',
  },
}

const QUICK_LINKS = [
  { label: 'GitHub', href: 'https://github.com/rubenmtzb', icon: GithubIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/rubenmartinezbernabe/', icon: LinkedinIcon },
  { label: 'Email', href: 'mailto:rmartbernabe@gmail.com', icon: Mail },
]

export default function Footer() {
  const { language } = useLanguage()
  const t = translations[language]
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <footer className="relative overflow-hidden border-t border-green-500/20 bg-[#020409]">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,136,0.08),transparent_45%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <p className="terminal-prompt break-words text-xs uppercase tracking-[0.18em] text-green-300/85 sm:text-sm sm:tracking-[0.3em]">{t.builtWith}</p>
          <p className="text-sm leading-6 text-slate-300/80">{t.tagline}</p>
          <p className="text-xs uppercase tracking-[0.24em] text-green-500/55">{t.copyright}</p>
        </div>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex flex-wrap items-center gap-3">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon

              return (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                  className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.18em] text-green-300/80 transition hover:border-green-300/35 hover:bg-green-500/10 hover:text-green-100 sm:tracking-[0.24em]"
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </a>
              )
            })}
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.18em] text-green-300/80 transition hover:-translate-y-0.5 hover:border-green-300/35 hover:bg-green-500/10 hover:text-green-100 sm:tracking-[0.24em]"
          >
            <ArrowUp className="h-4 w-4" />
            {t.backToTop}
          </button>
        </div>
      </div>
    </footer>
  )
}
