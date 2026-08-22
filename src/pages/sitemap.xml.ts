import { getCollection } from 'astro:content'
import { abs } from '../lib/content'
import { DEFAULT_LANG } from '../i18n/ui'

/**
 * Sitemap generated at the historical URL /sitemap.xml.
 *
 * It is generated here instead of with @astrojs/sitemap for two reasons: the
 * integration produces `sitemap-index.xml`, which would abandon a URL that
 * already existed; and here the set comes straight from the pages marked as
 * indexable, so it cannot drift away from the SEO contract.
 *
 * This is the only sitemap: there is no second one that could contradict it.
 */
export const GET = async () => {
  const pages = (await getCollection('pages')).map((e) => e.data).filter((p) => p.indexable)

  // Groups by cluster so each URL can emit its language alternatives.
  const clusters = new Map<string, typeof pages>()
  for (const page of pages) {
    clusters.set(page.key, [...(clusters.get(page.key) ?? []), page])
  }

  const urls = pages
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((page) => {
      const siblings = clusters.get(page.key) ?? []
      const xDefault = siblings.find((s) => s.lang === DEFAULT_LANG) ?? siblings[0]
      const alternates = [
        ...siblings.map((s) => `    <xhtml:link rel="alternate" hreflang="${s.lang}" href="${abs(s.path)}"/>`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(xDefault.path)}"/>`,
      ].join('\n')
      return `  <url>\n    <loc>${abs(page.path)}</loc>\n${alternates}\n  </url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
