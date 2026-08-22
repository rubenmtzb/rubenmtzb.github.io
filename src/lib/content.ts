import { getCollection } from 'astro:content'
import { SITE, STACK_GROUPS, type StackGroup } from '../site.config'
import { DEFAULT_LANG, t, type Lang } from '../i18n/ui'

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

/**
 * Builds de teclado, en orden de montaje. El contenido es bilingüe dentro
 * de cada build (una sola imagen, dos textos), así que aquí solo se ordena:
 * la resolución del idioma la hace el componente con `pick`.
 */
export async function getKeyboards() {
  const builds = byOrder(await getCollection('keyboards')).map((entry) => entry.data)
  const byKey = new Map(builds.map((build) => [build.key, build]))

  return builds.map((build) => {
    if (build.parts.length > 0) return build

    /*
     * Sin piezas y sin plantilla el modelo no se puede dibujar, y la vista
     * accede a `parts[0]` sin preguntar. Que falle aquí, con el nombre del
     * build delante, en lugar de con un "undefined" a mitad del renderizado.
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

/** Un build del archivo, ya resuelto: el tipo que reciben los componentes. */
export type KeyboardBuild = Awaited<ReturnType<typeof getKeyboards>>[number]
export type KeyboardPart = KeyboardBuild['parts'][number]

/**
 * Estado que muestra la ficha.
 *
 * El montaje físico puede seguir en curso aunque el modelo por capas ya esté
 * documentado, y es eso lo que hay que enseñar: un teclado a medio montar no
 * es un "build real" por mucho que su despiece esté completo.
 */
export const buildDisplayStatus = (build: KeyboardBuild) =>
  build.buildInProgress ? 'in-progress' : build.status

/**
 * Resuelve un par {en, es} al idioma pedido.
 *
 * El contenido bilingüe dentro de una misma entrada —una foto con dos pies,
 * una pieza con dos descripciones— se resuelve en la vista y no en la carga,
 * porque la imagen es la misma y solo cambia el texto.
 */
export const localizer = (lang: Lang) =>
  <T,>(pair: { en: T, es: T }): T => (lang === 'es' ? pair.es : pair.en)

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

/**
 * La otra versión lingüística de la misma página, que es lo que alimenta el
 * selector de idioma. Cuatro componentes lo resolvían por su cuenta con un
 * `find(...)!`; si el clúster quedara incompleto, el build se paraba con un
 * "undefined" en lugar de decir qué falta.
 */
export async function getAlternate(key: string, lang: Lang) {
  const { alternates } = await getCluster(key)
  const other = alternates.find((a) => a.lang !== lang)
  if (!other) throw new Error(`pages: el clúster "${key}" no tiene alternativa a "${lang}"`)
  return other
}

export const abs = (path: string) => new URL(path, SITE).href

/**
 * La misma ruta en el idioma pedido.
 *
 * La gramática de URLs pone el inglés en la raíz y el castellano bajo `/es/`,
 * así que la traducción de una ruta es mecánica. Estaba escrita a mano en
 * media docena de componentes —cada uno con su propio ternario— y basta con
 * que uno se olvide del prefijo para mandar a un lector castellano a la
 * versión inglesa sin que nada falle.
 */
export const localePath = (path: string, lang: Lang) => (lang === 'es' ? `/es${path}` : path)

/** Ruta del CV en el idioma dado. La enlazan la V1, la V2 y el propio CV. */
export const cvPath = (lang: Lang) => localePath('/cv/', lang)

/** Ruta de la portada en el idioma dado. */
export const homePath = (lang: Lang) => localePath('/', lang)

/**
 * PDF del CV. Los dos ficheros viven en `public/cv/` y no llevan prefijo de
 * idioma: es el nombre del fichero el que distingue la versión.
 */
export const cvPdfPath = (lang: Lang) =>
  `/cv/CV_RubenMartinez_${lang === 'es' ? 'ES' : 'EN'}.pdf`

/**
 * Proyectos con ficha propia. La V1 y la V2 enlazan a la misma página, así
 * que el mapa vive aquí: si mañana hay una segunda ficha, se añade una vez.
 */
const CASE_PATHS: Record<string, string> = { 'sars-cov-2': '/work/sars-cov-2/' }

/** Ruta de la ficha en el idioma dado, o null si el proyecto no tiene ficha. */
export function casePath(projectKey: string, lang: Lang): string | null {
  const path = CASE_PATHS[projectKey]
  return path ? localePath(path, lang) : null
}

/* ------------------------------------------------------------------ */
/* Fechas — la antigüedad nunca se escribe a mano                      */
/* ------------------------------------------------------------------ */

const toDate = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

/**
 * Numeración de dos dígitos: "01 / 04". La comparten los contadores de los
 * carruseles y los índices del archivo de teclados, que la escribían cada uno
 * por su cuenta.
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
/* Antigüedad derivada — reutilizable, no una excepción del CV         */
/* ------------------------------------------------------------------ */

type Period = { start: string; end: string | null }

/**
 * Meses cubiertos por un conjunto de periodos, fusionando solapamientos.
 * Genérico: sirve para la antigüedad en un puesto, para la trayectoria
 * completa o para cualquier subconjunto que se le pase.
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

/** Antigüedad en el puesto actual: el que no tiene fecha de fin. */
export function tenureMonths(entries: Period[]): number {
  return coveredMonths(entries.filter((e) => e.end === null))
}

/**
 * Frase de antigüedad en años, redondeando a la baja y marcando el "+".
 * Se recalcula en cada build: nunca hay una cifra escrita a mano.
 */
export function formatYears(months: number, lang: Lang): string {
  const years = Math.floor(months / 12)
  if (years < 1) {
    const m = Math.max(months, 1)
    return `${m} ${t(lang, m === 1 ? 'time.month' : 'time.months')}`
  }
  const noun = t(lang, years === 1 ? 'time.year' : 'time.years')

  /*
   * En el aniversario exacto, "más de N años" es falso: 48 meses son
   * exactamente 4 años, no más. El inglés no tiene el problema porque
   * "4+" significa "4 o más" y sigue siendo cierto.
   */
  if (lang !== 'es') return `${years}+ ${noun}`
  return months % 12 === 0 ? `${years} ${noun}` : `más de ${years} ${noun}`
}

/** Sustituye el token {years} en cualquier texto del modelo de contenido. */
export const withYears = (text: string, phrase: string) => text.replaceAll('{years}', phrase)

/* ------------------------------------------------------------------ */
/* JSON-LD — generado, nunca escrito a mano                            */
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
    /*
     * Una entidad por centro, no por titulación: Instituto la Guineueta
     * aparecía dos veces porque de allí salen DAW y SMX. Las dos
     * titulaciones siguen listadas por separado en Background y en el CV.
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
