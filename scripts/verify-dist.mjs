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
import { join } from 'node:path'
import { parseHTML } from 'linkedom'

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
  { path: '/v1/', file: 'v1/index.html', lang: 'en', cluster: null, indexable: false, kind: 'v1' },
  { path: '/v1/es/', file: 'v1/es/index.html', lang: 'es', cluster: null, indexable: false, kind: 'v1' },
  { path: '/builds/models/', file: 'builds/models/index.html', lang: 'en', cluster: null, indexable: false, kind: 'fragment' },
  { path: '/es/builds/models/', file: 'es/builds/models/index.html', lang: 'es', cluster: null, indexable: false, kind: 'fragment' },
]

const CLUSTERS = {
  home: { en: '/', es: '/es/', xDefault: '/' },
  cv: { en: '/cv/', es: '/es/cv/', xDefault: '/cv/' },
  case: { en: '/work/sars-cov-2/', es: '/es/work/sars-cov-2/', xDefault: '/work/sars-cov-2/' },
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
const AFFORDANCES = ['a[href]', 'button', 'img', 'input', 'audio', 'picture', 'source', 'svg', 'details', 'form']
const PAIRS = [
  ['index.html', 'es/index.html'],
  ['cv/index.html', 'es/cv/index.html'],
  ['work/sars-cov-2/index.html', 'es/work/sars-cov-2/index.html'],
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
