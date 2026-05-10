/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react'

const LanguageContext = createContext(undefined)

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en')

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'en' ? 'es' : 'en'))
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) throw new Error('useLanguage must be used within LanguageProvider')

  return context
}
