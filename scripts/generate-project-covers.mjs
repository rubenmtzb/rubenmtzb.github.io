#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

function translate(svg, labels) {
  const translated = new Set()
  const result = svg.replace(/(<text\b[^>]*>)([^<]*)(<\/text>)/g, (match, open, text, close) => {
    if (!(text in labels)) return match
    translated.add(text)
    return `${open}${labels[text]}${close}`
  })
  if (translated.size !== Object.keys(labels).length) throw new Error('Project cover source labels changed')
  return result
}

const finance = translate(await readFile('src/assets/projects/finance-core.svg', 'utf8'), {
  'PRIVATE / DEMO': 'PRIVADO / DEMO',
  OVERVIEW: 'RESUMEN',
  ACCOUNTS: 'CUENTAS',
  IMPORTS: 'IMPORTACIONES',
  PLANNING: 'PLANIFICACIÓN',
  CRYPTO: 'CRIPTO',
  SPENDING: 'GASTOS',
  'SAVINGS GOALS': 'OBJETIVOS DE AHORRO',
  'REACT / FASTAPI / PRIVATE SOURCE': 'REACT / FASTAPI / CÓDIGO PRIVADO',
})
await writeFile('src/assets/projects/finance-core-es.svg', finance)

const transcriber = translate(await readFile('scripts/artwork/youtube-transcriber-cover.svg', 'utf8'), {
  CAPTIONS: 'SUBTÍTULOS',
  SENTENCES: 'FRASES',
  'NO CAPTIONS': 'SIN SUBTÍTULOS',
  'EN &#8594; ES  &#183;  CAPTIONS FIRST  &#183;  DEEPL': 'EN &#8594; ES  &#183;  SUBTÍTULOS PRIMERO  &#183;  DEEPL',
  'SSE / STAGE: PREPARING_RESULT': 'SSE / ETAPA: PREPARING_RESULT',
  'SEGMENTS / SENTENCE-ALIGNED': 'SEGMENTOS / FRASES ALINEADAS',
  'PERSISTENCE / BROWSER ONLY': 'PERSISTENCIA / SOLO EN NAVEGADOR',
  'LANG / AUTO': 'IDIOMA / AUTO',
  'EXPORT / TXT SRT': 'EXPORTAR / TXT SRT',
})
await writeFile('scripts/artwork/youtube-transcriber-cover-es.svg', transcriber)
await sharp(Buffer.from(transcriber)).png().toFile('src/assets/projects/youtube-transcriber-es.png')
console.log('Generated Spanish project covers from the original editable artwork; English assets unchanged.')
