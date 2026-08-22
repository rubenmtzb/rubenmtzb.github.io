/**
 * Registry of issuing brands: logo and colour identity.
 *
 * It lives next to the technology registry and for the same reason: a brand's
 * visual identity is a fact about the site, not about the component that paints
 * it. It used to sit inside About.astro mixed with each certification's summary,
 * which is content and now comes from the typed collection.
 */

export interface CertBrand {
  /** Path to the logo. Without one, the neutral glyph is painted instead. */
  logo?: string
  /** Background, text, border and glow of the issuer pill. */
  bg: string
  text: string
  border: string
  glow: string
}

/** How a brand looks while it has no identity of its own in the registry. */
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

/** A certification's brand, or the neutral one while it has none. */
export const certBrand = (key: string): CertBrand => CERT_BRANDS[key] ?? NEUTRAL_BRAND

/**
 * The institution's logo. Instituto la Guineueta — DAW and SMX — has no
 * verifiable logo, so it stays out: with no entry, the generic degree icon is
 * painted instead.
 */
const INSTITUTION_LOGOS: Record<string, string> = {
  uoc: '/icons/uoc.svg',
  'inesem-devops': '/icons/inesem.svg',
}

export const institutionLogo = (key: string): string | undefined => INSTITUTION_LOGOS[key]
