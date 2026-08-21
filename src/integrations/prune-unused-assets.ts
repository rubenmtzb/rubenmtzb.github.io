import { readdir, readFile, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'

/**
 * Poda de los originales que el empaquetado emite pero nadie pide.
 *
 * Cada imagen de `src/assets/` entra en el grafo como un módulo, así que
 * Vite copia el fichero original a `_astro/` además de los cortes que
 * `astro:assets` genera de verdad. El HTML solo enlaza los cortes: el
 * original se queda en el artefacto de despliegue sin que ninguna página lo
 * llegue a pedir jamás — más de 20 MB en este sitio, todo en fotografías
 * que ya viajan optimizadas por otro lado.
 *
 * Al terminar el build se recogen todos los nombres de fichero citados en
 * la salida de texto —HTML, CSS, JS, sitemap, manifest— y se borra de
 * `_astro/` la imagen que no cita nadie.
 *
 * Tres cercos deliberados para que esto no pueda borrar de más:
 *   1. Solo mira dentro del directorio de assets generados. Lo que viene de
 *      `public/` se copia tal cual y no se toca nunca.
 *   2. Solo borra formatos de imagen: el resto de `_astro/` es código.
 *   3. Solo borra si el nombre exacto del fichero no aparece en ninguna
 *      parte de la salida.
 */

/** Ficheros donde puede vivir la referencia a un asset. */
const TEXT_OUTPUT = /\.(html|css|js|mjs|xml|json|txt|webmanifest)$/

/** Solo se poda imagen: el resto de `_astro/` es código y siempre se enlaza. */
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
          logger.info(`podados ${orphans.length} originales sin referenciar (${megabytes(bytes)})`)
        }
      },
    },
  }
}
