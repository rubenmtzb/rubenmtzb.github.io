import { defineCollection, z } from 'astro:content'
import { file } from 'astro/loaders'
import { LANGS, STACK_GROUPS, STACK_TIERS } from './site.config'

/**
 * Single source of truth.
 *
 * V1, /cv/, JSON-LD, metadata and localised copy all come from here. No
 * equivalent piece of information may live duplicated inside a component.
 *
 * Id convention: `<lang>:<key>`. `key` is stable across languages and is what
 * pairs the two versions up; the build fails if a key exists in one language
 * and not in the other (see scripts/verify-dist.mjs and checkPairs).
 */

const lang = z.enum(LANGS)

/** Short ISO: YYYY-MM. It allows durations to be computed at build time unambiguously. */
const yearMonth = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM')

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
    /** The real job title. Feeds Person.jobTitle. */
    jobTitle: z.string().min(1),
    /** Brand positioning. It never replaces jobTitle. */
    positioning: z.string().min(1),
    locality: z.string().min(1),
    region: z.string().min(1),
    country: z.string().length(2),
    email: z.string().email(),
    /** Two levels from a single source. */
    /** The V2's positioning line, written from scratch. */
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
    /** /cv/ only. */
    cvOnly: z.object({
      summary: z.string().min(1),
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
    /** null = current role; the duration is computed at build time. */
    end: yearMonth.nullable(),
    /** Short summary: what Work displays on the V1. */
    summary: z.string().min(1),
    /** Granular detail: consumed by /cv/, not by the V1. */
    bullets: z.array(z.string().min(1)).min(1),
    /** A role appears in the focused developer CV only when curated here. */
    cv: z.object({
      bullets: z.array(z.string().min(1)).min(1).max(3),
      project: z.string().optional(),
    }).optional(),
    tech: z.array(z.string()).default([]),
    practices: z.array(z.string()).default([]),
    domains: z.array(z.string()).default([]),
  }),
})

const projectDemo = z.object({
  src: z.string().regex(/^\/media\/[\w-]+\.mp4$/),
  poster: z.string().regex(/^\/media\/[\w-]+\.jpg$/),
  caption: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  tracks: z.array(z.object({
    lang,
    label: z.string().min(1),
    src: z.string().regex(/^\/media\/[\w.-]+\.vtt$/),
  })).min(1),
})

const projects = defineCollection({
  loader: file('src/content/projects.json'),
  schema: ({ image }) =>
    z.object({
      key: z.string().min(1),
      lang,
      order: z.number().int(),
      title: z.string().min(1),
      eyebrow: z.string().min(1),
      description: z.string().min(1),
      status: z.string().min(1),
      badge: z.enum(['live', 'private', 'coming-soon']),
      featured: z.boolean().default(false),
      /** Shows up on /cv/ as a project of its own, never as experience. */
      inCv: z.boolean().default(false),
      cvSummary: z.string().min(1).optional(),
      tech: z.array(z.string()).default([]),
      domains: z.array(z.string()).default([]),
      link: z.string().url().optional(),
      /** One repo, or frontend + API when the product is split. */
      github: z
        .union([
          z.string().url(),
          z.array(z.object({ label: z.string().min(1), href: z.string().url() })).min(1),
        ])
        .optional(),
      /** The project's real cover. Optimised via astro:assets, not a loose string. */
      image: image().optional(),
      imageAlt: z.string().optional(),
      publication: link.optional(),
      caseStudy: z.object({
        problem: z.string().min(1),
        decisions: z.array(z.object({ title: z.string().min(1), body: z.string().min(1) })).min(1),
        limits: z.array(z.string().min(1)).min(1),
        outcome: z.string().min(1),
        verification: z.array(z.string().min(1)).min(1),
        demo: projectDemo.optional(),
      }).optional(),
      /** Depth that used to live in the Research section. */
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
          demo: projectDemo.optional(),
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
     * Visible label for the period. It exists because the original sources gave
     * only years for the vocational degrees: what is known gets shown, and
     * `start`/`end` are left to sort by, without inventing months.
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
    /** What it certifies, in one sentence. Used to be written inside About.astro. */
    summary: z.string().min(1),
    date: yearMonth,
    credentialId: z.string().optional(),
    grade: z.string().optional(),
    verifyUrl: z.string().url(),
    projectUrl: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
  }),
})

/**
 * An asset with short localised labels: one file per item, not parallel files
 * per language. `tier` reflects the evidence-based classification agreed during
 * the reconciliation.
 */
const stack = defineCollection({
  loader: file('src/content/stack.json'),
  schema: z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    group: z.enum(STACK_GROUPS),
    tier: z.enum(STACK_TIERS),
    icon: z.string().optional(),
    label: z.object({ en: z.string().min(1), es: z.string().min(1) }),
    order: z.number().int(),
  }),
})

/**
 * The V2's personal archive. An asset with short localised labels: one file per
 * photograph, not parallel files per language — the image is the same and only
 * alt and caption change.
 *
 * `alt` is mandatory. `location` is localised and kept at city level: the
 * coordinate never comes in, neither in the text nor in the file.
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
      location: z.object({ en: z.string().min(1), es: z.string().min(1) }).optional(),
      date: z.string().optional(),
      featured: z.boolean().default(false),
    }),
})

/**
 * Archive of hand-built keyboards.
 *
 * The build explorer used to be markup: the photo, the assembly order, the
 * model's colours and the spec sheet were written inside the component. Here
 * each build is data, so adding the second keyboard is one more entry in this
 * file and not surgery on the HTML.
 *
 * `z` and `exploded` are the layer's height in the 3D model, assembled and
 * pulled apart, in the model's own pixels. The list's order is the real
 * assembly order, top to bottom.
 */
const keyboards = defineCollection({
  loader: file('src/content/keyboards.json'),
  schema: ({ image }) =>
    z.object({
      key: z.string().min(1),
      order: z.number().int(),
      name: z.string().min(1),
      status: z.enum(['complete', 'scaffold', 'planning']).default('complete'),
      /** The physical build can still be in progress even once the model is documented. */
      buildInProgress: z.boolean().default(false),
      layout: z.enum(['ansi65', 'hhkb', 'evo75', 'corne']).default('ansi65'),
      /** The build it borrows its layers from while its own model is being prepared. */
      modelTemplate: z.string().min(1).optional(),
      /** One-line summary: size, mounting style and connection. */
      summary: z.object({ en: z.string().min(1), es: z.string().min(1) }),
      photos: z
        .array(
          z.object({
            image: image(),
            label: z.object({ en: z.string().min(1), es: z.string().min(1) }),
            alt: z.object({ en: z.string().min(10), es: z.string().min(10) }),
          }),
        )
        .min(1),
      parts: z
        .array(
          z.object({
            id: z.string().min(1),
            label: z.object({ en: z.string().min(1), es: z.string().min(1) }),
            spec: z.object({ en: z.string().min(1), es: z.string().min(1) }),
            /** The listing's colour swatch and the layer's tint in the model. */
            color: z.string().regex(/^#[0-9a-f]{6}$/i),
            /**
             * Where the part comes from: shop, manufacturer page or review.
             * Without it the row shows no link. The label is a proper name, so
             * it is not translated.
             */
            source: z.object({ label: z.string().min(1), href: z.string().url() }).optional(),
            z: z.number(),
            exploded: z.number(),
          }),
        )
        .default([]),
      /**
       * The build's sound sample.
       *
       * The three takes are cut the same way: the same three finger snaps at
       * the start, normalised to the same reference peak, and the typing from
       * there on. What changes between one sample and the next is the keyboard,
       * so the levels can be compared with each other.
       *
       * Without this block the build shows up on the bench as not yet recorded.
       */
      sound: z
        .object({
          /** The file's name under /keyboards/sound/, without extension. */
          clip: z.string().min(1),
          duration: z.number().positive(),
          /** The second the typing starts: before it there is only the reference. */
          typingFrom: z.number().nonnegative(),
          /** RMS of the typing in dBFS, measured after the snaps. */
          level: z.number().negative(),
          /** How it sounds, in one line. */
          character: z.object({ en: z.string().min(1), es: z.string().min(1) }),
          /**
           * The mascot's notes on why this build sounds the way it does.
           *
           * Only the keyboards built chasing silence carry them, since they are
           * the ones with something to say about it. Without this block nobody
           * peeks out of the card: the ornament depends on the content, not the
           * other way round. Both lists must hold the same number of notes.
           */
          quips: z
            .object({
              en: z.array(z.string().min(1)).min(2),
              es: z.array(z.string().min(1)).min(2),
            })
            .refine((q) => q.en.length === q.es.length, {
              message: 'quips: every note needs both of its languages',
            })
            .optional(),
          /**
           * Envelope already computed at build time: one 0–100 height per bar,
           * on a decibel scale and with the same floor for all three samples.
           * It is drawn as-is, so the browser decodes nothing.
           */
          peaks: z.array(z.number().int().min(0).max(100)).length(160),
        })
        .optional(),
      /** Spec sheet for the side panel. Label/value pairs, in order. */
      specs: z
        .array(
          z.object({
            label: z.object({ en: z.string().min(1), es: z.string().min(1) }),
            value: z.object({ en: z.string().min(1), es: z.string().min(1) }),
          }),
        )
        .default([]),
    }),
})

/** SEO metadata per page and language. One unique title and description. */
const pages = defineCollection({
  loader: file('src/content/pages.json'),
  schema: z.object({
    key: z.string().min(1),
    lang,
    /** Path with leading and trailing slash. It must match the generated URL. */
    path: z.string().regex(/^\/([a-z0-9/-]*\/)?$/),
    title: z.string().min(1).max(70),
    description: z.string().min(50).max(180),
    ogImage: z.string().min(1),
    ogImageAlt: z.string().min(1),
    ogImageWidth: z.number().int().positive().optional(),
    ogImageHeight: z.number().int().positive().optional(),
    indexable: z.boolean().default(true),
  }),
})

export const collections = { profile, experience, projects, education, certs, stack, personal, keyboards, pages }
