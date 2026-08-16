import { defineCollection, z } from 'astro:content'
import { file } from 'astro/loaders'

/**
 * Fuente única de verdad.
 *
 * V1, /cv/, JSON-LD, metadata y textos localizados salen todos de aquí.
 * Ninguna información equivalente puede vivir duplicada en componentes.
 *
 * Convención de id: `<lang>:<key>`. `key` es estable entre idiomas y es lo
 * que empareja las versiones lingüísticas; el build falla si una key existe
 * en un idioma y no en el otro (ver scripts/verify-dist.mjs y checkPairs).
 */

const LANGS = ['en', 'es'] as const
const lang = z.enum(LANGS)

/** ISO corta: YYYY-MM. Permite calcular duraciones en build sin ambigüedad. */
const yearMonth = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Debe ser YYYY-MM')

const link = z.object({
  label: z.string().min(1),
  href: z.string().url(),
})

const profile = defineCollection({
  loader: file('src/content/profile.json'),
  schema: z.object({
    key: z.literal('ruben'),
    lang,
    name: z.string().min(1),
    /** Título real del puesto. Va a Person.jobTitle. */
    jobTitle: z.string().min(1),
    /** Posicionamiento de marca. Nunca sustituye a jobTitle. */
    positioning: z.string().min(1),
    locality: z.string().min(1),
    region: z.string().min(1),
    country: z.string().length(2),
    email: z.string().email(),
    /** Dos niveles desde una única fuente. */
    /** Frase de posicionamiento de la V2, escrita desde cero. */
    headline: z.string().min(1),
    bioShort: z.string().min(1),
    bioLong: z.string().min(1),
    socials: z.array(link).min(1),
    focus: z.string().min(1),
    mindset: z.string().min(1),
    terminalCard: z.object({
      role: z.string(),
      company: z.string(),
      location: z.string(),
      passion: z.array(z.string()).min(1),
    }),
    contactHeadline: z.string().min(1),
    contactSubheadline: z.string().min(1),
    languages: z.array(z.object({ name: z.string(), level: z.string() })).min(1),
    /** Solo /cv/. */
    cvOnly: z.object({
      availability: z.string().min(1),
      referencesNote: z.string().min(1),
      summaryTitle: z.string().min(1),
      summaryKicker: z.string().min(1),
      summaryLead: z.string().min(1),
      summaryBody: z.string().min(1),
      metrics: z
        .array(z.object({ title: z.string(), description: z.string() }))
        .length(3),
      interests: z
        .array(z.object({ title: z.string(), description: z.string() }))
        .min(1),
    }),
  }),
})

const experience = defineCollection({
  loader: file('src/content/experience.json'),
  schema: z.object({
    key: z.string().min(1),
    lang,
    order: z.number().int(),
    role: z.string().min(1),
    company: z.string().min(1),
    location: z.string().optional(),
    mode: z.string().optional(),
    start: yearMonth,
    /** null = puesto actual; la duración se calcula en build. */
    end: yearMonth.nullable(),
    /** Resumen corto: es lo que muestra Work en la V1. */
    summary: z.string().min(1),
    /** Detalle granular: lo consume /cv/, no la V1. */
    bullets: z.array(z.string().min(1)).min(1),
    tech: z.array(z.string()).default([]),
    practices: z.array(z.string()).default([]),
    domains: z.array(z.string()).default([]),
  }),
})

const projects = defineCollection({
  loader: file('src/content/projects.json'),
  schema: z.object({
    key: z.string().min(1),
    lang,
    order: z.number().int(),
    title: z.string().min(1),
    eyebrow: z.string().min(1),
    description: z.string().min(1),
    status: z.string().min(1),
    badge: z.enum(['live', 'private']),
    featured: z.boolean().default(false),
    /** Aparece en /cv/ como proyecto propio, nunca como experiencia. */
    inCv: z.boolean().default(false),
    tech: z.array(z.string()).default([]),
    domains: z.array(z.string()).default([]),
    link: z.string().url().optional(),
    publication: link.optional(),
    /** Profundidad que antes vivía en la sección Research. */
    deep: z
      .object({
        highlights: z.array(z.string().min(1)).min(1),
        partnerLabel: z.string().min(1),
        partnerName: z.string().min(1),
        partnerDescription: z.string().min(1),
        focusLabel: z.string().min(1),
        focusText: z.string().min(1),
        intersectionLabel: z.string().min(1),
        intersectionText: z.string().min(1),
      })
      .nullish(),
  }),
})

const education = defineCollection({
  loader: file('src/content/education.json'),
  schema: z.object({
    key: z.string().min(1),
    lang,
    order: z.number().int(),
    institution: z.string().min(1),
    title: z.string().min(1),
    start: yearMonth,
    end: yearMonth.nullable(),
    /**
     * Etiqueta visible del periodo. Existe porque las fuentes originales
     * daban solo años para los ciclos formativos: se muestra lo que se sabe
     * y `start`/`end` quedan para ordenar, sin inventar meses.
     */
    periodLabel: z.string().min(1),
    inProgress: z.boolean().default(false),
    grade: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    /** Credencial verificable asociada. Resuelve el duplicado de INESEM. */
    credential: z
      .object({ verifyUrl: z.string().url(), id: z.string().optional() })
      .optional(),
  }),
})

const certs = defineCollection({
  loader: file('src/content/certs.json'),
  schema: z.object({
    key: z.string().min(1),
    lang,
    order: z.number().int(),
    title: z.string().min(1),
    issuer: z.string().min(1),
    date: yearMonth,
    credentialId: z.string().optional(),
    grade: z.string().optional(),
    verifyUrl: z.string().url(),
    projectUrl: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
  }),
})

/**
 * Activo con etiquetas cortas localizadas: un solo fichero por elemento,
 * no ficheros paralelos por idioma. `tier` refleja la clasificación por
 * evidencia acordada en la reconciliación.
 */
const stack = defineCollection({
  loader: file('src/content/stack.json'),
  schema: z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    group: z.enum(['backend', 'frontend', 'devops', 'data', 'practices']),
    tier: z.enum(['actual', 'historica', 'formacion', 'secundaria']),
    icon: z.string().optional(),
    label: z.object({ en: z.string().min(1), es: z.string().min(1) }),
    order: z.number().int(),
  }),
})

/**
 * Archivo personal de la V2. Activo con etiquetas cortas localizadas:
 * un fichero por fotografía, no ficheros paralelos por idioma — la imagen
 * es la misma y solo cambian alt y caption.
 *
 * `alt` es obligatorio. `location` se guarda a nivel de ciudad: la
 * coordenada nunca entra, ni en el texto ni en el fichero.
 */
const personal = defineCollection({
  loader: file('src/content/personal.json'),
  schema: ({ image }) =>
    z.object({
      key: z.string().min(1),
      order: z.number().int(),
      category: z.enum(['identity', 'life', 'travel', 'style', 'sport', 'moment']),
      image: image(),
      alt: z.object({ en: z.string().min(10), es: z.string().min(10) }),
      caption: z.object({ en: z.string(), es: z.string() }).optional(),
      location: z.string().optional(),
      date: z.string().optional(),
      featured: z.boolean().default(false),
    }),
})

/** Metadata SEO por página e idioma. Un título y una descripción únicos. */
const pages = defineCollection({
  loader: file('src/content/pages.json'),
  schema: z.object({
    key: z.string().min(1),
    lang,
    /** Ruta con barra inicial y final. Debe coincidir con la URL generada. */
    path: z.string().regex(/^\/([a-z0-9/-]*\/)?$/),
    title: z.string().min(1).max(70),
    description: z.string().min(50).max(180),
    ogImage: z.string().min(1),
    ogImageAlt: z.string().min(1),
    indexable: z.boolean().default(true),
  }),
})

export const collections = { profile, experience, projects, education, certs, stack, personal, pages }
