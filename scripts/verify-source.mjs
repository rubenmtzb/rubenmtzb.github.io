#!/usr/bin/env node
/**
 * Convenciones que solo se ven en la fuente.
 *
 * Los otros dos verificadores miran lo que sale del build. Este mira cómo está
 * escrito lo que entra, porque hay reglas que no dejan rastro en el HTML: dos
 * caminos distintos para traducir producen exactamente la misma página, y aun
 * así uno de los dos sobra.
 *
 * Cada regla de aquí nace de un desvío real, no de un gusto.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

let failures = 0
let checks = 0
const assert = (cond, msg) => {
  if (cond) { checks++; console.log(`  ✓ ${msg}`) }
  else { failures++; console.error(`  ✗ ${msg}`) }
}

const sources = (dir, ext) => {
  const out = []
  ;(function walk(d) {
    for (const entry of readdirSync(d)) {
      const path = join(d, entry)
      if (statSync(path).isDirectory()) walk(path)
      else if (ext.some((e) => entry.endsWith(e))) out.push(path)
    }
  })(dir)
  return out
}

/* ---------- El idioma se resuelve en el diccionario, no en la vista ---------- */
/*
 * Llegó a haber ochenta y cuatro `lang === 'es' ? … : …` repartidos por el
 * marcado, conviviendo con `t(lang, clave)`. Las dos vías funcionaban, así que
 * nada las separaba salvo el criterio de quien tocara el fichero ese día, y la
 * mitad de las frases quedaba fuera del diccionario donde se revisan.
 */
console.log('\n· Idioma')
const views = sources('src/components', ['.astro'])
  .concat(sources('src/layouts', ['.astro']), sources('src/pages', ['.astro']))
const inlineLang = views
  .map((file) => ({ file, hits: (readFileSync(file, 'utf8').match(/lang === '(?:en|es)'/g) ?? []).length }))
  .filter((entry) => entry.hits > 0)
assert(
  inlineLang.length === 0,
  `ninguna vista decide el idioma por su cuenta${
    inlineLang.length ? ` — lo hacen: ${inlineLang.map((e) => `${e.file} (${e.hits})`).join(', ')}` : ''
  }`,
)

/* ---------- Las dos tablas del diccionario describen lo mismo ---------- */
/*
 * `ui.ts` se escribe a mano y crece por los dos lados. Una clave que solo
 * exista en un idioma compila igual —el tipo sale de la tabla inglesa— pero
 * revienta al pedirla desde la otra portada.
 */
const ui = readFileSync('src/i18n/ui.ts', 'utf8')
const tables = [...ui.matchAll(/^ {2}(en|es): \{$/gm)].map((m) => ({ lang: m[1], at: m.index }))
const keysOf = (from, to) =>
  new Set([...ui.slice(from, to).matchAll(/^ {4}'([^']+)':/gm)].map((m) => m[1]))
const enKeys = keysOf(tables[0].at, tables[1].at)
const esKeys = keysOf(tables[1].at, ui.length)
const onlyEn = [...enKeys].filter((k) => !esKeys.has(k))
const onlyEs = [...esKeys].filter((k) => !enKeys.has(k))
assert(
  onlyEn.length === 0 && onlyEs.length === 0,
  `las ${enKeys.size} claves existen en los dos idiomas${
    onlyEn.length ? ` — solo en inglés: ${onlyEn.join(', ')}` : ''
  }${onlyEs.length ? ` — solo en castellano: ${onlyEs.join(', ')}` : ''}`,
)

/* ---------- Ninguna clave del diccionario sobra ---------- */
/*
 * Una entrada que ya no pide nadie se queda ahí pidiendo traducción cada vez
 * que se revisa el idioma. Se cuentan también los accesos calculados
 * —`about.group.${g}`— por su prefijo.
 */
/* De `ui.ts` cuenta todo menos las dos tablas: las claves que nombra `V2_NAV`
   son consumo real, las de las tablas son la declaración. */
const uiOutsideTables = ui.slice(0, tables[0].at)
const consumers = sources('src', ['.astro', '.ts'])
  .filter((f) => !f.endsWith('i18n/ui.ts'))
  .map((f) => readFileSync(f, 'utf8'))
  .concat(uiOutsideTables)
  .join('\n')
const unused = [...enKeys].filter((key) => {
  if (consumers.includes(`'${key}'`)) return false
  const prefix = key.slice(0, key.lastIndexOf('.') + 1)
  return !consumers.includes(`\`${prefix}$`)
})
assert(unused.length === 0, `ninguna clave sin consumidor${unused.length ? ` — sobran: ${unused.join(', ')}` : ''}`)

/* ---------- El color de la V2 sale de la paleta ---------- */
/*
 * La V2 tiene su paleta en `styles/v2/tokens.css`, pero no tenía colores de
 * estado, así que cada componente elegía el de Tailwind que le sonaba bien:
 * `emerald-400` aquí, `amber-500` allá, y `rgba(111,227,255,.2)` escrito a
 * mano donde hacía falta cian con alfa. Cuarenta y cuatro decisiones sueltas
 * y ningún sitio donde cambiarlas de una vez.
 *
 * Las utilidades de Tailwind siguen siendo el vehículo —`text-[color:var(…)]`—
 * pero el valor tiene que venir de un token. La V1 queda fuera: es la versión
 * documental y tiene su propia identidad en verde.
 */
console.log('\n· Color')
const STOCK_COLOURS = /\b(?:text|bg|border|from|via|to|shadow|ring|fill|stroke|decoration|outline|accent|caret|divide)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g
const RAW_COLOURS = /(?:class|style)(?::list)?=[""'`{][^""'`]*?(#[0-9a-fA-F]{3,8}\b|rgba?\([\d\s.,]+\))/g

const improvised = sources('src/components/v2', ['.astro']).flatMap((file) => {
  const text = readFileSync(file, 'utf8')
  const stock = [...text.matchAll(STOCK_COLOURS)].map((m) => m[0])
  const raw = [...text.matchAll(RAW_COLOURS)].map((m) => m[1])
  const found = [...new Set([...stock, ...raw])]
  return found.length ? [`${file} (${found.slice(0, 3).join(', ')})`] : []
})
assert(
  improvised.length === 0,
  `ningún color de la V2 se improvisa fuera de la paleta${improvised.length ? ` — lo hacen: ${improvised.join('; ')}` : ''}`,
)

console.log(`\n${'─'.repeat(52)}`)
if (failures > 0) {
  console.error(`❌ ${failures} desvío(s) sobre ${checks + failures} convenciones`)
  process.exit(1)
}
console.log(`✅ ${checks} convenciones de fuente respetadas`)
