import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
  const { profile, getInitials, getDisplayName, logout, isPro } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen,       setMobileOpen]       = useState(false)
  const [avatarOpen,       setAvatarOpen]       = useState(false)
  const avatarRef = useRef(null)
  const navigate  = useNavigate()

  const initials    = getInitials()
  const displayName = getDisplayName()
  const clinic      = profile?.clinic || 'Krankenhaus'

  async function handleLogout() {
    setAvatarOpen(false)
    await logout()
    navigate('/login')
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

        <button className="topbar-btn" onClick={() => setSidebarCollapsed(v => !v)} title="Sidebar ein-/ausblenden">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
        </button>

        {/* Center slot */}
        <div className="topbar-center-slot">
          <img src="/arvis-icon.svg" alt="" className="topbar-center-icon" style={{ height: 57 }} />
          <span style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 800, fontSize: 38, color: 'var(--text)',
            letterSpacing: '-0.02em', userSelect: 'none'
          }}>Arvis</span>
        </div>

        <div className="topbar-right">
          <div style={{position:'relative'}} ref={avatarRef}>
            <div className="topbar-avatar" onClick={() => setAvatarOpen(v => !v)} style={{cursor:'pointer'}} title="Mein Profil">
              {initials}
            </div>
            {avatarOpen && (
              <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',minWidth:160,background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,boxShadow:'var(--shadow-lg)',zIndex:9999,overflow:'hidden'}}>
                <div onClick={() => { setAvatarOpen(false); navigate('/profil') }}
                  style={{padding:'11px 16px',fontSize:13,fontWeight:600,color:'var(--text)',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'background 0.12s'}}
                  onMouseOver={e=>e.currentTarget.style.background='var(--bg)'} onMouseOut={e=>e.currentTarget.style.background=''}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Mein Profil
                </div>
                <div style={{height:1,background:'var(--border)',margin:'0 12px'}}/>
                <div onClick={handleLogout}
                  style={{padding:'11px 16px',fontSize:13,fontWeight:600,color:'#D94B0A',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'background 0.12s'}}
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
        {navItems.map(item => {
          const restricted = ['/scan', '/briefschreiber', '/bausteine', '/uebersetzung'].includes(item.to)
          const disabled = restricted && !isPro
          return (
            <NavLink key={item.to} to={item.to} className={({isActive}) => `nav-item${isActive && !disabled ? ' active' : ''}`} onClick={(e) => { if (disabled) { e.preventDefault() } else { setMobileOpen(false) } }} style={disabled ? { opacity: 0.4, pointerEvents: 'none', cursor: 'not-allowed' } : {}}>
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          )
        })}

        <div className="sidebar-section-title">Persönlich</div>
        {personalItems.map(item => {
          const restricted = ['/dateien'].includes(item.to)
          const disabled = restricted && !isPro
          return (
            <NavLink key={item.to} to={item.to} className={({isActive}) => `nav-item${isActive && !disabled ? ' active' : ''}`} onClick={(e) => { if (disabled) { e.preventDefault() } else { setMobileOpen(false) } }} style={disabled ? { opacity: 0.4, pointerEvents: 'none', cursor: 'not-allowed' } : {}}>
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          )
        })}

        {!isPro && (
          <div
            onClick={() => { setMobileOpen(false); navigate('/profil'); }}
            style={{
              margin: '8px 12px 4px',
              padding: '6px 10px',
              background: 'var(--orange-ghost)',
              borderRadius: 6,
              fontSize: 11,
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
            <div className="sidebar-avatar" onClick={() => { setMobileOpen(false); navigate('/profil') }} style={{cursor:'pointer'}}>{initials}</div>
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

    </div>
  )
}
