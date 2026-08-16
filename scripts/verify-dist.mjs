#!/usr/bin/env node
/**
 * Verificaciones sobre el HTML realmente generado en dist/.
 *
 * No son tests unitarios: son afirmaciones sobre el build. Si alguna falla,
 * el despliegue se detiene. La comprobación 12 es la que convierte el
 * principio rector —contenido en el HTML de build, no en runtime— en algo
 * verificable en lugar de una intención.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parseHTML } from 'linkedom'

const DIST = 'dist'
const SITE = 'https://rubenitx.me'

/**
 * Contrato de URLs tras el intercambio de la Fase 5.
 *
 * V1 queda en /v1/ con noindex: el análisis de cobertura de la Fase 4
 * no encontró ni una entidad exclusiva suya frente a V2 + CV + fichas.
 * Por eso no emite hreflang ni entra en el sitemap, pero sigue siendo
 * accesible para humanos.
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
]

const CLUSTERS = {
  home: { en: '/', es: '/es/', xDefault: '/' },
  cv: { en: '/cv/', es: '/es/cv/', xDefault: '/cv/' },
  case: { en: '/work/sars-cov-2/', es: '/es/work/sars-cov-2/', xDefault: '/work/sars-cov-2/' },
}

const LEGACY_ANCHORS = ['stack', 'experience', 'projects', 'research', 'education', 'certifications', 'resume']
const NAV_IDS = ['home', 'about', 'work', 'background', 'contact']
const V2_IDS = ['identity', 'work', 'archive', 'contact']

let failures = 0
let checks = 0
const fail = (msg) => { failures++; console.error(`  ✗ ${msg}`) }
const ok = (msg) => { checks++; console.log(`  ✓ ${msg}`) }
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg))

const abs = (p) => new URL(p, SITE).href
const read = (f) => readFileSync(join(DIST, f), 'utf8')

/* ---------- 1. Conjunto de URLs generadas ---------- */
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
  `conjunto exacto: ${expectedFiles.join(', ')}${htmlFiles.length !== expectedFiles.length ? ` — encontrado: ${htmlFiles.join(', ')}` : ''}`,
)

/* ---------- 2-11. Por página ---------- */
for (const page of EXPECTED) {
  console.log(`\n· ${page.path}`)
  const html = read(page.file)
  const { document } = parseHTML(html)

  // 2. Exactamente un H1
  const h1s = document.querySelectorAll('h1')
  assert(h1s.length === 1, `un único <h1> (encontrados: ${h1s.length})`)

  // Jerarquía sin saltos
  const levels = [...document.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1]))
  let jump = null
  for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) jump = `h${levels[i - 1]}→h${levels[i]}`
  assert(!jump, `jerarquía de encabezados sin saltos${jump ? ` (${jump})` : ''}`)

  // 3. lang correcto
  const lang = document.documentElement.getAttribute('lang')
  assert(lang === page.lang, `<html lang="${page.lang}"> (encontrado: "${lang}")`)

  // 4. Canonical absoluto y self-referencing
  const canon = document.querySelector('link[rel=canonical]')?.getAttribute('href')
  assert(canon === abs(page.path), `canonical self y absoluto (${canon})`)

  // robots coherente con la indexabilidad declarada
  const robots = document.querySelector('meta[name=robots]')?.getAttribute('content') ?? ''
  assert(
    page.indexable ? robots.includes('index') && !robots.includes('noindex') : robots.includes('noindex'),
    `robots="${robots}"`,
  )

  // 5. hreflang: conjunto idéntico dentro del clúster, se incluye a sí mismo,
  // x-default. Las páginas no indexables NO deben emitirlo.
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
    assert(map[page.lang] === abs(page.path), 'el clúster se incluye a sí mismo')
  } else {
    assert(alts.length === 0, `sin hreflang por no ser indexable (${alts.length})`)
  }

  // title y description únicos y presentes
  const title = document.querySelector('title')?.textContent?.trim()
  const desc = document.querySelector('meta[name=description]')?.getAttribute('content')
  assert(Boolean(title), 'title presente')
  assert(Boolean(desc) && desc.length >= 50 && desc.length <= 180, `meta description (${desc?.length} car.)`)

  // Open Graph y Twitter
  for (const sel of ['meta[property="og:title"]', 'meta[property="og:image"]', 'meta[name="twitter:card"]']) {
    assert(Boolean(document.querySelector(sel)), `${sel} presente`)
  }

  // 7. JSON-LD: parsea y hay una única entidad Person con @id estable
  const ld = document.querySelector('script[type="application/ld+json"]')?.textContent
  let graph = []
  try {
    graph = JSON.parse(ld)['@graph'] ?? []
    ok('JSON-LD parsea')
  } catch {
    fail('JSON-LD no parsea')
  }
  const persons = graph.filter((n) => n['@type'] === 'Person')
  assert(persons.length === 1, `una única entidad Person (encontradas: ${persons.length})`)
  assert(persons[0]?.['@id'] === `${SITE}/#person`, 'Person con @id estable')
  assert(
    !graph.some((n) => n['@type'] === 'Person' && n['@id'] !== `${SITE}/#person`),
    'ningún Person alternativo',
  )

  // alumniOf: una entidad por centro, no por titulación
  const alumni = (persons[0]?.alumniOf ?? []).map((a) => a.name)
  assert(
    new Set(alumni).size === alumni.length,
    `alumniOf sin centros repetidos (${alumni.length} entradas)`,
  )

  // 8. Ningún nodo de contenido con opacity:0 inline
  const hidden = [...document.querySelectorAll('[style]')].filter((el) =>
    /opacity\s*:\s*0(?![.\d])/.test(el.getAttribute('style') ?? ''),
  )
  assert(hidden.length === 0, `sin contenido con opacity:0 inline (${hidden.length})`)

  // 9. Enlaces internos resuelven a un fichero existente
  const broken = []
  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href')
    if (!href.startsWith('/') || href.startsWith('//')) continue
    const clean = href.split('#')[0].split('?')[0]
    if (!clean) continue
    const target = clean.endsWith('/') ? join(DIST, clean, 'index.html') : join(DIST, clean)
    if (!existsSync(target)) broken.push(href)
  }
  assert(broken.length === 0, `enlaces internos resuelven${broken.length ? ` — rotos: ${broken.join(', ')}` : ''}`)

  // 10. Imágenes con alt, width y height
  const badImgs = [...document.querySelectorAll('img')].filter(
    (i) => i.getAttribute('alt') === null || !i.getAttribute('width') || !i.getAttribute('height'),
  )
  assert(badImgs.length === 0, `toda <img> con alt, width y height (${badImgs.length} sin ello)`)

  // 11. Anclas heredadas y navegación (solo en la home)
  if (page.kind === 'v1' || page.kind === 'v2') {
    const missing = LEGACY_ANCHORS.filter((id) => !document.getElementById(id))
    assert(missing.length === 0, `7 anclas heredadas${missing.length ? ` — faltan: ${missing.join(', ')}` : ''}`)
    const areas = page.kind === 'v1' ? NAV_IDS : V2_IDS
    const navMissing = areas.filter((id) => !document.getElementById(id))
    assert(navMissing.length === 0, `áreas presentes${navMissing.length ? ` — faltan: ${navMissing.join(', ')}` : ''}`)
  }

  // 12. Sin JavaScript: se elimina todo <script> y el contenido debe seguir ahí
  const { document: noJs } = parseHTML(html)
  noJs.querySelectorAll('script').forEach((s) => s.remove())
  const text = noJs.body.textContent.replace(/\s+/g, ' ').trim()
  // Umbral por tipo: una ficha de proyecto es legítimamente más corta
  // que la portada, pero ninguna puede quedarse en un esqueleto vacío.
  const minText = page.kind === 'case' ? 700 : 1500
  assert(text.length > minText, `contenido presente sin JS (${text.length} caracteres, mínimo ${minText})`)
  assert(text.includes('Rubén Martínez Bernabe'), 'identidad presente sin JS')
  const navLinks = [...noJs.querySelectorAll('a[href]')].filter((a) => a.getAttribute('href')?.startsWith('#'))
  if (page.kind === 'v1' || page.kind === 'v2') {
    assert(navLinks.length >= 3, `navegación operativa sin JS (${navLinks.length} enlaces)`)
    const menu = noJs.getElementById('mobile-menu') ?? noJs.getElementById('menu')
    assert(menu && !menu.hasAttribute('hidden'), 'menú móvil visible sin JS')
  }
  const langLink = [...noJs.querySelectorAll('a[rel=alternate][hreflang]')]
  assert(langLink.length >= 1, 'selector de idioma es un enlace real')
}

/* ---------- 6. Sitemap ---------- */
console.log('\n6 · Sitemap')
// El sitemap vive en la URL histórica y es el único que existe: dos
// sitemaps podrían contradecirse, y robots.txt no puede apuntar a un 404.
assert(existsSync(join(DIST, 'sitemap.xml')), '/sitemap.xml existe físicamente')

const otherSitemaps = readdirSync(DIST).filter((f) => /sitemap.*\.xml$/.test(f) && f !== 'sitemap.xml')
assert(otherSitemaps.length === 0, `no hay sitemaps contradictorios${otherSitemaps.length ? ` — sobra: ${otherSitemaps.join(', ')}` : ''}`)

const declared = read('robots.txt').match(/Sitemap:\s*(\S+)/)?.[1]
assert(declared === abs('/sitemap.xml'), `robots.txt declara ${declared}`)
const declaredPath = declared ? new URL(declared).pathname.replace(/^\//, '') : ''
assert(existsSync(join(DIST, declaredPath)), 'el sitemap declarado por robots.txt existe (no 404)')

const sm = read('sitemap.xml')
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort()
const expectedLocs = EXPECTED.filter((e) => e.indexable).map((e) => abs(e.path)).sort()
assert(
  JSON.stringify(locs) === JSON.stringify(expectedLocs),
  `contiene exactamente el conjunto indexable (${locs.length} URLs)`,
)
assert(!sm.includes('/v1/'), 'la V1 no aparece en el sitemap')
for (const c of Object.values(CLUSTERS)) {
  assert(sm.includes(`hreflang="x-default" href="${abs(c.xDefault)}"`), `alternativas x-default para ${c.xDefault}`)
}

/* ---------- Compatibilidad: URLs y assets que no pueden desaparecer ---------- */
console.log('\n· Compatibilidad')
// GitHub Pages sirve /404.html en cualquier ruta inexistente.
assert(existsSync(join(DIST, '404.html')), '/404.html presente')
assert(read('404.html').includes('noindex'), 'el 404 va noindex')
for (const asset of [
  'cv/CV_RubenMartinez_EN.pdf',
  'cv/CV_RubenMartinez_ES.pdf',
  'avatar.png',
  'manifest.json',
  'robots.txt',
  'CNAME',
]) {
  assert(existsSync(join(DIST, asset)), `/${asset} preservado`)
}

/* ---------- CSS: el estado por defecto del revelado es visible ---------- */
console.log('\n· Revelado')
const cssDir = join(DIST, '_astro')
const css = existsSync(cssDir)
  ? readdirSync(cssDir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(cssDir, f), 'utf8')).join('')
  : ''
assert(/\.reveal\{[^}]*opacity:1/.test(css.replace(/\s/g, '')), '.reveal por defecto es opacity:1')
assert(css.includes('prefers-reduced-motion'), 'prefers-reduced-motion contemplado')

/* ---------- Resultado ---------- */
console.log(`\n${'─'.repeat(52)}`)
if (failures === 0) {
  console.log(`✅ ${checks} comprobaciones superadas`)
  process.exit(0)
}
console.error(`❌ ${failures} fallo(s) sobre ${checks + failures} comprobaciones`)
process.exit(1)
