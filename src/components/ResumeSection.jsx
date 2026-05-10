import { motion } from 'framer-motion'
import { ExternalLink, FileDown, SquareTerminal } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const translations = {
  en: {
    label: 'RESUME',
    title: 'Download my CV',
    description:
      'Get a comprehensive overview of my experience, skills, research, and education in a print-ready format.',
    button: 'View & Download CV',
    hint: 'Opens in a new tab — save as PDF with Ctrl+P',
    badgePrimary: 'A4 / PDF ready',
    badgeSecondary: 'EN + ES toggle',
    terminalTitle: 'resume/export.sh',
    terminalLines: [
      '> format: interactive + print optimized',
      '> profile: backend, frontend, research',
      '> output: /cv/index.html',
    ],
    exportStatus: 'export ready',
  },
  es: {
    label: 'CURRÍCULUM',
    title: 'Descarga mi CV',
    description:
      'Obtén una visión completa de mi experiencia, habilidades, investigación y formación en un formato listo para imprimir.',
    button: 'Ver y Descargar CV',
    hint: 'Se abre en nueva pestaña — guardar como PDF con Ctrl+P',
    badgePrimary: 'Listo para A4 / PDF',
    badgeSecondary: 'Selector EN + ES',
    terminalTitle: 'resume/export.sh',
    terminalLines: [
      '> formato: interactivo + optimizado para impresión',
      '> perfil: backend, frontend, investigación',
      '> salida: /cv/index.html',
    ],
    exportStatus: 'listo para exportar',
  },
}

export default function ResumeSection() {
  const { language } = useLanguage()
  const t = translations[language] ?? translations.en

  return (
    <section id="resume" className="relative overflow-hidden bg-[#030712] px-6 py-20 font-mono text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,136,0.14),transparent_38%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-400/60 to-transparent" />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[28px] border border-green-500/20 bg-black/40 p-8 backdrop-blur-sm sm:p-10"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,255,136,0.1),transparent_45%,rgba(34,211,238,0.08))]" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />

          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="max-w-2xl text-center lg:text-left">
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.35em] text-green-400 text-glow-green">
                &gt; {t.label}
              </p>

              <h2 className="text-3xl font-bold text-white sm:text-4xl">{t.title}</h2>
              <p className="mt-4 text-base leading-8 text-slate-300/90 sm:text-lg">{t.description}</p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <span className="rounded-full border border-green-400/20 bg-green-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-green-200">
                  {t.badgePrimary}
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
                  {t.badgeSecondary}
                </span>
              </div>

              <motion.a
                href="/cv/"
                target="_blank"
                rel="noreferrer"
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="mt-8 inline-flex items-center gap-3 rounded-full border border-green-400/35 bg-green-500/10 px-6 py-3 text-sm font-semibold text-green-200 transition hover:border-green-300/55 hover:bg-green-500/15 hover:shadow-[0_0_25px_rgba(0,255,136,0.2)]"
              >
                <FileDown className="h-5 w-5" />
                {t.button}
                <ExternalLink className="h-4 w-4 opacity-60" />
              </motion.a>

              <p className="mt-4 text-xs tracking-[0.22em] text-green-500/60">{t.hint}</p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto w-full max-w-md rounded-3xl border border-green-500/20 bg-[#02050b]/85 p-5 text-left shadow-[0_0_35px_rgba(0,255,136,0.08)]"
            >
              <div className="mb-5 flex items-center gap-2 border-b border-green-500/15 pb-4">
                <span className="h-3 w-3 rounded-full bg-rose-400/90" />
                <span className="h-3 w-3 rounded-full bg-amber-300/90" />
                <span className="h-3 w-3 rounded-full bg-green-400/90" />
                <div className="ml-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-green-400/70">
                  <SquareTerminal className="h-4 w-4" />
                  {t.terminalTitle}
                </div>
              </div>

              <div className="space-y-3 text-sm leading-7 text-slate-300">
                {t.terminalLines.map((line, index) => (
                  <div key={line} className="flex items-start gap-3">
                    <span className="text-green-500/50">0{index + 1}</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              <motion.div
                aria-hidden="true"
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-green-500/15 bg-green-500/5 px-3 py-1 text-xs uppercase tracking-[0.26em] text-green-300/80"
              >
                <span className="h-2 w-2 rounded-full bg-green-400" />
                {t.exportStatus}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
