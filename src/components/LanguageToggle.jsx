import { memo } from 'react'
import { Globe } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const translations = {
  en: {
    switchAriaLabel: 'Switch to Spanish',
    switchTitle: 'Cambiar a Español',
    nextLanguage: 'ES',
  },
  es: {
    switchAriaLabel: 'Cambiar a Inglés',
    switchTitle: 'Switch to English',
    nextLanguage: 'EN',
  },
}

const LanguageToggle = memo(function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage()
  const t = translations[language]

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="flex items-center gap-2 rounded-full border border-green-500/20 bg-black/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-green-300/80 backdrop-blur-sm transition hover:border-green-300/40 hover:bg-green-500/10 hover:text-green-100"
      aria-label={t.switchAriaLabel}
      title={t.switchTitle}
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{t.nextLanguage}</span>
    </button>
  )
})

export default LanguageToggle
