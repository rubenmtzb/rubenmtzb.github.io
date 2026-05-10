import { memo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Mail } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { GithubIcon, LinkedinIcon } from './BrandIcons'

const translations = {
  en: {
    titles: ['Full-Stack Engineer', 'Spring Boot + React', 'DevOps Enthusiast', 'Building in quiet mode'],
    tagline: 'Transforming complex problems into efficient, scalable software',
    viewWork: 'View My Work',
    getInTouch: 'Get in Touch',
    scrollToAbout: 'Scroll to about section',
  },
  es: {
    titles: ['Full-Stack Engineer', 'Spring Boot + React', 'Entusiasta de DevOps', 'Construyendo en modo silencioso'],
    tagline: 'Transformando problemas complejos en software eficiente y escalable',
    viewWork: 'Ver Mi Trabajo',
    getInTouch: 'Contactar',
    scrollToAbout: 'Ir a la sección sobre mí',
  },
}

const PARTICLES = [
  { top: '14%', left: '12%', size: 5, dur: '3.2s', delay: '0s' },
  { top: '22%', left: '86%', size: 7, dur: '4.1s', delay: '0.8s' },
  { top: '38%', left: '8%', size: 4, dur: '3.7s', delay: '1.3s' },
  { top: '48%', left: '90%', size: 6, dur: '2.9s', delay: '0.5s' },
  { top: '58%', left: '18%', size: 8, dur: '4.4s', delay: '1.8s' },
  { top: '65%', left: '78%', size: 5, dur: '3.3s', delay: '1.1s' },
  { top: '74%', left: '10%', size: 4, dur: '3.9s', delay: '0.4s' },
  { top: '82%', left: '84%', size: 6, dur: '3.1s', delay: '1.6s' },
  { top: '18%', left: '52%', size: 4, dur: '4s', delay: '0.9s' },
  { top: '86%', left: '46%', size: 7, dur: '3.5s', delay: '1.2s' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: 'easeOut',
    },
  },
}

const SOCIAL_LINKS = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/rubenmartinezbernabe/',
    icon: LinkedinIcon,
  },
  {
    label: 'GitHub',
    href: 'https://github.com/rubenmtzb',
    icon: GithubIcon,
  },
  {
    label: 'Email',
    href: 'mailto:rmartbernabe@gmail.com',
    icon: Mail,
  },
]

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId)

  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const HeroBackdrop = memo(function HeroBackdrop() {
  return (
    <>
      <div
        className="grid-move absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 255, 136, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.12) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,136,0.12),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(0,255,255,0.08),transparent_32%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_80%,rgba(191,95,255,0.07),transparent_28%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(transparent 0%, rgba(0, 255, 136, 0.18) 50%, transparent 100%)',
          backgroundSize: '100% 6px',
        }}
      />
      <div className="scanline-anim pointer-events-none absolute left-0 top-0 z-20 h-[2px] w-full bg-gradient-to-r from-transparent via-green-400/70 to-transparent" />

      {PARTICLES.map((particle, index) => (
        <div
          key={`hero-particle-${index}`}
          className="particle absolute rounded-full bg-green-400/70 shadow-[0_0_16px_rgba(0,255,136,0.7)]"
          style={{
            top: particle.top,
            left: particle.left,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            '--dur': particle.dur,
            '--delay': particle.delay,
          }}
        />
      ))}

      <div className="pointer-events-none absolute left-6 top-24 z-10 text-xs uppercase tracking-[0.35em] text-green-500/30 sm:left-10">
        [ RMB_SYS v2.0 ]
      </div>
      <div className="pointer-events-none absolute bottom-8 right-6 z-10 text-xs uppercase tracking-[0.35em] text-green-500/30 sm:right-10">
        [ UPTIME: ∞ ]
      </div>
    </>
  )
})

const HeroAvatar = memo(function HeroAvatar() {
  return (
    <motion.div variants={itemVariants} className="mb-5">
      <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-green-400/40 bg-black/45 p-2 shadow-[0_0_55px_rgba(0,255,136,0.18)] glow-pulse sm:h-40 sm:w-40">
        <img
          src="/avatar.png"
          alt="Rubén Martínez Bernabe avatar"
          className="h-full w-full rounded-full border border-green-400/30 object-cover"
          width="160"
          height="160"
          decoding="async"
          fetchPriority="high"
        />
      </div>
    </motion.div>
  )
})

const HeroSocialLinks = memo(function HeroSocialLinks() {
  return (
    <motion.div variants={itemVariants} className="mt-12 flex flex-wrap items-center justify-center gap-4 sm:mt-14">
      {SOCIAL_LINKS.map((link, index) => {
        const Icon = link.icon

        return (
          <a
            key={`hero-social-${index}`}
            href={link.href}
            target={link.href.startsWith('mailto:') ? undefined : '_blank'}
            rel={link.href.startsWith('mailto:') ? undefined : 'noreferrer'}
            aria-label={link.label}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-green-500/20 bg-black/40 text-green-300 transition hover:-translate-y-1 hover:border-green-300/40 hover:bg-green-500/10 hover:text-green-100 hover:shadow-[0_0_22px_rgba(0,255,136,0.2)]"
          >
            <Icon className="h-5 w-5" />
          </a>
        )
      })}
    </motion.div>
  )
})

export default function Hero() {
  const { language } = useLanguage()
  const t = translations[language]
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // Reset the typewriter whenever the active language changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhraseIndex(0)
    setDisplayText('')
    setIsDeleting(false)
  }, [language])

  useEffect(() => {
    const currentPhrase = t.titles[phraseIndex] ?? ''
    const isComplete = displayText === currentPhrase
    const isReset = displayText.length === 0

    const delay = isComplete && !isDeleting ? 1350 : isReset && isDeleting ? 280 : isDeleting ? 45 : 90

    const timeoutId = window.setTimeout(() => {
      if (!isDeleting) {
        if (isComplete) {
          setIsDeleting(true)
          return
        }

        setDisplayText(currentPhrase.slice(0, displayText.length + 1))
        return
      }

      if (isReset) {
        setIsDeleting(false)
        setPhraseIndex((currentValue) => (currentValue + 1) % t.titles.length)
        return
      }

      setDisplayText(currentPhrase.slice(0, displayText.length - 1))
    }, delay)

    return () => window.clearTimeout(timeoutId)
  }, [displayText, isDeleting, phraseIndex, t.titles])

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 pb-20 pt-28 sm:px-8"
    >
      <HeroBackdrop />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-1 text-center"
      >
        <HeroAvatar />

        <motion.div
          variants={itemVariants}
          className="mb-4 inline-flex max-w-full items-center rounded-full border border-green-500/20 bg-black/45 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-green-400/70 backdrop-blur-sm break-all sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.35em]"
        >
          terminal://rubenitx.me/boot
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="glitch-layer break-words px-2 text-3xl font-black leading-tight tracking-[0.08em] text-green-50 text-glow-green sm:text-6xl lg:text-7xl"
          data-text="Rubén Martínez Bernabe"
        >
          Rubén Martínez Bernabe
        </motion.h1>

        <motion.div variants={itemVariants} className="mt-5 min-h-[3rem] max-w-full px-2 sm:min-h-[4rem]">
          <p className="break-words text-xs font-medium uppercase tracking-[0.22em] text-green-300/90 sm:text-lg sm:tracking-[0.38em]">
            {displayText}
            <span
              className="ml-1 inline-block border-r-2 border-green-400 pr-[1px] align-middle"
              style={{ animation: 'typewriter-cursor 1s step-end infinite' }}
              aria-hidden="true"
            />
          </p>
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="mt-4 max-w-3xl px-2 text-base leading-8 text-slate-300/85 sm:text-lg"
        >
          {t.tagline}
        </motion.p>

        <motion.div variants={itemVariants} className="mt-8 flex w-full max-w-md flex-col gap-4 sm:max-w-none sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => scrollToSection('projects')}
            className="box-glow-green-strong inline-flex w-full items-center justify-center rounded-full border border-green-300/30 bg-gradient-to-r from-green-400 via-emerald-300 to-cyan-300 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-950 transition duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(0,255,136,0.35)] sm:w-auto sm:tracking-[0.28em]"
          >
            {t.viewWork}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('contact')}
            className="inline-flex w-full items-center justify-center rounded-full border border-green-400/35 bg-black/30 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-green-200 transition duration-300 hover:scale-[1.03] hover:bg-green-500/10 hover:shadow-[0_0_26px_rgba(0,255,136,0.2)] sm:w-auto sm:tracking-[0.28em]"
          >
            {t.getInTouch}
          </button>
        </motion.div>

        <HeroSocialLinks />
      </motion.div>

      <motion.button
        type="button"
        onClick={() => scrollToSection('about')}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        className="absolute bottom-5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center justify-center rounded-full border border-green-500/20 bg-black/35 p-3 text-green-300 backdrop-blur-sm transition hover:border-green-300/40 hover:text-green-100"
        aria-label={t.scrollToAbout}
      >
        <ChevronDown className="h-5 w-5" />
      </motion.button>
    </section>
  )
}
