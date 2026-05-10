import { motion } from 'framer-motion'
import { ArrowUpRight, Globe, Lock, Microscope } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const translations = {
  en: {
    title: 'PROJECTS',
    visitProject: 'Visit project',
    comingSoon: 'Coming Soon',
    projects: [
      {
        title: 'Decoupled Financial Architecture',
        eyebrow: 'Private — coming soon',
        description:
          'Modular platform designed for independent evolution of the financial engine and the client layer. Focused on clean domain boundaries, observability, and long-term maintainability.',
        status: 'In private development',
        badge: 'Private',
      },
      {
        title: 'The Mutational Landscape of SARS-CoV-2',
        eyebrow: 'Research',
        description:
          'Interactive portal for exploring mutations across the SARS-CoV-2 genome. Interdisciplinary project between software engineering and bioinformatics in collaboration with Universitat Rovira i Virgili.',
        status: 'Live research portal',
        badge: 'Live',
      },
      {
        title: 'Personal Portfolio',
        eyebrow: 'Web',
        description:
          'This very portfolio. Designed and built with React, Tailwind CSS and a cyberpunk/terminal aesthetic. Deployed on GitHub Pages.',
        status: 'Live on rubenitx.me',
        badge: 'Live',
      },
    ],
  },
  es: {
    title: 'PROYECTOS',
    visitProject: 'Visitar proyecto',
    comingSoon: 'Próximamente',
    projects: [
      {
        title: 'Arquitectura Financiera Desacoplada',
        eyebrow: 'Privado — próximamente',
        description:
          'Plataforma modular diseñada para la evolución independiente del motor financiero y la capa de cliente. Enfocada en límites de dominio limpios, observabilidad y mantenibilidad a largo plazo.',
        status: 'En desarrollo privado',
        badge: 'Privado',
      },
      {
        title: 'The Mutational Landscape of SARS-CoV-2',
        eyebrow: 'Investigación',
        description:
          'Portal interactivo para explorar mutaciones del genoma SARS-CoV-2. Proyecto interdisciplinar entre ingeniería de software y bioinformática en colaboración con la Universitat Rovira i Virgili.',
        status: 'Portal de investigación activo',
        badge: 'Activo',
      },
      {
        title: 'Portfolio Personal',
        eyebrow: 'Web',
        description:
          'Este mismo portfolio. Diseñado y construido con React, Tailwind CSS y una estética cyberpunk/terminal. Desplegado en GitHub Pages.',
        status: 'Activo en rubenitx.me',
        badge: 'Activo',
      },
    ],
  },
}

const projectMeta = [
  {
    icon: Lock,
    stack: ['Java', 'Spring Boot', 'React', 'Docker', 'PostgreSQL'],
    featured: true,
  },
  {
    icon: Microscope,
    stack: ['TypeScript', 'PHP', 'Python', 'D3.js', 'Data Viz'],
    link: 'http://sarscov2-mutation-portal.urv.cat',
    featured: true,
  },
  {
    icon: Globe,
    stack: ['React', 'Tailwind CSS', 'Vite', 'Framer Motion'],
    link: 'https://rubenitx.me',
    featured: false,
  },
]

const sectionVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

const badgeClasses = {
  Live: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
  Activo: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
  Private: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  Privado: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  'Coming Soon': 'border-purple-400/30 bg-purple-500/10 text-purple-200',
}

function ProjectCard({ project, visitProject, comingSoon }) {
  const Icon = project.icon
  const isFeatured = project.featured

  const content = (
    <div
      className={[
        'relative h-full overflow-hidden rounded-xl border border-green-500/20 bg-black/40 p-5 backdrop-blur-sm transition-all duration-300 sm:p-6',
        isFeatured ? 'border-green-500/40 shadow-[0_0_30px_rgba(0,255,136,0.12)]' : 'hover:border-green-500/35',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,136,0.14),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(0,255,255,0.08),transparent_40%)] opacity-70" />
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-green-400/60 to-transparent" />

      <div className="relative flex h-full flex-col">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3 text-green-300">
              <span className="rounded-full border border-green-500/20 bg-green-500/10 p-2">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[0.62rem] uppercase tracking-[0.24em] text-green-300/80 sm:text-[0.68rem] sm:tracking-[0.35em]">{project.eyebrow}</span>
            </div>
            <h3 className="text-lg font-bold text-white sm:text-xl md:text-2xl">{project.title}</h3>
          </div>

          <span className={`self-start rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] sm:shrink-0 sm:tracking-[0.24em] ${badgeClasses[project.badge]}`}>
            {project.badge}
          </span>
        </div>

        <p className="text-sm leading-6 text-slate-300/90 sm:leading-7">{project.description}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {project.stack.map((item, index) => (
            <span key={`stack-item-${index}`} className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-400">
              {item}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-start gap-4 border-t border-green-500/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-[0.18em] text-green-300/65 sm:tracking-[0.28em]">{project.status}</p>

          {project.link ? (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-cyan-500/15 sm:w-auto"
            >
              {visitProject}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : (
            <span className="inline-flex w-full items-center justify-center rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200 sm:w-auto">
              {comingSoon}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (!isFeatured) {
    return (
      <motion.article variants={cardVariants} whileHover={{ y: -6 }}>
        {content}
      </motion.article>
    )
  }

  return (
    <motion.article variants={cardVariants} whileHover={{ y: -8 }} className="group">
      <motion.div
        className="rounded-[1rem] bg-gradient-to-br from-green-400/55 via-cyan-400/20 to-purple-400/45 p-[1px]"
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        style={{ backgroundSize: '200% 200%' }}
      >
        {content}
      </motion.div>
    </motion.article>
  )
}

export default function Projects() {
  const { language } = useLanguage()
  const t = translations[language]
  const projects = t.projects.map((project, index) => ({ ...project, ...projectMeta[index] }))
  const featuredProjects = projects.filter((project) => project.featured)
  const standardProjects = projects.filter((project) => !project.featured)

  return (
    <section id="projects" className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,136,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(191,95,255,0.06),transparent_28%)]" />

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

        <motion.div
          className="grid gap-6 lg:grid-cols-2"
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          {featuredProjects.map((project, index) => (
            <ProjectCard key={`feat-${index}`} project={project} visitProject={t.visitProject} comingSoon={t.comingSoon} />
          ))}
        </motion.div>

        <motion.div
          className="mt-6 grid gap-6"
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          {standardProjects.map((project, index) => (
            <ProjectCard key={`std-${index}`} project={project} visitProject={t.visitProject} comingSoon={t.comingSoon} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
