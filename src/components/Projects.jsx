import { motion } from 'framer-motion'
import { ArrowUpRight, Lock, Microscope, Globe } from 'lucide-react'

const projects = [
  {
    title: 'Arquitectura Financiera Desacoplada',
    icon: Lock,
    eyebrow: 'Privado — próximamente',
    description:
      'Plataforma modular diseñada para la evolución independiente del motor financiero y la capa de cliente. Enfocada en límites de dominio limpios, observabilidad y mantenibilidad a largo plazo.',
    stack: ['Java', 'Spring Boot', 'React', 'Docker', 'PostgreSQL'],
    status: 'En desarrollo privado',
    badge: 'Private',
    featured: true,
  },
  {
    title: 'The Mutational Landscape of SARS-CoV-2',
    icon: Microscope,
    eyebrow: 'Research',
    description:
      'Portal interactivo para explorar mutaciones del genoma SARS-CoV-2. Proyecto interdisciplinar entre ingeniería de software y bioinformática en colaboración con la Universitat Rovira i Virgili.',
    stack: ['TypeScript', 'PHP', 'Python', 'D3.js', 'Data Viz'],
    status: 'Live research portal',
    badge: 'Live',
    link: 'http://sarscov2-mutation-portal.urv.cat',
    featured: true,
  },
  {
    title: 'Portfolio Personal',
    icon: Globe,
    eyebrow: 'Web',
    description:
      'Este mismo portfolio. Diseñado y construido con React, Tailwind CSS y una estética cyberpunk/terminal. Desplegado en GitHub Pages.',
    stack: ['React', 'Tailwind CSS', 'Vite', 'Framer Motion'],
    status: 'Live on rubenitx.me',
    badge: 'Live',
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
  Private: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  'Coming Soon': 'border-purple-400/30 bg-purple-500/10 text-purple-200',
}

function ProjectCard({ project }) {
  const Icon = project.icon
  const isFeatured = project.featured

  const content = (
    <div
      className={[
        'relative h-full overflow-hidden bg-black/40 backdrop-blur-sm border border-green-500/20 rounded-xl p-6 transition-all duration-300',
        isFeatured ? 'border-green-500/40 shadow-[0_0_30px_rgba(0,255,136,0.12)]' : 'hover:border-green-500/35',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,136,0.14),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(0,255,255,0.08),transparent_40%)] opacity-70" />
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-green-400/60 to-transparent" />

      <div className="relative flex h-full flex-col">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3 text-green-300">
              <span className="rounded-full border border-green-500/20 bg-green-500/10 p-2">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[0.68rem] uppercase tracking-[0.35em] text-green-300/80">{project.eyebrow}</span>
            </div>
            <h3 className="text-xl font-bold text-white md:text-2xl">{project.title}</h3>
          </div>

          <span className={`shrink-0 rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.24em] ${badgeClasses[project.badge]}`}>
            {project.badge}
          </span>
        </div>

        <p className="text-sm leading-7 text-slate-300/90">{project.description}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {project.stack.map((item) => (
            <span key={item} className="bg-green-500/10 text-green-400 border border-green-500/30 rounded-full px-3 py-1 text-xs">
              {item}
            </span>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-green-500/15 pt-5">
          <p className="text-xs uppercase tracking-[0.28em] text-green-300/65">{project.status}</p>

          {project.link ? (
            <a
              href={project.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-cyan-500/15"
            >
              Visit project
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : (
            <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200">
              Coming Soon
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
  const featuredProjects = projects.filter((project) => project.featured)
  const standardProjects = projects.filter((project) => !project.featured)

  return (
    <section id="projects" className="relative py-20 px-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,136,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(191,95,255,0.06),transparent_28%)]" />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-extrabold tracking-widest uppercase text-white text-glow-green mb-12 text-center">
            <span className="text-green-400">&gt; </span>
            PROJECTS
          </h2>
        </motion.div>

        <motion.div
          className="grid gap-6 lg:grid-cols-2"
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.16 }}
        >
          {featuredProjects.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </motion.div>

        <motion.div
          className="mt-6 grid gap-6"
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.16 }}
        >
          {standardProjects.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
