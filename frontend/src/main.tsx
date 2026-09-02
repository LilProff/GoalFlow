import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply the persisted theme before React mounts — reading zustand's own
// persisted blob directly (rather than waiting for the store to hydrate)
// avoids a flash of the wrong theme on load for anyone who's picked light.
try {
  const raw = localStorage.getItem('goalflow-ui-state');
  const theme = raw ? JSON.parse(raw)?.state?.theme : null;
  if (theme === 'light') document.documentElement.dataset.theme = 'light';
} catch { /* malformed/blocked storage — default dark theme, no crash */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
