import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'

const STRIPE_PRICE_MONTHLY = 'price_monthly'
const STRIPE_PRICE_YEARLY = 'price_yearly'

function EyeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
}

const CardIcon = ({ brand }) => {
  const b = brand?.toLowerCase()
  if (b === 'visa') {
    return <img src="https://cdn.simpleicons.org/visa/1434CB" alt="Visa" style={{ width: '85%', height: 'auto', display: 'block' }} />
  }
  if (b === 'mastercard') {
    return <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg" alt="Mastercard" style={{ width: '90%', height: 'auto', display: 'block' }} />
  }
  if (b === 'amex') {
    return <img src="https://cdn.simpleicons.org/americanexpress" alt="Amex" style={{ width: '85%', height: 'auto', display: 'block' }} />
  }
  if (b === 'paypal') {
    return <img src="https://img.icons8.com/color/48/paypal.png" alt="PayPal" style={{ width: 34, height: 34, display: 'block', marginLeft: 4 }} />
  }
  if (b === 'sepa' || b === 'sepa_debit') {
    return <img src="https://cdn.simpleicons.org/sepa/00509E" alt="SEPA" style={{ width: 44, height: 'auto', display: 'block' }} />
  }
  if (b === 'apple_pay' || b === 'applepay' || b === 'apple pay') {
    return <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" style={{ width: 44, height: 'auto', display: 'block' }} />
  }
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" fill="none" style={{ display: 'block' }}>
      <rect width="24" height="16" rx="2" fill="#1a1a2e" />
      <rect y="4" width="24" height="3" fill="#e2b80a" opacity="0.8" />
    </svg>
  )
}

export default function Profil() {
  const { user, profile, updateProfile, getInitials, getPlanInfo, logout } = useAuth()
  const [toast, setToast] = useState(null)
  const [errors, setErrors] = useState({})
  const photoInputRef = useRef(null)

  // Plan
  const planInfo = getPlanInfo()
  const [yearly, setYearly] = useState(false)

  // Profil fields
  const [titel, setTitel] = useState('')
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [email, setEmail] = useState('')
  const [klinik, setKlinik] = useState('')
  const [strasse, setStrasse] = useState('')
  const [hausnummer, setHausnummer] = useState('')
  const [plz, setPlz] = useState('')
  const [stadt, setStadt] = useState('')
  const [photo, setPhoto] = useState(null)

  // Password fields
  const [pwOld, setPwOld] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [showPw, setShowPw] = useState({ old: false, new: false, confirm: false })

  // Payment
  const paymentMethod = profile?.card_brand
    ? { brand: profile.card_brand.charAt(0).toUpperCase() + profile.card_brand.slice(1), last4: profile.card_last4 || '' }
    : null

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  async function manageSubscription() {
    setPortalLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session')
      if (error) throw new Error(error.message)
      if (data?.url) {
        window.location.href = data.url
      } else if (data?.error) {
        throw new Error(data.error)
      }
    } catch (err) {
      showToast('Fehler: ' + err.message, false)
    } finally {
      setPortalLoading(false)
      setShowCancelModal(false)
    }
  }

  useEffect(() => {
    if (!profile) return
    setTitel(profile.title || 'Dr.')
    setVorname(profile.first_name || '')
    setNachname(profile.last_name || '')
    setEmail(profile.email || '')
    setKlinik(profile.clinic || '')
    setStrasse(profile.strasse || '')
    setHausnummer(profile.hausnummer || '')
    setPlz(profile.plz || '')
    setStadt(profile.stadt || '')
    if (profile.avatar_url) setPhoto(profile.avatar_url)
  }, [profile])

  function showToast(msg, light = true) { setToast({ msg, light }); setTimeout(() => setToast(null), 2500) }

  // ── Photo ──────────────────────────────────────────────────────────────────
  function handlePhoto(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setPhoto(ev.target.result) }
    reader.readAsDataURL(file)
  }

  // ── Save profile ───────────────────────────────────────────────────────────
  async function saveProfile() {
    const errs = {}
    if (!vorname.trim()) errs.vorname = true
    if (!nachname.trim()) errs.nachname = true
    if (!email.trim()) errs.email = true
    setErrors(errs)
    if (Object.keys(errs).length) return

    const { error } = await updateProfile({
      title: titel,
      first_name: vorname.trim(),
      last_name: nachname.trim(),
      email: email.trim(),
      clinic: klinik.trim(),
      strasse: strasse.trim(),
      hausnummer: hausnummer.trim(),
      plz: plz.trim(),
      stadt: stadt.trim(),
      avatar_url: photo || null,
    })
    if (error) { showToast('Fehler beim Speichern'); return }
    showToast('Profil gespeichert')
  }

  // ── Save password ──────────────────────────────────────────────────────────
  async function savePassword() {
    if (!pwOld.trim()) { showToast('Bitte aktuelles Passwort eingeben'); return }
    if (!pwNew.trim()) { showToast('Bitte neues Passwort eingeben'); return }
    if (pwNew !== pwConfirm) { showToast('Passwörter stimmen nicht überein'); return }
    if (pwNew.length < 6) { showToast('Mindestens 6 Zeichen'); return }

    // Überprüfe das alte Passwort durch einen erneuten Login-Versuch
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwOld
    })

    if (signInError) {
      showToast('Aktuelles Passwort ist inkorrekt');
      return
    }

    const { error } = await supabase.auth.updateUser({ password: pwNew })
    if (error) { showToast('Fehler: ' + error.message); return }
    setPwOld(''); setPwNew(''); setPwConfirm('')
    showToast('Passwort geändert', true)
  }

  const initials = getInitials()
  const displayName = [titel, vorname ? vorname[0] + '.' : '', nachname].filter(Boolean).join(' ') || 'Arvis'

  return (
    <div className="page active" id="page-profil">
      <div className="page-header">
        <div>
          <div className="page-title">Mein Profil</div>
          <div className="page-date">Profileinstellungen & Abonnement</div>
        </div>
      </div>

      <div className="profil-layout">

        {/* ── Linke Spalte: Persönliche Infos ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 4 }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 18 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <span style={{ lineHeight: '18px' }}>Persönliche Informationen</span>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div id="profilAvatar" onClick={() => photoInputRef.current?.click()}
                style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg,var(--orange),var(--orange-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 700, color: 'white', flexShrink: 0, cursor: 'pointer', overflow: 'hidden' }}>
                {photo ? <img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" /> : initials}
              </div>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => photoInputRef.current?.click()}>Foto ändern</button>
                  <button
                    className="btn-danger"
                    onClick={() => setPhoto(null)}
                  >
                    Foto löschen
                  </button>
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>JPG oder PNG, max. 2 MB</div>
              </div>
            </div>

            {/* Titel + Vorname + Nachname */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Titel</label>
                <div style={{ position: 'relative' }}>
                  <select className="form-input" value={titel} onChange={e => setTitel(e.target.value)} style={{ paddingRight: 36 }}>
                    <option value="Dr.">Dr.</option>
                    <option value="Prof.">Prof.</option>
                    <option value="Prof. Dr.">Prof. Dr.</option>
                    <option value="">Kein Titel</option>
                  </select>
                  <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Vorname <span style={{ color: 'var(--orange)' }}>*</span></label>
                <input type="text" className="form-input" value={vorname} onChange={e => setVorname(e.target.value)} placeholder="Hans" style={{ borderColor: errors.vorname ? '#e53e3e' : '' }} />
                {errors.vorname && <div style={{ fontSize: 11, color: '#e53e3e', marginTop: 4 }}>Pflichtfeld</div>}
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Nachname <span style={{ color: 'var(--orange)' }}>*</span></label>
                <input type="text" className="form-input" value={nachname} onChange={e => setNachname(e.target.value)} placeholder="Müller" style={{ borderColor: errors.nachname ? '#e53e3e' : '' }} />
                {errors.nachname && <div style={{ fontSize: 11, color: '#e53e3e', marginTop: 4 }}>Pflichtfeld</div>}
              </div>
            </div>

            {/* Email */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">E-Mail-Adresse <span style={{ color: 'var(--orange)' }}>*</span></label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="dr.mueller@klinik.de" style={{ borderColor: errors.email ? '#e53e3e' : '' }} />
              {errors.email && <div style={{ fontSize: 11, color: '#e53e3e', marginTop: 4 }}>Pflichtfeld</div>}
            </div>

            {/* Klinik */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Klinik / Krankenhaus</label>
              <input type="text" className="form-input" value={klinik} onChange={e => setKlinik(e.target.value)} placeholder="Universitätsklinikum Berlin" />
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Rechnungsadresse</div>

            {/* Straße + Hausnummer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Straße</label>
                <input type="text" className="form-input" value={strasse} onChange={e => setStrasse(e.target.value)} placeholder="Musterstraße" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Hausnr.</label>
                <input type="text" className="form-input" value={hausnummer} onChange={e => setHausnummer(e.target.value)} placeholder="12a" />
              </div>
            </div>

            {/* PLZ + Stadt */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">PLZ</label>
                <input type="text" className="form-input" value={plz} onChange={e => setPlz(e.target.value)} placeholder="10115" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Stadt</label>
                <input type="text" className="form-input" value={stadt} onChange={e => setStadt(e.target.value)} placeholder="Berlin" />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: -6 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}><span style={{ color: 'var(--orange)' }}>*</span> Pflichtfeld</div>
              <button className="btn-action" onClick={saveProfile} style={{ padding: '10px 24px' }}>Speichern</button>
            </div>
          </div>
        </div>

        {/* ── Rechte Spalte: Abo + Passwort ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>

          {/* Abonnement */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 4 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 18 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                <span style={{ lineHeight: '18px' }}>Abonnement &amp; Zahlung</span>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Plan badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: planInfo.expired ? 'rgba(229,62,62,0.06)' : 'rgba(22,163,74,0.08)', border: planInfo.expired ? '1px solid rgba(229,62,62,0.2)' : '1px solid rgba(22,163,74,0.3)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {planInfo.plan === 'pro' ? 'Plan Pro' : planInfo.expired ? 'Testversion abgelaufen' : 'Testversion'}
                  </div>
                  {planInfo.plan !== 'pro' && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {planInfo.expired ? 'Abonnement erforderlich' : `Noch ${planInfo.daysLeft} Tag${planInfo.daysLeft !== 1 ? 'e' : ''} verbleibend`}
                    </div>
                  )}
                </div>
                <span style={{ padding: '4px 12px', borderRadius: 999, background: planInfo.expired ? '#e53e3e' : '#16a34a', color: 'white', fontSize: 11, fontWeight: 700 }}>
                  {planInfo.plan === 'pro' ? 'Aktiv' : planInfo.expired ? 'Abgelaufen' : 'Trial'}
                </span>
              </div>

              {/* Zahlungsmittel */}
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>Zahlungsmittel</div>
                {paymentMethod ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {['paypal', 'sepa', 'sepa_debit', 'apple_pay', 'applepay', 'apple pay'].includes(paymentMethod.brand?.toLowerCase()) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 52, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CardIcon brand={paymentMethod.brand} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            {paymentMethod.brand?.toLowerCase() === 'paypal' ? paymentMethod.last4 : paymentMethod.last4 ? `•••• ${paymentMethod.last4}` : 'Apple Pay'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            {paymentMethod.brand?.toLowerCase() === 'paypal' ? 'PayPal-Konto' :
                              paymentMethod.brand?.toLowerCase().includes('apple') ? 'Apple Wallet' : 'SEPA-Lastschrift'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 52, height: 34, borderRadius: 6, background: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          <CardIcon brand={paymentMethod.brand} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>•••• {paymentMethod.last4}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            Standardzahlungsmittel
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={manageSubscription}
                      disabled={portalLoading}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: portalLoading ? 'wait' : 'pointer', fontFamily: 'DM Sans,sans-serif', opacity: portalLoading ? 0.6 : 1, transition: 'all 0.2s' }}
                      onMouseOver={e => { if (!portalLoading) { e.target.style.background = 'var(--orange-ghost)'; e.target.style.color = 'var(--orange)'; e.target.style.borderColor = 'var(--orange-dark)'; } }}
                      onMouseOut={e => { if (!portalLoading) { e.target.style.background = 'var(--bg-2)'; e.target.style.color = 'var(--text)'; e.target.style.borderColor = 'var(--border)'; } }}
                    >
                      {portalLoading ? '...' : 'Ändern'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 24, borderRadius: 5, background: 'var(--bg-3)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Kein Zahlungsmittel hinterlegt</div>
                    </div>
                    <button onClick={manageSubscription} disabled={portalLoading} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--orange)', color: 'white', fontSize: 12, fontWeight: 600, cursor: portalLoading ? 'wait' : 'pointer', fontFamily: 'DM Sans,sans-serif', opacity: portalLoading ? 0.6 : 1 }}>
                      {portalLoading ? '...' : 'Hinzufügen'}
                    </button>
                  </div>
                )}
              </div>

              {/* Trial section */}
              {planInfo.plan !== 'pro' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Promo badge */}
                  {!yearly && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px', background: '#fff7ed', border: '1px solid rgba(217,75,10,0.2)', borderRadius: 8 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)' }}>Einführungsangebot –34% · erste 3 Monate</span>
                    </div>
                  )}
                  {/* Toggle Monatlich / Jährlich */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 10, background: 'var(--bg-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <div onClick={() => setYearly(false)} style={{ fontSize: 13, fontWeight: 600, color: yearly ? 'var(--text-3)' : 'var(--text)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span>Monatlich</span>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)' }}>
                        <span style={{ fontWeight: 700, color: yearly ? 'var(--text-3)' : 'var(--orange)' }}>19 €</span> <span style={{ textDecoration: 'line-through' }}>29 €</span>
                      </div>
                    </div>
                    <div onClick={() => setYearly(v => !v)} style={{ width: 44, height: 24, borderRadius: 999, background: 'var(--orange)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'transform 0.2s', transform: yearly ? 'translateX(20px)' : 'translateX(0)' }} />
                    </div>
                    <div onClick={() => setYearly(true)} style={{ fontSize: 13, fontWeight: 600, color: yearly ? 'var(--text)' : 'var(--text-3)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span>Jährlich</span>
                      <div style={{ fontSize: 11, fontWeight: 500, color: yearly ? 'var(--orange)' : 'var(--text-3)' }}>
                        249 € <span style={{ color: '#16a34a' }}>–28%</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => showToast('Stripe-Integration folgt')}
                    style={{ width: '100%', padding: 11, borderRadius: 6, border: 'none', background: 'var(--orange)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', transition: 'background 0.2s' }}
                    onMouseOver={e => e.target.style.background = 'var(--orange-dark)'} onMouseOut={e => e.target.style.background = 'var(--orange)'}>
                    {yearly ? 'Jetzt Pro starten – 249 €/Jahr' : 'Jetzt Pro starten – 19 €/Monat'}
                  </button>
                </div>
              )}

              {/* Pro section */}
              {planInfo.plan === 'pro' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Abonnement kündigen</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>Ihr Zugang bleibt bis zum Ende des aktuellen Abrechnungszeitraums aktiv.</div>
                    <button className="btn-danger" onClick={() => setShowCancelModal(true)}>
                      Abonnement kündigen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Passwort */}
          <div className="card" id="passwortCard">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 4 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 18 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <span style={{ lineHeight: '18px' }}>Passwort ändern</span>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { id: 'old', label: 'Aktuelles Passwort', val: pwOld, set: setPwOld, ph: '••••••••' },
                { id: 'new', label: 'Neues Passwort', val: pwNew, set: setPwNew, ph: 'Min. 6 Zeichen' },
                { id: 'confirm', label: 'Passwort bestätigen', val: pwConfirm, set: setPwConfirm, ph: 'Passwort wiederholen' },
              ].map(f => (
                <div key={f.id} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{f.label}</label>
                  <div className="form-input-group">
                    <input
                      type={showPw[f.id] ? 'text' : 'password'}
                      className="form-input"
                      value={f.val}
                      onChange={e => f.set(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') savePassword() }}
                      placeholder={f.ph}
                      style={{ paddingRight: 44 }}
                    />
                    <span className="form-input-icon" onClick={() => setShowPw(p => ({ ...p, [f.id]: !p[f.id] }))} style={{ cursor: 'pointer' }}><EyeIcon /></span>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: -6 }}>
                <button className="btn-action" onClick={savePassword} style={{ padding: '10px 24px' }}>Passwort ändern</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '28px 28px 22px', width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Abonnement kündigen</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8, lineHeight: 1.6 }}>Sind Sie sicher, dass Sie Ihr Abonnement kündigen möchten?</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 22, padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, lineHeight: 1.6 }}>
              Ihr Zugang bleibt bis zum <strong>Ende des Abrechnungszeitraums</strong> aktiv.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setShowCancelModal(false)} style={{ height: 38, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Abbrechen</button>
              <button
                onClick={manageSubscription}
                disabled={portalLoading}
                style={{ height: 38, fontSize: 13, fontWeight: 500, borderRadius: 6, border: 'none', background: '#e53e3e', color: 'white', cursor: portalLoading ? 'wait' : 'pointer', fontFamily: 'DM Sans,sans-serif', opacity: portalLoading ? 0.6 : 1 }}
              >
                {portalLoading ? 'Lädt...' : 'Kündigen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 28, left: 'calc(50% + 120px)', transform: 'translateX(-50%)', background: toast.light ? 'var(--orange-ghost)' : 'var(--orange)', color: toast.light ? 'var(--orange)' : 'white', border: 'none', padding: '10px 22px', borderRadius: 6, fontSize: 14, fontWeight: 600, zIndex: 99999 }}>{toast.msg}</div>}
    </div>
  )
}
