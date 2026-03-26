import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react'
import App from './App';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  enabled: !!process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
})

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
