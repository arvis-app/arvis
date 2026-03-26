import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'

const STEPS = [
  {
    number: 1,
    label: 'Brief Schreiber',
    title: 'KI korrigiert Ihre Briefe',
    description: 'Fügen Sie einen Arztbrief ein — Arvis korrigiert Grammatik, Stil und Fachsprache in Sekunden. Auch Umformulierung und Zusammenfassung möglich.',
    shortcut: { label: 'Jetzt ausprobieren', path: '/briefschreiber' },
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  {
    number: 2,
    label: 'Scan & Analyse',
    title: 'Dokumente scannen & analysieren',
    description: 'Fotografieren Sie einen Befund, ein Labor oder ein Rezept — die KI extrahiert automatisch Patient, Diagnose und Therapie.',
    shortcut: { label: 'Zum Scanner', path: '/scan' },
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
  },
  {
    number: 3,
    label: 'Bausteine',
    title: 'Textbausteine wiederverwenden',
    description: 'Speichern Sie häufige Formulierungen als Bausteine und fügen Sie sie per Klick in jeden Brief ein — spart täglich Zeit.',
    shortcut: { label: 'Zu den Bausteinen', path: '/bausteine' },
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="6" height="6" rx="1"/><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/>
        <rect x="2" y="10" width="6" height="6" rx="1"/><rect x="9" y="10" width="6" height="6" rx="1"/><rect x="16" y="10" width="6" height="6" rx="1"/>
      </svg>
    ),
  },
]

async function markOnboardingComplete(userId) {
  await supabase.from('users').update({ onboarding_completed: true }).eq('id', userId)
}

export default function Onboarding() {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  async function handleFinish() {
    if (user) await markOnboardingComplete(user.id)
    await updateProfile({ onboarding_completed: true })
    navigate('/dashboard', { replace: true })
  }

  async function handleShortcut(path) {
    if (user) await markOnboardingComplete(user.id)
    await updateProfile({ onboarding_completed: true })
    navigate(path, { replace: true })
  }

  return (
    <div className="onboarding-wrapper">

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#D94B0A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Willkommen bei Arvis
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
          Schnellstart in 3 Schritten
        </div>
      </div>

      {/* Progress tabs */}
      <div className="onboarding-tabs">
        {STEPS.map((s, i) => (
          <button
            key={i}
            className={`onboarding-tab${i === step ? ' onboarding-tab--active' : i < step ? ' onboarding-tab--done' : ''}`}
            onClick={() => setStep(i)}
          >
            <span className="onboarding-tab-num">{i < step ? '✓' : i + 1}</span>
            <span className="onboarding-tab-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="onboarding-card">
        <div className="onboarding-card-body">
          <div className="onboarding-icon">{currentStep.icon}</div>
          <h2 className="onboarding-title">{currentStep.title}</h2>
          <p className="onboarding-description">{currentStep.description}</p>
          <button
            className="onboarding-shortcut-btn"
            onClick={() => handleShortcut(currentStep.shortcut.path)}
          >
            {currentStep.shortcut.label} →
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="onboarding-nav">
        {step > 0 ? (
          <button className="onboarding-btn-secondary" onClick={() => setStep(s => s - 1)}>
            ← Zurück
          </button>
        ) : <div />}
        {isLast ? (
          <button className="onboarding-btn-primary" onClick={handleFinish}>
            Loslegen
          </button>
        ) : (
          <button className="onboarding-btn-primary" onClick={() => setStep(s => s + 1)}>
            Weiter →
          </button>
        )}
      </div>

    </div>
  )
}
