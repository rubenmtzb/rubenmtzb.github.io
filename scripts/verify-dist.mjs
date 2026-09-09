#!/usr/bin/env node
/**
 * Verifications over the HTML actually generated in dist/.
 *
 * These are not unit tests: they are assertions about the build. If any of them
 * fails, the deployment stops. Check 12 is the one that turns the guiding
 * principle — content in the built HTML, not at runtime — into something
 * verifiable rather than an intention.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { parseHTML } from 'linkedom'
import { cvFingerprint, sha256 } from './cv-artifacts.mjs'

const DIST = 'dist'
const SITE = 'https://rubenitx.me'

/**
 * URL contract after the Phase 5 swap.
 *
 * The V1 stays at /v1/ with noindex: Phase 4's coverage analysis did not find a
 * single entity exclusive to it against V2 + CV + case studies. That is why it
 * emits no hreflang and stays out of the sitemap, while remaining reachable by
 * humans.
 */
const EXPECTED = [
  { path: '/', file: 'index.html', lang: 'en', cluster: 'home', indexable: true, kind: 'v2' },
  { path: '/es/', file: 'es/index.html', lang: 'es', cluster: 'home', indexable: true, kind: 'v2' },
  { path: '/cv/', file: 'cv/index.html', lang: 'en', cluster: 'cv', indexable: true, kind: 'cv' },
  { path: '/es/cv/', file: 'es/cv/index.html', lang: 'es', cluster: 'cv', indexable: true, kind: 'cv' },
  { path: '/work/sars-cov-2/', file: 'work/sars-cov-2/index.html', lang: 'en', cluster: 'case', indexable: true, kind: 'case' },
  { path: '/es/work/sars-cov-2/', file: 'es/work/sars-cov-2/index.html', lang: 'es', cluster: 'case', indexable: true, kind: 'case' },
  { path: '/work/youtube-transcriber/', file: 'work/youtube-transcriber/index.html', lang: 'en', cluster: 'transcriber', indexable: true, kind: 'case' },
  { path: '/es/work/youtube-transcriber/', file: 'es/work/youtube-transcriber/index.html', lang: 'es', cluster: 'transcriber', indexable: true, kind: 'case' },
  { path: '/work/finance-core/', file: 'work/finance-core/index.html', lang: 'en', cluster: 'finance', indexable: true, kind: 'case' },
  { path: '/es/work/finance-core/', file: 'es/work/finance-core/index.html', lang: 'es', cluster: 'finance', indexable: true, kind: 'case' },
  { path: '/v1/', file: 'v1/index.html', lang: 'en', cluster: null, indexable: false, kind: 'v1' },
  { path: '/v1/es/', file: 'v1/es/index.html', lang: 'es', cluster: null, indexable: false, kind: 'v1' },
  { path: '/builds/models/', file: 'builds/models/index.html', lang: 'en', cluster: null, indexable: false, kind: 'fragment' },
  { path: '/es/builds/models/', file: 'es/builds/models/index.html', lang: 'es', cluster: null, indexable: false, kind: 'fragment' },
]

const CLUSTERS = {
  home: { en: '/', es: '/es/', xDefault: '/' },
  cv: { en: '/cv/', es: '/es/cv/', xDefault: '/cv/' },
  case: { en: '/work/sars-cov-2/', es: '/es/work/sars-cov-2/', xDefault: '/work/sars-cov-2/' },
  transcriber: { en: '/work/youtube-transcriber/', es: '/es/work/youtube-transcriber/', xDefault: '/work/youtube-transcriber/' },
  finance: { en: '/work/finance-core/', es: '/es/work/finance-core/', xDefault: '/work/finance-core/' },
}

const LEGACY_ANCHORS = ['stack', 'experience', 'projects', 'research', 'education', 'certifications', 'resume']
const NAV_IDS = ['home', 'about', 'work', 'background', 'contact']
const V2_IDS = ['identity', 'work', 'archive', 'contact']

/**
 * Editorial terms that must never cross languages. Generic words such as the
 * names of technologies, courses or publications are left out: Java, DevOps,
 * Claude Code in Action and The Mutational Landscape are proper names and have
 * to be preserved.
 */
const FORBIDDEN_BY_LANG = {
  es: [
    /Outside the Code/i,
    /About Me/i,
    /\bHobbies\b/i,
    /\bShowcase\b/i,
    /Profile & Mindset/i,
    /Academic Foundations/i,
    /Verified Credentials/i,
    /Credential ID/i,
    /Under construction/i,
    /Coming Soon/i,
    /Laboratory \/\/ Build Archive/i,
    /\bBuild(?:s)?\b/i,
    /\bArchive\b/i,
    /\bStack\b/i,
    /System Design/i,
    /Clean Architecture/i,
    /Smart Contracts/i,
    /Batch Processing/i,
    /Data Visualization/i,
    /Prompt Engineering/i,
    /\bownership\b/i,
    /\brecruiters\b/i,
    /customization/i,
    /containerized/i,
    /end-to-end/i,
    /Full-Stack/i,
    /\bKeycaps?\b/i,
    /\bSwitch(?:es)?\b/i,
    /\bFoam\b/i,
    /\bCase\b/i,
    /\bNetworking\b/i,
    /\bIT Support\b/i,
  ],
  en: [
    /Más allá del código/i,
    /Sobre mí/i,
    /\bAficiones\b/i,
    /Selección destacada/i,
    /Perfil y mentalidad/i,
    /Fundamentos académicos/i,
    /Credenciales verificadas/i,
    /ID de credencial/i,
    /En construcción/i,
    /Próximamente/i,
    /Laboratorio \/\/ Archivo/i,
    /\bMontaje(?:s)?\b/i,
    /\bArchivo\b/i,
    /\bTecnologías\b/i,
    /Diseño de sistemas/i,
    /Arquitectura limpia/i,
    /Contratos inteligentes/i,
    /Procesamiento por lotes/i,
    /Visualización de datos/i,
    /Ingeniería de prompts/i,
    /\bEspacio \/ W\b/i,
    /\bCorreo\b/i,
    /\bUbicación\b/i,
    /\bDiapositiva\b/i,
    /\bEjecutar\b/i,
    /Red profesional/i,
    /\bRepositorios\b/i,
    /\bActualidad\b/i,
    /En curso/i,
    /\bEspaña\b/i,
    /\bLondres\b/i,
    /Reino Unido/i,
    /\bRoma\b/i,
    /\bItalia\b/i,
  ],
}

let failures = 0
let checks = 0
const fail = (msg) => { failures++; console.error(`  ✗ ${msg}`) }
const ok = (msg) => { checks++; console.log(`  ✓ ${msg}`) }
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg))

const abs = (p) => new URL(p, SITE).href
const read = (f) => readFileSync(join(DIST, f), 'utf8')

/* ---------- 1. The set of generated URLs ---------- */
console.log('\n1 · URLs generadas')
const htmlFiles = []
;(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p)
    else if (e.endsWith('.html') && e !== '404.html') htmlFiles.push(p.slice(DIST.length + 1))
  }
})(DIST)
const expectedFiles = EXPECTED.map((e) => e.file).sort()
assert(
  JSON.stringify(htmlFiles.sort()) === JSON.stringify(expectedFiles),
  `exact set: ${expectedFiles.join(', ')}${htmlFiles.length !== expectedFiles.length ? ` — found: ${htmlFiles.join(', ')}` : ''}`,
)

/* ---------- 2-11. Per page ---------- */
for (const page of EXPECTED) {
  console.log(`\n· ${page.path}`)
  const html = read(page.file)
  if (page.kind === 'fragment') {
    assert(html.includes('noindex'), 'the fragment is not a page of the site')
    assert((html.match(/data-bx-build=/g) ?? []).length >= 4, 'one workbench per build')
    assert(html.includes('bx-model-key'), 'ships the layered keys')
    assert(html.includes('data-bx-geometry'), 'ships the key geometry with the models')
    continue
  }
  const { document } = parseHTML(html)

  // 2. Exactamente un H1
  const h1s = document.querySelectorAll('h1')
  assert(h1s.length === 1, `exactly one <h1> (found: ${h1s.length})`)

  // Hierarchy with no skipped levels
  const levels = [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1]))
  let jump = null
  for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) jump = `h${levels[i - 1]}→h${levels[i]}`
  assert(!jump, `heading hierarchy with no skipped levels${jump ? ` (${jump})` : ''}`)

  // 3. lang correcto
  const lang = document.documentElement.getAttribute('lang')
  assert(lang === page.lang, `<html lang="${page.lang}"> (found: "${lang}")`)

  // 4. Canonical absoluto y self-referencing
  const canon = document.querySelector('link[rel=canonical]')?.getAttribute('href')
  assert(canon === abs(page.path), `canonical is self and absolute (${canon})`)

  // robots consistent with the declared indexability
  const robots = document.querySelector('meta[name=robots]')?.getAttribute('content') ?? ''
  assert(
    page.indexable ? robots.includes('index') && !robots.includes('noindex') : robots.includes('noindex'),
    `robots="${robots}"`,
  )

  // 5. hreflang: an identical set within the cluster, self-inclusive, plus
  // x-default. Non-indexable pages must NOT emit it.
  const alts = [...document.querySelectorAll('link[rel=alternate][hreflang]')].map((l) => [
    l.getAttribute('hreflang'),
    l.getAttribute('href'),
  ])
  const map = Object.fromEntries(alts)
  if (page.cluster) {
    const cluster = CLUSTERS[page.cluster]
    assert(map.en === abs(cluster.en), `hreflang="en" → ${cluster.en}`)
    assert(map.es === abs(cluster.es), `hreflang="es" → ${cluster.es}`)
    assert(map['x-default'] === abs(cluster.xDefault), `x-default → ${cluster.xDefault}`)
    assert(map[page.lang] === abs(page.path), 'the cluster includes itself')
  } else {
    assert(alts.length === 0, `no hreflang, being non-indexable (${alts.length})`)
  }

  // A unique title and description, both present
  const title = document.querySelector('title')?.textContent?.trim()
  const desc = document.querySelector('meta[name=description]')?.getAttribute('content')
  assert(Boolean(title), 'title present')
  assert(Boolean(desc) && desc.length >= 50 && desc.length <= 180, `meta description (${desc?.length} chars)`)

  // Open Graph y Twitter
  for (const sel of ['meta[property="og:title"]', 'meta[property="og:image"]', 'meta[name="twitter:card"]']) {
    assert(Boolean(document.querySelector(sel)), `${sel} present`)
  }
  if (page.kind === 'case' || page.kind === 'v2') {
    const image = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
    const imagePath = image ? join(DIST, new URL(image).pathname) : ''
    assert(Boolean(imagePath) && existsSync(imagePath), 'the original social card exists in the build')
    if (imagePath && existsSync(imagePath)) {
      const png = readFileSync(imagePath)
      assert(
        png.subarray(1, 4).toString() === 'PNG' && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630,
        'the social card is a real 1200 × 630 PNG',
      )
    }
    assert(
      document.querySelector('meta[property="og:image:width"]')?.getAttribute('content') === '1200'
        && document.querySelector('meta[property="og:image:height"]')?.getAttribute('content') === '630',
      'Open Graph declares the actual image dimensions',
    )
    assert(
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') === title
        && document.querySelector('meta[property="og:description"]')?.getAttribute('content') === desc
        && document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') === image,
      'social metadata shares the page-specific title, description and card',
    )
  }

  // 7. JSON-LD: it parses and there is a single Person entity with a stable @id
  const ld = document.querySelector('script[type="application/ld+json"]')?.textContent
  let graph = []
  try {
    graph = JSON.parse(ld)['@graph'] ?? []
    ok('JSON-LD parsea')
  } catch {
    fail('JSON-LD no parsea')
  }
  const persons = graph.filter((n) => n['@type'] === 'Person')
  assert(persons.length === 1, `exactly one Person entity (found: ${persons.length})`)
  assert(persons[0]?.['@id'] === `${SITE}/#person`, 'Person with a stable @id')
  assert(
    !graph.some((n) => n['@type'] === 'Person' && n['@id'] !== `${SITE}/#person`),
    'no alternative Person',
  )

  // alumniOf: one entity per institution, not per degree
  const alumni = (persons[0]?.alumniOf ?? []).map((a) => a.name)
  assert(
    new Set(alumni).size === alumni.length,
    `alumniOf with no repeated institutions (${alumni.length} entries)`,
  )

  // 8. No content node with an inline opacity:0
  const hidden = [...document.querySelectorAll('[style]')].filter((el) =>
    /opacity\s*:\s*0(?![.\d])/.test(el.getAttribute('style') ?? ''),
  )
  assert(hidden.length === 0, `no content with an inline opacity:0 (${hidden.length})`)

  // 9. Internal links resolve to a file that exists
  const broken = []
  // ...and those pointing at an anchor on THIS same page have a destination.
  // An "#education" inherited from the home page led nowhere on the case
  // studies, and nobody noticed.
  const danglingAnchors = []
  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href')

    if (href.startsWith('#')) {
      const id = href.slice(1)
      if (id && !document.getElementById(id)) danglingAnchors.push(href)
      continue
    }
    if (!href.startsWith('/') || href.startsWith('//')) continue

    const clean = href.split('#')[0].split('?')[0]
    if (!clean) continue
    const target = clean.endsWith('/') ? join(DIST, clean, 'index.html') : join(DIST, clean)
    if (!existsSync(target)) broken.push(href)
  }
  assert(broken.length === 0, `internal links resolve${broken.length ? ` — broken: ${broken.join(', ')}` : ''}`)
  assert(
    danglingAnchors.length === 0,
    `same-page anchors all have a destination${danglingAnchors.length ? ` — orphaned: ${[...new Set(danglingAnchors)].join(', ')}` : ''}`,
  )

  // 10. Images with alt, width and height
  const badImgs = [...document.querySelectorAll('img')].filter(
    (i) => i.getAttribute('alt') === null || !i.getAttribute('width') || !i.getAttribute('height'),
  )
  assert(badImgs.length === 0, `every <img> has alt, width and height (${badImgs.length} without)`)

  // 11. Inherited anchors and navigation (home page only)
  if (page.kind === 'v1' || page.kind === 'v2') {
    const missing = LEGACY_ANCHORS.filter((id) => !document.getElementById(id))
    assert(missing.length === 0, `7 inherited anchors${missing.length ? ` — missing: ${missing.join(', ')}` : ''}`)
    const areas = page.kind === 'v1' ? NAV_IDS : V2_IDS
    const navMissing = areas.filter((id) => !document.getElementById(id))
    assert(navMissing.length === 0, `all areas present${navMissing.length ? ` — missing: ${navMissing.join(', ')}` : ''}`)
  }

  // 12. Without JavaScript: every <script> is removed and the content must
  // still be there. Stylesheets too: CSS was never content, and counting it
  // would let one long rule get an empty page through.
  const { document: noJs } = parseHTML(html)
  noJs.querySelectorAll('script, style').forEach((s) => s.remove())
  const text = noJs.body.textContent.replace(/\s+/g, ' ').trim()
  // A threshold per type: a case study is legitimately shorter than the home
  // page, but none of them may be reduced to an empty skeleton.
  const minText = page.kind === 'case' ? 700 : 1500
  assert(text.length > minText, `content present without JS (${text.length} characters, minimum ${minText})`)
  assert(text.includes('Rubén Martínez Bernabe'), 'identity present without JS')
  const navLinks = [...noJs.querySelectorAll('a[href]')].filter((a) => a.getAttribute('href')?.startsWith('#'))
  if (page.kind === 'v1' || page.kind === 'v2') {
    assert(navLinks.length >= 3, `navigation usable without JS (${navLinks.length} links)`)
  }
  // The disclosure exists only on the V1: the V2 always shows the four areas
  // in the bar, so there is no menu that could stay hidden.
  if (page.kind === 'v1') {
    const menu = noJs.getElementById('mobile-menu')
    assert(menu && !menu.hasAttribute('hidden'), 'mobile menu visible without JS')
  }
  const langLink = [...noJs.querySelectorAll('a[rel=alternate][hreflang]')]
  assert(langLink.length >= 1, 'the language switcher is a real link')

  // 13. Visible and accessible text both belong to the page's language.
  // Scripts and styles have already been stripped so internal code is not
  // mistaken for content a person or a screen reader actually receives.
  const accessibleText = [...noJs.querySelectorAll('[aria-label], [title], [placeholder]')]
    .flatMap((element) => ['aria-label', 'title', 'placeholder'].map((name) => element.getAttribute(name)))
    .filter(Boolean)
    .join(' ')
  const localeSurface = `${text} ${accessibleText}`
  const leaks = FORBIDDEN_BY_LANG[page.lang]
    .map((pattern) => localeSurface.match(pattern)?.[0])
    .filter(Boolean)
  assert(
    leaks.length === 0,
    `content and accessibility entirely in ${page.lang}${leaks.length ? ` — mixed in: ${[...new Set(leaks)].join(', ')}` : ''}`,
  )

  /*
   * 14. The `js` marker is what hides the reveal until there is JavaScript to
   * bring it back. No page may declare it without also carrying the net that
   * reveals everything if the bundle never runs: without that, one lost file
   * leaves the home page blank.
   */
  const marksJs = html.includes("classList.add('js')")
  assert(
    !marksJs || html.includes("classList.contains('enhanced')"),
    'the js marker travels with its safety net for the reveal',
  )
}

/* ---------- 6. Sitemap ---------- */
console.log('\n6 · Sitemap')
// The sitemap lives at the historical URL and is the only one that exists: two
// sitemaps could contradict each other, and robots.txt cannot point at a 404.
assert(existsSync(join(DIST, 'sitemap.xml')), '/sitemap.xml physically exists')

const otherSitemaps = readdirSync(DIST).filter((f) => /sitemap.*\.xml$/.test(f) && f !== 'sitemap.xml')
assert(otherSitemaps.length === 0, `no contradictory sitemaps${otherSitemaps.length ? ` — redundant: ${otherSitemaps.join(', ')}` : ''}`)

const declared = read('robots.txt').match(/Sitemap:\s*(\S+)/)?.[1]
assert(declared === abs('/sitemap.xml'), `robots.txt declares ${declared}`)
const declaredPath = declared ? new URL(declared).pathname.replace(/^\//, '') : ''
assert(existsSync(join(DIST, declaredPath)), 'the sitemap robots.txt declares exists (not a 404)')

const sm = read('sitemap.xml')
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort()
const expectedLocs = EXPECTED.filter((e) => e.indexable).map((e) => abs(e.path)).sort()
assert(
  JSON.stringify(locs) === JSON.stringify(expectedLocs),
  `holds exactly the indexable set (${locs.length} URLs)`,
)
assert(!sm.includes('/v1/'), 'the V1 does not appear in the sitemap')
for (const c of Object.values(CLUSTERS)) {
  assert(sm.includes(`hreflang="x-default" href="${abs(c.xDefault)}"`), `x-default alternates for ${c.xDefault}`)
}

/* ---------- Parity between language versions ---------- */
/*
 * The two versions of a page tell the same thing in another language, so they
 * have to offer the same things: the same links, the same buttons, the same
 * images and the same controls. The text changes and the distribution of
 * `<span>` may change with it — a Spanish sentence does not hold the same words
 * as an English one — but an action that exists in one and not in the other is
 * always a defect.
 *
 * This contract was born from a real one: a technology tag written
 * already-translated in the content could not find its entry in the registry,
 * and the Spanish version silently lost a link and a logo the English one still
 * showed. Nothing caught it.
 */
console.log('\n· Language parity')
const AFFORDANCES = ['a[href]', 'button', 'img', 'input', 'audio', 'video', 'track', 'picture', 'source', 'svg', 'details', 'form']
const PAIRS = [
  ['index.html', 'es/index.html'],
  ['cv/index.html', 'es/cv/index.html'],
  ['work/sars-cov-2/index.html', 'es/work/sars-cov-2/index.html'],
  ['work/youtube-transcriber/index.html', 'es/work/youtube-transcriber/index.html'],
  ['work/finance-core/index.html', 'es/work/finance-core/index.html'],
  ['v1/index.html', 'v1/es/index.html'],
]
for (const [enFile, esFile] of PAIRS) {
  const en = parseHTML(read(enFile)).document
  const es = parseHTML(read(esFile)).document
  const gaps = AFFORDANCES
    .map((selector) => ({
      selector,
      en: en.querySelectorAll(selector).length,
      es: es.querySelectorAll(selector).length,
    }))
    .filter((count) => count.en !== count.es)
  assert(
    gaps.length === 0,
    `${enFile} and ${esFile} offer the same${gaps.length ? ` — they differ: ${gaps.map((g) => `${g.selector} ${g.en}/${g.es}`).join(', ')}` : ''}`,
  )
}

/* ---------- Compatibility: URLs and assets that cannot disappear ---------- */
console.log('\n· Compatibility')
// GitHub Pages sirve /404.html en cualquier ruta inexistente.
assert(existsSync(join(DIST, '404.html')), '/404.html present')
const notFound = read('404.html')
assert(notFound.includes('noindex'), 'the 404 is noindex')
assert(
  notFound.includes('This route does not resolve.')
    && notFound.includes('Esta ruta no existe.')
    && notFound.includes("document.documentElement.lang = 'es'"),
  'the 404 adapts language and copy when the route belongs to /es/',
)
/* The paths are checked, not how they are written: the contract is that the
   three ways back exist in Spanish, not the shape of the script that sets them. */
const spanishRoutes = ["'/es/'", "'/es/cv/'", "'/v1/es/'"].filter((route) => !notFound.includes(route))
assert(
  spanishRoutes.length === 0,
  `the Spanish 404 keeps its three recovery routes${spanishRoutes.length ? ` — missing ${spanishRoutes.join(', ')}` : ''}`,
)
for (const asset of [
  'cv/CV_RubenMartinez_EN.pdf',
  'cv/CV_RubenMartinez_ES.pdf',
  'avatar.png',
  'manifest.json',
  'robots.txt',
  'CNAME',
]) {
  assert(existsSync(join(DIST, asset)), `/${asset} preserved`)
}

console.log('\n· Bilingual CV artifacts')
const cvManifest = JSON.parse(read('cv/manifest.json'))
assert(cvManifest.version === 1 && cvManifest.documents.length === 2, 'exactly two documented CV PDFs')
for (const lang of ['en', 'es']) {
  const file = `CV_RubenMartinez_${lang.toUpperCase()}.pdf`
  const entry = cvManifest.documents.find(document => document.lang === lang)
  const html = read(`${lang === 'es' ? 'es/' : ''}cv/index.html`)
  const { document } = parseHTML(html)
  const pdf = readFileSync(join(DIST, 'cv', file))
  assert(entry?.file === file && entry.sha256 === sha256(pdf) && entry.bytes === pdf.length,
    `${lang}: deployed CV PDF matches the validated artifact`)
  assert(entry?.documentSha256 === cvFingerprint(html, DIST),
    `${lang}: CV PDF matches the current document and print stylesheet; regenerate PDFs when this fails`)
  assert(pdf.subarray(0, 5).toString() === '%PDF-' && pdf.length < 500_000,
    `${lang}: CV is a PDF within the 500 kB download budget`)
  const pdfSource = pdf.toString('latin1')
  assert((pdfSource.match(/\/Type\s*\/Page\b/g) ?? []).length === 1 && entry?.pages === 1,
    `${lang}: the actual PDF has exactly one page`)
  assert(pdfSource.includes('/StructTreeRoot') && /\/Marked\s+true/.test(pdfSource),
    `${lang}: the PDF contains a marked structure tree`)
  assert(document.querySelectorAll('[data-cv-sheet]').length === 1 && entry?.words <= 360,
    `${lang}: online CV is a focused single sheet within 360 words`)
  assert(document.querySelectorAll('link[rel="preload"][as="font"]').length === 1,
    `${lang}: CV preloads only the font it actually uses`)
  assert(document.querySelectorAll('[data-cv-experience]').length === 2
    && document.querySelector('[data-cv-experience="egarsat"]')
    && document.querySelector('[data-cv-experience="urv"]')
    && document.querySelectorAll('[data-cv-project]').length === 2,
    `${lang}: CV prioritizes two technical roles and two selected projects`)
  assert(document.querySelector('.cv-download')?.getAttribute('href') === `/cv/${file}`,
    `${lang}: CV download selects the correct language`)
  const finance = document.querySelector('[data-cv-project="financial-architecture"]')
  assert(finance?.querySelectorAll('a').length === 1
    && finance.querySelector('a').getAttribute('href') === `${SITE}${lang === 'es' ? '/es' : ''}/work/finance-core/`
    && finance.querySelector('.cv-private'),
    `${lang}: CV links Finance only to its public, explicitly private case study`)
  const cvGithub = [...document.querySelectorAll('.cv-document a[href*="github.com"]')]
    .map(link => link.getAttribute('href'))
  assert(cvGithub.length > 0 && cvGithub.every(href => /^https:\/\/github\.com\/rubenitx(\/|$)/.test(href)),
    `${lang}: CV points every repository link at the current GitHub account`)
}

/* ---------- Weight budget ---------- */
/*
 * Three ceilings, and all three exist because they were genuinely breached.
 *
 * The first: an archive photo ended up being served as a one-megabyte lossless
 * PNG for a 340 px card. No cut has any business weighing half a megabyte; if it
 * happens again, it does not deploy.
 *
 * The second: the 3D models wrote every key's position into a `style` attribute,
 * repeated on each layer, and that was 213 kB of HTML. The limit does not
 * measure the page's size — content may get larger — but how much
 * presentation travels repeated in the markup instead of living in a stylesheet.
 *
 * The third: that same model, with the component's CSS scoped, forced 2,745
 * elements to be marked with the scope attribute, which was 66 kB of the home
 * page. With the sheet outside the component the attribute disappears, and the
 * limit exists so it cannot creep back in unnoticed: it is an attribute that
 * says nothing and is paid for once per element.
 */
console.log('\n· Budget')
const MAX_IMAGE_BYTES = 500 * 1024
const MAX_INLINE_STYLE_BYTES = 32 * 1024
const MAX_SCOPE_ATTRIBUTES = 200

const assetDir = join(DIST, '_astro')
const oversized = existsSync(assetDir)
  ? readdirSync(assetDir)
    .filter((f) => /\.(png|jpe?g|webp|avif|gif)$/i.test(f))
    .map((f) => ({ f, size: statSync(join(assetDir, f)).size }))
    .filter((entry) => entry.size > MAX_IMAGE_BYTES)
  : []
assert(
  oversized.length === 0,
  `no image cut exceeds ${MAX_IMAGE_BYTES / 1024} kB${
    oversized.length ? ` — over: ${oversized.map((e) => `${e.f} (${Math.round(e.size / 1024)} kB)`).join(', ')}` : ''
  }`,
)

for (const page of EXPECTED) {
  const html = read(page.file)

  const inline = [...html.matchAll(/\sstyle="([^"]*)"/g)]
    .reduce((total, match) => total + match[1].length, 0)
  assert(
    inline <= MAX_INLINE_STYLE_BYTES,
    `${page.path} carries ${Math.round(inline / 1024)} kB of inline style (maximum ${MAX_INLINE_STYLE_BYTES / 1024} kB)`,
  )

  const scoped = [...html.matchAll(/\sdata-astro-cid-[\w-]+/g)].length
  assert(
    scoped <= MAX_SCOPE_ATTRIBUTES,
    `${page.path} marks ${scoped} elements with the scope attribute (maximum ${MAX_SCOPE_ATTRIBUTES})`,
  )
}

/* ---------- CSS: the reveal's default state is visible ---------- */
console.log('\n· Reveal')
const cssDir = join(DIST, '_astro')
const css = existsSync(cssDir)
  ? readdirSync(cssDir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(cssDir, f), 'utf8')).join('')
  : ''
assert(/\.reveal\{[^}]*opacity:1/.test(css.replace(/\s/g, '')), '.reveal defaults to opacity:1')
assert(css.includes('prefers-reduced-motion'), 'prefers-reduced-motion accounted for')
assert(!css.includes('var(…)'), 'Tailwind does not emit placeholder utilities from documentation')

console.log('\n· Project repository actions')
for (const page of EXPECTED.filter((page) => page.kind === 'v2')) {
  const { document } = parseHTML(read(page.file))
  const project = document.querySelector('[data-project="youtube-transcriber"]')
  const repos = [...(project?.querySelectorAll('.project-repo-link') ?? [])]
  assert(
    repos.length === 2 && ['Frontend', 'API'].every((label) =>
      repos.some((link) => link.textContent.trim() === label && link.getAttribute('aria-label')?.includes(label)),
    ),
    `${page.path} exposes readable Frontend and API repository actions`,
  )
  assert(
    !project?.querySelector('.project-repo-callout'),
    `${page.path} does not overlay decorative labels on repository actions`,
  )
  assert(
    document.querySelector('#job-tabs')?.parentElement?.parentElement?.classList.contains('grid-cols-1'),
    `${page.path} constrains the mobile experience grid to the viewport`,
  )
  const cards = [...document.querySelectorAll('#work [data-project]')]
  const keys = cards.map((card) => card.dataset.project)
  assert(
    keys.join(',') === 'youtube-transcriber,financial-architecture,sars-cov-2,portfolio',
    `${page.path} presents each project once, ordered Transcriber, Finance, research and portfolio source`,
  )
  assert(
    document.querySelectorAll('.project-slide').length === 3
      && document.querySelector('.project-slide[data-project="financial-architecture"] .project-private-source')
      && !document.querySelector('.project-slide[data-project="financial-architecture"] a[href*="github.com"]')
      && !document.querySelector('#project-deck button, .project-deck-track')
      && !document.querySelector('#project-deck')?.hasAttribute('aria-roledescription'),
    `${page.path} features Finance without exposing private source or another carousel`,
  )
  const reference = document.querySelector('#project-deck .project-reference')
  assert(
    reference?.querySelector('a[href="https://github.com/rubenitx/rubenmtzb.github.io"]')
      && !document.querySelector('#other-projects-title, .project-grid-card')
      && !reference.querySelector('h3, h4, img, .tech-chip')
      && reference.querySelectorAll('a').length === 1,
    `${page.path} keeps the portfolio as a compact source reference without a redundant visit link`,
  )
  assert(
    [...document.querySelectorAll('.project-slide')].every((slide) =>
      !slide.hasAttribute('aria-hidden') && slide.querySelector('p')?.textContent.trim()),
    `${page.path} ships readable project descriptions without hiding slides from no-JS readers`,
  )
}

console.log('\n· Verified demonstration assets')
for (const page of EXPECTED.filter(page => ['case', 'finance', 'transcriber'].includes(page.cluster))) {
  const { document } = parseHTML(read(page.file))
  const player = document.querySelector('#demo video')
  const downloads = [...document.querySelectorAll('#demo a[download]')]
  assert(
    downloads.length === 1
      && downloads[0].getAttribute('href') === player?.querySelector('source')?.getAttribute('src')
      && !document.querySelector('#demo a[href*="-original."], #demo a[href*="-silent."]'),
    `${page.path} offers exactly one download, matching the video being watched`,
  )
  assert(
    document.querySelector('[data-demo-fullscreen][hidden]')
      && document.querySelector('[data-demo-error][role="status"][hidden]')
      && document.querySelector('.case-demo-hint')?.textContent.trim(),
    `${page.path} progressively enables fullscreen with a localized viewing hint and visible error handling`,
  )
  const graph = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph']
  const canonical = document.querySelector('link[rel="canonical"]').getAttribute('href')
  const entity = graph.find(item => item['@id'] === `${canonical}#project`)
  assert(
    entity?.['@type'] === 'CreativeWork' && entity.url === canonical && entity.inLanguage === page.lang
      && graph.find(item => item['@id'] === `${canonical}#page`)?.mainEntity?.['@id'] === entity['@id'],
    `${page.path} identifies its public project case as the structured-data main entity`,
  )
}
for (const [name, duration, fps, uiFrames] of [
  ['transcriber-demo', 42.64, 25, 916],
  ['finance-core-demo', 191.64, 25, 4541],
  ['mutation-portal-demo', 81, 30, 2010],
]) {
  const validation = JSON.parse(readFileSync(join(DIST, 'media', `${name}-validation.json`), 'utf8'))
  const videoHash = createHash('sha256').update(readFileSync(join(DIST, 'media', `${name}.mp4`))).digest('hex')
  const cursor = validation.continuousCursor
  assert(
    validation.videoSha256 === videoHash
      && (validation.decodedFrames ?? validation.video?.decodedFrames) === Math.round(duration * fps)
      && (validation.durationSeconds ?? validation.video?.seconds) === duration,
    `${name} ships the exact fully decoded and validated film`,
  )
  assert(
    cursor?.totalUiFrames === uiFrames && cursor.cursorCoveredFrames === uiFrames
      && cursor.missingFrames === 0 && cursor.multipleCursorFrames === 0
      && cursor.coordinatesInBoundsFrames === uiFrames,
    `${name} has a single visible in-bounds cursor throughout every application frame`,
  )
  if (name === 'mutation-portal-demo') {
    assert(
      validation.video.fps === fps && validation.presentation?.guideVisibleFrames === uiFrames
        && validation.presentation.guideDoesNotOverlapUi === true
        && validation.presentation.blackApplicationFrames === 0
        && cursor.motion?.unintendedCursorStallsOver200ms === 0,
      `${name} preserves 30fps, non-overlapping explanatory panels and continuous motion`,
    )
  }
  for (const language of ['en', 'es']) {
    const subtitles = readFileSync(join(DIST, 'media', `${name}.${language}.vtt`), 'utf8')
    const times = [...subtitles.matchAll(/(\d{2}):(\d{2}):(\d{2}\.\d{3}) --> (\d{2}):(\d{2}):(\d{2}\.\d{3})/g)]
      .map(match => ({
        start: Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]),
        end: Number(match[4]) * 3600 + Number(match[5]) * 60 + Number(match[6]),
      }))
    assert(
      subtitles.startsWith('WEBVTT') && times.length > 0 && times[0].start === 0
        && Math.abs(times.at(-1).end - duration) < 0.001
        && times.every((cue, index) => cue.start < cue.end && cue.end <= duration
          && (!index || cue.start >= times[index - 1].end)),
      `${name} ${language} captions cover the film with ordered, valid cue times`,
    )
  }
}

console.log('\n· Project case studies')
for (const page of EXPECTED.filter((page) => page.cluster === 'finance')) {
  const { document } = parseHTML(read(page.file))
  const article = document.querySelector('.finance-case')
  const text = article?.textContent ?? ''
  assert(
    article?.querySelector('h1')?.getAttribute('aria-label') === 'Finance Core'
      && article.querySelector('.finance-privacy')
      && article.querySelector('.finance-signal[aria-hidden="true"]')
      && article.querySelectorAll('.case-pipeline li').length === 3,
    `${page.path} presents Finance with a private, accessible editorial identity`,
  )
  assert(
    ['React', 'TypeScript', 'FastAPI', 'Python', 'PostgreSQL', 'SQLite', 'GoCardless', 'CoinMarketCap', 'CSV'].every(term => text.includes(term))
      && !/Spring Boot/.test(text)
      && ![...article.querySelectorAll('a')].some(link => /github\.com\/.*finance|127\.0\.0\.1|localhost/.test(link.getAttribute('href'))),
    `${page.path} documents the verified stack without linking private repositories or local services`,
  )
  assert(
    (page.lang === 'es' ? /no conecta bancos/.test(text) && /datos sintéticos/.test(text) : /no bank connection/.test(text) && /synthetic data/.test(text))
      && article.querySelectorAll('#case-decisions + div .case-decision').length === 6,
    `${page.path} distinguishes the implemented connector from the disconnected synthetic walkthrough`,
  )
  const player = article.querySelector('#demo video')
  const tracks = [...(player?.querySelectorAll('track') ?? [])]
  assert(
    player?.getAttribute('preload') === 'none' && player.hasAttribute('controls')
      && !player.hasAttribute('autoplay') && !player.hasAttribute('loop')
      && player.querySelector('source')?.getAttribute('src') === '/media/finance-core-demo.mp4'
      && player.getAttribute('poster') === '/media/finance-core-demo-poster.jpg'
      && ['finance-core-demo.mp4', 'finance-core-demo-poster.jpg'].every(file => existsSync(join(DIST, 'media', file))),
    `${page.path} serves the actual dark Finance demo on demand`,
  )
  assert(
    tracks.length === 2 && tracks.every(track => existsSync(join(DIST, track.getAttribute('src'))))
      && tracks.filter(track => track.hasAttribute('default')).length === 1
      && tracks.find(track => track.hasAttribute('default'))?.getAttribute('srclang') === page.lang
      && (article.querySelector('#demo-caption')?.textContent ?? '').includes(
        new Intl.NumberFormat(page.lang).format(JSON.parse(readFileSync(join(DIST, 'media/finance-core-demo.json'), 'utf8')).durationSeconds),
      )
      && existsSync(join(DIST, 'media/finance-core-demo-original.mp4'))
      && !article.querySelector('a[href*="transcriber-demo"]'),
    `${page.path} offers bilingual Finance captions and preserves the original asset`,
  )
}
for (const page of EXPECTED.filter((page) => page.cluster === 'case')) {
  const { document } = parseHTML(read(page.file))
  assert(
    document.querySelector('.mutation-case.editorial-case h1')?.getAttribute('aria-label') === 'The Mutational Landscape of SARS-CoV-2'
      && document.querySelectorAll('.mutation-overview .mutation-icon svg').length === 4
      && document.querySelector('.mutation-signal[aria-hidden="true"]')
      && document.querySelector('.case-publication a[href="https://www.mdpi.com/1422-0067/24/10/9072"]'),
    `${page.path} retains the research evidence with its own accessible editorial presentation`,
  )
  const player = document.querySelector('#demo video')
  const tracks = [...(player?.querySelectorAll('track') ?? [])]
  assert(
    player?.getAttribute('preload') === 'none' && player.hasAttribute('controls')
      && !player.hasAttribute('autoplay') && !player.hasAttribute('loop')
      && player.querySelector('source')?.getAttribute('src') === '/media/mutation-portal-demo.mp4'
      && player.getAttribute('poster') === '/media/mutation-portal-demo-poster.jpg'
      && ['mutation-portal-demo.mp4', 'mutation-portal-demo-poster.jpg'].every(file => existsSync(join(DIST, 'media', file)))
      && tracks.length === 2 && tracks.every(track => existsSync(join(DIST, track.getAttribute('src'))))
      && tracks.filter(track => track.hasAttribute('default')).length === 1
      && tracks.find(track => track.hasAttribute('default'))?.getAttribute('srclang') === page.lang,
    `${page.path} provides the recorded research walkthrough on demand with bilingual captions`,
  )
}
for (const page of EXPECTED.filter((page) => page.kind === 'v2')) {
  const { document } = parseHTML(read(page.file))
  assert(
    document.querySelectorAll('#project-carousel .project-actions[role="group"]').length === document.querySelectorAll('.project-slide').length
      && [...document.querySelectorAll('#project-carousel .project-action')].every((link) => link.querySelector('strong')?.textContent.trim())
      && !document.querySelector('.project-overlay .project-actions'),
    `${page.path} exposes labelled project actions in a dedicated dock, not over the cover`,
  )
  assert(
    ![...document.querySelectorAll('a[href*="github.com"]')].filter((link) => !link.closest('#project-carousel'))
      .some((link) => link.matches('.project-action, .project-repo-link')),
    `${page.path} limits the new repository controls to featured projects`,
  )
}
for (const page of EXPECTED.filter((page) => page.cluster === 'transcriber')) {
  const { document } = parseHTML(read(page.file))
  for (const id of ['case-problem', 'case-decisions', 'case-limits', 'case-outcome', 'demo']) {
    assert(Boolean(document.getElementById(id)), `${page.path} includes ${id} in static HTML`)
  }
  const player = document.querySelector('#demo video')
  assert(
    document.querySelector('h1')?.getAttribute('aria-label') === 'YouTube Transcriber'
      && document.querySelectorAll('.case-letter').length === 11
      && document.querySelector('.case-hero.reveal')
      && document.querySelector('.case-signal[aria-hidden="true"]')
      && document.querySelectorAll('.case-pipeline li').length === 3,
    `${page.path} enhances the title and pipeline without fragmenting its accessible name`,
  )
  assert(
    player?.getAttribute('preload') === 'none' && player.hasAttribute('controls')
      && !player.hasAttribute('autoplay') && !player.hasAttribute('loop'),
    `${page.path} only plays the demo on demand`,
  )
  const src = player?.querySelector('source')?.getAttribute('src')
  const poster = player?.getAttribute('poster')
  assert(
    src === '/media/transcriber-demo.mp4' && poster === '/media/transcriber-demo-poster.jpg'
      && existsSync(join(DIST, src)) && existsSync(join(DIST, poster)),
    `${page.path} serves the supplied recording and poster, not placeholders`,
  )
  assert(
    existsSync(join(DIST, 'media/transcriber-demo-silent.mp4'))
      && existsSync(join(DIST, 'media/transcriber-demo-music-original.mp4'))
      && existsSync(join(DIST, 'media/transcriber-demo-guided-original.mp4')),
    `${page.path} preserves earlier approved recordings without advertising alternate downloads`,
  )
  const caption = document.getElementById('demo-caption')?.textContent ?? ''
  const tracks = [...(player?.querySelectorAll('track') ?? [])]
  assert(
    tracks.length === 2 && tracks.every((track) =>
      track.getAttribute('kind') === 'captions' && existsSync(join(DIST, track.getAttribute('src'))))
      && tracks.filter((track) => track.hasAttribute('default')).length === 1
      && tracks.find((track) => track.hasAttribute('default'))?.getAttribute('srclang') === page.lang,
    `${page.path} offers both caption tracks with its own language selected`,
  )
  assert(
    /benchmark/.test(caption) && /latenc/.test(caption) && /edit/i.test(caption)
      && player?.getAttribute('aria-describedby') === 'demo-caption',
    `${page.path} labels the edited demo, not a benchmark or latency guarantee`,
  )
  const text = document.querySelector('main')?.textContent ?? ''
  assert(
    ['yt-dlp', 'whisper.cpp', 'DeepL', 'SSE', 'YouTube'].every((term) => text.includes(term))
      && (page.lang === 'es' ? /cinco/.test(text) && /registros/.test(text) : /five/.test(text) && /logs/.test(text)),
    `${page.path} documents the real pipeline, history and data handling`,
  )
  assert(
    ['https://yt.rubenitx.me/', 'https://github.com/rubenitx/yt-transcriber-web', 'https://github.com/rubenitx/yt-transcriber-api']
      .every((href) => document.querySelector(`main a[href="${href}"]`)),
    `${page.path} exposes the live app and both evidence repositories`,
  )
}

/* ---------- Sound samples ---------- */
/*
 * Each sample lives inside its build's card and not on a separate bench: whoever
 * enters a keyboard has the assembly order and the sound right there. That is
 * exactly what gets checked — that the clip hangs off the right panel — along
 * with both formats really existing in dist. A clip renamed in the JSON and not
 * replaced in public/ only shows up when you press play, which is precisely what
 * nobody does while deploying.
 */
console.log('\n· Sound samples')
const soundBuilds = JSON.parse(readFileSync('src/content/keyboards.json', 'utf8'))
const withSound = soundBuilds.filter((b) => b.sound)

for (const page of EXPECTED.filter((p) => p.kind === 'v2')) {
  const { document: home } = parseHTML(read(page.file))
  const fragmentFile = page.lang === 'es' ? 'es/builds/models/index.html' : 'builds/models/index.html'
  const { document } = parseHTML(read(fragmentFile))
  assert(
    document.querySelectorAll('[data-bx-clip]').length === withSound.length,
    `${page.path} publishes ${withSound.length} sample(s), one per recorded build`,
  )
  /* No sample may be left loose in the gallery: every one inside its own card. */
  assert(
    [...document.querySelectorAll('[data-bx-clip]')].every((clip) => clip.closest('[data-bx-build]')),
    `${page.path} serves every sample inside its build's panel`,
  )

  for (const build of soundBuilds) {
    const panel = document.querySelector(`[data-bx-build="${build.key}"]`)
    const row = panel?.querySelector('[data-bx-clip]')

    if (!build.sound) {
      assert(
        !row && Boolean(panel?.querySelector('.bx-clip-note')),
        `${build.name}: with no take recorded, its card says so instead of staying silent`,
      )
      continue
    }

    assert(
      row?.dataset.bxClip === build.sound.clip,
      `${build.name}: its card serves its own clip (${build.sound.clip})`,
    )
    const sources = [...(row?.querySelectorAll('source') ?? [])].map((el) => el.getAttribute('src'))
    assert(
      sources.length === 2 && sources.every((src) => existsSync(join(DIST, src))),
      `${build.name}: both formats of the clip exist in dist (${sources.join(', ')})`,
    )
    assert(
      Number(row?.dataset.duration) === build.sound.duration,
      `${build.name}: the markup's duration matches the content's`,
    )
    /* The waveform is drawn in one go: one bar per declared height. */
    const segments = row?.querySelector('.bx-clip-wave path')?.getAttribute('d')?.match(/M/g)?.length ?? 0
    assert(
      segments === build.sound.peaks.length,
      `${build.name}: the waveform draws the content's ${build.sound.peaks.length} bars`,
    )
    /* The reference stretch comes before the typing, never past it. */
    const ref = Number((row?.getAttribute('style') ?? '').match(/--ref:([\d.]+)%/)?.[1])
    assert(
      ref > 0 && ref < 100 && Math.abs(ref - (build.sound.typingFrom / build.sound.duration) * 100) < 0.02,
      `${build.name}: the reference stretch marks the snaps (${ref}%)`,
    )
  }

  /* With `preload="none"` the page carries not one byte of audio until somebody
     presses play: that is what allows serving the samples in the HTML. */
  const players = [...document.querySelectorAll('audio')]
  assert(
    players.length === withSound.length && players.every((el) => el.getAttribute('preload') === 'none'),
    `${page.path} preloads no sample at all`,
  )

  /*
   * The mascot only peeks out where the content says so. It is an ornament, but
   * one that claims something — why that build sounds the way it does — and it
   * cannot show up on a keyboard that never declared it.
   */
  const quipBuilds = soundBuilds.filter((b) => b.sound?.quips)
  assert(
    document.querySelectorAll('[data-bx-quip]').length === quipBuilds.length,
    `${page.path} shows the mascot on ${quipBuilds.length} build(s), the ones assembled for silence`,
  )
  for (const build of soundBuilds) {
    const panel = document.querySelector(`[data-bx-build="${build.key}"]`)
    const quip = panel?.querySelector('[data-bx-quip]')
    if (!build.sound?.quips) {
      assert(!quip, `${build.name}: with no notes declared, nobody peeks out`)
      continue
    }
    const lines = build.sound.quips[page.lang]
    const shipped = JSON.parse(quip?.querySelector('[data-bx-quip-next]')?.dataset.quips ?? '[]')
    assert(
      shipped.length === lines.length && shipped.every((line, i) => line === lines[i]),
      `${build.name}: its ${lines.length} notes travel in ${page.lang}`,
    )
    assert(
      quip?.querySelector('[data-bx-quip-text]')?.textContent?.trim() === lines[0],
      `${build.name}: el bocadillo se sirve escrito, no en blanco`,
    )
  }

  /* The whole card opens the build; the button remains the keyboard's target. */
  const cards = [...home.querySelectorAll('.bx-build-card')]
  assert(
    cards.length > 0 && cards.every((card) => card.dataset.bxOpen
      && card.querySelector(`button[data-bx-open="${card.dataset.bxOpen}"]`)),
    `${page.path} lets the whole card open the build, with its button inside`,
  )

  const homeKeys = home.querySelectorAll('.bx-model-key').length
  const homePanels = home.querySelectorAll('[data-bx-build]').length
  assert(
    homeKeys === 0 && homePanels === 0 && Boolean(home.querySelector('[data-bx-models-src]')),
    `${page.path} leaves workbenches and layered keys out of the home document`,
  )

  const homeHtml = read(page.file)
  assert(
    !homeHtml.includes('.gm-canvas{') && !homeHtml.includes('html.game-mode-active'),
    `${page.path} does not inline Game Mode CSS`,
  )
  assert(
    [...home.querySelectorAll('link[rel="preload"][as="image"]')].some(
      (link) => (link.getAttribute('href') ?? '').includes('avatar.png'),
    ),
    `${page.path} preloads the portrait so the ASCII canvas does not wait on JS`,
  )
}

/* ---------- Result ---------- */
console.log(`\n${'─'.repeat(52)}`)
if (failures === 0) {
  console.log(`✅ ${checks} checks passed`)
  process.exit(0)
}
console.error(`❌ ${failures} failure(s) across ${checks + failures} checks`)
process.exit(1)
