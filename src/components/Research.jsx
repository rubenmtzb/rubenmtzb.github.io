import { motion } from 'framer-motion'
import { ArrowUpRight, Building2, FlaskConical, Microscope } from 'lucide-react'

const highlights = [
  'Portal interactivo para explorar mutaciones a lo largo del genoma del SARS-CoV-2',
  'Desarrollado en colaboración con la Universitat Rovira i Virgili',
  'Contribución en la intersección de ingeniería de software y bioinformática',
  'Publicado como herramienta de referencia para investigadores',
]

export default function Research() {
  return (
    <section id="research" className="relative py-20 px-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,255,255,0.06),transparent_24%)]" />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-extrabold tracking-widest uppercase text-white text-glow-green mb-12 text-center">
            <span className="text-green-400">&gt; </span>
            RESEARCH
          </h2>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -6 }}
          className="relative overflow-hidden rounded-2xl border border-green-500/25 bg-gradient-to-br from-green-500/10 via-black/55 to-cyan-500/10 p-6 shadow-[0_0_40px_rgba(0,255,136,0.08)] backdrop-blur-sm md:p-8"
        >
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border border-cyan-400/15" />
          <div className="absolute -right-8 top-12 h-24 w-24 rounded-full border border-green-400/20" />
          <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-green-500/20 bg-black/40 px-4 py-2 text-green-300/85">
                <FlaskConical className="h-4 w-4" />
                <span className="text-[0.72rem] uppercase tracking-[0.34em]">Featured research portal</span>
              </div>

              <h3 className="max-w-2xl text-2xl font-bold text-white md:text-3xl">
                The Mutational Landscape of SARS-CoV-2
              </h3>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300/90 md:text-base">
                Una herramienta científica interactiva para navegar el genoma del SARS-CoV-2 desde una interfaz clara, visual y pensada para análisis exploratorio.
              </p>

              <div className="mt-6 space-y-3">
                {highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-400 shadow-[0_0_12px_rgba(0,255,136,0.9)]" />
                    <p className="text-sm leading-7 text-slate-300/90">{item}</p>
                  </div>
                ))}
              </div>

              <a
                href="http://sarscov2-mutation-portal.urv.cat"
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-full border border-green-400/35 bg-green-500/10 px-5 py-3 text-sm font-semibold text-green-200 transition hover:-translate-y-0.5 hover:border-green-300/55 hover:bg-green-500/15"
              >
                Explorar el Portal
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-cyan-400/20 bg-black/35 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-cyan-200">
                  <Building2 className="h-5 w-5" />
                  <span className="text-[0.72rem] uppercase tracking-[0.3em]">University partner</span>
                </div>
                <p className="mt-3 text-lg font-semibold text-white">Universitat Rovira i Virgili</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/80">
                  Colaboración interdisciplinar orientada a convertir datos genómicos en una experiencia de consulta útil para investigación.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-green-500/20 bg-black/35 p-5 backdrop-blur-sm">
                  <Microscope className="h-5 w-5 text-green-300" />
                  <p className="mt-3 text-[0.72rem] uppercase tracking-[0.28em] text-green-300/70">Focus</p>
                  <p className="mt-1 text-sm text-white">Genómica visual y análisis exploratorio</p>
                </div>
                <div className="rounded-2xl border border-purple-400/20 bg-black/35 p-5 backdrop-blur-sm">
                  <FlaskConical className="h-5 w-5 text-purple-200" />
                  <p className="mt-3 text-[0.72rem] uppercase tracking-[0.28em] text-purple-200/70">Intersection</p>
                  <p className="mt-1 text-sm text-white">Software engineering + bioinformática</p>
                </div>
              </div>
            </div>
          </div>
        </motion.article>
      </div>
    </section>
  )
}
