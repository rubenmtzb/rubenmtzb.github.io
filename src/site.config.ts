/**
 * Constants shared by the Astro config and by the site itself.
 *
 * These are the facts that had to agree across files that never imported each
 * other, so they were written two and three times over: the domain lived both
 * in `astro.config.mjs` and in the absolute-URL builder, and the locale list
 * lived in `astro.config.mjs`, in the content schema and in i18n. Nothing tied
 * the copies together — changing one was enough to leave the rest lying.
 *
 * This module imports nothing on purpose: the Astro config loads it before
 * `astro:content` exists, so it cannot depend on it.
 */

/** Canonical domain. Astro's `site` and every absolute URL come from here. */
export const SITE = 'https://rubenitx.me'

/** The site's locales. The first one lives at the root, with no prefix. */
export const LANGS = ['en', 'es'] as const
export type Lang = (typeof LANGS)[number]
export const DEFAULT_LANG: Lang = LANGS[0]

/**
 * BCP 47 tag for each locale, which is what Open Graph and friends ask for.
 * It is not translatable copy but the language code itself, so it lives with
 * the rest of the vocabulary and not in the UI dictionary.
 */
export const LOCALE_TAGS: Record<Lang, string> = { en: 'en_US', es: 'es_ES' }

/**
 * Functional grouping of the stack. The order here is the order the groups are
 * painted in, both on V1 and on the CV.
 */
export const STACK_GROUPS = ['backend', 'frontend', 'devops', 'data', 'practices'] as const
export type StackGroup = (typeof STACK_GROUPS)[number]

/** How much evidence backs each technology in the stack. */
export const STACK_TIERS = ['actual', 'historica', 'formacion', 'secundaria'] as const
export type StackTier = (typeof STACK_TIERS)[number]
