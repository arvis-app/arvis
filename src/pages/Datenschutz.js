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
  h3:      { fontSize: 17, fontWeight: 600, marginTop: 20, marginBottom: 8, color: '#1a1a1a' },
  p:       { fontSize: 17, lineHeight: 1.7, color: '#333', marginBottom: 12 },
  ul:      { paddingLeft: 20, marginBottom: 12 },
  li:      { fontSize: 17, lineHeight: 1.7, color: '#333', marginBottom: 6 },
  table:   { width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 16 },
  th:      { textAlign: 'left', padding: '8px 12px', background: '#f8f8f8', borderBottom: '1px solid #eee', fontWeight: 600 },
  td:      { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top' },
  caps:    { fontSize: 16, lineHeight: 1.7, color: '#333', marginBottom: 12, fontWeight: 600 },
  note:    { background: '#fff8f0', border: '1px solid #ffe4c4', borderRadius: 8, padding: '12px 16px', fontSize: 15, color: '#b45309', marginTop: 12, marginBottom: 12 },
  footer:  { borderTop: '1px solid #eee', padding: '24px 40px', display: 'flex', justifyContent: 'center', gap: 24 },
  flink:   { fontSize: 15, color: '#888', textDecoration: 'none' },
  a:       { color: '#D94B0A' },
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

        {/* ── 1. DATENSCHUTZ AUF EINEN BLICK ── */}
        <h2 style={S.h2}>1. Datenschutz auf einen Blick</h2>
        <h3 style={S.h3}>Allgemeine Hinweise</h3>
        <p style={S.p}>
          Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten
          passiert, wenn Sie Arvis nutzen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich
          identifiziert werden können. Ausführliche Informationen entnehmen Sie der nachfolgenden
          Datenschutzerklärung.
        </p>
        <h3 style={S.h3}>Welche Daten erfassen wir?</h3>
        <p style={S.p}>
          Wir erheben Daten, die Sie uns aktiv mitteilen (z. B. bei der Registrierung oder im Kontaktformular),
          sowie technische Daten, die automatisch beim Besuch der Website entstehen (z. B. IP-Adresse,
          Browsertyp). Wenn Sie Arvis als Anwendung nutzen, verarbeiten wir außerdem die von Ihnen eingegebenen
          medizinischen Texte zum Zweck der KI-gestützten Dokumentationshilfe.
        </p>
        <h3 style={S.h3}>Wofür nutzen wir Ihre Daten?</h3>
        <p style={S.p}>
          Ihre Daten werden zur Bereitstellung und Verbesserung der Anwendung, zur Abwicklung Ihres
          Abonnements sowie zur Bearbeitung Ihrer Anfragen verwendet. Es findet kein Tracking zu Werbezwecken
          statt.
        </p>
        <h3 style={S.h3}>Welche Rechte haben Sie?</h3>
        <p style={S.p}>
          Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit und Widerspruch. Außerdem steht Ihnen ein Beschwerderecht bei der zuständigen
          Aufsichtsbehörde zu. Wenden Sie sich hierzu jederzeit an:{' '}
          <a href="mailto:hello@arvis-app.de" style={S.a}>hello@arvis-app.de</a>
        </p>

        {/* ── 2. VERANTWORTLICHER ── */}
        <h2 style={S.h2}>2. Verantwortlicher</h2>
        <p style={S.p}>
          Verantwortlicher im Sinne der DSGVO ist:<br />
          <strong>Amine Mabtoul</strong><br />
          Klinik für Geriatrische Rehabilitation<br />
          Burgstall 9, 72160 Horb am Neckar<br />
          Telefon: <a href="tel:+4915229231538" style={S.a}>015229231538</a><br />
          E-Mail: <a href="mailto:hello@arvis-app.de" style={S.a}>hello@arvis-app.de</a>
        </p>

        {/* ── 3. HOSTING ── */}
        <h2 style={S.h2}>3. Hosting</h2>
        <p style={S.p}>
          Diese Website wird extern gehostet. Die personenbezogenen Daten, die auf dieser Website erfasst
          werden, werden auf den Servern des Hosters gespeichert. Hierbei kann es sich v. a. um IP-Adressen,
          Kontaktanfragen, Meta- und Kommunikationsdaten, Websitezugriffe und sonstige Daten handeln.
        </p>
        <p style={S.p}>
          Das externe Hosting erfolgt zum Zwecke der Vertragserfüllung gegenüber unseren potenziellen und
          bestehenden Nutzern (Art. 6 Abs. 1 lit. b DSGVO) und im Interesse einer sicheren, schnellen und
          effizienten Bereitstellung unseres Online-Angebots durch einen professionellen Anbieter
          (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
        <p style={S.p}>Wir setzen folgenden Hoster ein: <strong>Vercel Inc.</strong></p>
        <h3 style={S.h3}>Auftragsverarbeitung</h3>
        <p style={S.p}>
          Wir haben einen Vertrag über Auftragsverarbeitung (AVV) mit Vercel Inc. geschlossen. Dieser
          datenschutzrechtlich vorgeschriebene Vertrag gewährleistet, dass Vercel die personenbezogenen
          Daten unserer Nutzer nur nach unseren Weisungen und unter Einhaltung der DSGVO verarbeitet.
        </p>

        {/* ── 4. ERHOBENE DATEN ── */}
        <h2 style={S.h2}>4. Erhobene Daten und Verarbeitungszwecke</h2>
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
              <td style={S.td}>Technische Zugriffsdaten (IP-Adresse, Browser, Betriebssystem)</td>
              <td style={S.td}>Sicherheit, Fehleranalyse, Server-Logs</td>
              <td style={S.td}>Art. 6 Abs. 1 lit. f DSGVO</td>
            </tr>
          </tbody>
        </table>
        <div style={S.note}>
          <strong>Hinweis zu medizinischen Texten:</strong> Arvis verarbeitet ausschließlich Texte, die Sie
          selbst eingeben. Diese Texte können im Einzelfall besondere Kategorien personenbezogener Daten
          im Sinne von Art. 9 DSGVO (Gesundheitsdaten) enthalten. Wir empfehlen dringend, keine direkt
          identifizierenden Patientendaten (Name, Geburtsdatum, Adresse) einzugeben. Verwenden Sie
          Pseudonyme oder Kürzel gemäß den Vorgaben Ihrer Einrichtung. Die Verarbeitung erfolgt auf
          Grundlage Ihrer ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a DSGVO).
        </div>

        {/* ── 5. SERVER-LOG-DATEIEN ── */}
        <h2 style={S.h2}>5. Server-Log-Dateien</h2>
        <p style={S.p}>
          Der Provider der Seiten erhebt und speichert automatisch Informationen in sogenannten
          Server-Log-Dateien, die Ihr Browser automatisch übermittelt:
        </p>
        <ul style={S.ul}>
          <li style={S.li}>Browsertyp und Browserversion</li>
          <li style={S.li}>Verwendetes Betriebssystem</li>
          <li style={S.li}>Referrer-URL</li>
          <li style={S.li}>Hostname des zugreifenden Rechners</li>
          <li style={S.li}>Uhrzeit der Serveranfrage</li>
          <li style={S.li}>IP-Adresse</li>
        </ul>
        <p style={S.p}>
          Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen. Die Erfassung
          erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der technisch
          fehlerfreien Bereitstellung des Dienstes).
        </p>

        {/* ── 6. COOKIES ── */}
        <h2 style={S.h2}>6. Cookies</h2>
        <p style={S.p}>
          Arvis verwendet ausschließlich technisch notwendige Cookies sowie lokale Speicherung (localStorage)
          zur Aufrechterhaltung Ihrer angemeldeten Sitzung. Es werden keine Tracking-, Analyse- oder
          Marketing-Cookies eingesetzt.
        </p>
        <p style={S.p}>
          Technisch notwendige Cookies werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO sowie
          § 25 Abs. 2 TDDDG gespeichert, da sie für den Betrieb der Anwendung unerlässlich sind und
          keiner gesonderten Einwilligung bedürfen.
        </p>
        <p style={S.p}>
          Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert werden
          und Cookies nur im Einzelfall erlauben oder generell ausschließen. Bei der Deaktivierung von
          Cookies kann die Funktionalität der Anwendung eingeschränkt sein.
        </p>

        {/* ── 7. KONTAKT ── */}
        <h2 style={S.h2}>7. Kontaktaufnahme</h2>
        <h3 style={S.h3}>Kontaktformular</h3>
        <p style={S.p}>
          Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben inklusive der von
          Ihnen angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall von
          Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
        </p>
        <p style={S.p}>
          Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung) oder
          Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bearbeitung von Anfragen). Die Daten
          verbleiben bei uns, bis Sie uns zur Löschung auffordern oder der Zweck der Datenspeicherung
          entfällt.
        </p>
        <h3 style={S.h3}>Anfrage per E-Mail oder Telefon</h3>
        <p style={S.p}>
          Wenn Sie uns per E-Mail oder Telefon kontaktieren, wird Ihre Anfrage inklusive aller daraus
          hervorgehenden personenbezogenen Daten (Name, Anfrage) zum Zwecke der Bearbeitung bei uns
          gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. b oder lit. f DSGVO.
        </p>

        {/* ── 8. DRITTANBIETER ── */}
        <h2 style={S.h2}>8. Drittanbieter und Auftragsverarbeiter</h2>
        <p style={S.p}>
          Arvis nutzt folgende externe Dienstleister, an die personenbezogene Daten übermittelt werden.
          Für alle Übertragungen in die USA stützen wir uns auf Standardvertragsklauseln (Art. 46 DSGVO)
          oder das EU-US Data Privacy Framework, soweit die jeweiligen Anbieter diesem beigetreten sind:
        </p>
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
              <td style={S.td}>USA — <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>Datenschutzerklärung</a></td>
            </tr>
            <tr>
              <td style={S.td}><strong>Stripe Inc.</strong></td>
              <td style={S.td}>Zahlungsabwicklung</td>
              <td style={S.td}>USA — <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>Datenschutzerklärung</a></td>
            </tr>
            <tr>
              <td style={S.td}><strong>OpenAI Inc.</strong></td>
              <td style={S.td}>KI-gestützte Textverarbeitung</td>
              <td style={S.td}>USA — <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>Datenschutzerklärung</a></td>
            </tr>
            <tr>
              <td style={S.td}><strong>Vercel Inc.</strong></td>
              <td style={S.td}>Hosting und Bereitstellung der Website</td>
              <td style={S.td}>USA — <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={S.a}>Datenschutzerklärung</a></td>
            </tr>
            <tr>
              <td style={S.td}><strong>Cloudflare, Inc.</strong></td>
              <td style={S.td}>DNS-Verwaltung und Netzwerkschutz</td>
              <td style={S.td}>USA — <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" style={S.a}>Datenschutzerklärung</a></td>
            </tr>
            <tr>
              <td style={S.td}><strong>Resend Inc.</strong></td>
              <td style={S.td}>Versand transaktionaler E-Mails (Willkommen, Testphasen-Erinnerung, Abo-Bestätigung)</td>
              <td style={S.td}>USA — <a href="https://resend.com/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>Datenschutzerklärung</a></td>
            </tr>
          </tbody>
        </table>
        <p style={S.p}>
          Mit allen oben genannten Dienstleistern wurden Verträge über Auftragsverarbeitung (AVV) gemäß
          Art. 28 DSGVO geschlossen. Cloudflare ist dem EU-US Data Privacy Framework beigetreten
          (Art. 45 DSGVO). Bei DNS-Anfragen können technische Daten (IP-Adresse) kurzzeitig verarbeitet
          werden; es findet keine dauerhafte Speicherung personenbezogener Daten statt.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Sicherheit und
          Verfügbarkeit).
        </p>

        {/* ── 9. SPEICHERDAUER ── */}
        <h2 style={S.h2}>9. Speicherdauer</h2>
        <p style={S.p}>
          Personenbezogene Daten werden gelöscht, sobald der Zweck der Verarbeitung entfallen ist.
          Sofern keine speziellere Speicherdauer genannt wurde, gelten folgende Fristen:
        </p>
        <ul style={S.ul}>
          <li style={S.li}>Kontodaten (E-Mail, Name): bis zur Löschung des Kontos</li>
          <li style={S.li}>Zahlungsdaten: entsprechend gesetzlicher Aufbewahrungsfristen (bis zu 10 Jahre, § 147 AO)</li>
          <li style={S.li}>Eingegebene Texte und Dateien: bis zur Löschung durch den Nutzer oder bei Kontoschließung</li>
          <li style={S.li}>Server-Log-Dateien: in der Regel nach 7–30 Tagen</li>
          <li style={S.li}>Kontaktanfragen: bis zur abschließenden Bearbeitung, danach auf Anfrage</li>
        </ul>
        <p style={S.p}>
          Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine Einwilligung widerrufen, werden
          Ihre Daten gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
        </p>

        {/* ── 10. IHRE RECHTE ── */}
        <h2 style={S.h2}>10. Ihre Rechte</h2>
        <p style={S.p}>Sie haben gemäß DSGVO folgende Rechte gegenüber uns:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Auskunft</strong> (Art. 15 DSGVO): Welche Daten wir über Sie gespeichert haben</li>
          <li style={S.li}><strong>Berichtigung</strong> (Art. 16 DSGVO): Korrektur unrichtiger oder unvollständiger Daten</li>
          <li style={S.li}><strong>Löschung</strong> (Art. 17 DSGVO): Löschung Ihrer personenbezogenen Daten</li>
          <li style={S.li}><strong>Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO): Einschränkung statt Löschung unter bestimmten Voraussetzungen</li>
          <li style={S.li}><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO): Herausgabe Ihrer Daten in einem maschinenlesbaren Format</li>
          <li style={S.li}><strong>Widerspruch</strong> (Art. 21 DSGVO): Widerspruch gegen bestimmte Verarbeitungsvorgänge</li>
          <li style={S.li}><strong>Widerruf</strong>: Jederzeit widerrufbare Einwilligungen mit Wirkung für die Zukunft</li>
          <li style={S.li}><strong>Beschwerde</strong>: Bei der zuständigen Datenschutzaufsichtsbehörde</li>
        </ul>
        <p style={S.p}>
          Zur Ausübung Ihrer Rechte wenden Sie sich an:{' '}
          <a href="mailto:hello@arvis-app.de" style={S.a}>hello@arvis-app.de</a>
        </p>

        <h3 style={S.h3}>Recht auf Einschränkung der Verarbeitung</h3>
        <p style={S.p}>
          Das Recht auf Einschränkung der Verarbeitung besteht insbesondere dann, wenn Sie die Richtigkeit
          Ihrer Daten bestreiten (für die Dauer der Prüfung), wenn die Verarbeitung unrechtmäßig war und
          Sie statt Löschung Einschränkung verlangen, oder wenn Sie die Daten zur Geltendmachung von
          Rechtsansprüchen benötigen.
        </p>

        <h3 style={S.h3}>Widerruf Ihrer Einwilligung</h3>
        <p style={S.p}>
          Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie
          können eine bereits erteilte Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Die
          Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt unberührt.
        </p>

        <h3 style={S.h3}>Beschwerderecht bei der Aufsichtsbehörde</h3>
        <p style={S.p}>
          Im Falle von Verstößen gegen die DSGVO steht Ihnen ein Beschwerderecht bei einer
          Aufsichtsbehörde zu, insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthalts, Ihres
          Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.
        </p>

        {/* ── Art. 21 WIDERSPRUCH — legally required in ALL CAPS ── */}
        <h3 style={S.h3}>Widerspruchsrecht (Art. 21 DSGVO)</h3>
        <p style={S.caps}>
          WENN DIE DATENVERARBEITUNG AUF GRUNDLAGE VON ART. 6 ABS. 1 LIT. E ODER F DSGVO ERFOLGT,
          HABEN SIE JEDERZEIT DAS RECHT, AUS GRÜNDEN, DIE SICH AUS IHRER BESONDEREN SITUATION
          ERGEBEN, GEGEN DIE VERARBEITUNG IHRER PERSONENBEZOGENEN DATEN WIDERSPRUCH EINZULEGEN;
          DIES GILT AUCH FÜR EIN AUF DIESE BESTIMMUNGEN GESTÜTZTES PROFILING. DIE JEWEILIGE
          RECHTSGRUNDLAGE, AUF DER EINE VERARBEITUNG BERUHT, ENTNEHMEN SIE DIESER
          DATENSCHUTZERKLÄRUNG. WENN SIE WIDERSPRUCH EINLEGEN, WERDEN WIR IHRE BETROFFENEN
          PERSONENBEZOGENEN DATEN NICHT MEHR VERARBEITEN, ES SEI DENN, WIR KÖNNEN ZWINGENDE
          SCHUTZWÜRDIGE GRÜNDE FÜR DIE VERARBEITUNG NACHWEISEN, DIE IHRE INTERESSEN, RECHTE UND
          FREIHEITEN ÜBERWIEGEN ODER DIE VERARBEITUNG DIENT DER GELTENDMACHUNG, AUSÜBUNG ODER
          VERTEIDIGUNG VON RECHTSANSPRÜCHEN (WIDERSPRUCH NACH ART. 21 ABS. 1 DSGVO).
        </p>
        <p style={S.caps}>
          WERDEN IHRE PERSONENBEZOGENEN DATEN VERARBEITET, UM DIREKTWERBUNG ZU BETREIBEN, SO
          HABEN SIE DAS RECHT, JEDERZEIT WIDERSPRUCH GEGEN DIE VERARBEITUNG SIE BETREFFENDER
          PERSONENBEZOGENER DATEN ZUM ZWECKE DERARTIGER WERBUNG EINZULEGEN; DIES GILT AUCH FÜR
          DAS PROFILING, SOWEIT ES MIT SOLCHER DIREKTWERBUNG IN VERBINDUNG STEHT. WENN SIE
          WIDERSPRECHEN, WERDEN IHRE PERSONENBEZOGENEN DATEN ANSCHLIESSEND NICHT MEHR ZUM
          ZWECKE DER DIREKTWERBUNG VERWENDET (WIDERSPRUCH NACH ART. 21 ABS. 2 DSGVO).
        </p>

        {/* ── 11. SICHERHEIT ── */}
        <h2 style={S.h2}>11. Sicherheit der Datenübertragung</h2>
        <p style={S.p}>
          Alle Datenübertragungen zwischen Ihrem Browser und unseren Servern erfolgen verschlüsselt über
          TLS/HTTPS. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers
          „https://" anzeigt und ein Schloss-Symbol erscheint.
        </p>
        <p style={S.p}>
          Passwörter werden nicht im Klartext gespeichert. Der Zugang zur Plattform ist durch
          Authentifizierung geschützt. Wir weisen darauf hin, dass die Datenübertragung im Internet
          (z. B. bei der Kommunikation per E-Mail) grundsätzliche Sicherheitslücken aufweisen kann. Ein
          lückenloser Schutz vor dem Zugriff durch Dritte ist nicht möglich.
        </p>

        {/* ── 12. WIDERSPRUCH WERBE-E-MAILS ── */}
        <h2 style={S.h2}>12. Widerspruch gegen Werbe-E-Mails</h2>
        <p style={S.p}>
          Der Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten zur Übersendung
          von nicht ausdrücklich angeforderter Werbung und Informationsmaterialien wird hiermit
          widersprochen. Die Betreiber behalten sich ausdrücklich rechtliche Schritte im Falle der
          unverlangten Zusendung von Werbeinformationen, etwa durch Spam-E-Mails, vor.
        </p>

        {/* ── 13. SCHRIFTARTEN (LOKAL) ── */}
        <h2 style={S.h2}>13. Schriftarten</h2>
        <p style={S.p}>
          Diese Website verwendet die Schriftart Inter, die über Google Fonts geladen wird.
          Beim Laden der Schriftarten wird Ihre IP-Adresse kurzzeitig an Google übertragen.
          Weitere Informationen finden Sie in der Datenschutzerklärung von Google:{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={S.a}>https://policies.google.com/privacy</a>.
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
