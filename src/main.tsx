/*
  main.tsx — the very first file that runs in the browser.
  It finds the <div id="root"> in index.html and draws our React app into it.
*/
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import App from './App'
import { applyPageClass } from './perf/quality'

// Mark the page as 'fast' graphics if this computer needs it (switches off decorative motion).
applyPageClass()

createRoot(document.getElementById('root')!).render(
  // StrictMode runs extra checks during development to catch bugs early.
  // It has no effect on the published site.
  <StrictMode>
    {/* BrowserRouter lets us have real page URLs like /protein and /reaction. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
