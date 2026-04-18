import { Link } from 'react-router-dom'

const S = {
  page:    { minHeight: '100vh', background: '#fff', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' },
  header:  { borderBottom: '1px solid #eee', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo:    { fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', color: '#1a1a1a', textDecoration: 'none' },
  back:    { fontSize: 15, color: '#888', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 },
  body:    { maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' },
  h1:      { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  updated: { fontSize: 15, color: '#888', marginBottom: 40 },
  h2:      { fontSize: 19, fontWeight: 700, marginTop: 36, marginBottom: 10, color: '#1a1a1a' },
  p:       { fontSize: 17, lineHeight: 1.7, color: '#333', marginBottom: 12 },
  note:    { background: '#fff8f0', border: '1px solid #ffe4c4', borderRadius: 8, padding: '12px 16px', fontSize: 15, color: '#b45309', marginTop: 32 },
  footer:  { borderTop: '1px solid #eee', padding: '24px 40px', display: 'flex', justifyContent: 'center', gap: 24 },
  flink:   { fontSize: 15, color: '#888', textDecoration: 'none' },
}

export default function Impressum() {
  return (
    <div style={S.page}>
      <header style={S.header}>
        <a href="/" style={S.logo}>Arvis</a>
        <Link to="/" style={S.back}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Zurück
        </Link>
      </header>

      <div style={S.body}>
        <h1 style={S.h1}>Impressum</h1>
        <p style={S.updated}>Angaben gemäß § 5 TMG</p>

        <h2 style={S.h2}>Anbieter</h2>
        <p style={S.p}>
          <strong>Amine Mabtoul</strong><br />
          Klinik für Geriatrische Rehabilitation<br />
          Burgstall 9<br />
          72160 Horb am Neckar<br />
          Deutschland
        </p>

        <h2 style={S.h2}>Kontakt</h2>
        <p style={S.p}>
          E-Mail: <a href="mailto:hello@arvis-app.de" style={{ color: '#D94B0A' }}>hello@arvis-app.de</a><br />
          Telefon: +49 152 29231538
        </p>

        <h2 style={S.h2}>Verantwortlich für den Inhalt</h2>
        <p style={S.p}>
          Amine Mabtoul<br />
          Burgstall 9, 72160 Horb am Neckar
        </p>

        <h2 style={S.h2}>Berufsrechtliche Angaben</h2>
        <p style={S.p}>
          Arvis ist ein digitales Werkzeug zur Unterstützung medizinischer Dokumentation.
          Die Plattform richtet sich ausschließlich an medizinisches Fachpersonal.
          Die Nutzung ersetzt keine medizinische Entscheidung oder Diagnose.
        </p>

        <h2 style={S.h2}>Haftung für Inhalte</h2>
        <p style={S.p}>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
        </p>

        <h2 style={S.h2}>Urheberrecht</h2>
        <p style={S.p}>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
        </p>

      </div>

      <footer style={S.footer}>
        <Link to="/impressum"   style={S.flink}>Impressum</Link>
        <Link to="/datenschutz" style={S.flink}>Datenschutz</Link>
        <Link to="/agb"         style={S.flink}>AGB</Link>
      </footer>
    </div>
  )
}
