import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase traite automatiquement le token dans l'URL et crée la session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login', { replace: true })
      } else {
        setSessionReady(true)
      }
    })
  }, [navigate])

  async function handleSubmit() {
    setError('')
    if (!password)            { setError('Bitte neues Passwort eingeben.'); return }
    if (password.length < 6)  { setError('Das Passwort muss mindestens 6 Zeichen lang sein.'); return }
    if (password !== confirm)  { setError('Die Passwörter stimmen nicht überein.'); return }

    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setSuccess(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
    } catch (e) {
      setError(e.message || 'Fehler beim Ändern des Passworts.')
    } finally {
      setLoading(false)
    }
  }

  if (!sessionReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div id="loginPage" style={{ display: 'grid' }}>
      {/* Left panel */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-logo">
            <div className="login-logo-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            Arvis
          </div>
          <div className="login-tagline">Ihr digitaler Klinik-Begleiter</div>
        </div>
        <div className="login-headline">
          <h2>Sicher.<br/>Einfach.<br/>Schnell.</h2>
          <p>Legen Sie Ihr neues Passwort fest und kehren Sie zu Ihrem Arvis-Konto zurück.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-form-container">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 26,
              background: 'rgba(226,184,10,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div className="form-title">Neues Passwort festlegen</div>
            <div className="form-sub">Geben Sie Ihr neues Passwort ein</div>
          </div>

          {success ? (
            <div style={{
              textAlign: 'center', padding: '16px',
              background: 'rgba(46,125,50,0.07)', borderRadius: 8,
              color: '#2e7d32', fontWeight: 600, fontSize: 14
            }}>
              ✓ Passwort erfolgreich geändert — Sie werden weitergeleitet…
            </div>
          ) : (
            <>
              {error && (
                <p style={{
                  margin: '0 0 16px', fontSize: 13, fontWeight: 600, textAlign: 'center',
                  borderRadius: 8, padding: '8px 12px',
                  background: 'rgba(217,75,10,0.07)', color: '#D94B0A'
                }}>
                  {error}
                </p>
              )}

              <div className="form-group">
                <label className="form-label">Neues Passwort</label>
                <div className="form-input-group">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Min. 6 Zeichen"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    style={{ paddingRight: 44 }}
                    autoFocus
                  />
                  <span className="form-input-icon" onClick={() => setShowPw(v => !v)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Passwort bestätigen</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Passwort wiederholen"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              <button
                className="btn-submit"
                onClick={handleSubmit}
                disabled={loading}
                style={{ marginTop: 20 }}
              >
                {loading ? 'Speichern…' : 'Passwort speichern'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
