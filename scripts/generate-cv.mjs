#!/usr/bin/env node
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { cvFingerprint, sha256 } from './cv-artifacts.mjs'

const [originArgument, playwrightModule] = process.argv.slice(2)
assert(originArgument && playwrightModule, 'Usage: npm run cv:pdf -- LOCAL_PREVIEW_ORIGIN PLAYWRIGHT_MODULE')
const origin = new URL(originArgument)
assert(origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname),
  'PDF generation only accepts a local HTTP preview')
const { chromium } = await import(pathToFileURL(resolve(playwrightModule)).href)
const dist = resolve('dist')
const temporary = mkdtempSync(join(tmpdir(), 'portfolio-cv-'))
const browser = await chromium.launch({ headless: true })
const outputs = []
const normalize = text => text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()

try {
  for (const lang of ['en', 'es']) {
    const route = lang === 'es' ? '/es/cv/' : '/cv/'
    const filename = `CV_RubenMartinez_${lang.toUpperCase()}.pdf`
    const html = readFileSync(join(dist, route, 'index.html'), 'utf8')
    const fingerprint = cvFingerprint(html, dist)
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: Math.floor((210 - 28) * 96 / 25.4), height: 1100 },
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`))
    await context.route('**/*', routeRequest => {
      if (new URL(routeRequest.request().url()).origin !== origin.origin) {
        errors.push(`Unexpected external request: ${routeRequest.request().url()}`)
        return routeRequest.abort()
      }
      return routeRequest.continue()
    })
    assert.equal((await page.goto(new URL(route, origin).href)).status(), 200)
    await page.emulateMedia({ media: 'print' })
    await page.evaluate(() => document.fonts.ready)
    assert.equal(cvFingerprint(await page.content(), dist), fingerprint, 'Preview does not match dist; restart the current build preview')
    assert.deepEqual(errors, [], 'CV must load without browser or network errors')
    const documentInfo = await page.evaluate(() => {
      const sheets = [...document.querySelectorAll('[data-cv-sheet]')]
      return {
        lang: document.documentElement.lang,
        title: document.title,
        words: document.querySelector('.cv-document').innerText.trim().split(/\s+/).length,
        heights: sheets.map(sheet => sheet.getBoundingClientRect().height),
        text: [...document.querySelectorAll('.cv-document h1, .cv-document h2, .cv-document h3, .cv-document p, .cv-bullets li, .cv-languages li, .cv-contact a, .cv-project-links a')]
          .map(element => element.innerText.trim()).filter(Boolean),
        links: [...document.querySelectorAll('.cv-document a[href]')].map(link => link.href),
        fonts: [...document.fonts].filter(font => font.status === 'error').map(font => font.family),
      }
    })
    assert.equal(documentInfo.lang, lang)
    assert.deepEqual(documentInfo.fonts, [], 'All CV fonts must load')
    assert.equal(documentInfo.heights.length, 1)
    assert(documentInfo.words <= 360, `${lang}: the focused CV exceeds the 360-word content budget (${documentInfo.words})`)
    const printableHeight = (297 - 28) * 96 / 25.4
    for (const [index, height] of documentInfo.heights.entries()) {
      assert(height <= printableHeight, `${lang}: CV sheet ${index + 1} is ${height.toFixed(1)}px, above the ${printableHeight.toFixed(1)}px A4 content area`)
    }
    const path = join(temporary, filename)
    await page.pdf({
      path, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true,
      displayHeaderFooter: false,
    })
    const info = execFileSync('pdfinfo', [path], { encoding: 'utf8' })
    assert.match(info, /Pages:\s+1\b/)
    assert.match(info, /Tagged:\s+yes\b/)
    const dimensions = info.match(/Page size:\s+([\d.]+) x ([\d.]+) pts \(A4\)/)
    assert(dimensions && Math.abs(Number(dimensions[1]) - 595.28) < 1
      && Math.abs(Number(dimensions[2]) - 841.89) < 1, 'PDF page size must be A4 within Chromium point rounding')
    for (const options of [[], ['-layout']]) {
      const text = normalize(execFileSync('pdftotext', [...options, path, '-'], { encoding: 'utf8' }))
      for (const expected of documentInfo.text) {
        assert(text.includes(normalize(expected)), `${lang}: missing or fragmented PDF text: ${expected}`)
      }
    }
    const urls = execFileSync('pdfinfo', ['-url', path], { encoding: 'utf8' })
    for (const href of documentInfo.links) assert(urls.includes(href), `${lang}: missing PDF hyperlink: ${href}`)
    const fonts = execFileSync('pdffonts', [path], { encoding: 'utf8' }).trim().split('\n').slice(2)
    assert(fonts.length > 0 && fonts.every(line => /\byes\s+yes\s+yes\b/.test(line)),
      'Every PDF font must be embedded, subsetted and Unicode-mapped')
    const pdf = readFileSync(path)
    outputs.push({
      lang, file: filename, sha256: sha256(pdf), documentSha256: fingerprint,
      bytes: pdf.length, pages: 1, words: documentInfo.words, tagged: true, title: documentInfo.title,
      textChecks: documentInfo.text.length, links: [...new Set(documentInfo.links)].length,
      sheetHeights: documentInfo.heights.map(height => Math.round(height)),
    })
    console.log(`${filename}: 1 tagged A4 page, ${documentInfo.words} words, ${pdf.length} bytes; all text, links and fonts verified`)
    await context.close()
  }
  // Publish the pair only once both languages have passed all validation gates.
  for (const output of outputs) copyFileSync(join(temporary, output.file), join('public/cv', output.file))
  writeFileSync('public/cv/manifest.json', `${JSON.stringify({ version: 1, chromium: browser.version(), documents: outputs }, null, 2)}\n`)
} finally {
  await browser.close()
  rmSync(temporary, { recursive: true, force: true })
}
