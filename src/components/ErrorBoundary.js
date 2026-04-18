import React from 'react'
import * as Sentry from '@sentry/react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
    Sentry.captureException(error, { contexts: { react: info } })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', padding: '40px', gap: 16
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-3)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h3 style={{ color: 'var(--text)', fontWeight: 700, margin: 0 }}>
            Ein Fehler ist aufgetreten
          </h3>
          <p style={{ color: 'var(--text-2)', fontSize: 16, margin: 0, textAlign: 'center' }}>
            {this.state.error?.message || 'Unbekannter Fehler'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: 'var(--accent)', color: '#000', border: 'none',
              padding: '10px 22px', borderRadius: 8, fontWeight: 700,
              fontSize: 16, cursor: 'pointer', fontFamily: 'Inter, sans-serif'
            }}
          >
            Erneut versuchen
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
