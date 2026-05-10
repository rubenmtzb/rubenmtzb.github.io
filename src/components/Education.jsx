import { motion } from 'framer-motion'
import { BookOpen, CalendarRange, GraduationCap } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const translations = {
  en: {
    sectionLabel: 'EDUCATION',
    inProgress: 'In progress',
    gradeLabel: 'Grade',
    items: [
      {
        institution: 'Universitat Oberta de Catalunya (UOC)',
        title: "Bachelor's in Computer Software Engineering",
        period: 'February 2026 - Present',
        status: 'In progress',
        description:
          'Formalizing the foundations of software engineering. Strengthening the theoretical base in system architecture, algorithms, design patterns, and development methodologies.',
      },
      {
        institution: 'INESEM Business School',
        title: 'Advanced Course in DevOps',
        period: 'June 2025 - December 2025',
        note: 'Outstanding',
        description:
          'Strategic specialization to unify development and operations, focused on accelerating the delivery cycle of high-quality software. CI/CD, infrastructure as code, and monitoring.',
        tags: ['DevOps', 'CI/CD', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform'],
      },
      {
        institution: 'Instituto la Guineueta',
        title: 'Web Application Development (DAW) — Bioinformatics Specialization',
        period: '2020 - 2022',
        description:
          'Intensive higher education in software development. Application of a wide range of technologies to build complex solutions in real-world environments.',
        tags: ['TypeScript', 'SQL', 'Java', 'PHP', 'JavaScript', 'React'],
      },
      {
        institution: 'Instituto la Guineueta',
        title: 'Microcomputer Systems and Networks (SMX)',
        period: '2018 - 2020',
        description: 'Fundamentals of systems infrastructure, networking, and technical support.',
        tags: ['Networking', 'Linux', 'Windows Server', 'Hardware'],
      },
    ],
  },
  es: {
    sectionLabel: 'FORMACIÓN',
    inProgress: 'En curso',
    gradeLabel: 'Nota',
    items: [
      {
        institution: 'Universitat Oberta de Catalunya (UOC)',
        title: 'Grado en Ingeniería Informática — Computer Software Engineering',
        period: 'Febrero 2026 - Actualidad',
        status: 'En curso',
        description:
          'Formalizando los fundamentos de la ingeniería de software. Reforzando la base teórica en arquitectura de sistemas, algoritmos, patrones de diseño y metodologías de desarrollo.',
      },
      {
        institution: 'INESEM Business School',
        title: 'Curso Superior en DevOps',
        period: 'Junio 2025 - Diciembre 2025',
        note: 'Sobresaliente',
        description:
          'Especialización estratégica para unificar desarrollo y operaciones, enfocada en acelerar el ciclo de entrega de software de alta calidad. CI/CD, infraestructura como código y monitorización.',
        tags: ['DevOps', 'CI/CD', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform'],
      },
      {
        institution: 'Instituto la Guineueta',
        title: 'Desarrollo de Aplicaciones Web (DAW) — Especialización en Bioinformática',
        period: '2020 - 2022',
        description:
          'Formación superior intensiva en desarrollo de software. Aplicación de un amplio abanico de tecnologías para construir soluciones complejas en entornos reales.',
        tags: ['TypeScript', 'SQL', 'Java', 'PHP', 'JavaScript', 'React'],
      },
      {
        institution: 'Instituto la Guineueta',
        title: 'Sistemas Microinformáticos en Red (SMX)',
        period: '2018 - 2020',
        description: 'Fundamentos de infraestructura de sistemas, redes y soporte técnico.',
        tags: ['Networking', 'Linux', 'Windows Server', 'Hardware'],
      },
    ],
  },
}

const icons = [GraduationCap, BookOpen, GraduationCap, BookOpen]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

export default function Education() {
  const { language } = useLanguage()
  const t = translations[language]
  const items = t.items.map((item, index) => ({ ...item, icon: icons[index] }))

  return (
    <section id="education" className="section-container mx-auto max-w-6xl bg-[#030712] px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="space-y-12"
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-green-400 text-glow-green">
            &gt; {t.sectionLabel}
          </p>
          <div className="h-px w-full max-w-2xl bg-gradient-to-r from-green-400/70 via-purple-400/20 to-transparent" />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid gap-6 md:grid-cols-2"
        >
          {items.map((item) => {
            const Icon = item.icon

            return (
              <motion.article
                key={`edu-${index}`}
                variants={itemVariants}
                className="relative overflow-hidden rounded-xl border border-green-500/20 bg-black/40 p-6 backdrop-blur-sm"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-400/80 to-cyan-400/60" />

                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-green-400">
                      <Icon size={14} />
                      {item.institution}
                    </span>
                    <h3 className="text-xl font-semibold leading-8 text-white">{item.title}</h3>
                  </div>

                  <div className="rounded-full border border-green-500/20 bg-[#030712] p-3 text-green-400 shadow-[0_0_18px_#00ff8820]">
                    <Icon size={22} />
                  </div>
                </div>

                <div className="mb-5 flex flex-wrap gap-3 text-xs text-gray-300">
                  <span className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-black/40 px-3 py-1.5">
                    <CalendarRange size={14} className="text-green-400" />
                    {item.period}
                  </span>
                  {item.status && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-green-400">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
                      </span>
                      {t.inProgress}
                    </span>
                  )}
                  {item.note && (
                    <span className="inline-flex items-center rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1.5 text-purple-300">
                      {t.gradeLabel}: {item.note}
                    </span>
                  )}
                </div>

                <p className="leading-7 text-gray-300">{item.description}</p>

                {item.tags && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.article>
            )
          })}
        </motion.div>
      </motion.div>
    </section>
  )
}
