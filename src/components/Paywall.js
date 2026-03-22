import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'

export default function Paywall({ children }) {
  const { isPro, getPlanInfo, profile } = useAuth()
  const [loading, setLoading]  = useState(false)

  const planInfo = getPlanInfo()

  if (isPro) {
    return children
  }

  const handleUpgrade = async () => {
    try {
      setLoading(true)

      // Si l'utilisateur a déjà un stripe_customer_id → portal (gestion d'abonnement existant)
      if (profile?.stripe_customer_id) {
        const { data, error, response } = await supabase.functions.invoke('create-portal-session', {
          body: { returnUrl: window.location.href }
        })
        if (error) {
          // Lire le corps de la réponse pour le vrai message d'erreur
          let msg = error.message
          try {
            if (response) {
              const body = await response.text()
              msg += ' | Response: ' + body
            }
          } catch {}
          throw new Error(msg)
        }
        if (data?.error) throw new Error(data.error)
        if (data?.url) { window.location.href = data.url; return }
      }

      // Sinon → checkout (nouvel abonnement)
      const priceId = process.env.REACT_APP_STRIPE_PRICE_MONTHLY
      if (!priceId) {
        throw new Error('REACT_APP_STRIPE_PRICE_MONTHLY ist nicht konfiguriert')
      }

      const { data, error, response } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId }
      })
      if (error) {
        // Lire le corps de la réponse pour le vrai message d'erreur
        let msg = error.message
        try {
          if (response) {
            const body = await response.text()
            msg += ' | Status: ' + response.status + ' | Response: ' + body
          }
        } catch {}
        throw new Error(msg)
      }
      if (data?.error) throw new Error(data.error)
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('Keine Checkout-URL erhalten. Data: ' + JSON.stringify(data))
      }
    } catch (err) {
      console.error('Checkout error:', err)
      alert('Fehler: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="layout-content" style={{ padding: '40px' }}>
      <div className="section-header" style={{ marginBottom: 40, textAlign: 'center' }}>
        <h1 className="section-title">Abonnement Erforderlich ✨</h1>
        <p className="section-subtitle">Schalten Sie alle Funktionen von Arvis frei</p>
      </div>

      <div style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '50px 40px',
        textAlign: 'center',
        maxWidth: 500,
        margin: '0 auto'
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 32,
          background: 'rgba(226, 184, 10, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
          {planInfo.plan === 'canceled'
            ? 'Ihr Abonnement wurde gekündigt'
            : 'Ihr Probemonat ist abgelaufen'}
        </h2>

        <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          {planInfo.plan === 'canceled'
            ? 'Ihr vorheriges Abonnement ist nicht mehr aktiv. Um weiterhin Zugriff auf Brief Schreiber, Scan & Analyse und Premium-Funktionen zu haben, reaktivieren Sie bitte Ihr Abonnement.'
            : 'Um weiterhin Zugriff auf Brief Schreiber, Scan & Analyse und andere Premium-Funktionen zu haben, upgraden Sie bitte auf Arvis Pro.'}
        </p>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            background: 'var(--accent)',
            color: '#000',
            border: 'none',
            padding: '14px 28px',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'DM Sans, sans-serif'
          }}
        >
          {loading ? 'Laden...' : 'Abonnement Verwalten'}
          {!loading && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
        </button>
      </div>
    </div>
  )
}
