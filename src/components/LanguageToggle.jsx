import { Globe } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage()

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="flex items-center gap-2 rounded-full border border-green-500/20 bg-black/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-green-300/80 backdrop-blur-sm transition hover:border-green-300/40 hover:bg-green-500/10 hover:text-green-100"
      aria-label={language === 'en' ? 'Switch to Spanish' : 'Cambiar a Inglés'}
      title={language === 'en' ? 'Cambiar a Español' : 'Switch to English'}
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{language === 'en' ? 'ES' : 'EN'}</span>
    </button>
  )
}
