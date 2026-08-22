import { readdir, readFile, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'

/**
 * Pruning of the originals the bundler emits but nobody requests.
 *
 * Every image under `src/assets/` enters the graph as a module, so Vite copies
 * the original file into `_astro/` on top of the cuts `astro:assets` actually
 * generates. The HTML only links the cuts: the original stays in the deployment
 * artifact without a single page ever asking for it — over 20 MB on this site,
 * all of it photographs that already travel optimised by another route.
 *
 * Once the build finishes, every file name quoted in the textual output — HTML,
 * CSS, JS, sitemap, manifest — is collected, and any image nobody quotes is
 * deleted from `_astro/`.
 *
 * Three deliberate fences so this can never delete too much:
 *   1. It only looks inside the generated assets directory. Anything coming
 *      from `public/` is copied as-is and never touched.
 *   2. It only deletes image formats: the rest of `_astro/` is code.
 *   3. It only deletes when the file's exact name appears nowhere in the
 *      output.
 */

/** Files where a reference to an asset can live. */
const TEXT_OUTPUT = /\.(html|css|js|mjs|xml|json|txt|webmanifest)$/

/** Only images are pruned: the rest of `_astro/` is code and is always linked. */
const PRUNABLE_IMAGE = /\.(png|jpe?g|webp|avif|gif|tiff?|svg)$/i

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      return entry.isDirectory() ? walk(path) : Promise.resolve([path])
    }),
  )
  return nested.flat()
}

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

export default function pruneUnusedAssets(): AstroIntegration {
  return {
    name: 'prune-unused-assets',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir)
        const output = await walk(root)

        const referenced = new Set<string>()
        await Promise.all(
          output
            .filter((file) => TEXT_OUTPUT.test(file))
            .map(async (file) => {
              const text = await readFile(file, 'utf8')
              for (const [name] of text.matchAll(/[\w.-]+\.[a-z0-9]{2,5}\b/gi)) referenced.add(name)
            }),
        )

        const generated = await walk(join(root, '_astro'))
        const orphans = generated.filter(
          (file) => PRUNABLE_IMAGE.test(file) && !referenced.has(basename(file)),
        )

        let bytes = 0
        for (const orphan of orphans) {
          bytes += (await stat(orphan)).size
          await rm(orphan)
        }

        if (orphans.length > 0) {
          logger.info(`pruned ${orphans.length} unreferenced originals (${megabytes(bytes)})`)
        }
      },
    },
  }
}
