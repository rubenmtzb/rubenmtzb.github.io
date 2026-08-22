import { getCollection } from 'astro:content'
import { SITE, STACK_GROUPS, type StackGroup } from '../site.config'
import { DEFAULT_LANG, t, type Lang } from '../i18n/ui'

/* ------------------------------------------------------------------ */
/* Collection access                                                  */
/* ------------------------------------------------------------------ */

const byLang = <T extends { data: { lang: Lang } }>(entries: T[], lang: Lang) =>
  entries.filter((e) => e.data.lang === lang)

const byOrder = <T extends { data: { order: number } }>(entries: T[]) =>
  [...entries].sort((a, b) => a.data.order - b.data.order)

export async function getProfile(lang: Lang) {
  const all = await getCollection('profile')
  const entry = byLang(all, lang)[0]
  if (!entry) throw new Error(`profile: no entry for "${lang}"`)
  return entry.data
}

export async function getExperience(lang: Lang) {
  return byOrder(byLang(await getCollection('experience'), lang)).map((e) => e.data)
}

export async function getProjects(lang: Lang) {
  return byOrder(byLang(await getCollection('projects'), lang)).map((e) => e.data)
}

export async function getEducation(lang: Lang) {
  return byOrder(byLang(await getCollection('education'), lang)).map((e) => e.data)
}

export async function getCerts(lang: Lang) {
  return byOrder(byLang(await getCollection('certs'), lang)).map((e) => e.data)
}

/** The stack grouped by function and sorted within each group. */
export async function getStackByGroup() {
  const all = (await getCollection('stack')).map((e) => e.data)
  const grouped = new Map<StackGroup, typeof all>()
  for (const g of STACK_GROUPS) {
    grouped.set(
      g,
      all.filter((s) => s.group === g).sort((a, b) => a.order - b.order),
    )
  }
  return grouped
}

/**
 * Keyboard builds, in assembly order. The content is bilingual inside each
 * build — one image, two texts — so all this does is sort them: resolving the
 * language is the view's job, through `localizer`.
 */
export async function getKeyboards() {
  const builds = byOrder(await getCollection('keyboards')).map((entry) => entry.data)
  const byKey = new Map(builds.map((build) => [build.key, build]))

  return builds.map((build) => {
    if (build.parts.length > 0) return build

    /*
     * With no parts and no template the model cannot be drawn, and the view
     * reaches for `parts[0]` without asking. Fail here, with the build's name
     * in the message, instead of on an "undefined" halfway through rendering.
     */
    if (!build.modelTemplate) {
      throw new Error(`Keyboard "${build.key}" has no parts and no model template to borrow them from`)
    }

    const template = byKey.get(build.modelTemplate)
    if (!template || template.parts.length === 0) {
      throw new Error(`Keyboard "${build.key}" references an invalid model template: "${build.modelTemplate}"`)
    }

    return { ...build, parts: template.parts }
  })
}

/** A build from the archive, already resolved: what the components receive. */
export type KeyboardBuild = Awaited<ReturnType<typeof getKeyboards>>[number]
export type KeyboardPart = KeyboardBuild['parts'][number]

/**
 * The status the card shows.
 *
 * The physical assembly can still be under way even when the layered model is
 * fully documented, and that is what has to be shown: a half-built keyboard is
 * not a "real build" however complete its exploded view may be.
 */
export const buildDisplayStatus = (build: KeyboardBuild) =>
  build.buildInProgress ? 'in-progress' : build.status

/**
 * Resolves an {en, es} pair to the requested language.
 *
 * Bilingual content inside a single entry — one photo with two captions, one
 * part with two descriptions — is resolved in the view and not at load time,
 * because the asset is the same and only the text changes.
 */
export const localizer = (lang: Lang) =>
  <T,>(pair: { en: T, es: T }): T => (lang === 'es' ? pair.es : pair.en)

export async function getPage(key: string, lang: Lang) {
  const all = await getCollection('pages')
  const entry = all.find((e) => e.data.key === key && e.data.lang === lang)
  if (!entry) throw new Error(`pages: "${key}" is missing in "${lang}"`)
  return entry.data
}

/**
 * hreflang cluster: every language version of the same page. All members emit
 * an identical set that includes themselves.
 */
export async function getCluster(key: string) {
  const all = await getCollection('pages')
  const members = all.filter((e) => e.data.key === key).map((e) => e.data)
  if (members.length === 0) throw new Error(`pages: cluster "${key}" is empty`)
  return {
    alternates: members.map((m) => ({ lang: m.lang, path: m.path })),
    xDefault: members.find((m) => m.lang === DEFAULT_LANG)?.path ?? members[0].path,
  }
}

/**
 * The other language version of the same page, which is what feeds the language
 * switcher. Four components used to work it out on their own with a `find(...)!`;
 * if the cluster were ever incomplete the build stopped on an "undefined"
 * instead of naming what was missing.
 */
export async function getAlternate(key: string, lang: Lang) {
  const { alternates } = await getCluster(key)
  const other = alternates.find((a) => a.lang !== lang)
  if (!other) throw new Error(`pages: cluster "${key}" has no alternative to "${lang}"`)
  return other
}

export const abs = (path: string) => new URL(path, SITE).href

/**
 * The same path in the requested language.
 *
 * The URL grammar leaves the default locale at the root and prefixes the rest
 * with their code, so translating a path is mechanical. It used to be written
 * by hand in half a dozen components — each with its own ternary against
 * `'es'` — and one forgotten prefix is enough to send a Spanish reader to the
 * English version without anything failing.
 */
export const localePath = (path: string, lang: Lang) =>
  (lang === DEFAULT_LANG ? path : `/${lang}${path}`)

/** The CV path in the given language. V1, V2 and the CV itself all link to it. */
export const cvPath = (lang: Lang) => localePath('/cv/', lang)

/** The home path in the given language. */
export const homePath = (lang: Lang) => localePath('/', lang)

/**
 * The CV as a PDF. Both files live in `public/cv/` and carry no locale prefix:
 * the filename is what tells the two versions apart.
 */
export const cvPdfPath = (lang: Lang) =>
  `/cv/CV_RubenMartinez_${lang === 'es' ? 'ES' : 'EN'}.pdf`

/**
 * Projects with a case study of their own. V1 and V2 link to the same page, so
 * the map lives here: a second case study is added once, not twice.
 */
const CASE_PATHS: Record<string, string> = { 'sars-cov-2': '/work/sars-cov-2/' }

/** The case study path in the given language, or null if the project has none. */
export function casePath(projectKey: string, lang: Lang): string | null {
  const path = CASE_PATHS[projectKey]
  return path ? localePath(path, lang) : null
}

/* ------------------------------------------------------------------ */
/* Dates — seniority is never written by hand                         */
/* ------------------------------------------------------------------ */

const toDate = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

/**
 * Two-digit numbering: "01 / 04". Shared by the carousel counters and by the
 * keyboard archive's indices, each of which used to write it out on its own.
 */
export const twoDigits = (value: number) => String(value).padStart(2, '0')

export function formatMonthYear(ym: string, lang: Lang) {
  const d = toDate(ym)
  const s = new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatPeriod(start: string, end: string | null, lang: Lang) {
  const from = formatMonthYear(start, lang)
  const to = end ? formatMonthYear(end, lang) : t(lang, 'work.present')
  return `${from} - ${to}`
}

/**
 * Duration in years and months, computed at build time. No figure is ever
 * hand-written in the content: rebuild the site and it updates itself.
 */
export function formatDuration(start: string, end: string | null, lang: Lang) {
  const from = toDate(start)
  const to = end ? toDate(end) : new Date()
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  if (months < 0) months = 0
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts: string[] = []
  if (y > 0) parts.push(`${y} ${t(lang, y === 1 ? 'time.year' : 'time.years')}`)
  if (m > 0) parts.push(`${m} ${t(lang, m === 1 ? 'time.month' : 'time.months')}`)
  return parts.join(` ${t(lang, 'time.and')} `)
}

/* ------------------------------------------------------------------ */
/* Derived seniority — reusable, not a special case for the CV        */
/* ------------------------------------------------------------------ */

type Period = { start: string; end: string | null }

/**
 * Months covered by a set of periods, merging any overlap. Generic on purpose:
 * it serves tenure in one role, the whole career, or any subset handed to it.
 */
function coveredMonths(periods: Period[]): number {
  if (periods.length === 0) return 0
  const idx = (d: Date) => d.getFullYear() * 12 + d.getMonth()
  const now = idx(new Date())

  const ranges = periods
    .map((p) => ({ from: idx(toDate(p.start)), to: p.end ? idx(toDate(p.end)) : now }))
    .filter((r) => r.to >= r.from)
    .sort((a, b) => a.from - b.from)

  let total = 0
  let cursor = -Infinity
  for (const r of ranges) {
    const from = Math.max(r.from, cursor)
    if (r.to > from) total += r.to - from
    cursor = Math.max(cursor, r.to)
  }
  return total
}

/** Tenure in the current role: the one with no end date. */
export function tenureMonths(entries: Period[]): number {
  return coveredMonths(entries.filter((e) => e.end === null))
}

/**
 * Seniority as a phrase in years, rounding down and marking the "+".
 * Recomputed on every build: no figure is ever hand-written.
 */
export function formatYears(months: number, lang: Lang): string {
  const years = Math.floor(months / 12)
  if (years < 1) {
    const m = Math.max(months, 1)
    return `${m} ${t(lang, m === 1 ? 'time.month' : 'time.months')}`
  }
  const noun = t(lang, years === 1 ? 'time.year' : 'time.years')

  /*
   * On the exact anniversary, "más de N años" is false: 48 months are exactly
   * 4 years, not more. English does not have the problem because "4+" means
   * "4 or more" and stays true.
   */
  if (lang !== 'es') return `${years}+ ${noun}`
  return months % 12 === 0 ? `${years} ${noun}` : `más de ${years} ${noun}`
}

/** Substitutes the {years} token in any text from the content model. */
export const withYears = (text: string, phrase: string) => text.replaceAll('{years}', phrase)

/* ------------------------------------------------------------------ */
/* JSON-LD — generated, never hand-written                            */
/* ------------------------------------------------------------------ */

const PERSON_ID = `${SITE}/#person`
const WEBSITE_ID = `${SITE}/#website`

type JsonLdArgs = {
  lang: Lang
  pageUrl: string
  pageType: 'WebPage' | 'ProfilePage'
  pageName: string
  pageDescription: string
}

/**
 * A single Person entity across the whole site, with a stable @id.
 * Every page references it; none redefines it.
 */
export async function buildJsonLd({ lang, pageUrl, pageType, pageName, pageDescription }: JsonLdArgs) {
  const profile = await getProfile(lang)
  const experience = await getExperience(lang)
  const education = await getEducation(lang)
  const stack = (await getCollection('stack')).map((e) => e.data)
  const projects = await getProjects(lang)

  const current = experience.find((e) => e.end === null)

  const person = {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: profile.name,
    url: SITE,
    image: abs('/avatar.png'),
    jobTitle: profile.jobTitle,
    description: profile.bioShort,
    email: `mailto:${profile.email}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.locality,
      addressRegion: profile.region,
      addressCountry: profile.country,
    },
    knowsLanguage: profile.languages.map((l) => l.name),
    knowsAbout: stack.filter((s) => s.tier === 'actual').map((s) => s.name),
    sameAs: profile.socials.map((s) => s.href),
    ...(current ? { worksFor: { '@type': 'Organization', name: current.company } } : {}),
    /*
     * One entity per institution, not per degree: Instituto la Guineueta showed
     * up twice because both DAW and SMX come from there. The two degrees are
     * still listed separately in Background and on the CV.
     */
    alumniOf: [...new Set(education.map((e) => e.institution))].map((name) => ({
      '@type': 'EducationalOrganization',
      name,
    })),
  }

  const website = {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE,
    name: profile.name,
    inLanguage: lang,
    publisher: { '@id': PERSON_ID },
  }

  const page = {
    '@type': pageType,
    '@id': `${pageUrl}#page`,
    url: pageUrl,
    name: pageName,
    description: pageDescription,
    inLanguage: lang,
    isPartOf: { '@id': WEBSITE_ID },
    ...(pageType === 'ProfilePage'
      ? { mainEntity: { '@id': PERSON_ID } }
      : { about: { '@id': PERSON_ID } }),
  }

  const works = projects
    .filter((p) => p.link)
    .map((p) => ({
      '@type': 'CreativeWork',
      name: p.title,
      description: p.description,
      url: p.link,
      author: { '@id': PERSON_ID },
      ...(p.publication ? { citation: p.publication.href } : {}),
    }))

  return { '@context': 'https://schema.org', '@graph': [person, website, page, ...works] }
}
