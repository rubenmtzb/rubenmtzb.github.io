import { motion } from 'framer-motion'
import { ExternalLink, Eye, FileDown, SquareTerminal } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const translations = {
  en: {
    label: 'RESUME',
    title: 'Download my CV',
    description:
      'Get a comprehensive overview of my experience, skills, research, and education in a print-ready format.',
    downloadButton: 'Download PDF',
    previewButton: 'Preview Online',
    downloadHint: 'Direct download — A4 print-ready',
    badgePrimary: 'A4 / PDF ready',
    badgeSecondary: 'Direct PDF download',
    terminalTitle: 'resume/export.sh',
    terminalLines: [
      '> format: interactive + print optimized',
      '> profile: backend, frontend, research',
      '> output: /cv/CV_RubenMartinez_EN.pdf',
    ],
    exportStatus: 'export ready',
  },
  es: {
    label: 'CURRÍCULUM',
    title: 'Descarga mi CV',
    description:
      'Obtén una visión completa de mi experiencia, habilidades, investigación y formación en un formato listo para imprimir.',
    downloadButton: 'Descargar PDF',
    previewButton: 'Vista Previa Online',
    downloadHint: 'Descarga directa — Listo para A4',
    badgePrimary: 'Listo para A4 / PDF',
    badgeSecondary: 'Descarga directa PDF',
    terminalTitle: 'resume/export.sh',
    terminalLines: [
      '> formato: interactivo + optimizado para impresión',
      '> perfil: backend, frontend, investigación',
      '> salida: /cv/CV_RubenMartinez_ES.pdf',
    ],
    exportStatus: 'listo para exportar',
  },
}

export default function ResumeSection() {
  const { language } = useLanguage()
  const t = translations[language] ?? translations.en
  const pdfHref = language === 'es' ? '/cv/CV_RubenMartinez_ES.pdf' : '/cv/CV_RubenMartinez_EN.pdf'

  return (
    <section id="resume" className="relative overflow-hidden bg-[#030712] px-4 py-16 font-mono text-white sm:px-6 sm:py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,136,0.14),transparent_38%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-400/60 to-transparent" />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[28px] border border-green-500/20 bg-black/40 p-6 backdrop-blur-sm sm:p-8 lg:p-10"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,255,136,0.1),transparent_45%,rgba(34,211,238,0.08))]" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />

          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="max-w-2xl text-center lg:text-left">
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.35em] text-green-400 text-glow-green">
                &gt; {t.label}
              </p>

              <h2 className="text-2xl font-bold text-white sm:text-4xl">{t.title}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300/90 sm:text-lg sm:leading-8">{t.description}</p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <span className="rounded-full border border-green-400/20 bg-green-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-green-200 sm:text-xs sm:tracking-[0.28em]">
                  {t.badgePrimary}
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 sm:text-xs sm:tracking-[0.28em]">
                  {t.badgeSecondary}
                </span>
              </div>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <motion.a
                  href={pdfHref}
                  download
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-green-300/45 bg-green-500/15 px-7 py-3.5 text-sm font-semibold text-green-100 transition hover:border-green-200/60 hover:bg-green-500/20 hover:shadow-[0_0_30px_rgba(0,255,136,0.28)] sm:w-auto"
                >
                  <FileDown className="h-5 w-5" />
                  {t.downloadButton}
                </motion.a>

                <motion.a
                  href="/cv/"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-green-400/30 bg-transparent px-5 py-3 text-sm font-semibold text-green-200/90 transition hover:border-green-300/45 hover:bg-green-500/10 hover:text-green-100 sm:w-auto"
                >
                  <Eye className="h-4 w-4" />
                  {t.previewButton}
                  <ExternalLink className="h-4 w-4 opacity-60" />
                </motion.a>
              </div>

              <p className="mt-4 break-words text-[11px] tracking-[0.16em] text-green-500/60 sm:text-xs sm:tracking-[0.22em]">{t.downloadHint}</p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto w-full max-w-md rounded-3xl border border-green-500/20 bg-[#02050b]/85 p-4 text-left shadow-[0_0_35px_rgba(0,255,136,0.08)] sm:p-5"
            >
              <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-green-500/15 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-400/90" />
                  <span className="h-3 w-3 rounded-full bg-amber-300/90" />
                  <span className="h-3 w-3 rounded-full bg-green-400/90" />
                </div>
                <div className="inline-flex max-w-full items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-green-400/70 sm:ml-3 sm:text-xs sm:tracking-[0.28em]">
                  <SquareTerminal className="h-4 w-4 shrink-0" />
                  <span className="break-all">{t.terminalTitle}</span>
                </div>
              </div>

              <div className="space-y-3 text-sm leading-7 text-slate-300">
                {t.terminalLines.map((line, index) => (
                  <div key={`resume-line-${index}`} className="flex min-w-0 items-start gap-3">
                    <span className="shrink-0 text-green-500/50">0{index + 1}</span>
                    <span className="break-all">{line}</span>
                  </div>
                ))}
              </div>

              <motion.div
                aria-hidden="true"
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-green-500/15 bg-green-500/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-green-300/80 sm:text-xs sm:tracking-[0.26em]"
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
