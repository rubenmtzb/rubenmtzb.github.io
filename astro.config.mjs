// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import pruneUnusedAssets from './src/integrations/prune-unused-assets'
import { DEFAULT_LANG, LANGS, SITE } from './src/site.config'

/**
 * URL grammar: /[experience]/[language]/[path]/
 *
 * Phase 2 (provisional, Strategy A):
 *   /        V1 EN     /es/        V1 ES
 *   /cv/     CV EN     /es/cv/     CV ES
 *
 * Phase 5 (the swap): the V2 moves to / and /es/, the V1 drops to /v1/ and
 * /v1/es/. /v1/es/ will be resolved with an explicit file structure, never with
 * the i18n helper, which would produce /es/v1/.
 */
export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: DEFAULT_LANG,
    locales: [...LANGS],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [pruneUnusedAssets()],
  // Tailwind is pure CSS: zero framework runtime on the client.
  vite: { plugins: [tailwindcss()] },
})
