import { motion } from 'framer-motion'
import { Newspaper, Construction } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const translations = {
  en: {
    title: 'BLOG',
    heading: 'Articles & Insights',
    description: 'Technical articles about Java, Spring Boot, React, DevOps, and software architecture. Coming soon.',
    badge: 'Under Construction',
  },
  es: {
    title: 'BLOG',
    heading: 'Artículos & Reflexiones',
    description: 'Artículos técnicos sobre Java, Spring Boot, React, DevOps y arquitectura de software. Próximamente.',
    badge: 'En Construcción',
  },
}

export default function Blog() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <section id="blog" className="relative overflow-hidden px-6 py-16">
      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center"
        >
          <p className="mb-6 text-sm font-semibold uppercase tracking-[0.35em] text-green-400 text-glow-green">
            &gt; {t.title}
          </p>

          <div className="w-full max-w-lg rounded-xl border border-green-500/20 bg-black/40 p-8 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-center gap-3">
              <Newspaper className="h-8 w-8 text-green-400/60" />
              <Construction className="h-6 w-6 text-yellow-400/60" />
            </div>

            <h3 className="mb-3 text-xl font-bold text-white">{t.heading}</h3>
            <p className="mb-4 text-sm text-slate-300/80">{t.description}</p>

            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-500/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-yellow-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
              </span>
              {t.badge}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
