import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function LoginPage() {
  const { login, register, loginWithGoogle, isResettingPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/dashboard'

  const [tab, setTab]               = useState('login')
  const [error, setError]           = useState('')
  const [info, setInfo]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [showPwLogin, setShowPwLogin]       = useState(false)
  const [showPwRegister, setShowPwRegister] = useState(false)

  // Login state
  const [loginEmail, setLoginEmail]     = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register state
  const [regVorname, setRegVorname]     = useState('')
  const [regNachname, setRegNachname]   = useState('')
  const [regEmail, setRegEmail]         = useState('')
  const [regPassword, setRegPassword]   = useState('')

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('')

  // New password state (reset flow)
  const [newPassword, setNewPassword]     = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [showPwNew, setShowPwNew]         = useState(false)
  const [resetSuccess, setResetSuccess]   = useState(false)

  // Basculer automatiquement sur le formulaire de reset si lien cliqué
  useEffect(() => {
    if (isResettingPassword) setTab('reset')
  }, [isResettingPassword])

  function clearMessages() { setError(''); setInfo('') }

  async function handleLogin() {
    clearMessages()
    if (!loginEmail)    { setError('Bitte E-Mail-Adresse eingeben.'); return }
    if (!loginPassword) { setError('Bitte Passwort eingeben.'); return }
    setLoading(true)
    try {
      await login(loginEmail, loginPassword)
      // La redirection est gérée par PublicRoute (lit redirectAfterLogin depuis sessionStorage)
    } catch {
      setError('E-Mail-Adresse oder Passwort ist falsch.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister() {
    clearMessages()
    if (!regVorname)   { setError('Bitte Vorname eingeben.'); return }
    if (!regNachname)  { setError('Bitte Nachname eingeben.'); return }
    if (!regEmail)     { setError('Bitte E-Mail-Adresse eingeben.'); return }
    if (!regPassword)  { setError('Bitte Passwort eingeben.'); return }
    if (regPassword.length < 6) { setError('Das Passwort muss mindestens 6 Zeichen lang sein.'); return }
    setLoading(true)
    try {
      await register(regEmail, regPassword, regVorname, regNachname)
      setInfo('Bestätigungsmail gesendet — bitte E-Mail prüfen.')
    } catch (e) {
      setError(e.message || 'Fehler bei der Registrierung.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    clearMessages()
    try {
      await loginWithGoogle()
    } catch {
      setError('Google-Anmeldung fehlgeschlagen.')
    }
  }

  async function handleNewPassword() {
    clearMessages()
    if (!newPassword)                 { setError('Bitte neues Passwort eingeben.'); return }
    if (newPassword.length < 6)       { setError('Das Passwort muss mindestens 6 Zeichen lang sein.'); return }
    if (newPassword !== newPasswordConfirm) { setError('Die Passwörter stimmen nicht überein.'); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword })
      if (err) throw err
      setResetSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (e) {
      setError(e.message || 'Fehler beim Ändern des Passworts.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    clearMessages()
    if (!forgotEmail) { setError('Bitte E-Mail-Adresse eingeben.'); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (err) throw err
      setInfo('E-Mail gesendet — bitte prüfen Sie Ihr Postfach.')
      setForgotEmail('')
    } catch (e) {
      setError(e.message || 'Fehler beim Senden der E-Mail.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="loginPage" style={{display:'grid'}}>

      {/* Left panel */}
      <div className="login-left">
        <div className="login-brand">
          <a href="https://www.arvis-app.de/landing_page.html" style={{textDecoration:'none'}}>
            <img src="/arvis-logo.svg" alt="Arvis" style={{ height: 68, display: 'block', filter: 'brightness(0) invert(1)', marginLeft: -10 }} />
          </a>
          <div className="login-tagline">Ihr KI-Assistent</div>
        </div>
        <div className="login-headline">
          <h2>Effizienter.<br/>Präziser.<br/>Sicherer.</h2>
          <p>Arvis unterstützt Sie bei Dokumentation, Briefanalyse und Übersetzung — damit Sie mehr Zeit für Ihre Patienten haben.</p>
        </div>
        <div className="login-features">
          {[
            { icon: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>, text: 'Scan & KI-Analyse in Sekunden' },
            { icon: <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>, text: 'KI-Briefkorrektur auf Profiniveau' },
            { icon: <><rect x="3" y="3" width="18" height="4" rx="1"/><rect x="3" y="10" width="11" height="4" rx="1"/><rect x="3" y="17" width="14" height="4" rx="1"/></>, text: '1.550 vorgefertigte Textbausteine' },
            { icon: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>, text: '1.585 Begriffe in 6 Sprachen' },
            { icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>, text: '100% DSGVO-konform' },
          ].map((f, i) => (
            <div key={i} className="login-feature">
              <div className="login-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
              </div>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-form-container">
          <div className="login-tabs">
            <button className={`login-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); clearMessages() }}>Anmelden</button>
            <button className={`login-tab${tab === 'register' ? ' active' : ''}`} onClick={() => { setTab('register'); clearMessages() }}>Registrieren</button>
          </div>

          {error && (
            <p style={{display:'block', margin:'-20px 0 16px', fontSize:'13px', fontWeight:500, textAlign:'center', borderRadius:'5px', padding:'8px 12px', background:'var(--orange-ghost)', color:'var(--orange)'}}>
              {error}
            </p>
          )}
          {info && (
            <p style={{display:'block', margin:'-20px 0 16px', fontSize:'13px', fontWeight:500, textAlign:'center', borderRadius:'5px', padding:'8px 12px', background:'rgba(46,125,50,0.07)', color:'#2e7d32'}}>
              {info}
            </p>
          )}

          {/* Login Form */}
          {tab === 'login' && (
            <div>
              <div className="form-title">Willkommen zurück</div>
              <div className="form-sub">Melden Sie sich in Ihrem Konto an</div>

              <div className="form-group">
                <label className="form-label">E-Mail-Adresse</label>
                <input type="email" className="form-input" placeholder="dr.mueller@klinik.de"
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>
              <div className="form-group">
                <label className="form-label">Passwort</label>
                <div className="form-input-group">
                  <input type={showPwLogin ? 'text' : 'password'} className="form-input" placeholder="••••••••"
                    value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    style={{paddingRight:'44px'}} />
                  <span className="form-input-icon" onClick={() => setShowPwLogin(v => !v)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </span>
                </div>
                <div className="form-forgot"><button type="button" onClick={() => { setTab('forgot'); clearMessages() }} style={{background:'none',border:'none',padding:0,cursor:'pointer',color:'var(--orange)',fontSize:'inherit',fontFamily:'inherit'}}>Passwort vergessen?</button></div>
              </div>

              <button className="btn-submit" onClick={handleLogin} disabled={loading}>
                {loading ? 'Laden…' : 'Anmelden'}
              </button>

              <div className="form-divider"><span>oder weiter mit</span></div>

              <button className="btn-google" onClick={handleGoogle}>
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Mit Google anmelden
              </button>

              <div className="form-footer">
                Noch kein Konto? <button type="button" onClick={() => { setTab('register'); clearMessages() }} style={{background:'none',border:'none',padding:0,cursor:'pointer',color:'var(--orange)',fontSize:'inherit',fontFamily:'inherit',fontWeight:600}}>Jetzt registrieren</button>
              </div>
            </div>
          )}

          {/* Reset Password Form (depuis lien email) */}
          {tab === 'reset' && (
            <div>
              <div className="form-title">Neues Passwort festlegen</div>
              <div className="form-sub">Geben Sie Ihr neues Passwort ein</div>

              {resetSuccess ? (
                <p style={{ textAlign: 'center', padding: '16px', borderRadius: 8, background: 'rgba(46,125,50,0.07)', color: '#2e7d32', fontWeight: 600, fontSize: 16 }}>
                  ✓ Passwort erfolgreich geändert — Sie werden weitergeleitet…
                </p>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Neues Passwort</label>
                    <div className="form-input-group">
                      <input
                        type={showPwNew ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Min. 6 Zeichen"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleNewPassword()}
                        style={{ paddingRight: 44 }}
                        autoFocus
                      />
                      <span className="form-input-icon" onClick={() => setShowPwNew(v => !v)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </span>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label className="form-label">Passwort bestätigen</label>
                    <input
                      type={showPwNew ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Passwort wiederholen"
                      value={newPasswordConfirm}
                      onChange={e => setNewPasswordConfirm(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleNewPassword()}
                    />
                  </div>
                  <button className="btn-submit" onClick={handleNewPassword} disabled={loading} style={{ marginTop: 20 }}>
                    {loading ? 'Speichern…' : 'Passwort speichern'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Forgot Password Form */}
          {tab === 'forgot' && (
            <div>
              <div className="form-title">Passwort zurücksetzen</div>
              <div className="form-sub">Wir senden Ihnen einen Reset-Link per E-Mail</div>

              <div className="form-group">
                <label className="form-label">E-Mail-Adresse</label>
                <input type="email" className="form-input" placeholder="dr.mueller@klinik.de"
                  value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleForgotPassword()} />
              </div>

              <button className="btn-submit" onClick={handleForgotPassword} disabled={loading}>
                {loading ? 'Senden…' : 'Reset-Link senden'}
              </button>

              <div className="form-footer">
                <button type="button" onClick={() => { setTab('login'); clearMessages() }} style={{background:'none',border:'none',padding:0,cursor:'pointer',color:'var(--orange)',fontSize:'inherit',fontFamily:'inherit'}}>← Zurück zur Anmeldung</button>
              </div>
            </div>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <div>
              <div className="form-title">Konto erstellen</div>
              <div className="form-sub">Kostenlos starten — keine Kreditkarte nötig</div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                <div className="form-group">
                  <label className="form-label">Vorname <span style={{color:'var(--orange)'}}>*</span></label>
                  <input type="text" className="form-input" placeholder="Hans"
                    value={regVorname} onChange={e => setRegVorname(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nachname <span style={{color:'var(--orange)'}}>*</span></label>
                  <input type="text" className="form-input" placeholder="Müller"
                    value={regNachname} onChange={e => setRegNachname(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">E-Mail-Adresse <span style={{color:'var(--orange)'}}>*</span></label>
                <input type="email" className="form-input" placeholder="dr.mueller@klinik.de"
                  value={regEmail} onChange={e => setRegEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()} />
              </div>

              <div className="form-group">
                <label className="form-label">Passwort <span style={{color:'var(--orange)'}}>*</span></label>
                <div className="form-input-group">
                  <input type={showPwRegister ? 'text' : 'password'} className="form-input" placeholder="Min. 6 Zeichen"
                    value={regPassword} onChange={e => setRegPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRegister()}
                    style={{paddingRight:'44px'}} />
                  <span className="form-input-icon" onClick={() => setShowPwRegister(v => !v)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </span>
                </div>
              </div>

              <button className="btn-submit" onClick={handleRegister} disabled={loading}>
                {loading ? 'Laden…' : 'Konto erstellen'}
              </button>

              <div className="dsgvo-note">
                <span></span>
                <span>Mit der Registrierung stimmen Sie unseren <a href="/agb" style={{color:'var(--orange)'}}>AGB</a> und der <a href="/datenschutz" style={{color:'var(--orange)'}}>Datenschutzerklärung</a> zu.</span>
              </div>

              <div className="form-footer">
                Bereits ein Konto? <button type="button" onClick={() => { setTab('login'); clearMessages() }} style={{background:'none',border:'none',padding:0,cursor:'pointer',color:'var(--orange)',fontSize:'inherit',fontFamily:'inherit',fontWeight:600}}>Anmelden</button>
              </div>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-3)', marginTop: 24 }}>
          <a href="/impressum"   style={{ color: 'var(--text-3)', textDecoration: 'none', margin: '0 8px' }}>Impressum</a>·
          <a href="/datenschutz" style={{ color: 'var(--text-3)', textDecoration: 'none', margin: '0 8px' }}>Datenschutz</a>·
          <a href="/agb"         style={{ color: 'var(--text-3)', textDecoration: 'none', margin: '0 8px' }}>AGB</a>
        </div>
      </div>
    </div>
  )
}
