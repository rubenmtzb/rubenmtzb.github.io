import { motion } from 'framer-motion'
import { Award, BadgeCheck, ExternalLink, Shield } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const translations = {
  en: {
    title: 'CERTIFICATIONS',
    issuedBy: 'Issued by',
    dateLabel: 'Date',
    idLabel: 'ID',
    gradeLabel: 'Grade',
    verifyLabel: 'Verify Credential',
    projectLabel: 'View Project',
    certs: [
      {
        title: 'Claude Code in Action',
        issuer: 'Anthropic',
        date: 'January 2026',
        id: '7h7wd7qewuw8',
        verifyUrl: 'https://verify.skilljar.com/c/7h7wd7qewuw8',
        tags: ['AI', 'LLMs', 'Prompt Engineering'],
      },
      {
        title: 'Advanced DevOps Course',
        issuer: 'INESEM Business School',
        date: 'December 2025',
        note: 'Outstanding',
        verifyUrl: 'https://app.educasign.ai/validation/a2822919-7a1d-4679-861b-1c775147b901',
        tags: ['DevOps', 'CI/CD', 'Docker', 'Kubernetes'],
      },
      {
        title: 'Python Master',
        issuer: 'Udemy',
        date: 'May 2021',
        verifyUrl: 'https://www.udemy.com/certificate/UC-b5584cc7-094b-428d-a0c3-55a42951a908/',
        tags: ['Python', 'Git'],
      },
      {
        title: 'JavaScript Master',
        issuer: 'Udemy',
        date: 'May 2021',
        verifyUrl: 'https://www.udemy.com/certificate/UC-4e22184f-f814-40fe-8016-d75f4dd57edf/',
        tags: ['JavaScript', 'ES6+', 'Git'],
      },
      {
        title: 'Java Junior Developer',
        issuer: 'Fundación Esplai',
        date: 'July 2021',
        verifyUrl: 'https://badgr.com/public/assertions/K-E-j1zsTliUHrkekOoVBg',
        projectUrl: 'https://www.youtube.com/watch?v=L_G46DBG7Qc',
        tags: ['Java', 'Git'],
      },
    ],
  },
  es: {
    title: 'CERTIFICACIONES',
    issuedBy: 'Expedido por',
    dateLabel: 'Fecha',
    idLabel: 'ID',
    gradeLabel: 'Nota',
    verifyLabel: 'Verificar Credencial',
    projectLabel: 'Ver Proyecto',
    certs: [
      {
        title: 'Claude Code in Action',
        issuer: 'Anthropic',
        date: 'Enero 2026',
        id: '7h7wd7qewuw8',
        verifyUrl: 'https://verify.skilljar.com/c/7h7wd7qewuw8',
        tags: ['AI', 'LLMs', 'Prompt Engineering'],
      },
      {
        title: 'Curso Superior en DevOps',
        issuer: 'INESEM Business School',
        date: 'Diciembre 2025',
        note: 'Sobresaliente',
        verifyUrl: 'https://app.educasign.ai/validation/a2822919-7a1d-4679-861b-1c775147b901',
        tags: ['DevOps', 'CI/CD', 'Docker', 'Kubernetes'],
      },
      {
        title: 'Master en Python',
        issuer: 'Udemy',
        date: 'Mayo 2021',
        verifyUrl: 'https://www.udemy.com/certificate/UC-b5584cc7-094b-428d-a0c3-55a42951a908/',
        tags: ['Python', 'Git'],
      },
      {
        title: 'Master en JavaScript',
        issuer: 'Udemy',
        date: 'Mayo 2021',
        verifyUrl: 'https://www.udemy.com/certificate/UC-4e22184f-f814-40fe-8016-d75f4dd57edf/',
        tags: ['JavaScript', 'ES6+', 'Git'],
      },
      {
        title: 'Java Junior Developer',
        issuer: 'Fundación Esplai',
        date: 'Julio 2021',
        verifyUrl: 'https://badgr.com/public/assertions/K-E-j1zsTliUHrkekOoVBg',
        projectUrl: 'https://www.youtube.com/watch?v=L_G46DBG7Qc',
        tags: ['Java', 'Git'],
      },
    ],
  },
}

const icons = [Award, BadgeCheck, Shield]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export default function Certifications() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <section id="certifications" className="relative py-20 px-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,255,136,0.08),transparent_32%),radial-gradient(circle_at_top_right,rgba(191,95,255,0.06),transparent_26%)]" />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-extrabold tracking-widest uppercase text-white text-glow-green mb-12 text-center">
            <span className="text-green-400">&gt; </span>
            {t.title}
          </h2>
        </motion.div>

        <motion.div
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          {t.certs.map((certification, index) => {
            const Icon = icons[index % icons.length]

            return (
              <motion.article
                key={`${certification.title}-${certification.issuer}`}
                variants={itemVariants}
                whileHover={{ y: -6, scale: 1.01 }}
                className="relative overflow-hidden bg-black/40 backdrop-blur-sm border border-green-500/20 rounded-xl p-5"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-400 via-cyan-400 to-purple-400" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,136,0.12),transparent_52%)] opacity-80" />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.72rem] uppercase tracking-[0.32em] text-green-300/75">{t.issuedBy}</p>
                      <p className="mt-1 text-sm font-medium text-green-200">{certification.issuer}</p>
                    </div>

                    <span className="rounded-full border border-green-500/20 bg-green-500/10 p-2 text-green-300">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-white">{certification.title}</h3>

                  <div className="mt-4 space-y-2 text-sm text-slate-300/85">
                    <p>
                      <span className="text-green-300/70">{t.dateLabel}:</span> {certification.date}
                    </p>
                    {certification.id ? (
                      <p>
                        <span className="text-green-300/70">{t.idLabel}:</span> {certification.id}
                      </p>
                    ) : null}
                    {certification.note ? (
                      <p>
                        <span className="text-green-300/70">{t.gradeLabel}:</span> {certification.note}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium">
                    {certification.verifyUrl ? (
                      <a
                        href={certification.verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex items-center gap-1.5 text-green-300 transition-colors hover:text-green-200"
                      >
                        <span>{t.verifyLabel}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-green-500/70 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </a>
                    ) : null}
                    {certification.projectUrl ? (
                      <a
                        href={certification.projectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex items-center gap-1.5 text-green-300/85 transition-colors hover:text-green-200"
                      >
                        <span>{t.projectLabel}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-green-500/70 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </a>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {certification.tags.map((tag) => (
                      <span key={tag} className="bg-green-500/10 text-green-400 border border-green-500/30 rounded-full px-3 py-1 text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.article>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
