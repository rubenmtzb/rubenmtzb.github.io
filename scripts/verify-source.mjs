#!/usr/bin/env node
/**
 * Conventions that are only visible in the source.
 *
 * The other two verifiers look at what comes out of the build. This one looks at
 * how what goes in is written, because some rules leave no trace in the HTML:
 * two different routes to translating produce exactly the same page, and one of
 * the two is still redundant.
 *
 * Every rule here was born from a real drift, not from a preference.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
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

/* ---------- Language is resolved in the dictionary, not in the view ---------- */
/*
 * There were at one point eighty-four `lang === 'es' ? … : …` scattered through
 * the markup, living alongside `t(lang, key)`. Both routes worked, so nothing
 * separated them beyond the judgement of whoever touched the file that day, and
 * half the sentences ended up outside the dictionary where they get reviewed.
 */
console.log('\n· Language')
const views = sources('src/components', ['.astro'])
  .concat(sources('src/layouts', ['.astro']), sources('src/pages', ['.astro']))
const inlineLang = views
  .map((file) => ({ file, hits: (readFileSync(file, 'utf8').match(/lang === '(?:en|es)'/g) ?? []).length }))
  .filter((entry) => entry.hits > 0)
assert(
  inlineLang.length === 0,
  `no view decides the language on its own${
    inlineLang.length ? ` — these do: ${inlineLang.map((e) => `${e.file} (${e.hits})`).join(', ')}` : ''
  }`,
)

/* ---------- Both tables of the dictionary describe the same thing ---------- */
/*
 * `ui.ts` is written by hand and grows on both sides. A key that exists in only
 * one language still compiles — the type comes from the English side — but
 * blows up when it is asked for from the other language's page.
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
  `all ${enKeys.size} keys exist in both languages${
    onlyEn.length ? ` — English only: ${onlyEn.join(', ')}` : ''
  }${onlyEs.length ? ` — Spanish only: ${onlyEs.join(', ')}` : ''}`,
)

/* ---------- No key in the dictionary is redundant ---------- */
/*
 * An entry nobody asks for any more sits there demanding a translation every
 * time the language gets reviewed. Computed accesses — `about.group.${g}` — are
 * counted too, by their prefix.
 */
/* From `ui.ts` everything counts except the two tables: the keys `V2_NAV` names
   are real consumption, the tables' keys are the declaration. */
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
assert(unused.length === 0, `no key without a consumer${unused.length ? ` — redundant: ${unused.join(', ')}` : ''}`)

/* ---------- The V2's colour comes from the palette ---------- */
/*
 * The V2 has its palette in `styles/v2/tokens.css`, but it had no status
 * colours, so each component picked whichever Tailwind one sounded right:
 * `emerald-400` here, `amber-500` there, and `rgba(111,227,255,.2)` written by
 * hand wherever cyan with alpha was needed. Forty-four loose decisions and
 * nowhere to change them all at once.
 *
 * Tailwind's utilities are still the vehicle — `text-[color:var(…)]` — but the
 * value has to come from a token. The V1 stays out: it is the documentary
 * version and has an identity of its own, in green.
 */
console.log('\n· Colour')
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
  `no V2 colour is improvised outside the palette${improvised.length ? ` — these do: ${improvised.join('; ')}` : ''}`,
)

/* ---------- Every repository link names the current account ---------- */
/*
 * The GitHub account was renamed and the old handle stayed behind in the
 * profile, in the projects, in two views, in the README and — printed, where
 * nobody looks again — inside both CV PDFs. Every one of those links kept
 * working, which is the trap: they only resolve through GitHub's courtesy
 * redirect from the old name, and that redirect dies the day anyone else
 * registers it. So the handle is checked where it is written and not only where
 * it is rendered, artifacts included. Only the owner segment is matched: the
 * repository is still called rubenmtzb.github.io and that name is legitimate.
 * The stale form is assembled from pieces so the rule never matches itself.
 */
console.log('\n· GitHub identity')
const OWNER = 'rubenitx'
const staleOwner = new RegExp(`github\\.com[/:]${['ruben', 'mtzb'].join('')}\\b`)
const identityFiles = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .stdout.split('\0')
  .filter((file) => file && file !== 'package-lock.json'
    && /\.(astro|ts|mjs|js|json|md|yml|txt|pdf)$/.test(file))
const staleLinks = identityFiles.filter((file) => staleOwner.test(readFileSync(file, 'latin1')))
assert(
  staleLinks.length === 0,
  `every GitHub link names github.com/${OWNER}${
    staleLinks.length ? ` — these still name the old account: ${staleLinks.join(', ')}` : ''
  }`,
)

console.log('\n· Deployable media')
for (const [path, expectedStatus] of [
  ['public/media/transcriber-demo.mp4', 1],
  ['public/media/transcriber-demo-poster.jpg', 1],
  ['public/media/transcriber-demo-silent.mp4', 1],
  ['public/media/transcriber-demo-music-original.mp4', 1],
  ['public/media/transcriber-demo-guided-original.mp4', 1],
  ['public/media/finance-core-demo.mp4', 1],
  ['public/media/finance-core-demo-poster.jpg', 1],
  ['public/media/finance-core-demo-original.mp4', 1],
  ['public/media/finance-core-demo-original-poster.jpg', 1],
  ['public/media/mutation-portal-demo.mp4', 1],
  ['public/media/mutation-portal-demo-poster.jpg', 1],
  ['public/media/unpublished-recording.mp4', 0],
  ['personal-photo.JPG', 0],
]) {
  const result = spawnSync('git', ['check-ignore', '--no-index', '-q', path], { encoding: 'utf8' })
  assert(
    result.status === expectedStatus,
    `${path} is ${expectedStatus === 1 ? 'available to Git for deployment' : 'kept private by ignore rules'}${
      result.error || result.status === 128 ? ` — ${result.error?.message ?? result.stderr.trim()}` : ''
    }`,
  )
}

console.log(`\n${'─'.repeat(52)}`)
if (failures > 0) {
  console.error(`❌ ${failures} deviation(s) across ${checks + failures} conventions`)
  process.exit(1)
}
console.log(`✅ ${checks} source conventions upheld`)
