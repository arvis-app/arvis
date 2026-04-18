import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { supabase, invokeEdgeFunction } from '../supabaseClient'
import { logError } from '../utils/logger'
import { downloadAsWord } from '../utils/downloadWord'
import { QRCodeSVG } from 'qrcode.react'
import { PDFDocument } from 'pdf-lib'

// ── Utilitaire : échappe les caractères HTML dangereux dans une chaîne ────────
function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Markdown → HTML (fidèle à l'original) ─────────────────────────────────────
function markdownToHtml(md) {
  // Add space after colons not already followed by a space
  md = md.replace(/:\*\*([^\s*\n])/g, ':** $1') // space after closing ** bold label
  md = md.replace(/:(?=[^\s\n*])/g, ': ')        // space after other colons

  const lines = md.split('\n')

  // Bold labels before : in "Wichtige Befunde" items
  const befundeIdx = lines.findIndex(l => /^#{1,3} /.test(l) && /wichtige.befunde/i.test(l))
  if (befundeIdx >= 0) {
    for (let i = befundeIdx + 1; i < lines.length; i++) {
      if (/^#{1,3} /.test(lines[i])) break
      if (/^[-–] /.test(lines[i]) && !/\*\*/.test(lines[i]))
        lines[i] = lines[i].replace(/^([-–] )([^:\n]+): /, '$1**$2:** ')
    }
  }

  // Sort "Nicht übersehen" list items: 🔴 first, then 🟡, then 🟢
  const secIdx = lines.findIndex(l => /^#{1,3} /.test(l) && /nicht.übersehen/i.test(l))
  if (secIdx >= 0) {
    const itemIdxs = []
    for (let i = secIdx + 1; i < lines.length; i++) {
      if (/^#{1,3} /.test(lines[i])) break
      if (/^[-–] /.test(lines[i])) itemIdxs.push(i)
    }
    if (itemIdxs.length > 0) {
      const prio = l => l.includes('🔴') ? 0 : l.includes('🟡') ? 1 : l.includes('🟢') ? 2 : 3
      const sorted = itemIdxs.map(i => lines[i]).sort((a, b) => prio(a) - prio(b))
      itemIdxs.forEach((idx, i) => { lines[idx] = sorted[i] })
    }
  }

  let html = '', inList = false, inTable = false, sectionCounter = 0, inSectionBody = false
  // Tracks the current colored sub-section (🔴/🟡/🟢 header lines)
  let secBg = 'transparent', secColor = 'var(--text-2)', secBorder = 'var(--border)', secActive = false
  let i = 0; while (i < lines.length) {
    const line = lines[i]
    if (inTable && !/^\|/.test(line.trim())) { html += '</tbody></table></div>'; inTable = false }
    if (/^#{1,3} /.test(line)) {
      if (inSectionBody) { html += '</div>'; inSectionBody = false }
      if (inList) { html += '</div>'; inList = false }
      secActive = false; secBg = 'transparent'; secColor = 'var(--text-2)'; secBorder = 'var(--border)'
      let text = escHtml(line.replace(/^#{1,3} /, '')).replace(/\*\*(.+?)\*\*/g, '$1')
      const mt = html === '' ? '0' : '22px'
      sectionCounter++
      const sid = `s${sectionCounter}`
      const copyBtn = `<button data-copy-sec="${sid}" title="Abschnitt kopieren" style="flex-shrink:0;background:none;border:none;padding:3px 4px;cursor:pointer;color:var(--text-3);border-radius:4px;display:flex;align-items:center;opacity:0.6;margin-right:8px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>`
      if (/nicht.übersehen/i.test(text)) {
        text = text.replace(/^[⚠️\s]+/, '')
        html += `<div data-sec="${sid}" style="font-size:14px;font-weight:600;color:var(--text);margin-top:${mt};margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid var(--orange);letter-spacing:0.01em;display:flex;align-items:center;justify-content:space-between;gap:8px;"><span style="display:flex;align-items:center;gap:8px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#FEF08A;flex-shrink:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>${text}</span>${copyBtn}</div>`
      } else {
        html += `<div data-sec="${sid}" style="font-size:14px;font-weight:600;color:var(--text);margin-top:${mt};margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid var(--orange);letter-spacing:0.01em;display:flex;align-items:center;justify-content:space-between;"><span>${text}</span>${copyBtn}</div>`
      }
      html += `<div data-sec-body="${sid}">`
      inSectionBody = true
    } else if (/^\*\*[^*]+\*\*:?\s*$/.test(line.trim())) {
      if (inList) { html += '</div>'; inList = false }
      secActive = false; secBg = 'transparent'; secColor = 'var(--text-2)'; secBorder = 'var(--border)'
      const text = escHtml(line).replace(/\*\*(.+?)\*\*/g, '$1').replace(/:(\S)/g, ': $1')
      const mt2 = html === '' ? '0' : '22px'
      html += `<div style="font-size:14px;font-weight:600;color:var(--text);margin-top:${mt2};margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid var(--orange);letter-spacing:0.01em;">${text}</div>`
    } else if (/^(🔴|🟡|🟢)/.test(line.trim())) {
      // Colored sub-section header: "🔴 Kritisch" / "🟡 Wichtig" / "🟢 Beachten"
      if (inList) { html += '</div>'; inList = false }
      const em = line.trim().match(/^(🔴|🟡|🟢)/)[1]
      const label = escHtml(line.trim().replace(/^(🔴|🟡|🟢)\s*/, '')).replace(/\*\*/g, '').trim()
      let dot = '', dotColor = ''
      if (em === '🔴') { secBg = 'rgba(220,38,38,0.14)'; secColor = '#B91C1C'; secBorder = '#DC2626'; dotColor = '#DC2626' }
      else if (em === '🟡') { secBg = 'rgba(217,119,6,0.13)'; secColor = '#92400E'; secBorder = '#D97706'; dotColor = '#D97706' }
      else if (em === '🟢') { secBg = 'rgba(22,163,74,0.12)'; secColor = '#166534'; secBorder = '#16A34A'; dotColor = '#16A34A' }
      secActive = true
      dot = `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${dotColor};flex-shrink:0;margin-right:9px;"></span>`
      const mt3 = html === '' ? '0' : '14px'
      html += `<div style="font-size:13px;font-weight:600;color:${secColor};margin-top:${mt3};margin-bottom:6px;display:flex;align-items:center;">${dot}<span>${label}</span></div>`
    } else if (/^\|.+\|/.test(line.trim())) {
      if (inList) { html += '</div>'; inList = false }
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) { i++; continue }
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(c => escHtml(c.trim()).replace(/\*\*(.+?)\*\*/g, '$1'))
      if (!inTable) {
        inTable = true
        html += '<div style="border-left:3px solid var(--border);border-radius:0 6px 6px 0;padding:2px 0;margin-top:2px;overflow-x:auto;"><table style="width:auto;border-collapse:collapse;font-size:12.5px;"><tbody>'
      } else {
        html += '<tr>' + cells.map((c, i) => {
          const val = (c === '—' || c === '-') ? '' : c
          const s = i === 0 ? 'padding:4px 12px;font-weight:600;color:var(--text);white-space:nowrap;' : 'padding:4px 8px;color:var(--text-2);white-space:nowrap;'
          return `<td style="${s}">${val}</td>`
        }).join('') + '</tr>'
      }
    } else if (/^\* /.test(line)) {
      if (!inList) { html += '<div style="display:flex;flex-direction:column;gap:2px;margin-top:2px;">'; inList = true }
      const rawText2 = escHtml(line.replace(/^\* /, '').trim()).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/:(\S)/g, ': $1')
      html += `<div data-subitem="1" style="font-size:12px;color:var(--text-2);padding:2px 0 2px 12px;line-height:1.5;">${rawText2}</div>`
    } else if (/^[-–] /.test(line)) {
      if (!inList) { html += '<div style="display:flex;flex-direction:column;gap:2px;margin-top:2px;">'; inList = true }
      let rawText = escHtml(line.replace(/^[-–] /, '').trim())
      const emojiMatch = rawText.match(/🔴|🟡|🟢/)
      let bg = secActive ? secBg : 'transparent'
      let color = secActive ? secColor : 'var(--text-2)'
      let border = secActive ? secBorder : 'var(--border)'
      if (emojiMatch) {
        const em = emojiMatch[0]
        if (em === '🔴') { bg = 'rgba(220,38,38,0.14)'; color = '#B91C1C'; border = '#DC2626' }
        else if (em === '🟡') { bg = 'rgba(217,119,6,0.13)'; color = '#92400E'; border = '#D97706' }
        else if (em === '🟢') { bg = 'rgba(22,163,74,0.12)'; color = '#166534'; border = '#16A34A' }
        rawText = rawText.replace(em, '').trim()
      }
      let text = rawText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/:(\S)/g, ': $1')
      const subs = []
      while (i + 1 < lines.length && /^\* /.test(lines[i + 1])) {
        i++
        subs.push(escHtml(lines[i].replace(/^\* /, '').trim()).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/:(\S)/g, ': $1'))
      }
      if (subs.length > 0) {
        const subsHtml = subs.map(s => `<div data-subitem="1" style="margin-left:12px;">${s}</div>`).join('')
        html += `<div data-type="item" style="font-size:12.5px;color:${color};background:${bg};border-left:3px solid ${border};border-radius:0 6px 6px 0;padding:5px 12px;line-height:1.6;">${text}<div data-type="subs" style="margin-top:3px;font-size:12px;color:var(--text-2);display:flex;flex-direction:column;gap:1px;line-height:1.5;">${subsHtml}</div></div>`
      } else {
        html += `<div style="font-size:12.5px;color:${color};background:${bg};border-left:3px solid ${border};border-radius:0 6px 6px 0;padding:5px 12px;line-height:1.6;">${text}</div>`
      }
    } else if (line.trim() === '') {
      if (inList) { html += '</div>'; inList = false }
    } else if (/^[A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s\-/]+:\s*$/.test(line.trim())) {
      if (inList) { html += '</div>'; inList = false }
      secActive = false; secBg = 'transparent'; secColor = 'var(--text-2)'; secBorder = 'var(--border)'
      const mt2 = html === '' ? '0' : '22px'
      html += `<div style="font-size:17px;font-weight:800;color:var(--text);margin-top:${mt2};margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid var(--orange);letter-spacing:0.01em;">${escHtml(line.trim())}</div>`
    } else {
      if (inList) { html += '</div>'; inList = false }
      const text = escHtml(line).replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text);font-weight:700;">$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/:(\S)/g, ': $1').replace(/\b([A-ZÄÖÜ][^:<]{1,40}):/g, '<strong style="color:var(--text);font-weight:700;">$1:</strong>')
      const subs2 = []
      while (i + 1 < lines.length && /^\* /.test(lines[i + 1])) {
        i++
        subs2.push(escHtml(lines[i].replace(/^\* /, '').trim()).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/:(\S)/g, ': $1'))
      }
      if (subs2.length > 0) {
        const subs2Html = subs2.map(s => `<div data-subitem="1" style="margin-left:12px;">${s}</div>`).join('')
        html += `<div data-type="item" style="font-size:12.5px;font-weight:600;color:var(--text-2);border-left:3px solid var(--border);border-radius:0 6px 6px 0;padding:4px 10px;line-height:1.5;margin-top:2px;">${text}<div data-type="subs" style="margin-top:2px;font-size:12px;font-weight:400;color:var(--text-2);display:flex;flex-direction:column;gap:1px;line-height:1.5;">${subs2Html}</div></div>`
      } else {
        html += `<div style="font-size:12.5px;color:var(--text-2);border-left:3px solid var(--border);border-radius:0 6px 6px 0;padding:4px 10px;line-height:1.5;margin-top:2px;">${text}</div>`
      }
    }
    i++
  }
  if (inList) html += '</div>'
  if (inSectionBody) html += '</div>'
  if (inTable) html += '</tbody></table></div>'
  return html
}

// Normalise l'orientation EXIF via canvas (le navigateur applique auto l'EXIF)
function normalizeBlob(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    }
    img.src = url
  })
}

const SYSTEM_PROMPT = 'Du bist ein klinischer Entscheidungsassistent für Krankenhausärzte in Deutschland. Deine Aufgabe ist nicht nur zusammenzufassen, sondern aktiv mitzudenken — wie ein erfahrener Kollege, der das Dokument mitliest. Verwende klinische Abkürzungen (Z.n., ED, V.a., RR, NAS, etc.).\n\nDeine Ausgabe hat IMMER zwei Teile: zuerst die ZUSAMMENFASSUNG, dann die ANALYSE. Keinen Teil weglassen.\n\nDein interner Denkprozess für den Analyse-Teil (NICHT in der Ausgabe zeigen — nur die Ergebnisse als flache Liste ausgeben):\n\n1. MEDIKATION: Gleiche jede verordnete Substanz mit dokumentierten Allergien ab (inkl. Kreuzallergien wie Penicillin → Amoxicillin/Ampicillin/Piperacillin). Prüfe JEDES Medikament gegen die dokumentierten Befunde auf Kontraindikationen — insbesondere: Metformin bei GFR<45 (Laktatazidose), NSAR bei GI-Blutung/Ulkus/Niereninsuffizienz, Kalium bei Hyperkaliämie, ACE-Hemmer bei Hyperkaliämie+NI. Prüfe Interaktionen und fehlende Standardmedikamente für dokumentierte Diagnosen (z.B. Hypertonie ohne Antihypertensivum, VHF ohne Antikoagulation, Herzinsuffizienz ohne ACE-Hemmer/Betablocker, Diabetes ohne OAD/Insulin).\n2. KLINISCHE KOHÄRENZ: Stimmen Diagnosen, Befunde, Verlauf und Empfehlungen überein? Gibt es Widersprüche, nicht weiterverfolgte Befunde, fehlende Diagnostik, ungeklärte Symptome?\n3. DOKUMENTATION & DATEN: Falsche oder widersprüchliche Angaben (Alter, Datum, Seitenangabe, Dosierung)? Fehlende Informationen die für die Weiterbehandlung relevant wären?\n4. NACHSORGE & PRÄVENTION: Fehlende Verlaufskontrollen, offene Konsile, empfohlene Screenings, soziale/pflegerische Risiken (Sturzrisiko, Versorgungssituation, Compliance)?\n5. SELBSTPRÜFUNG: Würde ein erfahrener Oberarzt bei einem 🟢-Punkt sofort intervenieren? Dann hochstufen. Ist ein 🔴-Punkt aufschiebbar ohne Patientenschaden? Dann runterstufen.\n\nKlassifikation:\n🔴 Direktes Patientenrisiko — z.B. Allergie/Kreuzallergie übersehen, Medikament trotz Kontraindikation, nicht adressierte Red Flag, Widerspruch zwischen Verlauf und Entlassplan, fehlende Standardtherapie mit Prognoseeinfluss.\n🟡 Klinisch relevant, zeitnah klärungsbedürftig — z.B. pathologischer Wert ohne Konsequenz, unbegründete Dosisänderung, fehlende Verlaufskontrolle, falsche Angaben im Brief, relevante Interaktion, nicht weiterverfolgte Diagnostik.\n🟢 Optimierungspotenzial — z.B. empfohlene Vorsorge, fehlende nicht-dringliche Konsile, Dokumentationslücke, pflegerische/soziale Empfehlung.\n\nAUSGABEFORMAT:\n\nFühre nur Abschnitte auf, die im Text vorhanden sind:\n\n### Hauptdiagnose / Hauptdiagnosen\n(der Hauptgrund der stationären Aufnahme — genau eine → "Hauptdiagnose", mehrere → "Hauptdiagnosen". Wortgetreu aus dem Dokument übernehmen, keine Kürzung, keine Nummerierung. OP-Datum, Verfahren, Therapie-Details als "* " Unterpunkte direkt darunter wenn relevant.)\n\n### Weitere Diagnosen\n(ZWINGEND nach Organsystem sortiert in dieser Reihenfolge: Kardial → Metabolisch → Renal → Pneumologisch → Gastroenterologisch → Neurologisch → Hämatologisch/Onkologisch → Muskuloskelettal → Urogenital → Infektiös → Dermatologisch → HNO/Ophthalmologisch → Psychiatrisch → Sonstige/Allergien. KEINE Kategorie-Zwischenüberschriften ausgeben — nur die sortierte Liste der Diagnosen mit ihren Unterpunkten. Innerhalb jeder Kategorie die Diagnosen nach klinischer Relevanz sortieren — wichtigste zuerst.)\n\n### Aufenthalt\nGrund: [ein Satz]\nVerlauf: [2–3 Sätze, nur klinisch relevante Wendepunkte, chronologisch]\n\n### Wichtige Befunde\n(Gliedere diesen Abschnitt nach Modalität in Untergruppen. Jede Modalität (z.B. "Labor", "Sono Abdomen", "CT Thorax", "Röntgen Thorax", "EKG", "MRT ...", "Echokardiographie", "Histologie" — je nachdem was im Dokument vorkommt) steht auf einer eigenen Zeile OHNE Doppelpunkt und OHNE Bindestrich am Anfang. Direkt darunter die Werte/Befunde als Unterpunkte mit einem Sternchen gefolgt von einem Leerzeichen ("* "). Mehrere verwandte Laborwerte dürfen durch Kommas getrennt auf einer Zeile gruppiert werden (z.B. "Kreatinin 1,8 mg/dl, GFR 38 ml/min"). Nur pathologische oder klinisch relevante Werte, keine Normalbefunde, keine Interpretation. Beispielformat (exakt so):\nLabor\n* Kreatinin 1,8 mg/dl, GFR 38 ml/min\n* HbA1c 8,2 %\n* CRP 45 mg/l, Leukozyten 14,2/nl\nSono Abdomen\n* Leber grob strukturiert\n* Gallenblase mit Sludge\nCT Thorax\n* Kein Infiltrat, kein Erguss)\n\n### Aktuelle Medikation\n(Als Markdown-Tabelle: | Medikament (Dosis) | Schema | ggf. Dauer |)\nSchema-Format: morgens-mittags-abends (3 Werte). Die vierte Stelle (nachts) NUR angeben, wenn sie NICHT 0 ist. Beispiel: 1-0-1 (nicht 1-0-1-0), aber 0-0-0-2 wenn nachts relevant.\nKeine Darreichungsform (kein "Oral", "s.c.", "i.v.", "Tabletten", "Tropfen" etc.) — nur Wirkstoff, Dosis und Schema.\nSpalte "ggf. Dauer": AUSSCHLIESSLICH eintragen, wenn das Medikament "pausiert" oder "abgesetzt" ist, ODER wenn eine konkrete Restdauer/Enddatum dokumentiert ist (z.B. "für 5 Tage", "noch 3 Tage", "bis 18.04.2026", "7 Tage"). In ALLEN anderen Fällen die Zelle KOMPLETT LEER lassen — keine Einnahmehinweise ("nüchtern", "2h Abstand zu PPI"), keine Indikationen ("H.p.-Eradikation", "als Vormedikation", "wie Vormedikation"), keine Startdaten, keine Applikationsart, keine sonstigen Kommentare.\nREIHENFOLGE der Medikamente in der Tabelle (ZWINGEND einhalten, keine Untertitel/Gruppenüberschriften — nur die Zeilen in dieser Reihenfolge sortieren):\n1. Antikoagulation / Thrombozytenaggregationshemmer (z.B. ASS, Clopidogrel, Apixaban, Rivaroxaban, Edoxaban, Dabigatran, Marcumar)\n2. Betablocker (z.B. Bisoprolol, Metoprolol, Carvedilol, Nebivolol)\n3. Herzinsuffizienz-spezifische Medikation (z.B. Entresto / Sacubitril-Valsartan, Ivabradin)\n4. ACE-Hemmer / Sartane (z.B. Ramipril, Enalapril, Lisinopril, Candesartan, Valsartan, Losartan)\n5. Andere Antihypertensiva (z.B. Amlodipin, Lercanidipin, Moxonidin, Urapidil, Clonidin)\n6. Antiarrhythmika (z.B. Amiodaron, Flecainid, Propafenon, Digitoxin)\n7. Diuretika (z.B. Torasemid, Furosemid, HCT, Spironolacton, Eplerenon)\n8. Elektrolyte (z.B. Kalium, Magnesium, Calcium)\n9. Gliflozine / SGLT2-Hemmer (z.B. Empagliflozin, Dapagliflozin)\n10. Antidiabetika (z.B. Metformin, DPP4-Hemmer, GLP1-Agonisten, Sulfonylharnstoffe)\n11. Stoffwechsel-Medikation — inkl. ALLE Supplementationen außer Elektrolyte (z.B. Statine, Ezetimib, Allopurinol, Febuxostat, Fibrate, Vitamin D / Cholecalciferol, Vitamin B12 / Cyanocobalamin, Folsäure, Eisen / Eisen(II)-sulfat / Eisen(III), Zink, Selen). Eisen-Präparate (inkl. aller Handelsnamen wie Maltofer, Ferrlecit, Ferinject, Monofer, Eisensulfat, Eisen(III)-hydroxid-polymaltose — auch bei Anämie-Indikation) gehören IMMER in Kategorie 11, NIE in \"Sonstige\"\n12. Schilddrüsen-Medikation (z.B. L-Thyroxin, Thiamazol)\n13. Pulmologische Medikation (z.B. inhalative Bronchodilatatoren, ICS, Montelukast, Theophyllin)\n14. Magen-Darm-Medikation (z.B. PPI, Antiemetika, Laxantien, MCP)\n15. Analgetika (von höchster zur niedrigsten Stufe: starke Opioide → schwache Opioide → Metamizol → Paracetamol → NSAR)\n16. Ko-Analgetika (z.B. Pregabalin, Gabapentin, Amitriptylin, Duloxetin als Schmerztherapie)\n17. Neuro-Medikation (Antiepileptika, Neuroleptika, Parkinson-Medikation, Antidepressiva)\n18. Urologische Medikation (z.B. Alphablocker wie Tamsulosin, 5-Alpha-Reduktase-Hemmer)\n19. Antibiotika / Antiinfektiva\n20. Heparine (z.B. Enoxaparin, Certoparin, unfraktioniertes Heparin)\n21. Insulin (Basal- und Bolusinsulin)\nMedikamente, die sich keiner der Kategorien 1–19 zuordnen lassen, werden ZWINGEND zwischen Antibiotika (Punkt 19) und Heparine (Punkt 20) eingefügt — NIEMALS irgendwo anders in der Tabelle. Dazu gehören insbesondere (nicht erschöpfend): Antivertiginosa / HNO-Medikation (z.B. Betahistin, Dimenhydrinat, Cinnarizin, Flunarizin), Ophthalmologika (z.B. Latanoprost, Timolol-Augentropfen), Dermatologika (z.B. topische Kortikosteroide, Antimykotika-Salben), Gynäkologika (z.B. Estradiol, Tibolon), Immunsuppressiva / Biologika (z.B. Methotrexat, Tacrolimus, Ciclosporin, Adalimumab), Antihistaminika (z.B. Cetirizin, Loratadin, Desloratadin), Phytotherapeutika, Homöopathika, und alle sonstigen Substanzen, die keiner der oben genannten 19 Kategorien eindeutig angehören. Im Zweifel: lieber als "nicht klassifizierbar" behandeln und ans Ende vor Heparine setzen, als willkürlich in eine unpassende Kategorie einfügen. KEINE Zwischenüberschriften, KEINE Gruppen-Header, KEINE leeren Zeilen zwischen den Kategorien — nur eine durchgehende Tabelle in dieser Reihenfolge.\n\n### Aktuelle Empfehlungen\n\n### Nächste Schritte\n\nBei den Diagnosen: WORTGETREUE Übernahme aus dem Dokument — keine Kürzung. Alle Details beibehalten: Jahreszahl, Schweregrad, Messwerte, Stadium, ICD-Code, Lateralität. Keine Diagnose darf ausgelassen werden.\n\nSORTIERUNG NACH ORGANSYSTEM (PFLICHT):\nWeitere Diagnosen ZWINGEND in dieser Reihenfolge sortieren: Kardial → Metabolisch → Renal → Pneumologisch → Gastroenterologisch → Neurologisch → Hämatologisch/Onkologisch → Muskuloskelettal → Urogenital → Infektiös → Dermatologisch → HNO/Ophthalmologisch → Psychiatrisch → Sonstige/Allergien. KEINE Kategorie-Zwischenüberschriften ausgeben (weder "**Kardial**" noch "Kardial:" noch sonst eine sichtbare Kategorie-Markierung) — nur die sortierte Liste der Diagnosen. Innerhalb jeder Kategorie nach klinischer Relevanz sortieren (wichtigste zuerst).\n\nKONSOLIDIERUNGSREGEL (KRITISCH — OHNE AUSNAHME):\nKomplikationen, Manifestationen und Folgeerkrankungen einer Grunderkrankung werden NIEMALS als eigenständige Nebendiagnose gelistet, sondern ZWINGEND als Unterpunkte (\"* \") direkt unter die Grunderkrankung gezogen. Typische Konsolidierungen:\n- Diabetes mellitus → diabetische Nephropathie, Retinopathie, Polyneuropathie, diabetisches Fußsyndrom, Makroangiopathie als Unterpunkte (NICHT eigene Diagnosen)\n- Arterielle Hypertonie → hypertensive Herzerkrankung, hypertensive Kardiomyopathie, linksventrikuläre Hypertrophie, hypertensive Nephropathie als Unterpunkte\n- Chronische Herzinsuffizienz → LVEF, NYHA-Stadium, diastolische/systolische Dysfunktion, rezidivierende Dekompensationen als Unterpunkte\n- Vorhofflimmern → CHA2DS2-VASc-Score, HAS-BLED, Antikoagulation (Wirkstoff + Dosis) als Unterpunkte\n- KHK / Z.n. Myokardinfarkt → Datum, betroffene Gefäße, Stents, duale Thrombozytenaggregationshemmung als Unterpunkte\n- Hyperlipoproteinämie → LDL, Statin-Therapie, familiäre Belastung als Unterpunkte\n- COPD → GOLD-Stadium, FEV1, Exazerbation mit Datum, Sauerstofftherapie, Inhalativa als Unterpunkte\n- Niereninsuffizienz → aktuelle GFR, CKD-Stadium, Ursache als Unterpunkte\n- Anämie → aktueller Hb, Ätiologie (Eisenmangel, chronisch, Blutungs-assoziiert), Substitution als Unterpunkte\n- Onkologische Grunderkrankung → Metastasen, Rezidive, paraneoplastische Syndrome als Unterpunkte\n\nTHERAPIE- UND OP-EXTRAKTION (OBLIGATORISCH):\nFür jede Diagnose das GESAMTE Dokument durchsuchen (Therapie, Verlauf, Procedere, OP-Bericht, Befunde, Bildgebung, Konsile, Medikation, Anamnese) und relevante Infos als \"* \" Unterpunkte extrahieren:\n- Frakturen → OP-Datum + Verfahren (z.B. \"TFNa am 12.04.2026\", \"TEP-Implantation links\")\n- Pneumonie / Infektionen → Erreger (falls bekannt) + Antibiose + Dauer (z.B. \"Piperacillin/Tazobactam für 7 Tage\")\n- Onkologie → Stadium/TNM + Histologie + durchgeführte Therapie (OP, Chemo, RT)\n- Kardiovaskuläre Eingriffe → Datum + Prozedur (PCI, Stent, Schrittmacher, Klappenersatz)\n- Allgemeine OPs → Datum + Verfahren\n- Relevante Medikation (Antikoagulation, Antibiose, Immunsuppression, Eradikation, Chemotherapie) → Wirkstoff + Dosis + ggf. Dauer\n\nERLAUBTE LABORWERTE unter Diagnosen — AUSSCHLIESSLICH chronische Marker, ZWINGEND aktueller Wert (KEIN Verlauf, KEINE täglichen Werte):\n- HbA1c → bei Diabetes\n- GFR → bei chronischer Niereninsuffizienz\n- LDL / Gesamtcholesterin → bei Hyperlipoproteinämie\n- TSH → bei Schilddrüsenerkrankung\n- Ferritin, Transferrinsättigung → bei Eisenmangel\n- Hb → bei Anämie (aktueller Wert)\n\nVERBOTEN unter Diagnosen: CRP, Leukozyten, akute Kreatinin-Werte, Hb-Verlauf nach Transfusion, Blutzucker-Tagesprofile, Blutdruck-Tagesmessungen, alle täglichen/stündlichen Messwerte, alle Normalbefunde.\n\nFORMAT ZWINGEND — Unterpunkte mit \"* \" (Sternchen + Leerzeichen), NIEMALS \"- \" oder \"  - \". Keine Nummerierung der Diagnosen. Freie Neuorganisation erlaubt, aber keine neuen Informationen erfinden.\n\nBEISPIEL EINER VOLLSTÄNDIGEN STRUKTUR (ohne Kategorie-Überschriften, aber in Kategorie-Reihenfolge sortiert):\n\n### Weitere Diagnosen\n\nChronische Herzinsuffizienz, NYHA III (I50.13)\n* Reduzierte LVEF 35%\n* Rezidivierende kardiale Dekompensation, zuletzt 01/2026\nArterielle Hypertonie, Grad II (I11.90)\n* Hypertensive Kardiomyopathie mit linksventrikulärer Hypertrophie\n* Diastolische Dysfunktion Grad II\nVorhofflimmern, persistierend (I48.1)\n* CHA2DS2-VASc-Score 5\n* Orale Antikoagulation mit Apixaban 5 mg 1-0-1\nDiabetes mellitus Typ 2, insulinpflichtig (E11.9)\n* HbA1c 8,2%\n* Diabetische Nephropathie Stadium III (GFR 42 ml/min)\n* Diabetische Retinopathie, nicht-proliferativ beidseits\n* Diabetische Polyneuropathie der unteren Extremitäten\n* Insulin-Therapie\nHyperlipoproteinämie Typ IIa (E78.0)\n* LDL 142 mg/dl unter Atorvastatin 40 mg\n* Familiäre Belastung (Vater MI mit 52 J.)\nChronisch obstruktive Lungenerkrankung, GOLD II (J44.1)\n* FEV1 62% Soll\n* Akute Exazerbation 08.04.2026\nPertrochantäre Femurfraktur links\n* TFNa am 12.04.2026\nBekannte Penicillin-Allergie (Z88.0)\n\n### Nicht übersehen\n\nEine einzige flache Liste, sortiert nach Dringlichkeit (erst alle 🔴, dann alle 🟡, dann alle 🟢). Jeder Punkt im GLEICHEN Format:\n- 🔴 **[Problemstelle]** Erklärung warum es ein Problem ist → konkrete Handlungsempfehlung\n- 🟡 **[Problemstelle]** Erklärung → Handlungsempfehlung\n- 🟢 **[Problemstelle]** Erklärung → Handlungsempfehlung\n\nDieser Abschnitt ist der WICHTIGSTE der gesamten Analyse. Hier liegt der klinische Mehrwert. Jeder Punkt soll so detailliert sein, dass der Arzt sofort handeln kann (2–4 Sätze pro Punkt).\n\nJeder Punkt hat 3 Teile: (1) **Problemstelle fett**, (2) Erklärung des Mechanismus/Risikos, (3) → konkrete Handlungsempfehlung mit Alternativen. Beispiele:\n- 🔴 **Amoxicillin + Penicillinallergie**: Amoxicillin gehört zur Penicillin-Gruppe. Bei dokumentierter Penicillinallergie (hier: Exanthem) besteht Kreuzallergie-Risiko. → Amoxicillin ersetzen. Für H.p.-Eradikation: Bismut-Quadrupeltherapie (PPI + Bismut + Metronidazol + Tetrazyklin) oder PPI + Clarithromycin + Metronidazol.\n- 🔴 **Metformin + GFR 38 ml/min**: Metformin wird renal eliminiert. Bei GFR <45 ml/min steigt das Laktatazidose-Risiko erheblich (laut Fachinformation KI bei GFR <30, Dosisreduktion bei 30–45). → Dosis auf max. 1000 mg/d reduzieren oder absetzen. Alternative: DPP4-Hemmer (Sitagliptin, renal angepasst) oder SGLT2-Hemmer (bei GFR >20).\n- 🟡 **ASS + Z.n. Ulcusblutung**: ASS hemmt die Thrombozytenaggregation und erhöht das Rezidivblutungsrisiko bei frischer Ulcusanamnese. → Wiederaufnahme erst nach endoskopisch gesicherter Ulkusheilung (Kontroll-ÖGD). Bei kardialer Indikation: Nutzen-Risiko-Abwägung mit PPI-Schutz.\n\nKEINE Zwischenüberschriften, KEINE Kategorie-Titel, KEINE Nummerierung. Nur die flache Liste mit Emoji-Prefix. Die Punkte sollen ALLE klinischen Bereiche abdecken — nicht nur Medikation.\n\nZUSÄTZLICH (OPTIONAL) — fehlende Diagnosen identifizieren:\nWenn das Dokument EINDEUTIGE klinische Hinweise auf eine wahrscheinliche, aber nicht formal dokumentierte Diagnose liefert (z.B. metabolisches Syndrom bei dokumentierter Adipositas + Hypertonie + Dyslipidämie + gestörter Glukosetoleranz; Herzinsuffizienz bei mehreren dokumentierten Dekompensationen ohne formale Diagnose; chronische Niereninsuffizienz bei wiederholt erniedrigter GFR ohne CKD-Klassifikation), KANN dies als 🟡 oder 🟢 Punkt aufgeführt werden im Format: \"🟡 **Fehlende Diagnose: [Name]** — [Begründung aus dokumentierten Befunden] → formal dokumentieren bzw. weitere Diagnostik.\"\n\nSTRENG: KEINE Spekulationen, KEINE erzwungene Diagnosefindung. Nur bei EINDEUTIGEN klinischen Hinweisen im Dokument. Im Zweifel IMMER weglassen. Dieser Punkt ist OPTIONAL und soll NICHT in jeder Analyse auftauchen — nur wenn es wirklich offensichtlich ist.\n\nKeine Schlussformeln. Kein Disclaimer. Kein abschließender Kommentar. Keine Wiederholungen aus den oberen Abschnitten. Nur echte Auffälligkeiten, keine Spekulationen.'

export default function Scan() {
  const navigate = useNavigate()

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(() => parseInt(sessionStorage.getItem('arvis_scan_step')) || 1)
  const [panel, setPanel] = useState(() => {
    const saved = sessionStorage.getItem('arvis_scan_panel')
    if (saved === 'crop' && !sessionStorage.getItem('arvis_scan_imgData')) return 'upload'
    return saved || 'upload'
  })
  const [mode, setMode] = useState(() => sessionStorage.getItem('arvis_scan_mode') || 'ai')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiHtml, setAiHtml] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [loadingText, setLoadingText] = useState('Analysiere Dokument...')
  const [errorMsg, setErrorMsg] = useState('')
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [viewerHeight, setViewerHeight] = useState(0)
  const [blackouts, setBlackouts] = useState([])
  const [selectedBk, setSelectedBk] = useState(null)
  const [noDataConfirmed, setNoDataConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [limitReached, setLimitReached] = useState(() => sessionStorage.getItem('arvis_scan_limitReached') === 'true')
  const [scanHistory, setScanHistory] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('arvis_scan_history') || '[]') } catch { return [] }
  })

  // Mobile multi-photo state
  const [mobilePhotos, setMobilePhotos] = useState([]) // { file, preview }[]
  const [showMobileMultiUI, setShowMobileMultiUI] = useState(false)

  // Mobile Scan state
  const [showMobileScanOptions, setShowMobileScanOptions] = useState(false)
  const [showDesktopScanOptions, setShowDesktopScanOptions] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [scanChannel, setScanChannel] = useState(null)
  const [mobileTransferring, setMobileTransferring] = useState(false)
  const [qrExpired, setQrExpired] = useState(false)
  const qrTimeoutRef = useRef(null)

  // PDF state
  const pdfDocRef = useRef(null)
  const pdfPageRef = useRef(1)
  const pdfTotalRef = useRef(1)
  const [pdfPage, setPdfPage] = useState(1)
  const [pdfTotal, setPdfTotal] = useState(1)
  const blackoutsByPageRef = useRef({})

  const imgRef = useRef(null)
  const cropInnerRef = useRef(null)
  const viewerRef = useRef(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const imgDataRef = useRef(sessionStorage.getItem('arvis_scan_imgData') || null) // current image data url
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const [leftH, setLeftH] = useState(0)
  const [frozenRightH, setFrozenRightH] = useState(0)

  useEffect(() => {
    if (!leftRef.current) return
    const obs = new ResizeObserver(([e]) => setLeftH(e.contentRect.height))
    obs.observe(leftRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (panel === 'upload') setFrozenRightH(0)
  }, [panel])

  // ── Persist key state across tab switches ─────────────────────────────────
  useEffect(() => { sessionStorage.setItem('arvis_scan_step', step) }, [step])
  useEffect(() => { sessionStorage.setItem('arvis_scan_panel', panel) }, [panel])
  useEffect(() => { if (panel !== 'upload') setMobileTransferring(false) }, [panel])
  useEffect(() => { sessionStorage.setItem('arvis_scan_mode', mode) }, [mode])
  useEffect(() => { sessionStorage.setItem('arvis_scan_aiHtml', aiHtml) }, [aiHtml])
  useEffect(() => { sessionStorage.setItem('arvis_scan_ocrText', ocrText) }, [ocrText])
  useEffect(() => { sessionStorage.setItem('arvis_scan_limitReached', limitReached) }, [limitReached])
  useEffect(() => {
    sessionStorage.setItem('arvis_scan_history', JSON.stringify(scanHistory))
    window.dispatchEvent(new CustomEvent('arvis:history-change', { detail: { tab: 'scan' } }))
  }, [scanHistory])

  // Restauration via sidebar : écoute arvis:restore-request pour 'scan' + click direct
  useEffect(() => {
    function onRestore(e) {
      if (e.detail?.tab !== 'scan') return
      const item = scanHistory.find(x => x.id === e.detail.id)
      if (!item) return
      restoreScanHistoryItem(item)
    }
    window.addEventListener('arvis:restore-request', onRestore)
    return () => window.removeEventListener('arvis:restore-request', onRestore)
  }, [scanHistory]) // eslint-disable-line react-hooks/exhaustive-deps

  function restoreScanHistoryItem(item) {
    if (item.thumb) {
      imgDataRef.current = item.thumb
      if (imgRef.current) imgRef.current.src = item.thumb
      setPanel('crop')
    }
    setAiHtml(item.aiHtml || '')
    setOcrText(item.ocrText || '')
    setMode(item.mode || 'ai')
    goStep(4)
  }

  // Nettoyage des flags d'analyse interrompue (les images ne sont pas sauvegardées en sessionStorage)
  useEffect(() => {
    sessionStorage.removeItem('arvis_scan_isAnalyzing')
    sessionStorage.removeItem('arvis_scan_pendingOcr')
  }, [])

  // ── Pan ───────────────────────────────────────────────────────────────────
  function startPan(e) {
    e.preventDefault()
    setIsDragging(true)
    const touch = e.touches ? e.touches[0] : e
    const sx = touch.clientX, sy = touch.clientY
    const startPanX = panX, startPanY = panY
    const cw = viewerRef.current?.offsetWidth || 0
    const ch = viewerHeight || (viewerRef.current?.offsetHeight || 0)
    const onMove = (ev) => {
      const t = ev.touches ? ev.touches[0] : ev
      const minX = Math.min(0, cw - cw * zoom)
      const minY = Math.min(0, ch - ch * zoom)
      setPanX(Math.max(minX, Math.min(0, startPanX + (t.clientX - sx))))
      setPanY(Math.max(minY, Math.min(0, startPanY + (t.clientY - sy))))
    }
    const onUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)
  }

  async function startMobileScan() {
    const scanToken = crypto.randomUUID()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) { alert('Sitzung abgelaufen – bitte neu anmelden.'); return }

    await supabase.from('scan_sessions').insert({
      token: scanToken,
      user_id: session.user.id,
      status: 'waiting',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    })

    const mobileUrl = `${window.location.origin}/mobile-scan/${scanToken}`
    setQrUrl(mobileUrl)
    setShowDesktopScanOptions(false)
    setQrExpired(false)
    setShowQrModal(true)

    // Timeout = même durée que l'expiration du token (10 min)
    if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current)
    qrTimeoutRef.current = setTimeout(() => {
      setQrExpired(true)
    }, 10 * 60 * 1000)

    const channel = supabase
      .channel(`scan_${scanToken}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'scan_sessions',
        filter: `token=eq.${scanToken}`
      }, async (payload) => {
        if (payload.new.status === 'completed' && payload.new.image_url) {
          clearTimeout(qrTimeoutRef.current)
          setShowQrModal(false)
          setMobileTransferring(true)
          channel.unsubscribe()
          try {
            const raw = payload.new.image_url
            const filenames = raw.startsWith('[') ? JSON.parse(raw) : [raw]

            if (filenames.length === 1) {
              // Une seule image — normalise l'orientation puis loadFile
              const { data: blob, error } = await supabase.storage
                .from('scan-images')
                .download(filenames[0])
              if (error) throw error
              const normalized = await normalizeBlob(blob)
              loadFile(new File([normalized], 'mobile_scan.jpg', { type: 'image/jpeg' }))
            } else {
              // Plusieurs images → assemblage en PDF multi-pages
              const pdfDoc = await PDFDocument.create()
              for (const filename of filenames) {
                const { data: blob, error } = await supabase.storage
                  .from('scan-images')
                  .download(filename)
                if (error) throw error
                const normalized = await normalizeBlob(blob)
                const arrayBuffer = await normalized.arrayBuffer()
                const img = await pdfDoc.embedJpg(arrayBuffer)
                const page = pdfDoc.addPage([img.width, img.height])
                page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
              }
              const pdfBytes = await pdfDoc.save()
              const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' })
              loadFile(new File([pdfBlob], 'mobile_scan.pdf', { type: 'application/pdf' }))
            }
          } catch (e) {
            setMobileTransferring(false)
            logError('Scan.downloadSecureImage', e)
            alert("Erreur de téléchargement depuis le bucket privé : " + e.message)
          }
        }
      })
      .subscribe()

    setScanChannel(channel)
  }

  // ── Steps ─────────────────────────────────────────────────────────────────
  function goStep(n) { setStep(n) }

  async function handleMobileFinish() {
    if (mobilePhotos.length === 1) {
      const normalized = await normalizeBlob(mobilePhotos[0].file)
      loadFile(new File([normalized], 'scan.jpg', { type: 'image/jpeg' }))
    } else {
      const pdfDoc = await PDFDocument.create()
      for (const { file } of mobilePhotos) {
        const normalized = await normalizeBlob(file)
        const arrayBuffer = await normalized.arrayBuffer()
        const img = await pdfDoc.embedJpg(arrayBuffer)
        const page = pdfDoc.addPage([img.width, img.height])
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
      }
      const pdfBytes = await pdfDoc.save()
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' })
      loadFile(new File([pdfBlob], 'scan.pdf', { type: 'application/pdf' }))
    }
    setShowMobileMultiUI(false)
    setMobilePhotos([])
  }

  // ── File loading ───────────────────────────────────────────────────────────
  async function loadFile(file) {
    if (file.type === 'application/pdf') {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          const typedArray = new Uint8Array(e.target.result)
          const doc = await window.pdfjsLib.getDocument({ data: typedArray }).promise
          pdfDocRef.current = doc
          pdfTotalRef.current = doc.numPages
          pdfPageRef.current = 1
          blackoutsByPageRef.current = {}
          setPdfTotal(doc.numPages)
          setPdfPage(1)
          setBlackouts([])
          setSelectedBk(null)
          setNoDataConfirmed(false)
          await renderPdfPage(1)
          if (rightRef.current) setFrozenRightH(rightRef.current.offsetHeight)
          setPanel('crop')
          goStep(2)
        } catch (err) { alert('PDF konnte nicht geladen werden: ' + err.message) }
      }
      reader.readAsArrayBuffer(file)
    } else {
      pdfDocRef.current = null
      blackoutsByPageRef.current = {}
      const reader = new FileReader()
      reader.onload = (e) => {
        imgDataRef.current = e.target.result
        sessionStorage.setItem('arvis_scan_imgData', e.target.result)
        setBlackouts([])
        setSelectedBk(null)
        setNoDataConfirmed(false)
        if (imgRef.current) imgRef.current.src = e.target.result
        if (rightRef.current) setFrozenRightH(rightRef.current.offsetHeight)
        setPanel('crop')
        goStep(2)
      }
      reader.readAsDataURL(file)
    }
  }

  async function renderPdfPage(pageNum) {
    const page = await pdfDocRef.current.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.6 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width; canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    imgDataRef.current = dataUrl
    if (imgRef.current) imgRef.current.src = dataUrl
    pdfPageRef.current = pageNum
    setPdfPage(pageNum)
    setBlackouts(blackoutsByPageRef.current[pageNum]?.map(b => ({ ...b })) || [])
    setSelectedBk(null)
  }

  async function changePdfPage(dir) {
    blackoutsByPageRef.current[pdfPageRef.current] = blackouts.map(b => ({ ...b }))
    const next = Math.max(1, Math.min(pdfTotalRef.current, pdfPageRef.current + dir))
    if (next === pdfPageRef.current) return
    await renderPdfPage(next)
  }

  // ── Blackouts ──────────────────────────────────────────────────────────────
  function addBlackout() {
    const img = imgRef.current
    if (!cropInnerRef.current || !img) return
    // Coordinates are in cropInner's untransformed (layout) space
    const box = {
      id: Date.now(),
      x: Math.round(img.offsetWidth / 2 - 80),
      y: Math.round(img.offsetHeight / 4),
      w: 160, h: 40
    }
    setBlackouts(prev => [...prev, box])
    setSelectedBk(box.id)
  }

  function undoBlackout() {
    setBlackouts(prev => prev.slice(0, -1))
    setSelectedBk(null)
  }

  function deleteBlackout(id) {
    setBlackouts(prev => prev.filter(b => b.id !== id))
    setSelectedBk(null)
  }

  function startDragBlackout(e, box) {
    if (e.target !== e.currentTarget) return
    e.preventDefault(); e.stopPropagation()
    if (selectedBk !== box.id) { setSelectedBk(box.id); return }
    // getBoundingClientRect gives visual (post-transform) coords; divide by zoom to get layout coords
    const cr = cropInnerRef.current.getBoundingClientRect()
    const touch = e.touches ? e.touches[0] : e
    const ox = (touch.clientX - cr.left) / zoom - box.x
    const oy = (touch.clientY - cr.top) / zoom - box.y
    const onMove = (ev) => {
      const t = ev.touches ? ev.touches[0] : ev
      box.x = (t.clientX - cr.left) / zoom - ox
      box.y = (t.clientY - cr.top) / zoom - oy
      setBlackouts(prev => prev.map(b => b.id === box.id ? { ...box } : b))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)
  }

  function startResizeBlackout(e, box) {
    e.stopPropagation(); e.preventDefault()
    const touch = e.touches ? e.touches[0] : e
    const sx = touch.clientX, sy = touch.clientY, sw = box.w, sh = box.h
    const onMove = (ev) => {
      const t = ev.touches ? ev.touches[0] : ev
      // Screen pixel delta → layout pixel delta: divide by zoom
      box.w = Math.max(20, sw + (t.clientX - sx) / zoom)
      box.h = Math.max(10, sh + (t.clientY - sy) / zoom)
      setBlackouts(prev => prev.map(b => b.id === box.id ? { ...box } : b))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)
  }

  // ── Get anonymized image ───────────────────────────────────────────────────
  function getAnonymizedDataUrl() {
    const img = imgRef.current
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    // box coords are in layout space; scale to natural image pixels
    const scaleX = canvas.width / img.offsetWidth
    const scaleY = canvas.height / img.offsetHeight
    ctx.fillStyle = '#000'
    blackouts.forEach(box => {
      ctx.fillRect(box.x * scaleX, box.y * scaleY, box.w * scaleX, box.h * scaleY)
    })
    return canvas.toDataURL('image/jpeg', 0.92)
  }

  // ── Vision : compresser l'image pour GPT-4o (max 1200px wide, JPEG 0.85) ──
  function compressForVision(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const maxW = 1200
        const w = Math.min(maxW, img.naturalWidth)
        const h = Math.round(img.naturalHeight * (w / img.naturalWidth))
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => reject(new Error('Bildkompression fehlgeschlagen'))
      img.src = dataUrl
    })
  }

  // ── Thumbnail compressé pour l'historique (300px wide, JPEG 0.7) ────────────
  function createThumbnail(dataUrl) {
    return new Promise(resolve => {
      if (!dataUrl) return resolve(null)
      const img = new Image()
      img.onload = () => {
        const w = Math.min(300, img.naturalWidth)
        const h = Math.round(img.naturalHeight * (w / img.naturalWidth))
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
  }

  // ── Extrait un label court depuis le texte IA (première ligne de contenu) ──
  function extractScanLabel(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    let found = false
    for (const l of lines) {
      if (/^###/.test(l)) { found = true; continue }
      if (found) return l.replace(/^[-–*]\s*/, '').replace(/\*\*/g, '').slice(0, 45)
    }
    return 'Analyse'
  }

  // ── Vision OCR : extraction de texte brut via GPT-4o Vision ────────────────
  async function runVisionOCR(imageDataUrls) {
    setLoadingText('Text wird extrahiert...')
    const content = [
      { type: 'text', text: 'Extrahiere den vollständigen Text aus diesem medizinischen Dokument. Gib den Text originalgetreu wieder — Struktur, Absätze, Tabellen und Aufzählungen beibehalten. Bei Tabellen: Spaltenstruktur als Markdown-Tabelle wiedergeben. Keine Zusammenfassung, keine Interpretation — nur den reinen Text. Wasserzeichen und Seitenfußzeilen ignorieren.' },
      ...imageDataUrls.map(url => ({ type: 'image_url', image_url: { url } }))
    ]
    const data = await invokeEdgeFunction('ai-chat', {
      model: 'gpt-5.4-mini',
      max_completion_tokens: 4000,
      temperature: 0.1,
      messages: [{ role: 'user', content }]
    })
    if (data?.error === 'limit_reached') throw new Error('__limit_reached__')
    if (!data?.content) throw new Error('Kein Text erkannt.')
    return data.content
  }

  // ── AI Analysis via Vision : analyse clinique directe depuis l'image ───────
  async function runAIAnalysis(imageDataUrls) {
    setLoadingText('KI analysiert Dokument...')
    const content = [
      { type: 'text', text: 'Analysiere dieses medizinische Dokument.' },
      ...imageDataUrls.map(url => ({ type: 'image_url', image_url: { url } }))
    ]
    const data = await invokeEdgeFunction('ai-chat', {
      model: 'gpt-5.4-mini',
      max_completion_tokens: 4000,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content }
      ]
    })
    if (data?.error === 'limit_reached') throw new Error('__limit_reached__')
    if (!data?.content) throw new Error('Leere Antwort vom Modell.')
    return data.content
  }

  // ── Proceed to analysis ────────────────────────────────────────────────────
  async function proceedToAnalysis() {
    if (pdfDocRef.current) blackoutsByPageRef.current[pdfPageRef.current] = blackouts.map(b => ({ ...b }))
    const hasAnyBlackout = blackouts.length > 0 || Object.values(blackoutsByPageRef.current).some(a => a && a.length > 0)
    if (!hasAnyBlackout && !noDataConfirmed) {
      setErrorMsg('Bitte zuerst schwärzen oder bestätigen, dass keine Patientendaten vorhanden sind.')
      return
    }
    goStep(3)
    setIsAnalyzing(true)
    sessionStorage.setItem('arvis_scan_isAnalyzing', 'true')
    setErrorMsg('')
    if (window.innerWidth <= 785) setTimeout(() => rightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    try {
      // ── Collecter les images anonymisées (avec blackouts) ──────────────
      const imageDataUrls = []
      if (pdfDocRef.current && pdfTotalRef.current > 1) {
        for (let p = 1; p <= pdfTotalRef.current; p++) {
          setLoadingText(`Seite ${p}/${pdfTotalRef.current} wird vorbereitet...`)
          const page = await pdfDocRef.current.getPage(p)
          const viewport = page.getViewport({ scale: 1.6 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width; canvas.height = viewport.height
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
          const pageBlackouts = blackoutsByPageRef.current[p] || []
          if (pageBlackouts.length > 0) {
            const img = imgRef.current
            const ir = img.getBoundingClientRect()
            const cr = cropInnerRef.current.getBoundingClientRect()
            const ctx = canvas.getContext('2d')
            const scaleX = canvas.width / ir.width, scaleY = canvas.height / ir.height
            ctx.fillStyle = '#000'
            pageBlackouts.forEach(box => ctx.fillRect((box.x - (ir.left - cr.left)) * scaleX, (box.y - (ir.top - cr.top)) * scaleY, box.w * scaleX, box.h * scaleY))
          }
          imageDataUrls.push(await compressForVision(canvas.toDataURL('image/jpeg', 0.92)))
        }
      } else {
        imageDataUrls.push(await compressForVision(getAnonymizedDataUrl()))
      }

      const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      const thumb = await createThumbnail(imgDataRef.current)
      if (mode === 'ocr') {
        const txt = await runVisionOCR(imageDataUrls)
        setOcrText(txt)
        setScanHistory(prev => [{ id: crypto.randomUUID(), time, label: `${time} · OCR`, aiHtml: '', ocrText: txt, mode: 'ocr', thumb }, ...prev].slice(0, 5))
      } else {
        const analysis = await runAIAnalysis(imageDataUrls)
        const html = markdownToHtml(analysis)
        setAiHtml(html)
        // Pas de texte OCR séparé en mode Vision — le texte est intégré dans l'analyse
        setOcrText('')
        const rawLabel = extractScanLabel(analysis)
        setScanHistory(prev => [{ id: crypto.randomUUID(), time, label: `${time} · ${rawLabel}`, aiHtml: html, ocrText: '', mode: 'ai', thumb }, ...prev].slice(0, 5))
      }
      goStep(4)
    } catch (err) {
      if (err.message === '__limit_reached__') {
        setLimitReached(true)
        setErrorMsg('Ihr monatliches KI-Kontingent wurde erreicht.')
        goStep(2)
      } else {
        logError('Scan.proceedToAnalysis', err)
        setErrorMsg(err.message)
        goStep(2)
      }
    } finally {
      setIsAnalyzing(false)
      sessionStorage.removeItem('arvis_scan_isAnalyzing')
      sessionStorage.removeItem('arvis_scan_pendingOcr')
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetScan() {
    if (imgRef.current) imgRef.current.src = ''
    imgDataRef.current = null
    pdfDocRef.current = null
    blackoutsByPageRef.current = {}
    setPdfPage(1); setPdfTotal(1)
    setBlackouts([]); setSelectedBk(null)
    setPanel('upload')
    setIsAnalyzing(false)
    setAiHtml('')
    setOcrText('')
    setZoom(1); setPanX(0); setPanY(0); setIsDragging(false); setViewerHeight(0); setErrorMsg(''); setLimitReached(false)
    goStep(1);
    // UI state (non-PHI) → localStorage
    ;['arvis_scan_step','arvis_scan_panel','arvis_scan_mode','arvis_scan_limitReached'].forEach(k => localStorage.removeItem(k))
    // PHI (contenu médical) → sessionStorage
    ;['arvis_scan_aiHtml','arvis_scan_ocrText','arvis_scan_imgData'].forEach(k => sessionStorage.removeItem(k))
  }

  // ── Copy / Download ────────────────────────────────────────────────────────
  function copyResult() {
    if (mode === 'ai') {
      const el = document.getElementById('aiSummaryDiv')
      if (!el) return
      const html = el.innerHTML
      // Texte brut avec tableaux tabulés pour ORBIS/KIS
      const clone = el.cloneNode(true)
      clone.querySelectorAll('table').forEach(table => {
        const cells = []
        table.querySelectorAll('tr').forEach(tr => {
          cells.push(Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()))
        })
        // Pad each column to max width for alignment in monospace (ORBIS/KIS)
        const colCount = Math.max(...cells.map(r => r.length))
        const colWidths = Array.from({ length: colCount }, (_, i) => Math.max(...cells.map(r => (r[i] || '').length)))
        const rows = cells.map(r => r.map((c, i) => i < r.length - 1 ? c.padEnd(colWidths[i] + 2) : c).join(''))
        const pre = document.createElement('pre')
        pre.textContent = rows.join('\n')
        table.parentNode.replaceChild(pre, table)
      })
      clone.querySelectorAll('[data-subitem]').forEach(sub => { sub.textContent = '- ' + sub.textContent.trim() })
      const plainText = clone.innerText
      // Copier en HTML + texte brut — Word/ORBIS reçoit le formatage
      try {
        navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        })])
      } catch { navigator.clipboard.writeText(plainText) }
    } else {
      if (ocrText) navigator.clipboard.writeText(ocrText)
    }
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }
  function sectionBodyToText(bodyEl) {
    const out = []
    function walk(node) {
      if (node.nodeType !== 1) return
      if (node.getAttribute('data-subitem') === '1') { out.push('- ' + node.textContent.trim()); return }
      if (node.getAttribute('data-type') === 'subs') { for (const c of node.children) walk(c); return }
      const tableEl = node.tagName === 'TABLE' ? node : node.querySelector('table')
      if (tableEl) {
        const cells = []
        tableEl.querySelectorAll('tr').forEach(tr => {
          const r = [...tr.querySelectorAll('td,th')].map(td => {
            let text = td.textContent.trim()
            text = text.replace(/\s+(ab\s+\d|bis\s+\d|ab dem\s|\d{1,2}\.\d{1,2}\.\d{4}.*)/gi, '').trim()
            return text
          })
          if (r.join('').trim()) cells.push(r)
        })
        if (cells.length) {
          // Skip header row for length calculation
          const dataRows = cells.slice(1)
          const longestLen = dataRows.length
            ? Math.max(...dataRows.map(r => (r[0] || '').length))
            : Math.max(...cells.map(r => (r[0] || '').length))
          out.push(cells.map((r, ri) => {
            if (r.length < 2) return r[0] || ''
            const col1 = r[0] || ''
            const rest = r.slice(1).join('\t\t')
            const t = ri === 0 ? 2 : Math.max(2, 2 + Math.round((longestLen - col1.length) / 5))
            return `${col1}${'\t'.repeat(t)}${rest}`
          }).join('\n'))
        }
        return
      }
      if (node.style && node.style.display === 'flex' && node.style.flexDirection === 'column') {
        for (const c of node.children) walk(c)
        return
      }
      const subsDiv = node.querySelector('[data-type="subs"]')
      if (subsDiv) {
        const mainText = [...node.childNodes].filter(n => n !== subsDiv).map(n => n.textContent).join('').trim()
        if (mainText) out.push(mainText)
        walk(subsDiv)
        return
      }
      const t = node.textContent.trim()
      if (t) out.push(t)
    }
    for (const child of bodyEl.children) walk(child)
    return out.join('\n')
  }
  function handleSectionCopy(e) {
    const btn = e.target.closest('[data-copy-sec]')
    if (!btn) return
    e.stopPropagation()
    const sid = btn.getAttribute('data-copy-sec')
    const body = document.querySelector(`[data-sec-body="${sid}"]`)
    if (!body) return
    navigator.clipboard.writeText(sectionBodyToText(body)).catch(() => {})
    btn.style.color = 'var(--orange)'
    btn.style.opacity = '1'
    setTimeout(() => { btn.style.color = ''; btn.style.opacity = '' }, 1500)
  }

  async function downloadResult() {
    const text = mode === 'ai' ? document.getElementById('aiSummaryDiv')?.innerText : ocrText
    if (!text) return
    await downloadAsWord(text, mode === 'ai' ? 'KI-Analyse' : 'OCR-Text')
  }
  function sendToBrief() {
    const text = mode === 'ai' ? document.getElementById('aiSummaryDiv')?.innerText : ocrText
    if (text) { sessionStorage.setItem('arvis_brief_input', text); navigate('/briefassistent') }
  }

  // ── Reset pan when zoom returns to 1 ─────────────────────────────────────
  useEffect(() => {
    if (zoom === 1) { setPanX(0); setPanY(0) }
  }, [zoom])

  // ── Set viewer height = rendered image height at 100% width ──────────────
  function handleImageLoad() {
    const img = imgRef.current
    if (!img) return
    // offsetHeight is the natural rendered height at width:100% (zoom=1)
    setViewerHeight(img.offsetHeight)
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  // ── Inject image src when crop panel mounts ───────────────────────────────
  useEffect(() => {
    if (panel === 'crop' && imgRef.current && imgDataRef.current) {
      imgRef.current.src = imgDataRef.current
    }
  }, [panel])

  // ── Load external scripts ──────────────────────────────────────────────────
  useEffect(() => {
    function loadScript(src) {
      if (document.querySelector(`script[src="${src}"]`)) return
      const s = document.createElement('script'); s.src = src; document.head.appendChild(s)
    }
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.4/tesseract.min.js')
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page active" id="page-scan">

      {/* Main layout */}
      <div className="scan-layout">

        {/* LEFT */}
        <div className="scan-left" ref={leftRef}>

          {/* Left-panel top row: panel label left + Zurücksetzen right (fusionnés) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexShrink: 0 }}>
            <span className="scan-panel-title">{panel === 'crop' ? 'Anonymisieren' : 'Dokument laden'}</span>
            <button className="btn-secondary" id="scanResetBtn" onClick={resetScan} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '6px 12px', fontSize: 13 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
              <span className="btn-label" style={{ lineHeight: 1 }}>Zurücksetzen</span>
            </button>
          </div>

          {limitReached && (
            <div style={{ background: 'var(--orange-ghost)', border: '1px solid var(--orange)', borderRadius: 5, padding: '10px 14px', marginBottom: 14, flexShrink: 0 }}>
              <span style={{ color: 'var(--orange)', fontSize: 12.5, fontWeight: 500 }}>
                Ihr monatliches KI-Kontingent ist erschöpft. Es wird am 1. des nächsten Monats erneuert.
              </span>
            </div>
          )}



          {/* Upload panel */}
          {panel === 'upload' && (
            <div className="scan-panel" id="panelUpload" style={{ position: 'relative' }}>
              {mobileTransferring && (
                <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', borderRadius: 'inherit', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div className="spinner" />
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)' }}>Foto wird übertragen…</div>
                </div>
              )}
              <div className="scan-drop-zone" onClick={() => fileInputRef.current.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
                onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}>
                <div className="scan-drop-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                </div>
                <div className="scan-drop-title">Datei hierher ziehen</div>
                <div className="scan-drop-sub">oder klicken zum Auswählen</div>
                <div className="scan-drop-formats">JPG · PNG · PDF · HEIC</div>
              </div>
              <input type="file" ref={fileInputRef} accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) loadFile(f) }} />
              <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => {
                const f = e.target.files[0]
                if (!f) return
                e.target.value = ''
                const preview = URL.createObjectURL(f)
                setMobilePhotos(prev => [...prev, { file: f, preview }])
                setShowMobileMultiUI(true)
              }} />
              <div style={{ marginTop: 'auto' }}>
                <div style={{ textAlign: 'center', marginTop: 2 }}><span style={{ fontSize: 12, color: 'var(--text-3)' }}>oder</span></div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center' }}>
                  <button className="btn-action" onClick={() => {
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && !/Macintosh/.test(navigator.userAgent));
                    if (isMobile) { cameraInputRef.current.click() } else { startMobileScan() }
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                    Foto aufnehmen
                  </button>
                  <button className="btn-action-secondary" onClick={() => fileInputRef.current.click()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    Datei wählen
                  </button>
                </div>
                <div className="scan-dsgvo-note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  <span>Keine Daten werden gespeichert — alles läuft lokal in Ihrem Browser</span>
                </div>
              </div>
            </div>
          )}

          {/* Crop panel */}
          {panel === 'crop' && (
            <div className="scan-panel" id="panelCrop">
              {/* Warning + checkbox (merged) */}
              <div id="anonWarning" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: noDataConfirmed ? 'var(--bg-3)' : 'rgba(193,58,43,0.07)', borderTop: `1px solid ${noDataConfirmed ? 'var(--border)' : 'rgba(193,58,43,0.2)'}`, borderBottom: `1px solid ${noDataConfirmed ? 'var(--border)' : 'rgba(193,58,43,0.2)'}`, padding: '10px 14px', transition: 'background 0.15s, border-color 0.15s' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={noDataConfirmed ? 'var(--text-3)' : 'var(--error)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2, transition: 'stroke 0.15s' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: noDataConfirmed ? 'var(--text-2)' : 'var(--error)', lineHeight: 1.5, transition: 'color 0.15s' }}>
                    Bitte alle Patientendaten schwärzen{pdfTotal > 1 ? ` — auf allen ${pdfTotal} Seiten anwenden` : ''}.
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={noDataConfirmed} onChange={e => setNoDataConfirmed(e.target.checked)} style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--orange)', margin: 0, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>oder bestätigen: Keine Patientendaten auf {pdfTotal > 1 ? 'allen Seiten' : 'dem Dokument'}.</span>
                  </label>
                </div>
              </div>
              {/* Analysieren CTA — full width, directly below warning block */}
              {(() => {
                const hasAnyBlackout = blackouts.length > 0 || Object.values(blackoutsByPageRef.current).some(a => a && a.length > 0)
                const canProceed = hasAnyBlackout || noDataConfirmed
                return (
                  <button className="scan-analyze-cta" onClick={proceedToAnalysis} disabled={!canProceed} title={!canProceed ? 'Bitte zuerst schwärzen oder bestätigen, dass keine Patientendaten vorhanden sind' : ''}>
                    Analysieren
                  </button>
                )
              })()}
              {/* Document viewer with floating tools overlay */}
              <div id="cropContainer" ref={viewerRef} onMouseDown={startPan} onTouchStart={startPan} style={{ height: viewerHeight > 0 ? viewerHeight : 'auto', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', position: 'relative' }}>
                <div id="cropInner" ref={cropInnerRef} style={{ position: 'relative', width: '100%', transformOrigin: 'top left', transform: `translate(${panX}px,${panY}px) scale(${zoom})` }}>
                  <img ref={imgRef} style={{ width: '100%', display: 'block', background: 'var(--bg-2)' }} alt="" onLoad={handleImageLoad} onClick={() => setSelectedBk(null)} />
                  <canvas id="cropCanvas" style={{ display: 'none' }} />
                  {/* Blackout boxes */}
                  {blackouts.map(box => (
                    <div key={box.id} onMouseDown={e => startDragBlackout(e, box)} onTouchStart={e => startDragBlackout(e, box)}
                      style={{ position: 'absolute', background: '#000', boxSizing: 'border-box', left: box.x, top: box.y, width: box.w, height: box.h, border: selectedBk === box.id ? '2px solid var(--error)' : '2px solid transparent', cursor: 'move', minWidth: 20, minHeight: 10, userSelect: 'none' }}>
                      {selectedBk === box.id && (
                        <>
                          <div onMouseDown={e => e.stopPropagation()} onClick={() => deleteBlackout(box.id)}
                            style={{ position: 'absolute', top: -10, right: -10, width: 20, height: 20, borderRadius: '50%', background: 'var(--error)', color: 'white', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20 }}>×</div>
                          <div onMouseDown={e => startResizeBlackout(e, box)} onTouchStart={e => startResizeBlackout(e, box)}
                            style={{ position: 'absolute', bottom: -9, right: -9, width: 18, height: 18, background: 'var(--error)', borderRadius: '50%', cursor: 'se-resize', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleY(-1)' }}><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="crop-overlay" id="cropOverlay" style={{ display: 'none' }} />
                {/* Floating tools overlay — top-right of viewer (edit + nav) */}
                <div className="scan-tools-overlay" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
                  <button onClick={addBlackout} title="Schwärzen" style={{ height: 28, padding: '0 10px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', background: 'var(--text)', color: 'white', border: 'none', borderRadius: 4, fontFamily: "'Inter', sans-serif", fontWeight: 500, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>
                    Schwärzen
                  </button>
                  <button className="btn-secondary" aria-label="Schwärzung rückgängig machen" onClick={undoBlackout} title="Rückgängig" style={{ height: 28, width: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
                  </button>
                  {pdfDocRef.current && (
                    <div className="scan-toolbar-zoom">
                      <button aria-label="Vorherige Seite" title="Vorherige Seite" onClick={() => changePdfPage(-1)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <button className="seg-label" style={{ cursor: 'default' }} tabIndex={-1}>
                        Seite {pdfPage} / {pdfTotal}
                      </button>
                      <button aria-label="Nächste Seite" title="Nächste Seite" onClick={() => changePdfPage(1)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </div>
                  )}
                  <div className="scan-toolbar-zoom">
                    <button aria-label="Verkleinern" onClick={() => setZoom(z => Math.max(1, z - 0.25))} title="Verkleinern">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                    <button onClick={() => setZoom(1)} title="Zoom zurücksetzen" className="seg-label">
                      {Math.round(zoom * 100)}%
                    </button>
                    <button aria-label="Vergrößern" onClick={() => setZoom(z => Math.min(4, z + 0.25))} title="Vergrößern">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="scan-right" ref={rightRef}>
          {/* Mode selector */}
          <div className="scan-mode-card">
            <div className="scan-mode-title">Analysemodus</div>
            <div className="scan-mode-toggle">
              <div className={`scan-mode-btn${mode === 'ai' ? ' active' : ''}`} onClick={() => setMode('ai')}>
                <div className="scan-mode-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><line x1="12" y1="7" x2="12" y2="11" /><line x1="8" y1="15" x2="8" y2="17" /><line x1="12" y1="15" x2="12" y2="17" /><line x1="16" y1="15" x2="16" y2="17" /></svg>
                </div>
                <div>
                  <div className="scan-mode-name">KI-Analyse</div>
                  <div className="scan-mode-desc">Intelligente Zusammenfassung + Schlüsselpunkte</div>
                </div>
              </div>
              <div className={`scan-mode-btn${mode === 'ocr' ? ' active' : ''}`} onClick={() => setMode('ocr')}>
                <div className="scan-mode-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                </div>
                <div>
                  <div className="scan-mode-name">OCR Text</div>
                  <div className="scan-mode-desc">Reiner Textexport zum Kopieren</div>
                </div>
              </div>
              {!isAnalyzing && ((mode === 'ai' && aiHtml) || (mode === 'ocr' && ocrText)) && (
                <div className="result-actions" style={{ marginLeft: 'auto', alignSelf: 'center', paddingBottom: 4 }}>
                  <button className="result-action-btn" aria-label="Ergebnis kopieren" onClick={copyResult} title="Kopieren" style={copied ? { color: 'var(--orange)' } : {}}>
                    {copied
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                    }
                  </button>
                  <button onClick={downloadResult} title="Als Word herunterladen" aria-label="Als Word herunterladen"
                    style={{ width: 26, height: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2B579A', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Result card */}
          <div className="scan-result-card" id="resultCard">
            {/* Empty */}
            {!isAnalyzing && !errorMsg && ((mode === 'ai' && !aiHtml) || (mode === 'ocr' && !ocrText)) && (
              <div className="scan-result-empty">
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Laden Sie ein Dokument, um die Analyse zu starten.</div>
              </div>
            )}
            {/* Loading */}
            {isAnalyzing && (
              <div className="scan-result-loading">
                <div className="scan-spinner" />
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 14, fontWeight: 500 }}>{loadingText}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>KI verarbeitet den Inhalt</div>
              </div>
            )}
            {/* Error */}
            {!isAnalyzing && errorMsg && (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 20 }}>
                <div style={{ fontSize: 12.5, marginTop: 4, color: 'var(--error)' }}>{errorMsg}</div>
              </div>
            )}
            {/* AI result */}
            {!isAnalyzing && mode === 'ai' && aiHtml && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <div className="result-section" style={{ marginBottom: 0 }}>
                    <div className="result-text" id="aiSummaryDiv" onClick={handleSectionCopy} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aiHtml) }} />
                  </div>
                </div>
                <button className="btn-send-briefassistent" onClick={sendToBrief} style={{ marginTop: 16, flexShrink: 0, alignSelf: 'center' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  An Briefassistent senden
                </button>
              </div>
            )}
            {/* OCR result */}
            {!isAnalyzing && mode === 'ocr' && ocrText && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <textarea className="ocr-textarea" value={ocrText} onChange={e => setOcrText(e.target.value)} placeholder="OCR Text erscheint hier..." />
                <button className="btn-send-briefassistent" onClick={sendToBrief} style={{ marginTop: 12, alignSelf: 'center' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  An Briefassistent senden
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile multi-photo overlay ── */}
      {showMobileMultiUI && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '8px 8px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', textAlign: 'center' }}>
              {mobilePhotos.length} Seite{mobilePhotos.length > 1 ? 'n' : ''} aufgenommen
            </div>
            {/* Thumbnails */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {mobilePhotos.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p.preview} alt={`Seite ${i + 1}`} style={{ width: 72, height: 90, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />
                  <div style={{ position: 'absolute', top: 4, left: 4, background: 'var(--orange)', color: 'white', borderRadius: 10, fontSize: 12, fontWeight: 600, padding: '1px 6px' }}>{i + 1}</div>
                </div>
              ))}
            </div>
            {/* Weitere Seite */}
            <button onClick={() => cameraInputRef.current.click()}
              style={{ padding: '14px', borderRadius: 5, border: '1px solid var(--orange)', background: 'var(--bg-2)', color: 'var(--orange)', fontSize: 17, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Weitere Seite
            </button>
            {/* Fertig */}
            <button onClick={handleMobileFinish}
              style={{ padding: '14px', borderRadius: 5, border: 'none', background: 'var(--text)', color: 'white', fontSize: 17, fontWeight: 500, cursor: 'pointer' }}>
              Weiter zur Anonymisierung
            </button>
            {/* Abbrechen */}
            <button onClick={() => { setShowMobileMultiUI(false); setMobilePhotos([]) }}
              style={{ padding: '12px', borderRadius: 5, border: 'none', background: 'var(--bg-3)', color: 'var(--text-2)', fontSize: 17, fontWeight: 500, cursor: 'pointer' }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {showMobileScanOptions && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowMobileScanOptions(false)}>
          <div style={{ background: 'var(--bg-2)', borderRadius: '8px 8px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 4, textAlign: 'center' }}>Dokument laden</div>
            <button onClick={() => { setShowMobileScanOptions(false); fileInputRef.current.click() }}
              style={{ padding: '16px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 17, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              Datei auswählen
            </button>
            <button onClick={() => { setShowMobileScanOptions(false); cameraInputRef.current.click() }}
              style={{ padding: '16px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 17, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              Foto aufnehmen
            </button>
            <button onClick={() => setShowMobileScanOptions(false)}
              style={{ marginTop: 4, padding: '12px', borderRadius: 5, border: 'none', background: 'var(--bg-3)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 17, fontWeight: 500 }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {showDesktopScanOptions && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: 6, padding: 24, width: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--text)', marginBottom: 8, textAlign: 'center' }}>Scan-Methode wählen</div>

            <button onClick={() => { setShowDesktopScanOptions(false); fileInputRef.current.click() }}
              style={{ padding: '14px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 17, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              Datei hochladen
            </button>
            <button onClick={startMobileScan}
              style={{ padding: '14px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', fontSize: 17, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
              Mit Handy fotografieren
            </button>

            <button onClick={() => setShowDesktopScanOptions(false)} className="scan-options-cancel">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {showQrModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-2)', borderRadius: 6, padding: 32, width: 340, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--text)' }}>Mit Handy fotografieren</div>
            {qrExpired ? (
              <>
                <div style={{ fontSize: 15, color: 'var(--error)', fontWeight: 600 }}>
                  QR-Code abgelaufen
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.4 }}>
                  Die Sitzung ist nach 10 Minuten abgelaufen. Bitte erneut versuchen.
                </div>
                <button onClick={() => { scanChannel?.unsubscribe(); startMobileScan() }}
                  style={{ padding: '10px 18px', borderRadius: 5, border: '1px solid var(--orange)', background: 'var(--orange)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', width: '100%' }}>
                  Neuen QR-Code erstellen
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>QR-Code mit Ihrem Handy scannen</div>
                <QRCodeSVG value={qrUrl} size={200} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--orange)', fontWeight: 500 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--orange)', animation: 'pulse 1.5s infinite' }} />
                  Warte auf Foto…
                </div>
              </>
            )}
            <button onClick={() => { setShowQrModal(false); scanChannel?.unsubscribe(); clearTimeout(qrTimeoutRef.current) }}
              className="scan-options-cancel">
              Abbrechen
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
