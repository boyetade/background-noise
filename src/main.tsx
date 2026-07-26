import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { preloadFonts } from './loadFonts'
import App from './App.tsx'

void preloadFonts()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
