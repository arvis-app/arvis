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

  let html = '', inList = false, inTable = false
  // Tracks the current colored sub-section (🔴/🟡/🟢 header lines)
  let secBg = 'transparent', secColor = 'var(--text-2)', secBorder = 'var(--border)', secActive = false
  for (const line of lines) {
    if (inTable && !/^\|/.test(line.trim())) { html += '</tbody></table></div>'; inTable = false }
    if (/^#{1,3} /.test(line)) {
      if (inList) { html += '</div>'; inList = false }
      secActive = false; secBg = 'transparent'; secColor = 'var(--text-2)'; secBorder = 'var(--border)'
      let text = escHtml(line.replace(/^#{1,3} /, '')).replace(/\*\*(.+?)\*\*/g, '$1')
      const mt = html === '' ? '0' : '22px'
      if (/nicht.übersehen/i.test(text)) {
        text = text.replace(/^[⚠️\s]+/, '')
        html += `<div style="font-size:17px;font-weight:800;color:var(--text);margin-top:${mt};margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid var(--orange);letter-spacing:0.01em;display:flex;align-items:center;gap:8px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#FEF08A;flex-shrink:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>${text}</div>`
      } else {
        html += `<div style="font-size:17px;font-weight:800;color:var(--text);margin-top:${mt};margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid var(--orange);letter-spacing:0.01em;">${text}</div>`
      }
    } else if (/^\*\*[^*]+\*\*:?\s*$/.test(line.trim())) {
      if (inList) { html += '</div>'; inList = false }
      secActive = false; secBg = 'transparent'; secColor = 'var(--text-2)'; secBorder = 'var(--border)'
      const text = escHtml(line).replace(/\*\*(.+?)\*\*/g, '$1').replace(/:(\S)/g, ': $1')
      const mt2 = html === '' ? '0' : '22px'
      html += `<div style="font-size:17px;font-weight:800;color:var(--text);margin-top:${mt2};margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid var(--orange);letter-spacing:0.01em;">${text}</div>`
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
      html += `<div style="font-size:14px;font-weight:800;color:${secColor};margin-top:${mt3};margin-bottom:6px;display:flex;align-items:center;">${dot}<span>${label}</span></div>`
    } else if (/^\|.+\|/.test(line.trim())) {
      if (inList) { html += '</div>'; inList = false }
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue
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
      if (!inList) { html += '<div style="display:flex;flex-direction:column;gap:4px;margin-top:2px;">'; inList = true }
      const rawText2 = escHtml(line.replace(/^\* /, '').trim()).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/:(\S)/g, ': $1')
      html += `<div style="font-size:12.5px;color:var(--text-2);background:transparent;border-left:3px solid var(--border);border-radius:0 6px 6px 0;padding:7px 12px;line-height:1.6;margin-left:16px;">${rawText2}</div>`
    } else if (/^[-–] /.test(line)) {
      if (!inList) { html += '<div style="display:flex;flex-direction:column;gap:4px;margin-top:2px;">'; inList = true }
      let rawText = escHtml(line.replace(/^[-–] /, '').trim())
      // Check if item has its own emoji override
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
      html += `<div style="font-size:12.5px;color:${color};background:${bg};border-left:3px solid ${border};border-radius:0 6px 6px 0;padding:7px 12px;line-height:1.6;">${text}</div>`
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
      html += `<div style="font-size:12.5px;color:var(--text-2);border-left:3px solid var(--border);border-radius:0 6px 6px 0;padding:7px 12px;line-height:1.6;margin-top:4px;">${text}</div>`
    }
  }
  if (inList) html += '</div>'
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

const SYSTEM_PROMPT = 'Du bist ein klinischer Entscheidungsassistent für Krankenhausärzte in Deutschland. Deine Aufgabe ist nicht nur zusammenzufassen, sondern aktiv mitzudenken — wie ein erfahrener Kollege, der das Dokument mitliest. Verwende klinische Abkürzungen (Z.n., ED, V.a., RR, NAS, etc.).\n\nDeine Ausgabe hat IMMER zwei Teile: zuerst die ZUSAMMENFASSUNG, dann die ANALYSE. Keinen Teil weglassen.\n\nDein interner Denkprozess für den Analyse-Teil (NICHT in der Ausgabe zeigen — nur die Ergebnisse als flache Liste ausgeben):\n\n1. MEDIKATION: Gleiche jede verordnete Substanz mit dokumentierten Allergien ab (inkl. Kreuzallergien wie Penicillin → Amoxicillin/Ampicillin/Piperacillin). Prüfe JEDES Medikament gegen die dokumentierten Befunde auf Kontraindikationen — insbesondere: Metformin bei GFR<45 (Laktatazidose), NSAR bei GI-Blutung/Ulkus/Niereninsuffizienz, Kalium bei Hyperkaliämie, ACE-Hemmer bei Hyperkaliämie+NI. Prüfe Interaktionen und fehlende Standardmedikamente für dokumentierte Diagnosen (z.B. Hypertonie ohne Antihypertensivum, VHF ohne Antikoagulation, Herzinsuffizienz ohne ACE-Hemmer/Betablocker, Diabetes ohne OAD/Insulin).\n2. KLINISCHE KOHÄRENZ: Stimmen Diagnosen, Befunde, Verlauf und Empfehlungen überein? Gibt es Widersprüche, nicht weiterverfolgte Befunde, fehlende Diagnostik, ungeklärte Symptome?\n3. DOKUMENTATION & DATEN: Falsche oder widersprüchliche Angaben (Alter, Datum, Seitenangabe, Dosierung)? Fehlende Informationen die für die Weiterbehandlung relevant wären?\n4. NACHSORGE & PRÄVENTION: Fehlende Verlaufskontrollen, offene Konsile, empfohlene Screenings, soziale/pflegerische Risiken (Sturzrisiko, Versorgungssituation, Compliance)?\n5. SELBSTPRÜFUNG: Würde ein erfahrener Oberarzt bei einem 🟢-Punkt sofort intervenieren? Dann hochstufen. Ist ein 🔴-Punkt aufschiebbar ohne Patientenschaden? Dann runterstufen.\n\nKlassifikation:\n🔴 Direktes Patientenrisiko — z.B. Allergie/Kreuzallergie übersehen, Medikament trotz Kontraindikation, nicht adressierte Red Flag, Widerspruch zwischen Verlauf und Entlassplan, fehlende Standardtherapie mit Prognoseeinfluss.\n🟡 Klinisch relevant, zeitnah klärungsbedürftig — z.B. pathologischer Wert ohne Konsequenz, unbegründete Dosisänderung, fehlende Verlaufskontrolle, falsche Angaben im Brief, relevante Interaktion, nicht weiterverfolgte Diagnostik.\n🟢 Optimierungspotenzial — z.B. empfohlene Vorsorge, fehlende nicht-dringliche Konsile, Dokumentationslücke, pflegerische/soziale Empfehlung.\n\nAUSGABEFORMAT:\n\nFühre nur Abschnitte auf, die im Text vorhanden sind:\n\n### Hauptdiagnose / Hauptdiagnosen\n(genau eine → "Hauptdiagnose", mehrere → "Hauptdiagnosen" — Liste ohne Nummerierung, eine Diagnose pro Zeile, EXAKT wie im Dokument, keine Kürzung)\n\n### Weitere Diagnose / Weitere Diagnosen\n(genau eine → "Weitere Diagnose", mehrere → "Weitere Diagnosen" — Liste ohne Nummerierung, eine Diagnose pro Zeile, EXAKT wie im Dokument, keine Kürzung)\n\n### Aufenthalt\nGrund: [ein Satz]\nVerlauf: [2–3 Sätze, nur klinisch relevante Wendepunkte, chronologisch]\n\n### Wichtige Befunde\n(nur pathologische oder klinisch entscheidende Werte, keine Normalbefunde)\n\n### Aktuelle Medikation\n(Als Markdown-Tabelle: | Medikament (Dosis) | Schema | ggf. Dauer |)\nSchema-Format: morgens-mittags-abends (3 Werte). Die vierte Stelle (nachts) NUR angeben, wenn sie NICHT 0 ist. Beispiel: 1-0-1 (nicht 1-0-1-0), aber 0-0-0-2 wenn nachts relevant.\nKeine Darreichungsform (kein "Oral", "s.c.", "i.v.", "Tabletten", "Tropfen" etc.) — nur Wirkstoff, Dosis und Schema.\n\n### Aktuelle Empfehlungen\n\n### Nächste Schritte\n\nBei den Diagnosen: WORTGETREUE Übernahme aus dem Dokument — keine Zusammenfassung, keine Kürzung, keine Nummerierung. Mehrere Diagnosen als Liste ohne Nummerierung, eine pro Zeile, bei Bedarf nach Organsystem gruppiert. Alle Details beibehalten: Jahreszahl, Schweregrad, Messwerte, Stadium, ICD-Code, Lateralität — nichts weglassen. WICHTIG: Keine Diagnose darf ausgelassen werden — alle im Dokument genannten Diagnosen vollständig übernehmen, auch wenn es viele sind.\n\nFür jede Diagnose darfst du relevante Informationen aus dem Dokument als eingerückte Unterpunkte darunter gruppieren (z.B. OP-Datum, Prozedur, Verlauf). Verwende dafür ZWINGEND ein Sternchen gefolgt von einem Leerzeichen — NICHT einen Bindestrich. Beispielformat (exakt so):\nDiabetes mellitus Typ 2, ED 2015\n* HbA1c 8,2 % (03/2025)\n* Metformin 1000 mg 1-0-1\nArterielle Hypertonie\n* RR zuletzt 155/90 mmHg\nNiemals "  - Unterpunkt" oder "- Unterpunkt" verwenden. Nur Informationen aus dem gescannten Dokument. Freie Neuorganisation erlaubt, keine neuen Informationen.\n\n### Nicht übersehen\n\nEine einzige flache Liste, sortiert nach Dringlichkeit (erst alle 🔴, dann alle 🟡, dann alle 🟢). Jeder Punkt im GLEICHEN Format:\n- 🔴 **[Problemstelle]** Erklärung warum es ein Problem ist → konkrete Handlungsempfehlung\n- 🟡 **[Problemstelle]** Erklärung → Handlungsempfehlung\n- 🟢 **[Problemstelle]** Erklärung → Handlungsempfehlung\n\nDieser Abschnitt ist der WICHTIGSTE der gesamten Analyse. Hier liegt der klinische Mehrwert. Jeder Punkt soll so detailliert sein, dass der Arzt sofort handeln kann (2–4 Sätze pro Punkt).\n\nJeder Punkt hat 3 Teile: (1) **Problemstelle fett**, (2) Erklärung des Mechanismus/Risikos, (3) → konkrete Handlungsempfehlung mit Alternativen. Beispiele:\n- 🔴 **Amoxicillin + Penicillinallergie**: Amoxicillin gehört zur Penicillin-Gruppe. Bei dokumentierter Penicillinallergie (hier: Exanthem) besteht Kreuzallergie-Risiko. → Amoxicillin ersetzen. Für H.p.-Eradikation: Bismut-Quadrupeltherapie (PPI + Bismut + Metronidazol + Tetrazyklin) oder PPI + Clarithromycin + Metronidazol.\n- 🔴 **Metformin + GFR 38 ml/min**: Metformin wird renal eliminiert. Bei GFR <45 ml/min steigt das Laktatazidose-Risiko erheblich (laut Fachinformation KI bei GFR <30, Dosisreduktion bei 30–45). → Dosis auf max. 1000 mg/d reduzieren oder absetzen. Alternative: DPP4-Hemmer (Sitagliptin, renal angepasst) oder SGLT2-Hemmer (bei GFR >20).\n- 🟡 **ASS + Z.n. Ulcusblutung**: ASS hemmt die Thrombozytenaggregation und erhöht das Rezidivblutungsrisiko bei frischer Ulcusanamnese. → Wiederaufnahme erst nach endoskopisch gesicherter Ulkusheilung (Kontroll-ÖGD). Bei kardialer Indikation: Nutzen-Risiko-Abwägung mit PPI-Schutz.\n\nKEINE Zwischenüberschriften, KEINE Kategorie-Titel, KEINE Nummerierung. Nur die flache Liste mit Emoji-Prefix. Die Punkte sollen ALLE klinischen Bereiche abdecken — nicht nur Medikation.\n\nKeine Schlussformeln. Kein Disclaimer. Kein abschließender Kommentar. Keine Wiederholungen aus den oberen Abschnitten. Nur echte Auffälligkeiten, keine Spekulationen.'

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
  useEffect(() => { sessionStorage.setItem('arvis_scan_history', JSON.stringify(scanHistory)) }, [scanHistory])

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
        setScanHistory(prev => [{ id: crypto.randomUUID(), time, label: 'OCR Text', aiHtml: '', ocrText: txt, mode: 'ocr', thumb }, ...prev].slice(0, 5))
      } else {
        const analysis = await runAIAnalysis(imageDataUrls)
        console.log('RAW_GPT:', analysis)
        const html = markdownToHtml(analysis)
        setAiHtml(html)
        // Pas de texte OCR séparé en mode Vision — le texte est intégré dans l'analyse
        setOcrText('')
        setScanHistory(prev => [{ id: crypto.randomUUID(), time, label: extractScanLabel(analysis), aiHtml: html, ocrText: '', mode: 'ai', thumb }, ...prev].slice(0, 5))
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
        const rows = []
        table.querySelectorAll('tr').forEach(tr => {
          rows.push(Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()).join('\t'))
        })
        const pre = document.createElement('pre')
        pre.textContent = rows.join('\n')
        table.parentNode.replaceChild(pre, table)
      })
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
  async function downloadResult() {
    const text = mode === 'ai' ? document.getElementById('aiSummaryDiv')?.innerText : ocrText
    if (!text) return
    await downloadAsWord(text, mode === 'ai' ? 'KI-Analyse' : 'OCR-Text')
  }
  function sendToBrief() {
    const text = mode === 'ai' ? document.getElementById('aiSummaryDiv')?.innerText : ocrText
    if (text) { sessionStorage.setItem('arvis_brief_input', text); navigate('/briefschreiber') }
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
    <div className="page active" id="page-scan" style={{ paddingBottom: 20 }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Scan & Analyse</div>
          <div className="page-date">Dokument fotografieren · anonymisieren · analysieren</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" id="scanResetBtn" onClick={resetScan} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
            <span className="btn-label" style={{ lineHeight: 1 }}>Zurücksetzen</span>
          </button>
        </div>
      </div>

      {limitReached && (
        <div style={{ background: 'rgba(217, 75, 10, 0.08)', border: '1px solid #D94B0A', borderRadius: 8, padding: '14px 20px', marginBottom: 16 }}>
          <span style={{ color: '#D94B0A', fontSize: 15, fontWeight: 500 }}>
            Ihr monatliches KI-Kontingent ist erschöpft. Es wird am 1. des nächsten Monats erneuert.
          </span>
        </div>
      )}

      {/* Historique de session */}
      {scanHistory.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>Verlauf:</span>
          {scanHistory.map(item => (
            <button key={item.id} onClick={() => {
              if (item.thumb) {
                imgDataRef.current = item.thumb
                if (imgRef.current) imgRef.current.src = item.thumb
                setPanel('crop')
              }
              setAiHtml(item.aiHtml); setOcrText(item.ocrText); setMode(item.mode); goStep(4)
            }}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-2)', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
              title={item.label}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {item.time}{item.label !== 'OCR Text' ? ` — ${item.label.slice(0, 28)}${item.label.length > 28 ? '…' : ''}` : ' — OCR'}
            </button>
          ))}
        </div>
      )}

      {/* Main layout */}
      <div className="scan-layout">

        {/* LEFT */}
        <div className="scan-left" ref={leftRef}>

          {/* Upload panel */}
          {panel === 'upload' && (
            <div className="scan-panel" id="panelUpload" style={{ position: 'relative' }}>
              {mobileTransferring && (
                <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', borderRadius: 'inherit', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div className="spinner" />
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)' }}>Foto wird übertragen…</div>
                </div>
              )}
              <div className="scan-panel-header">
                <span className="scan-panel-title">Dokument laden</span>
                <span className="scan-panel-sub">Foto aufnehmen oder Datei hochladen</span>
              </div>
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
                <div style={{ textAlign: 'center', marginTop: 2 }}><span style={{ fontSize: 14, color: 'var(--text-3)' }}>oder</span></div>
                <div style={{ margin: '0 20px', position: 'relative', zIndex: 1, display: 'flex', gap: 8, marginTop: 22 }}>
                  <button className="btn-action" onClick={() => {
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && !/Macintosh/.test(navigator.userAgent));
                    if (isMobile) { cameraInputRef.current.click() } else { startMobileScan() }
                  }} style={{ flex: 1, justifyContent: 'center', display: 'flex', boxSizing: 'border-box', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                    Foto aufnehmen
                  </button>
                  <button className="btn-action-secondary" onClick={() => fileInputRef.current.click()}
                    style={{ flex: 1, justifyContent: 'center', display: 'flex', boxSizing: 'border-box', gap: 6 }}>
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
              <div className="scan-panel-header">
                <span className="scan-panel-title">Anonymisieren</span>
                <span className="scan-panel-sub">Patientendaten mit dem Schwärzungs-Tool entfernen</span>
              </div>
              {/* Warning */}
              <div id="anonWarning" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEE2E2', borderBottom: '1px solid #FCA5A5', padding: '10px 16px', marginTop: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#DC2626' }}>Bitte alle Patientendaten schwärzen, bevor Sie fortfahren.</span>
              </div>
              {/* PDF nav */}
              {pdfDocRef.current && (
                <div id="pdfNav" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 10, justifyContent: 'center' }}>
                  <button className="btn-secondary" style={{ padding: '4px 12px', minWidth: 0 }} onClick={() => changePdfPage(-1)}>←</button>
                  <span style={{ fontSize: 15, color: 'var(--text-2)' }}>Seite {pdfPage} / {pdfTotal}</span>
                  <button className="btn-secondary" style={{ padding: '4px 12px', minWidth: 0 }} onClick={() => changePdfPage(1)}>→</button>
                </div>
              )}
              {/* Toolbar */}
              <div className="scan-viewer-toolbar">
                <button onClick={addBlackout} style={{ height: 32, padding: '0 12px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', background: '#1C1C1E', color: 'white', border: 'none', borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: 'pointer' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>
                  Schwärzen
                </button>
                <button className="btn-secondary" aria-label="Schwärzung rückgängig machen" onClick={undoBlackout} title="Rückgängig" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
                </button>
                <div className="scan-toolbar-zoom">
                  <button className="btn-secondary" aria-label="Verkleinern" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} title="Verkleinern" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                  </button>
                  <button className="btn-secondary" onClick={() => setZoom(1)} title="Zurücksetzen" style={{ height: 32, minWidth: 42, padding: '0 6px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                    {Math.round(zoom * 100)}%
                  </button>
                  <button className="btn-secondary" aria-label="Vergrößern" onClick={() => setZoom(z => Math.min(4, z + 0.25))} title="Vergrößern" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                  </button>
                </div>
                <button className="scan-toolbar-weiter" onClick={proceedToAnalysis} style={{ background: '#D94B0A', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                  Analysieren
                </button>
              </div>
              {/* Document viewer */}
              <div id="cropContainer" ref={viewerRef} onMouseDown={startPan} onTouchStart={startPan} style={{ height: viewerHeight > 0 ? viewerHeight : 'auto', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}>
                <div id="cropInner" ref={cropInnerRef} style={{ position: 'relative', width: '100%', transformOrigin: 'top left', transform: `translate(${panX}px,${panY}px) scale(${zoom})` }}>
                  <img ref={imgRef} style={{ width: '100%', display: 'block', background: 'var(--bg-2)' }} alt="" onLoad={handleImageLoad} onClick={() => setSelectedBk(null)} />
                  <canvas id="cropCanvas" style={{ display: 'none' }} />
                  {/* Blackout boxes */}
                  {blackouts.map(box => (
                    <div key={box.id} onMouseDown={e => startDragBlackout(e, box)} onTouchStart={e => startDragBlackout(e, box)}
                      style={{ position: 'absolute', background: '#000', boxSizing: 'border-box', left: box.x, top: box.y, width: box.w, height: box.h, border: selectedBk === box.id ? '2px solid #EF4444' : '2px solid transparent', cursor: 'move', minWidth: 20, minHeight: 10, userSelect: 'none' }}>
                      {selectedBk === box.id && (
                        <>
                          <div onMouseDown={e => e.stopPropagation()} onClick={() => deleteBlackout(box.id)}
                            style={{ position: 'absolute', top: -10, right: -10, width: 20, height: 20, borderRadius: '50%', background: '#EF4444', color: 'white', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20 }}>×</div>
                          <div onMouseDown={e => startResizeBlackout(e, box)} onTouchStart={e => startResizeBlackout(e, box)}
                            style={{ position: 'absolute', bottom: -9, right: -9, width: 18, height: 18, background: '#EF4444', borderRadius: '50%', cursor: 'se-resize', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleY(-1)' }}><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="crop-overlay" id="cropOverlay" style={{ display: 'none' }} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="scan-right" ref={rightRef} style={!isAnalyzing && (aiHtml || ocrText) && leftH > 0 ? { height: leftH, minHeight: 900 } : panel !== 'upload' && frozenRightH > 0 ? { height: frozenRightH } : { alignSelf: 'stretch' }}>
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
            </div>
          </div>

          {/* Result card */}
          <div className="scan-result-card" id="resultCard">
            {/* Empty */}
            {!isAnalyzing && !errorMsg && ((mode === 'ai' && !aiHtml) || (mode === 'ocr' && !ocrText)) && (
              <div className="scan-result-empty">
                <img src="/arvis-icon-light.svg" width="90" height="90" alt="" style={{ display: 'block', filter: 'grayscale(1) opacity(0.35)' }} />
                <div style={{ fontSize: 16, color: 'var(--text-3)', marginTop: 12 }}>Ergebnis erscheint hier</div>
                <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>Laden Sie zuerst ein Dokument</div>
              </div>
            )}
            {/* Loading */}
            {isAnalyzing && (
              <div className="scan-result-loading">
                <div className="scan-spinner" />
                <div style={{ fontSize: 16, color: 'var(--text-2)', marginTop: 16, fontWeight: 600 }}>{loadingText}</div>
                <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 6 }}>KI verarbeitet den Inhalt</div>
              </div>
            )}
            {/* Error */}
            {!isAnalyzing && errorMsg && (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 24 }}>
                <div style={{ fontSize: 15, marginTop: 4, color: '#DC2626' }}>{errorMsg}</div>
              </div>
            )}
            {/* AI result */}
            {!isAnalyzing && mode === 'ai' && aiHtml && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <div className="result-header">
                    <div className="result-badge ai">
                      <img src="/arvis-icon.svg" width="20" height="20" alt="" style={{ display: 'block' }} />
                      KI-Analyse
                    </div>
                    <div className="result-actions">
                      <button className="result-action-btn" aria-label="Ergebnis kopieren" onClick={copyResult} title="Kopieren" style={copied ? { color: 'var(--orange)' } : {}}>
                        {copied
                          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        }
                      </button>
                      <button onClick={downloadResult} title="Als Word herunterladen"
                        style={{ height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5, background: '#2B579A', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        Word
                      </button>
                    </div>
                  </div>
                  <div className="result-section" style={{ marginBottom: 0 }}>
                    <div className="result-text" id="aiSummaryDiv" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aiHtml) }} />
                  </div>
                </div>
                <button className="btn-send-briefschreiber" onClick={sendToBrief} style={{ marginTop: 16, flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  An Brief Schreiber senden
                </button>
              </div>
            )}
            {/* OCR result */}
            {!isAnalyzing && mode === 'ocr' && ocrText && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div className="result-header">
                  <div className="result-badge ocr">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                    OCR Text
                  </div>
                  <div className="result-actions">
                    <button className="result-action-btn" aria-label="Ergebnis kopieren" onClick={copyResult} title="Kopieren" style={copied ? { color: 'var(--orange)' } : {}}>
                      {copied
                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      }
                    </button>
                    <button onClick={downloadResult} title="Als Word herunterladen"
                      style={{ height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5, background: '#2B579A', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      Word
                    </button>
                  </div>
                </div>
                <textarea className="ocr-textarea" value={ocrText} onChange={e => setOcrText(e.target.value)} placeholder="OCR Text erscheint hier..." />
                <button className="btn-send-briefschreiber" onClick={sendToBrief} style={{ marginTop: 12 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  An Brief Schreiber senden
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile multi-photo overlay ── */}
      {showMobileMultiUI && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', textAlign: 'center' }}>
              {mobilePhotos.length} Seite{mobilePhotos.length > 1 ? 'n' : ''} aufgenommen
            </div>
            {/* Thumbnails */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {mobilePhotos.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p.preview} alt={`Seite ${i + 1}`} style={{ width: 72, height: 90, objectFit: 'cover', borderRadius: 8, border: '2px solid #E5E5EA' }} />
                  <div style={{ position: 'absolute', top: 4, left: 4, background: '#D94B0A', color: 'white', borderRadius: 10, fontSize: 12, fontWeight: 700, padding: '1px 6px' }}>{i + 1}</div>
                </div>
              ))}
            </div>
            {/* Weitere Seite */}
            <button onClick={() => cameraInputRef.current.click()}
              style={{ padding: '14px', borderRadius: 12, border: '2px solid #D94B0A', background: 'white', color: '#D94B0A', fontSize: 17, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D94B0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Weitere Seite
            </button>
            {/* Fertig */}
            <button onClick={handleMobileFinish}
              style={{ padding: '14px', borderRadius: 12, border: 'none', background: '#1C1C1E', color: 'white', fontSize: 17, fontWeight: 600, cursor: 'pointer' }}>
              Weiter zur Anonymisierung
            </button>
            {/* Abbrechen */}
            <button onClick={() => { setShowMobileMultiUI(false); setMobilePhotos([]) }}
              style={{ padding: '12px', borderRadius: 10, border: 'none', background: '#F2F2F7', color: '#3C3C43', fontSize: 17, fontWeight: 600, cursor: 'pointer' }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {showMobileScanOptions && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowMobileScanOptions(false)}>
          <div style={{ background: 'white', borderRadius: '16px 16px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', marginBottom: 4, textAlign: 'center' }}>Dokument laden</div>
            <button onClick={() => { setShowMobileScanOptions(false); fileInputRef.current.click() }}
              style={{ padding: '16px', borderRadius: 12, border: '1px solid #E5E5EA', background: 'white', color: '#1C1C1E', fontSize: 17, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              Datei auswählen
            </button>
            <button onClick={() => { setShowMobileScanOptions(false); cameraInputRef.current.click() }}
              style={{ padding: '16px', borderRadius: 12, border: '1px solid #E5E5EA', background: 'white', color: '#1C1C1E', fontSize: 17, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              Foto aufnehmen
            </button>
            <button onClick={() => setShowMobileScanOptions(false)}
              style={{ marginTop: 4, padding: '12px', borderRadius: 10, border: 'none', background: '#F2F2F7', color: '#3C3C43', cursor: 'pointer', fontSize: 17, fontWeight: 600 }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {showDesktopScanOptions && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#1C1C1E', marginBottom: 8, textAlign: 'center' }}>Scan-Methode wählen</div>

            <button onClick={() => { setShowDesktopScanOptions(false); fileInputRef.current.click() }}
              style={{ padding: '14px', borderRadius: 10, border: '1px solid #E5E5EA', background: 'white', color: '#1C1C1E', fontSize: 17, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              Datei hochladen
            </button>
            <button onClick={startMobileScan}
              style={{ padding: '14px', borderRadius: 10, border: '1px solid #E5E5EA', background: 'white', color: '#1C1C1E', fontSize: 17, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
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
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 340, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#1C1C1E' }}>Mit Handy fotografieren</div>
            {qrExpired ? (
              <>
                <div style={{ fontSize: 15, color: '#FF3B30', fontWeight: 600 }}>
                  QR-Code abgelaufen
                </div>
                <div style={{ fontSize: 14, color: '#8E8E93', lineHeight: 1.4 }}>
                  Die Sitzung ist nach 10 Minuten abgelaufen. Bitte erneut versuchen.
                </div>
                <button onClick={() => { scanChannel?.unsubscribe(); startMobileScan() }}
                  style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#D94B0A', color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                  Neuen QR-Code erstellen
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 15, color: '#8E8E93' }}>QR-Code mit Ihrem Handy scannen</div>
                <QRCodeSVG value={qrUrl} size={200} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#D94B0A', fontWeight: 600 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D94B0A', animation: 'pulse 1.5s infinite' }} />
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
