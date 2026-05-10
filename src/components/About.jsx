import { motion } from 'framer-motion'
import { Sparkles, TerminalSquare } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const translations = {
  en: {
    sectionLabel: 'ABOUT ME',
    terminalFile: 'portfolio/about.ts',
    profileStatus: 'online',
    profileLabel: 'developer.profile',
    focusLabel: 'focus',
    focusText: 'Solid architectures and products with real impact.',
    mindsetLabel: 'mindset',
    mindsetText: 'Systems thinking, constant iteration, and obsession with detail.',
    techProfileLabel: 'Technical profile',
    bio: 'Full-Stack Developer with solid experience in the Java ecosystem. I focus on transforming complex problems into efficient, scalable, and robust solutions for large-scale projects. My goal is to deliver value through clean code and high performance.',
    statusLabel: 'status',
    highlights: [
      '🏢 Software Engineer @ Egarsat — Backend & Frontend',
      '🎓 Computer Software Engineering Degree — UOC (in progress)',
      '🔬 Co-author: "The Mutational Landscape of SARS-CoV-2" — Universitat Rovira i Virgili',
      '🌱 Exploring LLMs, Artificial Intelligence & Smart Contracts',
    ],
  },
  es: {
    sectionLabel: 'SOBRE MÍ',
    terminalFile: 'portfolio/about.ts',
    profileStatus: 'online',
    profileLabel: 'developer.profile',
    focusLabel: 'enfoque',
    focusText: 'Arquitecturas sólidas y producto con impacto real.',
    mindsetLabel: 'mentalidad',
    mindsetText: 'Pensamiento sistémico, iteración constante y obsesión por el detalle.',
    techProfileLabel: 'Perfil técnico',
    bio: 'Full-Stack Developer con sólida experiencia en el ecosistema Java. Me enfoco en transformar problemas complejos en soluciones eficientes, escalables y robustas para proyectos de gran envergadura. Mi objetivo es aportar valor mediante código limpio y alto rendimiento.',
    statusLabel: 'estado',
    highlights: [
      '🏢 Software Engineer @ Egarsat — Backend & Frontend',
      '🎓 Grado en Ingeniería Informática — UOC (en curso)',
      '🔬 Co-autor: "The Mutational Landscape of SARS-CoV-2" — Universitat Rovira i Virgili',
      '🌱 Explorando LLMs e Inteligencia Artificial & Smart Contracts',
    ],
  },
}

const cardMotion = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.6, ease: 'easeOut' },
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut' },
  },
}

export default function About() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <section id="about" className="section-container mx-auto max-w-6xl bg-[#030712] px-6 py-20">
      <motion.div {...cardMotion} className="space-y-12">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-green-400 text-glow-green">
            &gt; {t.sectionLabel}
          </p>
          <div className="h-px w-full max-w-2xl bg-gradient-to-r from-green-400/70 via-cyan-400/20 to-transparent" />
        </div>

        <div className="grid items-stretch gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            {...cardMotion}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 }}
            className="flex h-full flex-col justify-between rounded-xl border border-green-500/20 bg-black/40 p-6 backdrop-blur-sm"
          >
            <div>
              <div className="mb-5 flex items-center gap-2 border-b border-green-500/20 pb-4">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/90" />
                <div className="ml-3 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-green-400/70">
                  <TerminalSquare size={14} />
                  {t.terminalFile}
                </div>
              </div>

              <div className="rounded-xl border border-green-500/15 bg-[#02050b]/80 p-5 font-mono text-sm leading-7 sm:text-base">
                <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-green-400/50">
                  <span>{t.profileLabel}</span>
                  <span className="text-cyan-400/70">{t.profileStatus}</span>
                </div>

                <div className="space-y-1 text-gray-200">
                  <div>
                    <span className="text-purple-400">const</span>{' '}
                    <span className="text-cyan-400">ruben</span>{' '}
                    <span>{'= {'}</span>
                  </div>
                  <div>
                    <span className="text-green-400">  role</span>: <span>"Full-Stack Developer",</span>
                  </div>
                  <div>
                    <span className="text-green-400">  company</span>: <span>"Egarsat",</span>
                  </div>
                  <div>
                    <span className="text-green-400">  location</span>: <span>"Barcelona, Spain",</span>
                  </div>
                  <div>
                    <span className="text-green-400">  passion</span>: <span>["Clean Code", "System Design", "AI/ML"],</span>
                  </div>
                  <div>
                    <span className="text-green-400">  coffee</span>: <span>Infinity</span>
                  </div>
                  <div>{'};'}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-gray-300 sm:grid-cols-2">
              <div className="rounded-lg border border-green-500/15 bg-green-500/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-green-400/60">{t.focusLabel}</p>
                <p className="mt-2 text-green-400">{t.focusText}</p>
              </div>
              <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-400/60">{t.mindsetLabel}</p>
                <p className="mt-2 text-gray-300">{t.mindsetText}</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              {...cardMotion}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.12 }}
              className="rounded-xl border border-green-500/20 bg-black/40 p-6 backdrop-blur-sm"
            >
              <div className="mb-4 flex items-center gap-3 text-green-400">
                <Sparkles size={18} />
                <span className="text-sm uppercase tracking-[0.3em] text-green-400/70">{t.techProfileLabel}</span>
              </div>

              <p className="text-base leading-8 text-gray-300 sm:text-lg">{t.bio}</p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="grid gap-4"
            >
              {t.highlights.map((highlight) => (
                <motion.div
                  key={highlight}
                  variants={staggerItem}
                  className="rounded-xl border border-green-500/20 bg-black/40 p-6 backdrop-blur-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 text-lg text-green-400">›</span>
                    <p className="text-sm leading-7 text-gray-300 sm:text-base">
                      <span className="font-medium text-green-400">{t.statusLabel}:</span>{' '}
                      {highlight}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
