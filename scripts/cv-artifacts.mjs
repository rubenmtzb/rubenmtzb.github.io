import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseHTML } from 'linkedom'

export const sha256 = value => createHash('sha256').update(value).digest('hex')

/** Include the rendered document and its actual print styles, not build timestamps. */
export function cvFingerprint(html, dist) {
  const { document } = parseHTML(html)
  const cv = document.querySelector('.cv-document')
  if (!cv) throw new Error('Missing CV document; build the portfolio before generating PDFs')
  const title = document.querySelector('title')?.textContent
  const lang = document.documentElement.getAttribute('lang')
  if (!title || !lang) throw new Error('CV requires a document title and language')
  const styles = [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => {
    const url = new URL(link.getAttribute('href'), 'https://cv.invalid')
    if (url.origin !== 'https://cv.invalid') throw new Error('CV styles must be self-hosted')
    return readFileSync(join(dist, url.pathname), 'utf8')
  })
  if (!styles.length) throw new Error('Missing CV print stylesheet')
  return sha256(JSON.stringify({
    title,
    lang,
    document: cv.outerHTML.replace(/\s+/g, ' ').trim(),
    styles,
  }))
}
