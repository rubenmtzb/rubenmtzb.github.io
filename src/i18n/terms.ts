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
  /* Labels for a part's references: where to buy it or where to read about it. */
  'Topre switch': 'Interruptor Topre',
  'Topre patent': 'Patente de Topre',
  'Corne build guide': 'Guía de montaje de Corne',
}

/**
 * Localises editorial concepts that double as technical keys. Proper names of
 * technologies are returned untouched.
 */
export function localizedTerm(term: string, lang: Lang): string {
  return lang === 'es' ? (SPANISH_TERMS[term] ?? term) : term
}

const CANONICAL_TERMS = new Map(
  Object.entries(SPANISH_TERMS).map(([english, spanish]) => [spanish, english]),
)

/**
 * Returns the term in its canonical English form, which is the key the site's
 * registries — the technology one, for a start — index every concept by.
 *
 * It is needed because the Spanish rows of the content write the tag already
 * translated. Without this step "Ingeniería de prompts" never found its entry,
 * and the Spanish version silently lost the logo and the link the English one
 * kept.
 */
export function canonicalTerm(term: string): string {
  return CANONICAL_TERMS.get(term) ?? term
}
