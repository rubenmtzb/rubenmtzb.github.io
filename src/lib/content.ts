import { getCollection, type CollectionEntry } from 'astro:content'
import { DEFAULT_LANG, t, type Lang } from '../i18n/ui'

export const SITE = 'https://rubenitx.me'

/* ------------------------------------------------------------------ */
/* Acceso a colecciones                                                */
/* ------------------------------------------------------------------ */

const byLang = <T extends { data: { lang: Lang } }>(entries: T[], lang: Lang) =>
  entries.filter((e) => e.data.lang === lang)

const byOrder = <T extends { data: { order: number } }>(entries: T[]) =>
  [...entries].sort((a, b) => a.data.order - b.data.order)

export async function getProfile(lang: Lang) {
  const all = await getCollection('profile')
  const entry = byLang(all, lang)[0]
  if (!entry) throw new Error(`profile: falta la entrada para "${lang}"`)
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

export type StackGroup = 'backend' | 'frontend' | 'devops' | 'data' | 'practices'
export const STACK_GROUPS: StackGroup[] = ['backend', 'frontend', 'devops', 'data', 'practices']

/** Devuelve el stack agrupado por función y ordenado dentro de cada grupo. */
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

export async function getPage(key: string, lang: Lang) {
  const all = await getCollection('pages')
  const entry = all.find((e) => e.data.key === key && e.data.lang === lang)
  if (!entry) throw new Error(`pages: falta "${key}" en "${lang}"`)
  return entry.data
}

/**
 * Clúster hreflang: todas las versiones lingüísticas de la misma página.
 * Todos los miembros emiten un conjunto idéntico que se incluye a sí mismo.
 */
export async function getCluster(key: string) {
  const all = await getCollection('pages')
  const members = all.filter((e) => e.data.key === key).map((e) => e.data)
  if (members.length === 0) throw new Error(`pages: clúster "${key}" vacío`)
  return {
    alternates: members.map((m) => ({ lang: m.lang, path: m.path })),
    xDefault: members.find((m) => m.lang === DEFAULT_LANG)?.path ?? members[0].path,
  }
}

export const abs = (path: string) => new URL(path, SITE).href

/* ------------------------------------------------------------------ */
/* Fechas — la antigüedad nunca se escribe a mano                      */
/* ------------------------------------------------------------------ */

const toDate = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

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
 * Duración en años y meses, calculada en build. Nunca hay una cifra
 * escrita a mano en el contenido: si el sitio se reconstruye, se actualiza.
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
/* JSON-LD — generado, nunca escrito a mano                            */
/* ------------------------------------------------------------------ */

export const PERSON_ID = `${SITE}/#person`
export const WEBSITE_ID = `${SITE}/#website`

type JsonLdArgs = {
  lang: Lang
  pageUrl: string
  pageType: 'WebPage' | 'ProfilePage'
  pageName: string
  pageDescription: string
}

/**
 * Una única entidad Person en todo el sitio, con @id estable.
 * Todas las páginas la referencian; ninguna la redefine.
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
    alumniOf: education.map((e) => ({
      '@type': 'EducationalOrganization',
      name: e.institution,
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

export type ExperienceData = CollectionEntry<'experience'>['data']
export type ProjectData = CollectionEntry<'projects'>['data']
