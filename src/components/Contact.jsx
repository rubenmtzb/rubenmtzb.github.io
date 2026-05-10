import { motion } from 'framer-motion'
import { ExternalLink, Mail, Send } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { GithubIcon, LinkedinIcon } from './BrandIcons'

const translations = {
  en: {
    sectionLabel: 'CONTACT',
    headline: 'Have an interesting project?',
    subheadline:
      "I'm open to conversations about ambitious backend, full-stack, or research-oriented projects.",
    connecting: '> establishing_connection...',
    sendEmail: 'Send Email',
    methods: [
      {
        label: 'Email',
        description: 'Write me directly',
        display: 'rmartbernabe@gmail.com',
      },
      {
        label: 'LinkedIn',
        description: "Let's connect professionally",
        display: 'linkedin.com/in/rubenmartinezbernabe/',
      },
      {
        label: 'GitHub',
        description: 'Check my code',
        display: 'github.com/rubenmtzb',
      },
    ],
  },
  es: {
    sectionLabel: 'CONTACTO',
    headline: '¿Tienes un proyecto interesante?',
    subheadline:
      'Estoy abierto a conversaciones sobre proyectos ambiciosos de backend, full-stack o investigación.',
    connecting: '> establishing_connection...',
    sendEmail: 'Enviar Email',
    methods: [
      {
        label: 'Email',
        description: 'Escríbeme directamente',
        display: 'rmartbernabe@gmail.com',
      },
      {
        label: 'LinkedIn',
        description: 'Conectemos profesionalmente',
        display: 'linkedin.com/in/rubenmartinezbernabe/',
      },
      {
        label: 'GitHub',
        description: 'Revisa mi código',
        display: 'github.com/rubenmtzb',
      },
    ],
  },
}

const contactMeta = [
  {
    href: 'mailto:rmartbernabe@gmail.com',
    Icon: Mail,
  },
  {
    href: 'https://www.linkedin.com/in/rubenmartinezbernabe/',
    Icon: LinkedinIcon,
  },
  {
    href: 'https://github.com/rubenmtzb',
    Icon: GithubIcon,
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

export default function Contact() {
  const { language } = useLanguage()
  const t = translations[language]
  const contactMethods = t.methods.map((method, index) => ({ ...method, ...contactMeta[index] }))

  return (
    <section id="contact" className="relative overflow-hidden px-6 py-24 font-mono text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#00ff8818,transparent_50%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-400/60 to-transparent" />

      <motion.div
        className="relative mx-auto flex max-w-6xl flex-col items-center text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.p
          className="mb-4 text-sm uppercase tracking-[0.35em] text-green-400"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          &gt; {t.sectionLabel}
        </motion.p>

        <motion.h2
          className="max-w-3xl text-3xl font-bold text-white sm:text-4xl md:text-5xl"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {t.headline}
        </motion.h2>

        <motion.p
          className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, delay: 0.18 }}
        >
          {t.subheadline}
        </motion.p>

        <motion.div
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-black/40 px-4 py-2 text-sm text-green-300 backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5, delay: 0.24 }}
        >
          <span>{t.connecting}</span>
          <motion.span
            aria-hidden="true"
            className="text-green-400"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          >
            ▌
          </motion.span>
        </motion.div>

        <motion.div
          className="mt-12 grid w-full gap-6 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          {contactMethods.map(({ label, description, href, display, Icon }, index) => {
            const isExternal = href.startsWith('http')

            return (
              <motion.a
                key={`contact-${index}`}
                href={href}
                variants={itemVariants}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.99 }}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="group rounded-xl border border-green-500/20 bg-black/40 p-6 backdrop-blur-sm transition-all hover:border-green-500/40 hover:shadow-[0_0_30px_rgba(0,255,136,0.14)]"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-green-300 shadow-[0_0_20px_rgba(0,255,136,0.12)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ExternalLink className="h-4 w-4 text-green-500/60 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>

                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-green-500/70">{label}</p>
                <p className="mb-3 break-all text-lg font-semibold text-white">{display}</p>
                <p className="text-sm leading-6 text-slate-300">{description}</p>
              </motion.a>
            )
          })}
        </motion.div>

        <motion.div
          className="mt-12 flex flex-col items-center gap-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, delay: 0.18 }}
        >
          <motion.a
            href="mailto:rmartbernabe@gmail.com"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-green-400 via-emerald-400 to-lime-300 px-8 py-4 text-base font-semibold text-slate-950 shadow-[0_0_30px_rgba(0,255,136,0.28)] transition-all hover:shadow-[0_0_45px_rgba(0,255,136,0.4)]"
          >
            <Send className="h-5 w-5" />
            <span>{t.sendEmail}</span>
          </motion.a>

          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-green-300">
            <a
              href="https://www.linkedin.com/in/rubenmartinezbernabe/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors hover:text-green-200"
            >
              <LinkedinIcon className="h-4 w-4" />
              <span>LinkedIn</span>
            </a>
            <a
              href="https://github.com/rubenmtzb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors hover:text-green-200"
            >
              <GithubIcon className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
