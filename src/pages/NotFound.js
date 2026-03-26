import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAF9F7',
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
        color: '#D94B0A',
        lineHeight: 1,
        letterSpacing: '-4px',
        marginBottom: 24,
      }}>
        404
      </div>

      <h1 style={{
        fontSize: 28,
        fontWeight: 700,
        color: '#1a1a1a',
        margin: '0 0 12px',
      }}>
        Seite nicht gefunden
      </h1>

      <p style={{
        fontSize: 17,
        color: '#666',
        margin: '0 0 40px',
        maxWidth: 380,
      }}>
        Die gesuchte Seite existiert nicht.
      </p>

      <button
        onClick={() => navigate('/dashboard')}
        style={{
          background: '#D94B0A',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '14px 32px',
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#bf4008'}
        onMouseLeave={e => e.currentTarget.style.background = '#D94B0A'}
      >
        Zurück zum Dashboard
      </button>
    </div>
  )
}
