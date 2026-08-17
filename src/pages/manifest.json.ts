import { getProfile } from '../lib/content'
import { DEFAULT_LANG } from '../i18n/ui'

/**
 * Manifest generado, no escrito a mano.
 *
 * Antes vivía en public/ con el nombre, el puesto y la descripción copiados
 * a mano, y se habían quedado atrás: anunciaba "Full-Stack Developer" cuando
 * el resto del sitio ya decía "Software Engineer". Sale del mismo perfil que
 * la portada, el CV y el JSON-LD, así que no puede volver a divergir.
 *
 * El manifest es único para todo el sitio, así que usa el idioma por defecto.
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
    theme_color: '#00ff88',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  })
}
