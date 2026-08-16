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
import { join, dirname } from 'node:path'
import { parseHTML } from 'linkedom'

const DIST = 'dist'
const SITE = 'https://rubenitx.me'

/** Contrato de páginas indexables de la Fase 2 (Estrategia A). */
const EXPECTED = [
  { path: '/', file: 'index.html', lang: 'en', cluster: 'home' },
  { path: '/es/', file: 'es/index.html', lang: 'es', cluster: 'home' },
  { path: '/cv/', file: 'cv/index.html', lang: 'en', cluster: 'cv' },
  { path: '/es/cv/', file: 'es/cv/index.html', lang: 'es', cluster: 'cv' },
]

const CLUSTERS = {
  home: { en: '/', es: '/es/', xDefault: '/' },
  cv: { en: '/cv/', es: '/es/cv/', xDefault: '/cv/' },
}

const LEGACY_ANCHORS = ['stack', 'experience', 'projects', 'research', 'education', 'certifications', 'resume']
const NAV_IDS = ['home', 'about', 'work', 'background', 'contact']

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
    else if (e.endsWith('.html')) htmlFiles.push(p.slice(DIST.length + 1))
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

  // 5. hreflang: conjunto idéntico dentro del clúster, se incluye a sí mismo, x-default
  const cluster = CLUSTERS[page.cluster]
  const alts = [...document.querySelectorAll('link[rel=alternate][hreflang]')].map((l) => [
    l.getAttribute('hreflang'),
    l.getAttribute('href'),
  ])
  const map = Object.fromEntries(alts)
  assert(map.en === abs(cluster.en), `hreflang="en" → ${cluster.en}`)
  assert(map.es === abs(cluster.es), `hreflang="es" → ${cluster.es}`)
  assert(map['x-default'] === abs(cluster.xDefault), `x-default → ${cluster.xDefault}`)
  assert(map[page.lang] === abs(page.path), 'el clúster se incluye a sí mismo')

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
  if (page.cluster === 'home') {
    const missing = LEGACY_ANCHORS.filter((id) => !document.getElementById(id))
    assert(missing.length === 0, `7 anclas heredadas${missing.length ? ` — faltan: ${missing.join(', ')}` : ''}`)
    const navMissing = NAV_IDS.filter((id) => !document.getElementById(id))
    assert(navMissing.length === 0, `las 5 áreas existen${navMissing.length ? ` — faltan: ${navMissing.join(', ')}` : ''}`)
  }

  // 12. Sin JavaScript: se elimina todo <script> y el contenido debe seguir ahí
  const { document: noJs } = parseHTML(html)
  noJs.querySelectorAll('script').forEach((s) => s.remove())
  const text = noJs.body.textContent.replace(/\s+/g, ' ').trim()
  assert(text.length > 1500, `contenido presente sin JS (${text.length} caracteres)`)
  assert(text.includes('Rubén Martínez Bernabe'), 'identidad presente sin JS')
  const navLinks = [...noJs.querySelectorAll('a[href]')].filter((a) => a.getAttribute('href')?.startsWith('#'))
  if (page.cluster === 'home') {
    assert(navLinks.length >= NAV_IDS.length, `navegación operativa sin JS (${navLinks.length} enlaces)`)
    const menu = noJs.getElementById('mobile-menu')
    assert(menu && !menu.hasAttribute('hidden'), 'menú móvil visible sin JS')
  }
  const langLink = [...noJs.querySelectorAll('a[rel=alternate][hreflang]')]
  assert(langLink.length >= 1, 'selector de idioma es un enlace real')
}

/* ---------- 6. Sitemap ---------- */
console.log('\n6 · Sitemap')
const smIndex = read('sitemap-index.xml')
const smFile = smIndex.match(/sitemap-\d+\.xml/)?.[0]
assert(Boolean(smFile), 'sitemap-index.xml referencia un sitemap')
if (smFile) {
  const sm = read(smFile)
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort()
  const expectedLocs = EXPECTED.map((e) => abs(e.path)).sort()
  assert(
    JSON.stringify(locs) === JSON.stringify(expectedLocs),
    `contiene exactamente el conjunto indexable (${locs.length} URLs)`,
  )
}

/* ---------- Compatibilidad: URLs y assets que no pueden desaparecer ---------- */
console.log('\n· Compatibilidad')
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
