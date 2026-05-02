import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

const root = createRoot(document.getElementById('root'));

// ── Axe-core Dev-Only A11y Scanner ──────────────────────────────────────────
// Automatically detects accessibility violations and prints them to the
// browser console during development. Zero bundle impact in production.
if (import.meta.env.DEV) {
  import('@axe-core/react').then(({ default: axe }) => {
    axe(import('react'), import('react-dom'), 1000);
  }).catch(() => {
    // axe is optional — silently skip if unavailable
  });
}

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
