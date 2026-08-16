// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

/**
 * Gramática de URLs: /[experiencia]/[idioma]/[ruta]/
 *
 * Fase 2 (provisional, Estrategia A):
 *   /        V1 EN     /es/        V1 ES
 *   /cv/     CV EN     /es/cv/     CV ES
 *
 * Fase 5 (intercambio): V2 pasa a / y /es/, V1 baja a /v1/ y /v1/es/.
 * /v1/es/ se resolverá con estructura de ficheros explícita, nunca con el
 * helper de i18n, que produciría /es/v1/.
 */
export default defineConfig({
  site: 'https://rubenitx.me',
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: { prefixDefaultLocale: false },
  },
  // Tailwind es CSS puro: cero runtime de framework en el cliente.
  vite: { plugins: [tailwindcss()] },
  integrations: [
    sitemap({
      // El sitemap contiene exactamente el conjunto indexable, ni una URL de más.
      filter: (page) => !page.includes('/preview/'),
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', es: 'es' },
      },
    }),
  ],
})
