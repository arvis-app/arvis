import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react'
import App from './App';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
})

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
