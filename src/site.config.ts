/**
 * Constantes compartidas por la configuración de Astro y por el sitio.
 *
 * Son los datos que tenían que coincidir entre ficheros que no se importaban
 * entre sí, así que estaban escritos dos y tres veces: el dominio vivía a la
 * vez en `astro.config.mjs` y en el generador de URLs absolutas, y la lista de
 * idiomas en `astro.config.mjs`, en el esquema de contenido y en i18n. Nada
 * ataba las copias; bastaba con cambiar una para que el resto mintiera en
 * silencio.
 *
 * Este módulo no importa nada a propósito: lo carga el config de Astro antes
 * de que exista `astro:content`, así que no puede depender de él.
 */

/** Dominio canónico. De aquí salen el `site` de Astro y todas las URLs absolutas. */
export const SITE = 'https://rubenitx.me'

/** Idiomas del sitio. El primero es el que vive en la raíz, sin prefijo. */
export const LANGS = ['en', 'es'] as const
export type Lang = (typeof LANGS)[number]
export const DEFAULT_LANG: Lang = LANGS[0]

/**
 * Etiqueta BCP 47 de cada idioma, que es lo que piden Open Graph y compañía.
 * No es texto traducible sino el código del idioma, así que vive con el resto
 * del vocabulario y no en el diccionario de la interfaz.
 */
export const LOCALE_TAGS: Record<Lang, string> = { en: 'en_US', es: 'es_ES' }

/**
 * Agrupación funcional del stack. El orden es el orden en que se pintan los
 * grupos, tanto en la V1 como en el CV.
 */
export const STACK_GROUPS = ['backend', 'frontend', 'devops', 'data', 'practices'] as const
export type StackGroup = (typeof STACK_GROUPS)[number]

/** Nivel de evidencia de cada tecnología del stack. */
export const STACK_TIERS = ['actual', 'historica', 'formacion', 'secundaria'] as const
export type StackTier = (typeof STACK_TIERS)[number]
