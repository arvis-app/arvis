import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react'
import { Analytics } from '@vercel/analytics/react'
import App from './App';

// Chunk introuvable après un déploiement (vieux cache index.html) → rechargement
window.addEventListener('vite:preloadError', () => { window.location.reload() })

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
})

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<><App /><Analytics /></>);
