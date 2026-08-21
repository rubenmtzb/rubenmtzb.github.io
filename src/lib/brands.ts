/**
 * Registro de marcas emisoras: logotipo e identidad de color.
 *
 * Vive junto al registro de tecnologías y por la misma razón: la identidad
 * visual de una marca es un dato del sitio, no del componente que la pinta.
 * Estaba dentro de About.astro mezclada con el resumen de cada certificación,
 * que es contenido y ahora sale de la colección tipada.
 */

export interface CertBrand {
  /** Ruta al logotipo. Sin él se pinta el glifo neutro. */
  logo?: string
  /** Fondo, texto, borde y resplandor de la píldora del emisor. */
  bg: string
  text: string
  border: string
  glow: string
}

/** Aspecto de una marca todavía sin identidad propia en el registro. */
const NEUTRAL_BRAND: CertBrand = {
  bg: 'rgba(91, 155, 255, 0.12)',
  text: '#5b9bff',
  border: 'rgba(91, 155, 255, 0.35)',
  glow: 'rgba(91, 155, 255, 0.2)',
}

const CERT_BRANDS: Record<string, CertBrand> = {
  'claude-code': {
    logo: '/icons/anthropic.svg',
    bg: 'rgba(217, 119, 6, 0.14)',
    text: '#fbbf24',
    border: 'rgba(217, 119, 6, 0.4)',
    glow: 'rgba(251, 191, 36, 0.3)',
  },
  'python-master': {
    logo: '/icons/udemy.svg',
    bg: 'rgba(56, 189, 248, 0.14)',
    text: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.4)',
    glow: 'rgba(56, 189, 248, 0.3)',
  },
  'javascript-master': {
    logo: '/icons/udemy.svg',
    bg: 'rgba(250, 204, 21, 0.14)',
    text: '#facc15',
    border: 'rgba(250, 204, 21, 0.4)',
    glow: 'rgba(250, 204, 21, 0.3)',
  },
  'java-junior': {
    logo: '/icons/esplai.png',
    bg: 'rgba(249, 115, 22, 0.14)',
    text: '#fb923c',
    border: 'rgba(249, 115, 22, 0.4)',
    glow: 'rgba(249, 115, 22, 0.3)',
  },
}

/** Marca de una certificación, o la neutra si todavía no tiene la suya. */
export const certBrand = (key: string): CertBrand => CERT_BRANDS[key] ?? NEUTRAL_BRAND

/**
 * Logotipo del centro de estudios. Instituto la Guineueta —DAW y SMX— no
 * tiene logotipo verificable, así que no entra: sin entrada se pinta el
 * icono genérico de titulación.
 */
const INSTITUTION_LOGOS: Record<string, string> = {
  uoc: '/icons/uoc.svg',
  'inesem-devops': '/icons/inesem.svg',
}

export const institutionLogo = (key: string): string | undefined => INSTITUTION_LOGOS[key]
