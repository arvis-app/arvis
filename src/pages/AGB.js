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
  note:    { background: '#fff8f0', border: '1px solid #ffe4c4', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#b45309', marginTop: 32 },
  footer:  { borderTop: '1px solid #eee', padding: '24px 40px', display: 'flex', justifyContent: 'center', gap: 24 },
  flink:   { fontSize: 13, color: '#888', textDecoration: 'none' },
  a:       { color: '#e87722' },
}

export default function AGB() {
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
        <h1 style={S.h1}>Allgemeine Geschäftsbedingungen</h1>
        <p style={S.updated}>Stand: März 2026</p>

        <h2 style={S.h2}>§ 1 Geltungsbereich</h2>
        <p style={S.p}>
          Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen dem Anbieter von Arvis (<strong>Amine Mabtoul</strong>, nachfolgend „Anbieter") und den Nutzern der Plattform arvis-app.de (nachfolgend „Nutzer").
        </p>
        <p style={S.p}>
          Arvis richtet sich ausschließlich an medizinisches Fachpersonal (Ärzte, Pflegepersonal, medizinisches Verwaltungspersonal). Die Nutzung durch Privatpersonen ist nicht vorgesehen.
        </p>

        <h2 style={S.h2}>§ 2 Leistungsbeschreibung</h2>
        <p style={S.p}>
          Arvis ist eine cloudbasierte Software-as-a-Service-Lösung zur Unterstützung medizinischer Dokumentation. Sie umfasst folgende Funktionen:
        </p>
        <ul style={S.ul}>
          <li style={S.li}>KI-gestützte Erstellung und Korrektur medizinischer Schreiben</li>
          <li style={S.li}>Scan und Analyse medizinischer Dokumente</li>
          <li style={S.li}>Verwaltung wiederverwendbarer Textbausteine</li>
          <li style={S.li}>Medizinische Übersetzungen</li>
          <li style={S.li}>Dateiverwaltung</li>
        </ul>
        <p style={S.p}>
          Arvis ist ein Dokumentationswerkzeug. Es ersetzt keine ärztliche Entscheidung, Diagnose oder medizinische Beurteilung. Der Nutzer ist für die inhaltliche Richtigkeit aller erstellten Dokumente verantwortlich.
        </p>

        <h2 style={S.h2}>§ 3 Registrierung und Konto</h2>
        <p style={S.p}>
          Zur Nutzung von Arvis ist eine Registrierung mit E-Mail-Adresse und Passwort oder über Google OAuth erforderlich. Der Nutzer ist verpflichtet, seine Zugangsdaten geheim zu halten und den Anbieter bei unbefugtem Zugriff unverzüglich zu informieren.
        </p>

        <h2 style={S.h2}>§ 4 Testphase und Abonnement</h2>
        <p style={S.p}>
          Nach der Registrierung steht eine kostenlose Testphase von <strong>14 Tagen</strong> mit vollem Funktionsumfang zur Verfügung. Nach Ablauf der Testphase ist ein Abonnement erforderlich:
        </p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Monatliches Abonnement:</strong> 29,00 € / Monat (zzgl. MwSt.)</li>
          <li style={S.li}><strong>Jährliches Abonnement:</strong> 249,00 € / Jahr (zzgl. MwSt.)</li>
        </ul>
        <p style={S.p}>
          Die Abrechnung erfolgt über Stripe. Mit Abschluss des Abonnements bestätigt der Nutzer, dass er über 18 Jahre alt ist und als Unternehmer handelt (B2B). Das Abonnement verlängert sich automatisch, bis es gekündigt wird.
        </p>

        <h2 style={S.h2}>§ 5 Kündigung</h2>
        <p style={S.p}>
          Der Nutzer kann sein Abonnement jederzeit über den Bereich „Mein Profil" in der Anwendung kündigen. Die Kündigung wird zum Ende der laufenden Abrechnungsperiode wirksam. Bis dahin bleibt der Zugang vollständig erhalten.
        </p>
        <p style={S.p}>
          Der Anbieter kann das Konto bei Verstoß gegen diese AGB mit sofortiger Wirkung kündigen. Eine Rückerstattung bereits gezahlter Beträge erfolgt in diesem Fall nicht.
        </p>

        <h2 style={S.h2}>§ 6 Zahlung</h2>
        <p style={S.p}>
          Die Zahlung erfolgt über den Zahlungsdienstleister Stripe. Akzeptierte Zahlungsmethoden: Kreditkarte (Visa, Mastercard), SEPA-Lastschrift, und weitere von Stripe angebotene Methoden. Bei fehlgeschlagener Zahlung behält sich der Anbieter vor, den Zugang zu sperren.
        </p>

        <h2 style={S.h2}>§ 7 Verfügbarkeit</h2>
        <p style={S.p}>
          Der Anbieter bemüht sich um eine hohe Verfügbarkeit der Plattform, garantiert jedoch keine 100%ige Verfügbarkeit. Wartungsarbeiten werden nach Möglichkeit vorab angekündigt. Ausfälle berechtigen nicht zur Minderung oder Rückforderung von Abonnementgebühren, sofern sie 48 Stunden pro Monat nicht überschreiten.
        </p>

        <h2 style={S.h2}>§ 8 Haftungsbeschränkung</h2>
        <p style={S.p}>
          Die Haftung des Anbieters ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Eine Haftung für mittelbare Schäden, entgangenen Gewinn oder Datenverlust ist ausgeschlossen, soweit gesetzlich zulässig.
        </p>
        <p style={S.p}>
          Arvis ist ein Hilfsmittel zur Dokumentation. Der Anbieter haftet nicht für medizinische Entscheidungen, die auf Basis der von Arvis erstellten Texte getroffen werden.
        </p>

        <h2 style={S.h2}>§ 9 Datenschutz</h2>
        <p style={S.p}>
          Informationen zur Verarbeitung personenbezogener Daten finden Sie in unserer{' '}
          <Link to="/datenschutz" style={S.a}>Datenschutzerklärung</Link>.
        </p>

        <h2 style={S.h2}>§ 10 Änderungen der AGB</h2>
        <p style={S.p}>
          Der Anbieter behält sich das Recht vor, diese AGB mit einer Frist von 30 Tagen zu ändern. Änderungen werden per E-Mail angekündigt. Widerspricht der Nutzer nicht innerhalb von 30 Tagen, gelten die neuen AGB als akzeptiert.
        </p>

        <h2 style={S.h2}>§ 11 Anwendbares Recht und Gerichtsstand</h2>
        <p style={S.p}>
          Es gilt deutsches Recht. Gerichtsstand ist Horb am Neckar, soweit der Nutzer Kaufmann ist.
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
