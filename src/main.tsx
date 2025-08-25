import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppFirebase from './AppFirebase.tsx'
import { DocumentProvider } from './context/DocumentContextFirebase'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DocumentProvider>
      <AppFirebase />
    </DocumentProvider>
  </StrictMode>,
)
