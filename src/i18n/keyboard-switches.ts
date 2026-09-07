import type { Lang } from './ui'

const labels = {
  en: {
    linear: 'Linear (Thock)',
    clicky: 'Clicky (Crisp)',
    tactile: 'Tactile (Pop)',
  },
  es: {
    linear: 'Lineal (sonido grave)',
    clicky: 'Con clic (sonido nítido)',
    tactile: 'Táctil (sonido seco)',
  },
} as const

export const keyboardSwitchLabels = (lang: Lang) => labels[lang]
