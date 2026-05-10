import { motion } from 'framer-motion'
import { useLanguage } from '../i18n/LanguageContext'

const translations = {
  en: {
    title: 'TECH_STACK',
    coreLabel: 'CORE — daily driver',
    toolboxLabel: 'ALSO IN THE TOOLBOX',
  },
  es: {
    title: 'TECH_STACK',
    coreLabel: 'CORE — uso diario',
    toolboxLabel: 'TAMBIÉN EN LA CAJA DE HERRAMIENTAS',
  },
}

const coreStack = [
  { name: 'Java', label: 'Backend core', icon: 'java' },
  { name: 'Spring Boot', label: 'APIs & microservices', icon: 'spring' },
  { name: 'React', label: 'Frontend framework', icon: 'react' },
  { name: 'TypeScript', label: 'Type-safe JS', icon: 'ts' },
  { name: 'JavaScript', label: 'Web essentials', icon: 'js' },
  { name: 'Docker', label: 'Containerization', icon: 'docker' },
  { name: 'MySQL', label: 'Relational DB', icon: 'mysql' },
  { name: 'Python', label: 'Scripting & AI', icon: 'python' },
]

const toolbox = [
  { name: 'Node.js', label: 'Runtime', icon: 'nodejs' },
  { name: 'Tailwind CSS', label: 'Styling', icon: 'tailwind' },
  { name: 'Kubernetes', label: 'Orchestration', icon: 'kubernetes' },
  { name: 'PostgreSQL', label: 'Advanced DB', icon: 'postgres' },
  { name: 'MongoDB', label: 'NoSQL', icon: 'mongodb' },
  { name: 'Git', label: 'Version control', icon: 'git' },
  { name: 'Linux', label: 'Server environment', icon: 'linux' },
  { name: 'Liferay', label: 'Portal platform' },
]

const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

function TierTitle({ children }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-500/25 to-green-500/10" />
      <span className="shrink-0 rounded-full border border-green-500/20 bg-black/40 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.35em] text-green-300/85">
        {children}
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-green-500/25 to-green-500/10" />
    </div>
  )
}

function TechCard({ tech }) {
  return (
    <motion.div variants={itemVariants} whileHover={{ y: -6, scale: 1.03 }} className="group h-full">
      <div className="relative h-full overflow-hidden bg-black/40 backdrop-blur-sm border border-green-500/10 rounded-xl p-4 hover:border-green-500/40 transition-all duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,136,0.14),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-green-400/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative flex h-full flex-col items-center justify-center text-center">
          {tech.icon ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-green-500/15 bg-green-500/5 shadow-[0_0_0_1px_rgba(0,255,136,0.04)] transition-all duration-300 group-hover:border-green-400/40 group-hover:shadow-[0_0_24px_rgba(0,255,136,0.18)]">
              <img
                src={`https://skillicons.dev/icons?i=${tech.icon}&theme=dark`}
                alt={tech.name}
                className="h-11 w-11"
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-400/25 bg-gradient-to-br from-purple-500/15 to-cyan-500/10 text-lg font-black uppercase tracking-[0.35em] text-purple-200 shadow-[0_0_22px_rgba(191,95,255,0.2)]">
              LI
            </div>
          )}

          <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.28em] text-white">
            {tech.name}
          </h3>

          <div className="mt-2 min-h-5">
            <p className="text-xs text-green-300/80 transition-all duration-300 opacity-100 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
              {tech.label}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StackGroup({ title, items }) {
  return (
    <div>
      <TierTitle>{title}</TierTitle>
      <motion.div
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
        variants={gridVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
      >
        {items.map((tech) => (
          <TechCard key={tech.name} tech={tech} />
        ))}
      </motion.div>
    </div>
  )
}

export default function TechStack() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <section id="stack" className="relative py-20 px-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,136,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(0,255,255,0.06),transparent_28%)]" />

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

        <div className="space-y-14">
          <StackGroup title={t.coreLabel} items={coreStack} />
          <StackGroup title={t.toolboxLabel} items={toolbox} />
        </div>
      </div>
    </section>
  )
}
