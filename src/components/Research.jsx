import { motion } from 'framer-motion'
import { ArrowUpRight, BookOpen, Building2, FlaskConical, Microscope } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const translations = {
  en: {
    title: 'RESEARCH',
    badge: 'Featured research portal',
    articleBadge: 'Published in MDPI — Int. J. Mol. Sci.',
    mainTitle: 'The Mutational Landscape of SARS-CoV-2',
    description:
      'An interactive scientific tool for navigating the SARS-CoV-2 genome through a clear, visual interface designed for exploratory analysis.',
    highlights: [
      'Interactive portal for exploring mutations across the SARS-CoV-2 genome',
      'Developed in collaboration with Universitat Rovira i Virgili',
      'Contribution at the intersection of software engineering and bioinformatics',
      'Published as a reference tool for researchers',
    ],
    ctaButton: 'Explore the Portal',
    articleButton: 'Read the Publication',
    partnerLabel: 'University partner',
    partnerName: 'Universitat Rovira i Virgili',
    partnerDesc:
      'Interdisciplinary collaboration aimed at transforming genomic data into a useful research consultation experience.',
    focusLabel: 'Focus',
    focusText: 'Visual genomics and exploratory analysis',
    intersectionLabel: 'Intersection',
    intersectionText: 'Software engineering + bioinformatics',
  },
  es: {
    title: 'INVESTIGACIÓN',
    badge: 'Portal de investigación destacado',
    articleBadge: 'Publicado en MDPI — Int. J. Mol. Sci.',
    mainTitle: 'The Mutational Landscape of SARS-CoV-2',
    description:
      'Una herramienta científica interactiva para navegar el genoma del SARS-CoV-2 desde una interfaz clara, visual y pensada para análisis exploratorio.',
    highlights: [
      'Portal interactivo para explorar mutaciones a lo largo del genoma del SARS-CoV-2',
      'Desarrollado en colaboración con la Universitat Rovira i Virgili',
      'Contribución en la intersección de ingeniería de software y bioinformática',
      'Publicado como herramienta de referencia para investigadores',
    ],
    ctaButton: 'Explorar el Portal',
    articleButton: 'Leer la Publicación',
    partnerLabel: 'Universidad colaboradora',
    partnerName: 'Universitat Rovira i Virgili',
    partnerDesc:
      'Colaboración interdisciplinar orientada a convertir datos genómicos en una experiencia de consulta útil para investigación.',
    focusLabel: 'Enfoque',
    focusText: 'Genómica visual y análisis exploratorio',
    intersectionLabel: 'Intersección',
    intersectionText: 'Ingeniería de software + bioinformática',
  },
}

export default function Research() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <section id="research" className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,255,255,0.06),transparent_24%)]" />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-12 text-center text-2xl font-extrabold tracking-widest uppercase text-white text-glow-green sm:text-3xl">
            <span className="text-green-400">&gt; </span>
            {t.title}
          </h2>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -6 }}
          className="relative overflow-hidden rounded-2xl border border-green-500/25 bg-gradient-to-br from-green-500/10 via-black/55 to-cyan-500/10 p-5 shadow-[0_0_40px_rgba(0,255,136,0.08)] backdrop-blur-sm sm:p-6 md:p-8"
        >
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border border-cyan-400/15" />
          <div className="absolute -right-8 top-12 h-24 w-24 rounded-full border border-green-400/20" />
          <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />

          <div className="relative grid gap-6 sm:gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-5 flex flex-wrap items-start gap-3">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-green-500/20 bg-black/40 px-3 py-2 text-green-300/85 sm:gap-3 sm:px-4">
                  <FlaskConical className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words text-[0.62rem] uppercase tracking-[0.18em] sm:text-[0.72rem] sm:tracking-[0.34em]">{t.badge}</span>
                </div>
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-cyan-200/90 shadow-[0_0_20px_rgba(34,211,238,0.12)] sm:gap-3 sm:px-4">
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words text-[0.62rem] uppercase tracking-[0.16em] sm:text-[0.72rem] sm:tracking-[0.28em]">{t.articleBadge}</span>
                </div>
              </div>

              <h3 className="max-w-2xl text-xl font-bold text-white sm:text-2xl md:text-3xl">{t.mainTitle}</h3>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300/90 sm:leading-7 md:text-base">{t.description}</p>

              <div className="mt-6 space-y-3">
                {t.highlights.map((item, index) => (
                  <div key={`research-${index}`} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-400 shadow-[0_0_12px_rgba(0,255,136,0.9)]" />
                    <p className="text-sm leading-7 text-slate-300/90">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <a
                  href="http://sarscov2-mutation-portal.urv.cat"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-green-400/35 bg-green-500/10 px-5 py-3 text-sm font-semibold text-green-200 transition hover:-translate-y-0.5 hover:border-green-300/55 hover:bg-green-500/15"
                >
                  {t.ctaButton}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href="https://www.mdpi.com/1422-0067/24/10/9072"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/35 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-300/55 hover:bg-cyan-500/15"
                >
                  {t.articleButton}
                  <BookOpen className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-cyan-400/20 bg-black/35 p-4 backdrop-blur-sm sm:p-5">
                <div className="flex items-center gap-3 text-cyan-200">
                  <Building2 className="h-5 w-5 shrink-0" />
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] sm:text-[0.72rem] sm:tracking-[0.3em]">{t.partnerLabel}</span>
                </div>
                <p className="mt-3 text-lg font-semibold text-white">{t.partnerName}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/80">{t.partnerDesc}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-green-500/20 bg-black/35 p-4 backdrop-blur-sm sm:p-5">
                  <Microscope className="h-5 w-5 text-green-300" />
                  <p className="mt-3 text-[0.65rem] uppercase tracking-[0.2em] text-green-300/70 sm:text-[0.72rem] sm:tracking-[0.28em]">{t.focusLabel}</p>
                  <p className="mt-1 text-sm text-white">{t.focusText}</p>
                </div>
                <div className="rounded-2xl border border-purple-400/20 bg-black/35 p-4 backdrop-blur-sm sm:p-5">
                  <FlaskConical className="h-5 w-5 text-purple-200" />
                  <p className="mt-3 text-[0.65rem] uppercase tracking-[0.2em] text-purple-200/70 sm:text-[0.72rem] sm:tracking-[0.28em]">{t.intersectionLabel}</p>
                  <p className="mt-1 text-sm text-white">{t.intersectionText}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.article>
      </div>
    </section>
  )
}
