import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function ResetPasswordModal() {
  const navigate = useNavigate()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

  async function handleSubmit() {
    setError('')
    if (!password)              { setError('Bitte neues Passwort eingeben.'); return }
    if (password.length < 6)    { setError('Das Passwort muss mindestens 6 Zeichen lang sein.'); return }
    if (password !== confirm)   { setError('Die Passwörter stimmen nicht überein.'); return }

    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (e) {
      setError(e.message || 'Fehler beim Ändern des Passworts.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '40px 36px', width: '100%', maxWidth: 400,
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
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
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Neues Passwort festlegen
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>
            Geben Sie Ihr neues Passwort ein.
          </p>
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
  )
}
