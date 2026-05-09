import { motion } from 'framer-motion'
import { BriefcaseBusiness, CalendarRange, MapPin } from 'lucide-react'

const experiences = [
  {
    role: 'Software Engineer',
    company: 'Egarsat',
    period: 'Septiembre 2022 - Actualidad · ~3 años y 9 meses',
    location: 'Sant Cugat del Vallès, Barcelona',
    mode: 'Presencial',
    description:
      'Desarrollo de nuevas funcionalidades full-stack utilizando Java y Spring Boot en el backend, con React y TypeScript en el frontend. Especializado en la creación de APIs REST para la comunicación entre servicios y en la implementación de procesos Batch. Desarrollo de portlets y customizaciones sobre la plataforma Liferay.',
    tags: ['Java', 'Spring Boot', 'React', 'TypeScript', 'Liferay', 'Docker', 'REST APIs', 'Batch'],
    current: true,
  },
  {
    role: 'Software Developer (Internship)',
    company: 'Universitat Rovira i Virgili',
    period: 'Octubre 2021 - Mayo 2022 · 8 meses',
    location: 'Tarragona',
    mode: 'Remoto',
    description:
      'Responsabilidad end-to-end del desarrollo del portal de investigación “The Mutational Landscape of SARS-CoV-2”, desde la concepción del diseño hasta el despliegue en producción. Trabajo interdisciplinar entre ingeniería de software y bioinformática.',
    tags: ['TypeScript', 'PHP', 'Python', 'Data Visualization', 'Bioinformatics'],
  },
  {
    role: 'Supervisor de Equipo',
    company: 'Taco Bell',
    period: 'Mayo 2021 - Septiembre 2022 · 1 año y 5 meses',
    location: 'Barcelona',
    description:
      'Liderazgo de un equipo dinámico, optimizando la asignación de tareas y los flujos de trabajo para maximizar la eficiencia operativa durante picos de alta demanda. Desarrollo de habilidades de gestión y comunicación en entornos de alto ritmo.',
    tags: ['Leadership', 'Team Management', 'Operations'],
  },
  {
    role: 'Técnico de Sistemas (Prácticas)',
    company: 'BEEP',
    period: 'Octubre 2019 - Junio 2020 · 9 meses',
    description: 'Soporte técnico y mantenimiento de sistemas e infraestructura informática.',
    tags: ['IT Support', 'Systems', 'Networking'],
  },
]

export default function Experience() {
  return (
    <section id="experience" className="section-container mx-auto max-w-6xl bg-[#030712] px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="space-y-12"
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-green-400 text-glow-green">
            &gt; EXPERIENCIA
          </p>
          <div className="h-px w-full max-w-2xl bg-gradient-to-r from-green-400/70 via-cyan-400/20 to-transparent" />
        </div>

        <div className="relative">
          <div className="absolute bottom-0 left-5 top-0 w-px bg-gradient-to-b from-transparent via-green-400/70 to-transparent md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-8 md:space-y-10">
            {experiences.map((item, index) => {
              const isLeft = index % 2 === 0

              return (
                <div key={`${item.company}-${item.role}`} className="relative md:grid md:grid-cols-2 md:gap-12">
                  <div className={`${isLeft ? 'md:col-start-1' : 'md:col-start-2'} ml-12 md:ml-0`}>
                    <motion.article
                      initial={{ opacity: 0, y: 30, x: isLeft ? -40 : 40 }}
                      whileInView={{ opacity: 1, y: 0, x: 0 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{ duration: 0.65, ease: 'easeOut', delay: index * 0.08 }}
                      className="relative rounded-xl border border-green-500/20 bg-black/40 p-6 backdrop-blur-sm"
                    >
                      <div className="mb-5 flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-green-400">
                          <BriefcaseBusiness size={14} />
                          {item.company}
                        </span>
                        {item.current && (
                          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-300">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
                            </span>
                            actual
                          </span>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-2xl font-semibold text-white">{item.role}</h3>
                          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-green-400 text-glow-green">
                            {item.company}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-gray-300">
                          <span className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-black/40 px-3 py-1.5">
                            <CalendarRange size={14} className="text-green-400" />
                            {item.period}
                          </span>
                          {item.location && (
                            <span className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-black/40 px-3 py-1.5">
                              <MapPin size={14} className="text-green-400" />
                              {item.location}
                            </span>
                          )}
                          {item.mode && (
                            <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-cyan-300">
                              {item.mode}
                            </span>
                          )}
                        </div>

                        <p className="leading-7 text-gray-300">{item.description}</p>

                        <div className="flex flex-wrap gap-2 pt-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.article>
                  </div>

                  <div className="absolute left-5 top-8 flex h-6 w-6 -translate-x-1/2 items-center justify-center md:left-1/2">
                    {item.current ? (
                      <>
                        <span className="absolute h-6 w-6 animate-ping rounded-full bg-green-400/25" />
                        <span className="relative h-3.5 w-3.5 rounded-full border border-green-300 bg-green-400 shadow-[0_0_18px_#00ff88]" />
                      </>
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full border border-green-400/70 bg-[#030712] shadow-[0_0_12px_#00ff8860]" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
