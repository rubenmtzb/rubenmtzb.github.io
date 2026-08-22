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

console.log(`\n${'─'.repeat(52)}`)
if (failures > 0) {
  console.error(`❌ ${failures} desvío(s) sobre ${checks + failures} convenciones`)
  process.exit(1)
}
console.log(`✅ ${checks} convenciones de fuente respetadas`)
