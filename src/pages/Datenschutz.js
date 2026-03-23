import { Link } from 'react-router-dom'

const S = {
  page:    { minHeight: '100vh', background: '#fff', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' },
  header:  { borderBottom: '1px solid #eee', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo:    { fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 22, color: '#1a1a1a', textDecoration: 'none' },
  back:    { fontSize: 13, color: '#888', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 },
  body:    { maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' },
  h1:      { fontSize: 30, fontWeight: 800, marginBottom: 8 },
  updated: { fontSize: 13, color: '#888', marginBottom: 40 },
  h2:      { fontSize: 17, fontWeight: 700, marginTop: 36, marginBottom: 10, color: '#1a1a1a' },
  p:       { fontSize: 15, lineHeight: 1.7, color: '#333', marginBottom: 12 },
  ul:      { paddingLeft: 20, marginBottom: 12 },
  li:      { fontSize: 15, lineHeight: 1.7, color: '#333', marginBottom: 6 },
  table:   { width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 14 },
  th:      { textAlign: 'left', padding: '8px 12px', background: '#f8f8f8', borderBottom: '1px solid #eee', fontWeight: 600 },
  td:      { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top' },
  note:    { background: '#fff8f0', border: '1px solid #ffe4c4', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#b45309', marginTop: 32 },
  footer:  { borderTop: '1px solid #eee', padding: '24px 40px', display: 'flex', justifyContent: 'center', gap: 24 },
  flink:   { fontSize: 13, color: '#888', textDecoration: 'none' },
  a:       { color: '#e87722' },
}

export default function Datenschutz() {
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
        <h1 style={S.h1}>Datenschutzerklärung</h1>
        <p style={S.updated}>Stand: März 2026</p>

        <h2 style={S.h2}>1. Verantwortlicher</h2>
        <p style={S.p}>
          Verantwortlicher im Sinne der DSGVO ist:<br />
          <strong>Amine Mabtoul</strong><br />
          Klinik für Geriatrische Rehabilitation, Burgstall 9, 72160 Horb am Neckar<br />
          E-Mail: <a href="mailto:hello@arvis-app.de" style={S.a}>hello@arvis-app.de</a>
        </p>

        <h2 style={S.h2}>2. Erhobene Daten</h2>
        <p style={S.p}>Bei der Nutzung von Arvis erheben wir folgende personenbezogene Daten:</p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Daten</th>
              <th style={S.th}>Zweck</th>
              <th style={S.th}>Rechtsgrundlage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}>E-Mail-Adresse, Name</td>
              <td style={S.td}>Kontoverwaltung, Authentifizierung</td>
              <td style={S.td}>Art. 6 Abs. 1 lit. b DSGVO</td>
            </tr>
            <tr>
              <td style={S.td}>Zahlungsdaten (letzte 4 Ziffern, Kartentyp)</td>
              <td style={S.td}>Abonnementverwaltung</td>
              <td style={S.td}>Art. 6 Abs. 1 lit. b DSGVO</td>
            </tr>
            <tr>
              <td style={S.td}>Von Ihnen eingegebene medizinische Texte</td>
              <td style={S.td}>KI-Verarbeitung zur Dokumentationshilfe</td>
              <td style={S.td}>Art. 6 Abs. 1 lit. b DSGVO</td>
            </tr>
            <tr>
              <td style={S.td}>Technische Zugriffsdaten (IP, Browser)</td>
              <td style={S.td}>Sicherheit, Fehleranalyse</td>
              <td style={S.td}>Art. 6 Abs. 1 lit. f DSGVO</td>
            </tr>
          </tbody>
        </table>
        <p style={S.p}>
          <strong>Hinweis zu medizinischen Daten:</strong> Arvis verarbeitet Texte, die Sie selbst eingeben. Wir empfehlen, keine direkt identifizierenden Patientendaten (Name, Geburtsdatum) einzugeben. Nutzen Sie Pseudonyme oder Kürzel gemäß den Vorgaben Ihrer Einrichtung.
        </p>

        <h2 style={S.h2}>3. Drittanbieter</h2>
        <p style={S.p}>Arvis nutzt folgende externe Dienstleister, an die personenbezogene Daten übermittelt werden:</p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Anbieter</th>
              <th style={S.th}>Zweck</th>
              <th style={S.th}>Sitz / Datenschutz</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}><strong>Supabase Inc.</strong></td>
              <td style={S.td}>Datenbankspeicherung, Authentifizierung</td>
              <td style={S.td}>USA — <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>Datenschutz</a></td>
            </tr>
            <tr>
              <td style={S.td}><strong>Stripe Inc.</strong></td>
              <td style={S.td}>Zahlungsabwicklung</td>
              <td style={S.td}>USA — <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>Datenschutz</a></td>
            </tr>
            <tr>
              <td style={S.td}><strong>OpenAI Inc.</strong></td>
              <td style={S.td}>KI-gestützte Textverarbeitung</td>
              <td style={S.td}>USA — <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>Datenschutz</a></td>
            </tr>
          </tbody>
        </table>
        <p style={S.p}>
          Für Datenübertragungen in die USA stützen wir uns auf Standardvertragsklauseln (Art. 46 DSGVO) oder das EU-US Data Privacy Framework, soweit die jeweiligen Anbieter diesem beigetreten sind.
        </p>

        <h2 style={S.h2}>4. Speicherdauer</h2>
        <p style={S.p}>
          Personenbezogene Daten werden gelöscht, sobald der Zweck der Verarbeitung entfallen ist:
        </p>
        <ul style={S.ul}>
          <li style={S.li}>Kontodaten: bis zur Löschung des Kontos</li>
          <li style={S.li}>Zahlungsdaten: entsprechend gesetzlicher Aufbewahrungsfristen (bis 10 Jahre, § 147 AO)</li>
          <li style={S.li}>Eingegebene Texte und Dateien: bis zur Löschung durch den Nutzer oder Kontoschließung</li>
        </ul>

        <h2 style={S.h2}>5. Ihre Rechte</h2>
        <p style={S.p}>Sie haben gemäß DSGVO folgende Rechte:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Auskunft</strong> (Art. 15 DSGVO): Welche Daten wir über Sie gespeichert haben</li>
          <li style={S.li}><strong>Berichtigung</strong> (Art. 16 DSGVO): Korrektur unrichtiger Daten</li>
          <li style={S.li}><strong>Löschung</strong> (Art. 17 DSGVO): Löschung Ihrer Daten</li>
          <li style={S.li}><strong>Einschränkung</strong> (Art. 18 DSGVO): Einschränkung der Verarbeitung</li>
          <li style={S.li}><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO): Export Ihrer Daten</li>
          <li style={S.li}><strong>Widerspruch</strong> (Art. 21 DSGVO): Widerspruch gegen bestimmte Verarbeitungen</li>
          <li style={S.li}><strong>Beschwerde</strong>: Bei der zuständigen Datenschutzaufsichtsbehörde</li>
        </ul>
        <p style={S.p}>
          Zur Ausübung Ihrer Rechte wenden Sie sich an: <a href="mailto:hello@arvis-app.de" style={S.a}>hello@arvis-app.de</a>
        </p>

        <h2 style={S.h2}>6. Cookies</h2>
        <p style={S.p}>
          Arvis verwendet technisch notwendige Cookies und lokale Speicherung (localStorage) ausschließlich zur Aufrechterhaltung Ihrer angemeldeten Sitzung. Es werden keine Tracking- oder Marketing-Cookies eingesetzt.
        </p>

        <h2 style={S.h2}>7. Sicherheit</h2>
        <p style={S.p}>
          Alle Datenübertragungen erfolgen verschlüsselt (TLS/HTTPS). Passwörter werden nicht im Klartext gespeichert. Der Zugang zur Plattform ist durch Authentifizierung geschützt.
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
