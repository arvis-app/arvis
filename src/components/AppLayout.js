import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, invokeEdgeFunction } from '../supabaseClient'

const navItems = [
  {
    to: '/dashboard', label: 'Dashboard',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  },
  {
    to: '/scan', label: 'Scan & Analyse',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
  },
  {
    to: '/briefschreiber', label: 'Brief Schreiber',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  },
  {
    to: '/bausteine', label: 'Bausteine',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="4" rx="1"/><rect x="3" y="10" width="11" height="4" rx="1"/><rect x="3" y="17" width="14" height="4" rx="1"/></svg>
  },
  {
    to: '/uebersetzung', label: 'Übersetzung',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  },
]

const personalItems = [
  {
    to: '/dateien', label: 'Meine Dateien',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
  },
  {
    to: '/profil', label: 'Mein Profil',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
]

export default function AppLayout() {
  const { user, profile, getInitials, getDisplayName, logout, isPro } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen,       setMobileOpen]       = useState(false)
  const [avatarOpen,       setAvatarOpen]       = useState(false)
  const [bugModalOpen,     setBugModalOpen]     = useState(false)
  const [bugEmail,         setBugEmail]         = useState('')
  const [bugText,          setBugText]          = useState('')
  const [bugPhotos,        setBugPhotos]        = useState([])
  const [bugSending,       setBugSending]       = useState(false)
  const [bugSuccess,       setBugSuccess]       = useState(false)
  const [bugError,         setBugError]         = useState('')
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const avatarRef = useRef(null)
  const bugFileRef = useRef(null)
  const navigate  = useNavigate()

  // Fermeture modale par ESC
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') { setBugModalOpen(false); setAvatarOpen(false) } }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  // Détection offline
  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline  = () => setIsOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline) }
  }, [])

  const initials    = getInitials()
  const displayName = getDisplayName()
  const clinic      = profile?.clinic || 'Krankenhaus'

  async function handleLogout() {
    setAvatarOpen(false)
    await logout()
    navigate('/login')
  }

  // Bug modal init
  useEffect(() => {
    if (bugModalOpen) {
      setBugEmail(profile?.email || user?.email || '')
      setBugText('')
      setBugPhotos([])
      setBugSuccess(false)
      setBugError('')
    }
  }, [bugModalOpen])

  function handleBugPhotos(e) {
    const files = Array.from(e.target.files || [])
    const total = [...bugPhotos, ...files]
    if (total.length > 5) { setBugError('Maximal 5 Fotos erlaubt.'); return }
    const totalSize = total.reduce((s, f) => s + f.size, 0)
    if (totalSize > 10 * 1024 * 1024) { setBugError('Maximale Gesamtgröße: 10 MB.'); return }
    setBugPhotos(total)
    setBugError('')
    if (bugFileRef.current) bugFileRef.current.value = ''
  }

  async function handleBugSubmit() {
    if (!bugText.trim()) { setBugError('Bitte beschreiben Sie den Fehler.'); return }
    setBugSending(true)
    setBugError('')
    try {
      const photoUrls = []
      for (const photo of bugPhotos) {
        const ext = (photo.name.match(/\.([^.]+)$/) || ['', 'jpg'])[1].toLowerCase()
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('bug-reports').upload(path, photo, { contentType: photo.type })
        if (error) throw new Error('Foto-Upload fehlgeschlagen: ' + error.message)
        const { data: urlData } = supabase.storage.from('bug-reports').getPublicUrl(path)
        photoUrls.push(urlData.publicUrl)
      }
      await invokeEdgeFunction('send-bug-report', { email: bugEmail, message: bugText.trim(), photoUrls })
      setBugSuccess(true)
    } catch (err) {
      setBugError(err.message || 'Fehler beim Senden.')
    } finally {
      setBugSending(false)
    }
  }

  // Close avatar menu on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className={`app-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' menu-open' : ''}`}>

      {/* Offline banner */}
      {isOffline && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000, background: '#e53e3e', color: 'white', textAlign: 'center', padding: '8px 16px', fontSize: 14, fontWeight: 600 }}>
          Keine Internetverbindung — Einige Funktionen sind nicht verfügbar.
        </div>
      )}

      {/* Topbar — grid-column 1/-1 */}
      <header className="topbar">
        <button className="mobile-menu-btn" onClick={() => { setSidebarCollapsed(false); setMobileOpen(v => !v) }} aria-label="Menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>

        {/* Left slot: wrapper animates width, inner logo stays fixed 240px */}
        <div className="topbar-logo-wrap">
          <div className="topbar-logo">
            <img src="/arvis-icon.svg" alt="Arvis" style={{ height: 57, display: 'block' }} />
          </div>
        </div>

        <button className="topbar-btn" aria-label="Sidebar ein-/ausblenden" onClick={() => setSidebarCollapsed(v => !v)} title="Sidebar ein-/ausblenden">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
        </button>

        {/* Center slot */}
        <div className="topbar-center-slot">
          <img src="/arvis-icon.svg" alt="" className="topbar-center-icon" style={{ height: 57 }} />
          <span style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 800, fontSize: 40, color: 'var(--text)',
            letterSpacing: '-0.02em', userSelect: 'none', marginTop: 3
          }}>Arvis</span>
        </div>

        <div className="topbar-right">
          <div style={{position:'relative',display:'flex',alignItems:'center',gap:6,cursor:'pointer'}} ref={avatarRef} onClick={() => setAvatarOpen(v => !v)}>
            <svg width="10" height="7" viewBox="0 0 10 7" fill="none" style={{transition:'transform 0.15s',transform:avatarOpen?'rotate(180deg)':'none'}}>
              <path d="M1 1.5L5 5.5L9 1.5" stroke="var(--text-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="topbar-avatar" title="Menü">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} alt="" />
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            </div>
            {avatarOpen && (
              <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',minWidth:160,background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,boxShadow:'var(--shadow-lg)',zIndex:9999,overflow:'hidden'}}>
                <div onClick={() => { setAvatarOpen(false); navigate('/profil') }}
                  style={{padding:'11px 16px',fontSize:15,fontWeight:600,color:'var(--text)',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'background 0.12s'}}
                  onMouseOver={e=>e.currentTarget.style.background='var(--bg)'} onMouseOut={e=>e.currentTarget.style.background=''}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Mein Profil
                </div>
                <div style={{height:1,background:'var(--border)',margin:'0 12px'}}/>
                <div onClick={() => { setAvatarOpen(false); setBugModalOpen(true) }}
                  style={{padding:'11px 16px',fontSize:15,fontWeight:600,color:'var(--text)',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'background 0.12s'}}
                  onMouseOver={e=>e.currentTarget.style.background='var(--bg)'} onMouseOut={e=>e.currentTarget.style.background=''}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Bug melden
                </div>
                <div style={{height:1,background:'var(--border)',margin:'0 12px'}}/>
                <div onClick={handleLogout}
                  style={{padding:'11px 16px',fontSize:15,fontWeight:600,color:'#D94B0A',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'background 0.12s'}}
                  onMouseOver={e=>e.currentTarget.style.background='rgba(217,75,10,0.07)'} onMouseOut={e=>e.currentTarget.style.background=''}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D94B0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Abmelden
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-section-title">Hauptmenü</div>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} className={({isActive}) => `nav-item${isActive ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>
            <span className="nav-item-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-section-title">Persönlich</div>
        {personalItems.map(item => (
          <NavLink key={item.to} to={item.to} className={({isActive}) => `nav-item${isActive ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>
            <span className="nav-item-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {!isPro && (
          <div
            onClick={() => { setMobileOpen(false); navigate('/profil'); }}
            style={{
              margin: '8px 12px 4px',
              padding: '6px 10px',
              background: 'var(--orange-ghost)',
              borderRadius: 6,
              fontSize: 13,
              color: 'var(--orange)',
              fontWeight: 600,
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            Trial abgelaufen — Jetzt Pro starten
          </div>
        )}

        <div className="sidebar-footer">
          <div className="sidebar-user" style={{cursor:'default'}}>
            <div className="sidebar-avatar" onClick={() => { setMobileOpen(false); navigate('/profil') }} style={{cursor:'pointer'}}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} alt="" />
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            </div>
            <div className="sidebar-user-info" onClick={() => { setMobileOpen(false); navigate('/profil') }} style={{cursor:'pointer'}}>
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-role">{clinic}</div>
            </div>
            <svg onClick={handleLogout} style={{cursor:'pointer', flexShrink:0}} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bug melden modal */}
      {bugModalOpen && (
        <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => !bugSending && setBugModalOpen(false)}>
          <div style={{background:'var(--card)',borderRadius:12,padding:28,border:'1px solid var(--border)',boxShadow:'var(--shadow-lg)',width:440,maxWidth:'95vw',maxHeight:'85vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>

            {bugSuccess ? (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(22,163,74,0.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{fontSize:17,fontWeight:700,color:'var(--text)',marginBottom:8}}>Vielen Dank!</div>
                <div style={{fontSize:14,color:'var(--text-2)',marginBottom:20}}>Ihre Meldung wurde gesendet und wird innerhalb von 24 Stunden bearbeitet.</div>
                <button onClick={() => setBugModalOpen(false)} style={{background:'var(--orange)',color:'white',border:'none',borderRadius:8,padding:'10px 24px',fontSize:15,fontWeight:600,cursor:'pointer'}}>Schließen</button>
              </div>
            ) : (
              <>
                <div style={{fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:18,fontFamily:"'Bricolage Grotesque', sans-serif"}}>Bug melden</div>

                {/* Email */}
                <label style={{fontSize:13,fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:6}}>E-Mail</label>
                <input value={bugEmail} onChange={e => setBugEmail(e.target.value)} type="email"
                  style={{width:'100%',padding:'10px 12px',fontSize:15,border:'1px solid var(--border)',borderRadius:8,fontFamily:'Inter, sans-serif',background:'var(--bg)',color:'var(--text)',boxSizing:'border-box',marginBottom:14}} />

                {/* Description */}
                <label style={{fontSize:13,fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:6}}>Fehlerbeschreibung</label>
                <textarea value={bugText} onChange={e => setBugText(e.target.value)} rows={5} placeholder="Beschreiben Sie den Fehler möglichst genau..."
                  style={{width:'100%',padding:'10px 12px',fontSize:15,border:'1px solid var(--border)',borderRadius:8,fontFamily:'Inter, sans-serif',background:'var(--bg)',color:'var(--text)',boxSizing:'border-box',resize:'vertical',minHeight:100,marginBottom:14}} />

                {/* Photos */}
                <label style={{fontSize:13,fontWeight:600,color:'var(--text-2)',display:'block',marginBottom:6}}>Screenshots <span style={{fontWeight:400}}>(optional, max. 5 Fotos, 10 MB)</span></label>
                <input ref={bugFileRef} type="file" multiple accept="image/*" style={{display:'none'}} onChange={handleBugPhotos} />
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:bugPhotos.length ? 10 : 0}}>
                  {bugPhotos.map((f, i) => (
                    <div key={i} style={{position:'relative',width:64,height:64,borderRadius:6,overflow:'hidden',border:'1px solid var(--border)'}}>
                      <img src={URL.createObjectURL(f)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                      <div onClick={() => setBugPhotos(prev => prev.filter((_, j) => j !== i))}
                        style={{position:'absolute',top:2,right:2,width:18,height:18,borderRadius:'50%',background:'rgba(0,0,0,0.6)',color:'white',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>×</div>
                    </div>
                  ))}
                </div>
                {bugPhotos.length < 5 && (
                  <button onClick={() => bugFileRef.current?.click()}
                    style={{padding:'8px 14px',fontSize:14,fontWeight:600,border:'1px solid var(--border)',borderRadius:8,background:'var(--bg)',color:'var(--text-2)',cursor:'pointer',display:'flex',alignItems:'center',gap:6,marginBottom:14}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Foto hinzufügen
                  </button>
                )}

                {/* Hinweis */}
                <div style={{fontSize:13,color:'var(--text-3)',marginBottom:16,lineHeight:1.5}}>
                  Ihre Meldung wird innerhalb von 24 Stunden bearbeitet.
                </div>

                {/* Error */}
                {bugError && <div style={{fontSize:13,color:'#DC2626',marginBottom:12}}>{bugError}</div>}

                {/* Buttons */}
                <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                  <button onClick={() => setBugModalOpen(false)} disabled={bugSending}
                    style={{padding:'10px 20px',fontSize:15,fontWeight:600,border:'1px solid var(--border)',borderRadius:8,background:'var(--bg)',color:'var(--text-2)',cursor:'pointer'}}>
                    Abbrechen
                  </button>
                  <button onClick={handleBugSubmit} disabled={bugSending}
                    style={{padding:'10px 20px',fontSize:15,fontWeight:600,border:'none',borderRadius:8,background:'var(--orange)',color:'white',cursor:bugSending?'wait':'pointer',opacity:bugSending?0.7:1,display:'flex',alignItems:'center',gap:8}}>
                    {bugSending && <div className="spinner" style={{width:16,height:16,borderWidth:2}}/>}
                    {bugSending ? 'Wird gesendet...' : 'Absenden'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
