import { getProfile } from '../lib/content'
import { DEFAULT_LANG } from '../i18n/ui'

/**
 * A generated manifest, not a hand-written one.
 *
 * It used to live in public/ with the name, the job title and the description
 * copied by hand, and they had fallen behind: it announced "Full-Stack
 * Developer" while the rest of the site already said "Software Engineer". It
 * comes from the same profile as the home page, the CV and the JSON-LD, so it
 * cannot drift again.
 *
 * The manifest is unique for the whole site, so it uses the default language.
 */
export const GET = async () => {
  const profile = await getProfile(DEFAULT_LANG)

  const manifest = {
    name: `${profile.name} — Portfolio`,
    short_name: 'rubenitx',
    description: profile.bioShort,
    lang: DEFAULT_LANG,
    start_url: '/',
    display: 'standalone',
    background_color: '#030712',
    /*
     * The same colour as the `theme-color` meta in the <head>. It was still on
     * the V1's green, so the browser bar in app mode did not match the one on
     * the site installed from that very page.
     */
    theme_color: '#030712',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  })
}
