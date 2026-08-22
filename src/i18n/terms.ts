import type { Lang } from './ui'

const SPANISH_TERMS: Record<string, string> = {
  'REST APIs': 'APIs REST',
  'Batch Processing': 'Procesamiento por lotes',
  'System Design': 'Diseño de sistemas',
  'Clean Architecture': 'Arquitectura limpia',
  'Data Visualization': 'Visualización de datos',
  'Smart Contracts': 'Contratos inteligentes',
  'Prompt Engineering': 'Ingeniería de prompts',
  'IT Support': 'Soporte técnico',
  Systems: 'Sistemas',
  Networking: 'Redes',
  Leadership: 'Liderazgo',
  'Team Management': 'Gestión de equipos',
  Operations: 'Operaciones',
  /* Rótulos de las referencias de una pieza: dónde se compra o dónde se lee. */
  'Topre switch': 'Interruptor Topre',
  'Topre patent': 'Patente de Topre',
  'Corne build guide': 'Guía de montaje de Corne',
}

/**
 * Localiza conceptos editoriales usados también como claves técnicas. Los
 * nombres propios de tecnologías se devuelven intactos.
 */
export function localizedTerm(term: string, lang: Lang): string {
  return lang === 'es' ? (SPANISH_TERMS[term] ?? term) : term
}

const CANONICAL_TERMS = new Map(
  Object.entries(SPANISH_TERMS).map(([english, spanish]) => [spanish, english]),
)

/**
 * Devuelve el término en su forma canónica inglesa, que es la clave con la que
 * los registros del sitio —el de tecnologías, sin ir más lejos— indexan cada
 * concepto.
 *
 * Hace falta porque las entradas castellanas del contenido escriben la etiqueta
 * ya traducida. Sin este paso, "Ingeniería de prompts" no encontraba su ficha y
 * la versión española perdía en silencio el logotipo y el enlace que la inglesa
 * sí mostraba.
 */
export function canonicalTerm(term: string): string {
  return CANONICAL_TERMS.get(term) ?? term
}
