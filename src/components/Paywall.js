import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { invokeEdgeFunction } from '../supabaseClient'
import { logError } from '../utils/logger'

export default function Paywall({ children }) {
  const { isPro, getPlanInfo, profile } = useAuth()
  const [loading, setLoading] = useState(false)

  const planInfo = getPlanInfo()

  if (isPro) {
    return children
  }

  const handleUpgrade = async () => {
    try {
      setLoading(true)

      // Abonné existant avec stripe_customer_id → portail de gestion
      if (profile?.stripe_customer_id) {
        const data = await invokeEdgeFunction('create-portal-session', {
          returnUrl: window.location.href
        })
        if (data?.url) { window.location.href = data.url; return }
      }

      // Nouvel utilisateur → Stripe Checkout
      const priceId = import.meta.env.VITE_STRIPE_PRICE_MONTHLY
      const data = await invokeEdgeFunction('create-checkout-session', { priceId })
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      logError('Paywall.checkout', err)
      alert('Fehler: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-testid="paywall" className="layout-content" style={{ padding: '40px' }}>
      <div className="section-header" style={{ marginBottom: 40, textAlign: 'center' }}>
        <h1 className="section-title">Abonnement Erforderlich</h1>
        <p className="section-subtitle">Schalten Sie alle Funktionen von Arvis frei</p>
      </div>

      <div style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '50px 40px',
        textAlign: 'center',
        maxWidth: 500,
        margin: '0 auto'
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
          {planInfo.plan === 'canceled'
            ? 'Ihr Abonnement wurde gekündigt'
            : 'Ihre 14-tägige Testphase ist abgelaufen'}
        </h2>

        <p style={{ color: 'var(--text-2)', fontSize: 17, lineHeight: 1.6, marginBottom: 32 }}>
          {planInfo.plan === 'canceled'
            ? 'Ihr vorheriges Abonnement ist nicht mehr aktiv. Um weiterhin Zugriff auf Brief Schreiber, Scan & Analyse und Premium-Funktionen zu haben, reaktivieren Sie bitte Ihr Abonnement.'
            : 'Um weiterhin Zugriff auf Brief Schreiber, Scan & Analyse und andere Premium-Funktionen zu haben, upgraden Sie bitte auf Arvis Pro.'}
        </p>

        <button
          data-testid="paywall-upgrade-btn"
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            background: 'var(--orange)',
            color: '#fff',
            border: 'none',
            padding: '14px 28px',
            borderRadius: 6,
            fontSize: 17,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontFamily: 'DM Sans, sans-serif'
          }}
        >
          {loading ? 'Laden...' : 'Jetzt upgraden'}
        </button>
      </div>
    </div>
  )
}
