import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '32px 24px',
      fontFamily: 'inherit',
    }}>
      <div style={{
        fontSize: 120,
        fontWeight: 800,
        color: 'var(--orange)',
        lineHeight: 1,
        letterSpacing: '-4px',
        marginBottom: 24,
      }}>
        404
      </div>

      <h1 style={{
        fontSize: 24,
        fontWeight: 700,
        color: 'var(--text)',
        margin: '0 0 12px',
      }}>
        Seite nicht gefunden
      </h1>

      <p style={{
        fontSize: 15,
        color: 'var(--text-3)',
        margin: '0 0 40px',
        maxWidth: 380,
      }}>
        Die gesuchte Seite existiert nicht.
      </p>

      <button
        onClick={() => navigate('/scan')}
        style={{
          background: 'var(--orange)',
          color: '#fff',
          border: '1px solid var(--orange)',
          borderRadius: 5,
          padding: '8px 20px',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.15s',
          fontFamily: 'Inter, sans-serif',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-dark)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--orange)'}
      >
        Zurück zur Hauptseite
      </button>
    </div>
  )
}
