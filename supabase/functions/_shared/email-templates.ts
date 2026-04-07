// Shared email templates for Arvis notification emails
// Design matches supabase/templates/confirm-signup.html

const SITE_URL = 'https://arvis-app.de'
const LOGO_URL = 'https://arvis-app.de/arvis-icon.svg'

interface EmailTemplate {
  subject: string
  html: string
}

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e;padding:40px 16px}
.wrapper{max-width:560px;margin:0 auto}
.card{background-color:#fff;border-radius:12px;padding:48px 40px;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
.logo{display:flex;align-items:center;gap:5px;margin-bottom:36px;text-decoration:none}
.logo img{height:40px;width:auto;display:block}
.logo span{font-size:28px;font-weight:800;color:#1c1c1e;letter-spacing:-0.02em;margin-top:3px}
h1{font-size:22px;font-weight:700;color:#1c1c1e;margin-bottom:16px;line-height:1.3}
p{font-size:15px;color:#555;line-height:1.7;margin-bottom:16px}
.cta-wrapper{margin:32px 0;text-align:center}
.cta-button{display:inline-block;background-color:#D94B0A;color:#fff!important;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.2px}
.divider{border:none;border-top:1px solid #eee;margin:32px 0}
.footer{text-align:center;font-size:12px;color:#aaa;line-height:1.6}
.footer a{color:#aaa;text-decoration:underline}
.highlight{color:#D94B0A;font-weight:600}
ul{margin:12px 0 16px 20px;font-size:15px;color:#555;line-height:1.9}
</style>
</head>
<body>
<div class="wrapper"><div class="card">
<a href="${SITE_URL}" class="logo"><img src="${LOGO_URL}" alt="Arvis"/><span>Arvis</span></a>
${body}
<hr class="divider"/>
<div class="footer">
<p>&copy; 2026 Arvis &mdash; <a href="${SITE_URL}">arvis-app.de</a></p>
</div>
</div></div>
</body></html>`
}

function cta(text: string, url: string): string {
  return `<div class="cta-wrapper"><a href="${url}" class="cta-button">${text}</a></div>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function buildEmailHtml(type: string, firstName?: string): EmailTemplate {
  const name = escapeHtml(firstName || 'dort')
  const loginUrl = `${SITE_URL}/login`

  switch (type) {
    case 'welcome':
      return {
        subject: 'Willkommen bei Arvis!',
        html: wrap('Willkommen bei Arvis', `
<h1>Willkommen bei Arvis, ${name}!</h1>
<p>Sch&ouml;n, dass du dabei bist. Dein <span class="highlight">14-t&auml;giger kostenloser Test</span> hat begonnen &mdash; alle Funktionen sind freigeschaltet:</p>
<ul>
<li><strong>Scan &amp; KI-Analyse</strong> &mdash; Dokumente scannen, OCR und KI-Auswertung</li>
<li><strong>Brief Schreiber</strong> &mdash; Arztbriefe mit KI-Unterst&uuml;tzung</li>
<li><strong>Bausteine</strong> &mdash; 1.550 medizinische Textbausteine</li>
<li><strong>&Uuml;bersetzung</strong> &mdash; Medizinisches W&ouml;rterbuch in 6 Sprachen</li>
</ul>
<p>Nutze die Zeit, um Arvis in deinem Klinikalltag auszuprobieren.</p>
${cta('Jetzt loslegen', loginUrl)}
<p style="font-size:13px;color:#888;">Wenn du Fragen hast, antworte einfach auf diese E-Mail.</p>
`)
      }

    case 'trial_reminder':
      return {
        subject: 'Deine Testphase endet in 3 Tagen',
        html: wrap('Testphase endet bald', `
<h1>Deine Testphase endet in 3 Tagen</h1>
<p>Hallo ${name},</p>
<p>dein kostenloser Test bei Arvis l&auml;uft in <strong>3 Tagen</strong> aus. Danach werden die Premium-Funktionen (Scan, Brief Schreiber, Bausteine, &Uuml;bersetzung) gesperrt.</p>
<p>Damit du ohne Unterbrechung weiterarbeiten kannst, sichere dir jetzt dein Abo:</p>
<ul>
<li><strong>Monatlich:</strong> 19&nbsp;&euro;/Monat</li>
<li><strong>J&auml;hrlich:</strong> 249&nbsp;&euro;/Jahr <span class="highlight">(spare &uuml;ber 20&nbsp;%)</span></li>
</ul>
${cta('Jetzt upgraden', loginUrl)}
<p style="font-size:13px;color:#888;">Du kannst jederzeit &uuml;ber dein Profil upgraden.</p>
`)
      }

    case 'trial_expired':
      return {
        subject: 'Deine Testphase ist abgelaufen',
        html: wrap('Testphase abgelaufen', `
<h1>Deine Testphase ist abgelaufen</h1>
<p>Hallo ${name},</p>
<p>dein 14-t&auml;giger Test ist heute zu Ende gegangen. Die Premium-Funktionen sind jetzt gesperrt &mdash; deine Daten bleiben aber gespeichert.</p>
<p>Um wieder vollen Zugriff zu erhalten, schlie&szlig;e einfach ein Abo ab:</p>
<ul>
<li><strong>Monatlich:</strong> 19&nbsp;&euro;/Monat</li>
<li><strong>J&auml;hrlich:</strong> 249&nbsp;&euro;/Jahr <span class="highlight">(spare &uuml;ber 20&nbsp;%)</span></li>
</ul>
${cta('Jetzt Abo abschlie&szlig;en', loginUrl)}
`)
      }

    case 'subscription_confirmed':
      return {
        subject: 'Abo best\u00e4tigt \u2013 Willkommen als Pro!',
        html: wrap('Abo best&auml;tigt', `
<h1>Dein Abo ist aktiv &mdash; Willkommen als Pro!</h1>
<p>Hallo ${name},</p>
<p>vielen Dank f&uuml;r dein Vertrauen! Dein Arvis-Abonnement ist jetzt aktiv und du hast uneingeschr&auml;nkten Zugriff auf alle Funktionen.</p>
<p>Dein Abo verl&auml;ngert sich automatisch. Du kannst es jederzeit &uuml;ber dein <strong>Profil</strong> verwalten oder k&uuml;ndigen.</p>
${cta('Weiter zu Arvis', loginUrl)}
<p style="font-size:13px;color:#888;">Deine Rechnungen findest du im Stripe-Kundenportal (erreichbar &uuml;ber Profil).</p>
`)
      }

    case 'subscription_cancelled':
      return {
        subject: 'Dein Abo wurde gek\u00fcndigt',
        html: wrap('Abo gek&uuml;ndigt', `
<h1>Schade, dass du gehst</h1>
<p>Hallo ${name},</p>
<p>dein Arvis-Abonnement wurde gek&uuml;ndigt. Du beh&auml;ltst deinen vollen Zugriff <strong>bis zum Ende der aktuellen Abrechnungsperiode</strong>.</p>
<p>Danach werden die Premium-Funktionen gesperrt, aber deine Daten bleiben erhalten. Du kannst jederzeit &uuml;ber dein Profil ein neues Abo abschlie&szlig;en.</p>
<p>Falls du Feedback f&uuml;r uns hast, antworte gerne auf diese E-Mail.</p>
`)
      }

    default:
      return { subject: 'Arvis', html: wrap('Arvis', '<p>Nachricht von Arvis.</p>') }
  }
}
