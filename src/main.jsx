import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LanguageProvider } from './i18n/LanguageContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
