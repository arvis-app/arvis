import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleCTA = () => {
    if (user) navigate('/app/dashboard')
    else navigate('/login')
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', background: '#F6F4F1', color: '#1C1C1E', minHeight: '100vh' }}>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 64,
        background: 'rgba(246,244,241,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E5E5EA',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <span style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 800, fontSize: 22, color: '#D94B0A' }}>
          Arvis
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <button onClick={() => navigate('/app/dashboard')} style={btnPrimary}>
              Zur App →
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} style={btnSecondary}>
                Anmelden
              </button>
              <button onClick={() => navigate('/login')} style={btnPrimary}>
                Kostenlos starten
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '100px 24px 80px' }}>
        <div style={{
          display: 'inline-block', padding: '6px 16px', borderRadius: 999,
          background: 'rgba(217,75,10,0.08)', border: '1px solid rgba(217,75,10,0.2)',
          fontSize: 13, fontWeight: 600, color: '#D94B0A', marginBottom: 28
        }}>
          KI-gestützte Dokumentation für Kliniken
        </div>
        <h1 style={{
          fontFamily: 'Bricolage Grotesque, sans-serif',
          fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 24, maxWidth: 800, margin: '0 auto 24px'
        }}>
          Medizinische Dokumentation.<br />
          <span style={{ color: '#D94B0A' }}>Einfach. Schnell. Präzise.</span>
        </h1>
        <p style={{ fontSize: 18, color: '#3A3A3C', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Arvis unterstützt Ärzte und Pflegepersonal beim Schreiben von Briefen,
          Scannen von Dokumenten und der Kommunikation mit internationalen Patienten.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleCTA} style={{ ...btnPrimary, fontSize: 16, padding: '14px 32px' }}>
            {user ? 'Zur App →' : '14 Tage kostenlos testen'}
          </button>
          {!user && (
            <button onClick={() => navigate('/login')} style={{ ...btnSecondary, fontSize: 16, padding: '14px 32px' }}>
              Anmelden
            </button>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 16 }}>
          Keine Kreditkarte erforderlich · 14 Tage gratis
        </p>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section style={{ padding: '80px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontFamily: 'Bricolage Grotesque, sans-serif', fontSize: 36, fontWeight: 800, marginBottom: 56 }}>
          Alles, was Sie brauchen
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {features.map(f => (
            <div key={f.title} style={{
              background: '#FFFFFF', borderRadius: 16, padding: 32,
              border: '1px solid #E5E5EA', boxShadow: '0 2px 16px rgba(0,0,0,0.06)'
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(217,75,10,0.08)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: 20
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#3A3A3C', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section style={{ padding: '80px 48px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontSize: 36, fontWeight: 800, marginBottom: 16 }}>
            Einfache Preisgestaltung
          </h2>
          <p style={{ color: '#3A3A3C', fontSize: 16, marginBottom: 48 }}>
            14 Tage kostenlos testen — keine Kreditkarte erforderlich
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 640, margin: '0 auto' }}>
            {/* Monthly */}
            <div style={{ border: '2px solid #D94B0A', borderRadius: 16, padding: 32, position: 'relative' }}>
              <div style={{
                position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                background: '#D94B0A', color: 'white', fontSize: 11, fontWeight: 700,
                padding: '3px 14px', borderRadius: 999
              }}>EMPFOHLEN</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93', marginBottom: 8 }}>Monatlich</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: '#D94B0A' }}>19 €</span>
                <span style={{ color: '#8E8E93', fontSize: 14 }}>/Monat</span>
              </div>
              <div style={{ fontSize: 12, color: '#8E8E93', textDecoration: 'line-through', marginBottom: 20 }}>29 €/Monat</div>
              <button onClick={handleCTA} style={{ ...btnPrimary, width: '100%', justifyContent: 'center' }}>
                {user ? 'Zur App' : 'Starten'}
              </button>
            </div>
            {/* Yearly */}
            <div style={{ border: '1px solid #E5E5EA', borderRadius: 16, padding: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93', marginBottom: 8 }}>Jährlich</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 800 }}>249 €</span>
                <span style={{ color: '#8E8E93', fontSize: 14 }}>/Jahr</span>
              </div>
              <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 600, marginBottom: 20 }}>–28% sparen</div>
              <button onClick={handleCTA} style={{ ...btnSecondary, width: '100%', justifyContent: 'center' }}>
                {user ? 'Zur App' : 'Starten'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer style={{ padding: '40px 48px', borderTop: '1px solid #E5E5EA', textAlign: 'center' }}>
        <span style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 800, fontSize: 18, color: '#D94B0A' }}>Arvis</span>
        <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 8 }}>
          © {new Date().getFullYear()} Arvis · KI-Dokumentation für medizinisches Fachpersonal
        </p>
      </footer>
    </div>
  )
}

const btnPrimary = {
  background: '#D94B0A', color: 'white', border: 'none',
  padding: '10px 22px', borderRadius: 8, fontSize: 14,
  fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
  display: 'inline-flex', alignItems: 'center', gap: 6,
  transition: 'background 0.2s'
}

const btnSecondary = {
  background: 'white', color: '#1C1C1E',
  border: '1px solid #E5E5EA',
  padding: '10px 22px', borderRadius: 8, fontSize: 14,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
  display: 'inline-flex', alignItems: 'center', gap: 6,
  transition: 'background 0.2s'
}

const features = [
  {
    title: 'Brief Schreiber',
    desc: 'KI-gestützte Erstellung medizinischer Briefe und Berichte — in Sekunden, nicht Stunden.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D94B0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  },
  {
    title: 'Scan & Analyse',
    desc: 'Dokumente scannen und automatisch auswerten. Befunde, Rezepte und Berichte im Handumdrehen.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D94B0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
  },
  {
    title: 'Übersetzung',
    desc: 'Kommunizieren Sie mühelos mit internationalen Patienten — medizinische Fachterminologie inklusive.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D94B0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  },
  {
    title: 'Bausteine',
    desc: 'Wiederverwendbare Textbausteine für häufig verwendete Formulierungen — individuell anpassbar.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D94B0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="6" height="6" rx="1"/><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="2" y="15" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/></svg>
  },
  {
    title: 'Dateienverwaltung',
    desc: 'Alle medizinischen Dokumente an einem Ort — sicher gespeichert und jederzeit abrufbar.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D94B0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
  },
  {
    title: 'DSGVO-konform',
    desc: 'Ihre Daten werden sicher in Europa verarbeitet und gespeichert. Vollständig DSGVO-konform.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D94B0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  }
]
