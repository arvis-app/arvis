import { useState, useRef, useEffect } from 'react'
import DOMPurify from 'dompurify'
import { supabase, invokeEdgeFunction } from '../supabaseClient'
import { downloadAsWord } from '../utils/downloadWord'

function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderPlaceholders(text) {
  let h = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  h = h.replace(/\[([^\][]{0,80})\]/g, (match) => `<span class="ph-chip" data-encoded="${encodeURIComponent(match)}" contenteditable="false">${match}</span>`)
  return h
}

function getBriefText(el) {
  if (!el) return ''
  let h = el.innerHTML
  h = h.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '')
  return h.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
}

function renderDiff(orig, result) {
  const origWords = orig.split(/(\s+)/), resultWords = result.split(/(\s+)/)
  const origSet = new Set(origWords.filter(w => w.trim())), resultSet = new Set(resultWords.filter(w => w.trim()))
  let html = ''
  resultWords.forEach(w => {
    if (!w.trim()) { html += escHtml(w); return }
    html += !origSet.has(w) ? `<span style="background:rgba(0,180,0,0.18);border-radius:3px;padding:0 2px;">${escHtml(w)}</span>` : escHtml(w)
  })
  origWords.forEach(w => {
    if (!w.trim() || resultSet.has(w)) return
    html += ` <span style="background:rgba(220,0,0,0.13);text-decoration:line-through;border-radius:3px;padding:0 2px;color:var(--text-3);">${escHtml(w)}</span>`
  })
  return html
}

const SYS = 'Du bist ein erfahrener klinischer Dokumentationsassistent für Krankenhausärzte in Deutschland. Gib AUSSCHLIESSLICH den fertigen Text zurück. Kein Kommentar, keine Erklärung.'

function buildPrompt(mode, style, length, input) {
  const si = mode === 'umformulierung' ? (style === 'Telegrafisch' ? ' Telegrafisch: kurze Sätze, keine Füllwörter.' : style === 'Präzise' ? ' Präzise und strukturiert.' : style === 'Narrativ' ? ' Narrativ: fließende Sätze.' : style === 'Aufzählung' ? ' Als Aufzählung mit Stichpunkten.' : '') : ''
  const li = mode === 'umformulierung' ? (length === 'Kürzer' ? ' Kürze deutlich.' : length === 'Länger' ? ' Ergänze relevante Details.' : '') : ''
  const ph = 'PLATZHALTER FÜLLEN: [_Wert], [Wert_], [Wert1/Wert2] → Wert in Satz integrieren. Leere [_] → "[nicht angegeben]".'
  if (mode === 'korrektur') return `Überarbeite den folgenden medizinischen Text zu einem professionellen deutschen Arztbrief.\n\nSTIL:\n- Schreibe wie ein erfahrener Facharzt: prägnant, sachlich, professionell. Kein Roman, keine Überinterpretation.\n- Abkürzungen auflösen und Fachvokabular verwenden, aber NICHT über-erklären (kein "als Ausdruck einer…", kein "hinweisend auf…" — der Leser ist Arzt).\n- Datumsangaben im Originalformat belassen (z.B. "02.04." NICHT in "02. April" umschreiben).\n- Medizinische Abkürzungen korrekt auflösen: "KI" nach Medikament + Dosis = "Kurzinfusion" (NICHT Kontraindikation).\n\nFORMAT-REGELN:\n1. ${ph}\n2. PROSA für: Anamnese, Befunde, Bildgebung, Therapie/Procedere — vollständige verbundene Sätze, KEINE Aufzählung, KEINE Satzfragmente. Typische Konstruktionen:\n   - Anamnese: Informationen zu einem fließenden Absatz verbinden, nicht Satz für Satz auflisten. Z.B. "Der [Alter]-jährige Patient stellte sich am [Datum] über die ZNA vor. Er berichtet über…, begleitet von… Zudem bestehe…"\n   - Befunde: "Die körperliche Untersuchung ergab…", "Bei der Palpation zeigte sich…"\n   - Bildgebung: "Sonographisch stellte sich… dar."\n   - Procedere: "Es erfolgte die Anlage…", "Der Patient erhielt…", "Zusätzlich wurde… eingeleitet.", "Die Operation ist für… geplant."\n3. LISTE für: Medikation (IMMER als Liste mit Schema beibehalten, z.B. "Metformin 1000 mg 1-0-1"), Diagnosen (wenn mehrere).\n4. LABORWERTE: Kompakt in 1–2 Sätzen zusammenfassen, Werte mit Einheiten nennen, keine Interpretation.\n5. ABSÄTZE: Thematisch getrennt durch Leerzeile (Anamnese, Vorerkrankungen, Medikation, Befunde, Labor, Bildgebung, Diagnose, Procedere).\n6. NUR was im Text steht: Nichts hinzufügen, nichts weglassen.\n7. Redundanzen entfernen.\n\nText:\n${input}`
  if (mode === 'umformulierung') return `${ph}\nUMFORMULIEREN: jeden Satz neu schreiben, gleicher Inhalt. Alle Werte exakt beibehalten.${si}${li}\n\nText:\n${input}`
  return `${ph}\nZUSAMMENFASSUNG in 5-10 Zeilen: Aufnahmegrund, Befunde, Diagnose(n), Maßnahmen, Weiteres. WICHTIG: Gib AUSSCHLIESSLICH den Zusammenfassungstext zurück. Kein Titel, keine Überschrift wie "Zusammenfassung:", kein Originaltext, keine Einleitung — nur der reine Text.${si}${li}\n\nText:\n${input}`
}

export default function BriefSchreiber() {
  const [mode, setMode] = useState('korrektur')
  const [style, setStyle] = useState('Telegrafisch')
  const [length, setLength] = useState('Original')
  const [chars, setChars] = useState(0)
  const [state, setState] = useState('empty') // empty|loading|result
  const [result, setResult] = useState('')
  const [orig, setOrig] = useState('')
  const [diffMode, setDiffMode] = useState('result')
  const [toast, setToast] = useState('')
  const [recording, setRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [limitReached, setLimitReached] = useState(false)

  const inputRef = useRef(null)
  const wsRef = useRef(null)
  const audioCtxRef = useRef(null)
  const processorRef = useRef(null)
  const streamRef = useRef(null)
  const popupChipRef = useRef(null)
  const intentionalStopRef = useRef(false)
  const reconnectCountRef  = useRef(0)
  const wsTokenRef         = useRef(null)
  const [popup, setPopup] = useState({ visible: false, choices: [], x: 0, y: 0 })

  useEffect(() => {
    return () => {
      processorRef.current?.disconnect()
      audioCtxRef.current?.close().catch(() => {})
      streamRef.current?.getTracks().forEach(t => t.stop())
      wsRef.current?.close()
    }
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem('arvis_brief_input')
    if (saved && inputRef.current) {
      const existing = inputRef.current.innerHTML.trim()
      const newContent = renderPlaceholders(saved)
      inputRef.current.innerHTML = DOMPurify.sanitize(existing ? existing + '<br><br>' + newContent : newContent)
      setChars(getBriefText(inputRef.current).length)
      sessionStorage.removeItem('arvis_brief_input')
    }
  }, [])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2200) }
  function updateCount() { setChars(getBriefText(inputRef.current).length) }
  function clearInput() { if (inputRef.current) inputRef.current.innerHTML = ''; setChars(0) }
  function clearAll() { clearInput(); setState('empty'); setResult(''); setOrig(''); setLimitReached(false) }

  function replaceChipWithCursor(chip) {
    const textNode = document.createTextNode('')
    chip.parentNode.replaceChild(textNode, chip)
    const range = document.createRange(), sel = window.getSelection()
    range.setStart(textNode, 0); range.collapse(true)
    sel.removeAllRanges(); sel.addRange(range)
    inputRef.current?.focus(); updateCount()
  }

  function replaceChipWithText(chip, text) {
    const textNode = document.createTextNode(text)
    chip.parentNode.replaceChild(textNode, chip)
    const range = document.createRange(), sel = window.getSelection()
    range.setStartAfter(textNode); range.collapse(true)
    sel.removeAllRanges(); sel.addRange(range)
    inputRef.current?.focus(); updateCount()
  }

  function hidePopup() {
    popupChipRef.current = null
    setPopup({ visible: false, choices: [], x: 0, y: 0 })
  }

  function choosePopup(val) {
    const chip = popupChipRef.current
    if (chip) replaceChipWithText(chip, val)
    hidePopup()
  }

  function andereEingeben() {
    const chip = popupChipRef.current
    if (chip) replaceChipWithCursor(chip)
    hidePopup()
  }

  function handleInputClick(e) {
    const chip = e.target.closest('.ph-chip')
    if (!chip) return
    const raw = decodeURIComponent(chip.dataset.encoded || '')
    const inner = raw.slice(1, -1)
    const isChoice = inner.indexOf('/') !== -1 && !inner.startsWith('_')
    if (isChoice) {
      const choices = inner.split('/').map(c => c.trim())
      const rect = chip.getBoundingClientRect()
      popupChipRef.current = chip
      const popupWidth = 160
      const x = Math.min(rect.left, window.innerWidth - popupWidth - 8)
      setPopup({ visible: true, choices, x: Math.max(8, x), y: rect.bottom + 6 })
    } else {
      replaceChipWithCursor(chip)
      hidePopup()
    }
  }

  useEffect(() => {
    if (!popup.visible) return
    function onDocClick(e) {
      const el = document.getElementById('placeholderPopup')
      if (el && !el.contains(e.target) && !e.target.closest('.ph-chip')) {
        hidePopup()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('touchstart', onDocClick)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('touchstart', onDocClick)
    }
  }, [popup.visible])

  function connectWs(token) {
    // RISQUE RÉSIDUEL DOCUMENTÉ : le token est visible dans les headers WebSocket
    // (subprotocol) interceptables sur un réseau non sécurisé. Un proxy Edge Function
    // qui relaierait la connexion WebSocket côté serveur éliminerait ce risque, mais
    // l'API OpenAI Realtime ne supporte pas de connexion serveur-à-serveur sans latence
    // inacceptable pour la dictée en temps réel.
    // Mitigations en place :
    //   1. Token ÉPHÉMÈRE généré par l'edge function realtime-token (TTL ~60s côté OpenAI)
    //   2. Token généré uniquement pour les utilisateurs Pro authentifiés (JWT vérifié côté serveur)
    //   3. Le token ne donne accès qu'à une session Realtime mono-usage, pas à l'API key principale
    const ws = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
      ['realtime', `openai-insecure-api-key.${token}`, 'openai-beta.realtime-v1']
    )
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text'],
          input_audio_format: 'pcm16',
          input_audio_transcription: { model: 'whisper-1', language: 'de' },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 600,
            create_response: false,
          },
        },
      }))
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'input_audio_buffer.speech_started') {
          setInterimText('')
        } else if (msg.type === 'conversation.item.input_audio_transcription.delta') {
          setInterimText(prev => prev + (msg.delta || ''))
        } else if (msg.type === 'conversation.item.input_audio_transcription.completed') {
          const text = (msg.transcript || '').trim()
          if (text) { insertAtCursor(text + ' '); setInterimText('') }
        } else if (msg.type === 'error') {
          showToast('Diktierfehler: ' + (msg.error?.message || 'Unbekannt'))
        }
      } catch {}
    }

    ws.onerror = () => showToast('WebSocket-Verbindungsfehler')

    ws.onclose = () => {
      if (intentionalStopRef.current) {
        intentionalStopRef.current = false
        reconnectCountRef.current = 0
        setRecording(false)
        setInterimText('')
        return
      }
      // Unexpected disconnect — try to reconnect up to 3 times
      if (reconnectCountRef.current < 3 && wsTokenRef.current) {
        reconnectCountRef.current++
        showToast(`Verbindung unterbrochen — Versuch ${reconnectCountRef.current}/3…`)
        setTimeout(() => connectWs(wsTokenRef.current), 1500 * reconnectCountRef.current)
      } else {
        setRecording(false)
        setInterimText('')
        reconnectCountRef.current = 0
        showToast('Diktat beendet — Verbindung konnte nicht wiederhergestellt werden')
      }
    }
  }

  async function toggleDictation() {
    if (recording) {
      intentionalStopRef.current = true
      processorRef.current?.disconnect()
      audioCtxRef.current?.close().catch(() => {})
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (wsRef.current) {
        setTimeout(() => {
          if (wsRef.current) {
            wsRef.current.onmessage = null
            wsRef.current.onerror = null
            wsRef.current.close()
          }
        }, 300)
      }
      setRecording(false)
      setInterimText('')
      reconnectCountRef.current = 0
      return
    }
    try {
      let tokenData
      try {
        tokenData = await invokeEdgeFunction('realtime-token', {})
      } catch (tokenErr) {
        showToast('Verbindung fehlgeschlagen: ' + tokenErr.message)
        return
      }
      if (!tokenData?.token) {
        showToast('Verbindung fehlgeschlagen: kein Token erhalten')
        return
      }

      wsTokenRef.current = tokenData.token
      reconnectCountRef.current = 0
      connectWs(tokenData.token)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const audioCtx = new AudioContext({ sampleRate: 24000 })
      audioCtxRef.current = audioCtx

      const source = audioCtx.createMediaStreamSource(stream)
      const processor = audioCtx.createScriptProcessor(2048, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (evt) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
        const float32 = evt.inputBuffer.getChannelData(0)
        const int16 = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32767)))
        }
        const uint8 = new Uint8Array(int16.buffer)
        let binary = ''
        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i])
        wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: btoa(binary) }))
      }

      source.connect(processor)
      processor.connect(audioCtx.destination)
      setRecording(true)
    } catch (err) {
      showToast('Mikrofon-Zugriff verweigert: ' + err.message)
    }
  }

  function insertAtCursor(text) {
    const el = inputRef.current; if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0); range.deleteContents()
      const node = document.createTextNode(text); range.insertNode(node)
      range.setStartAfter(node); range.collapse(true)
      sel.removeAllRanges(); sel.addRange(range)
    } else { el.textContent += text }
    updateCount()
  }

  async function runAI() {
    const input = getBriefText(inputRef.current).trim()
    if (!input) { showToast('Bitte Text eingeben'); return }
    setOrig(input); setState('loading')
    try {
      const data = await invokeEdgeFunction('ai-chat', {
        model: 'gpt-4o', max_tokens: 3000,
        messages: [{ role: 'system', content: SYS }, { role: 'user', content: buildPrompt(mode, style, length, input) }]
      })
      if (data?.error === 'limit_reached') { setState('empty'); setLimitReached(true); return }
      const content = data?.content
      if (!content) throw new Error('Leere Antwort.')
      setResult(content.trim()); setState('result'); setDiffMode('result')
      showToast({ korrektur: 'Korrektur', umformulierung: 'Umformulierung', zusammenfassung: 'Zusammenfassung' }[mode] + ' abgeschlossen')
    } catch (e) { setState('empty'); showToast('Fehler: ' + e.message) }
  }

  const [copied, setCopied] = useState(false)
  function copyResult() {
    navigator.clipboard.writeText(result)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }
  async function downloadDoc() {
    if (!result) return
    await downloadAsWord(result, 'Brief')
  }

  const modes = [
    {
      key: 'korrektur', label: 'Korrektur',
      icon: <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>
    },
    {
      key: 'umformulierung', label: 'Umformulierung',
      icon: <><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>
    },
    {
      key: 'zusammenfassung', label: 'Zusammenfassung',
      icon: <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>
    },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">AI Brief Schreiber</div>
          <div className="page-date">KI korrigiert und reformuliert Ihre medizinischen Briefe</div>
        </div>
        <button className="btn-secondary" id="briefResetBtn" onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
          <span className="btn-label" style={{ lineHeight: 1 }}>Zurücksetzen</span>
        </button>
      </div>

      {limitReached && (
        <div style={{ background: 'rgba(217, 75, 10, 0.08)', border: '1px solid #D94B0A', borderRadius: 8, padding: '14px 20px', marginBottom: 16 }}>
          <span style={{ color: '#D94B0A', fontSize: 15, fontWeight: 500 }}>
            Ihr monatliches KI-Kontingent ist erschöpft. Es wird am 1. des nächsten Monats erneuert.
          </span>
        </div>
      )}

      <div className="brief-modes">
        {modes.map(m => (
          <button key={m.key} className={`brief-mode-btn${mode === m.key ? ' active' : ''}`} onClick={() => setMode(m.key)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{m.icon}</svg>
            {m.label}
          </button>
        ))}
      </div>

      <div className="brief-layout">

        {/* LEFT */}
        <div className="brief-panel">
          <div className="brief-panel-header">
            <span className="brief-panel-label">Ihr Text</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="brief-char-count">{chars} Zeichen</span>
              <button className="result-action-btn" aria-label="Eingabe leeren" onClick={clearInput} title="Leeren">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
              </button>
            </div>
          </div>

          <div ref={inputRef} className="brief-textarea" contentEditable suppressContentEditableWarning spellCheck={false}
            data-placeholder="Diktieren, Text eingeben oder Bausteine hinzufügen…"
            onInput={updateCount} onClick={handleInputClick} />

          {recording && (
            <div style={{ margin: '4px 0 0', padding: '6px 10px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)', minHeight: 30, fontSize: 12.5, color: interimText ? 'var(--text)' : 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#DC2626', flexShrink: 0, animation: 'pulse 1s infinite' }} />
              {interimText || 'Sprechen Sie jetzt…'}
            </div>
          )}

          {mode === 'umformulierung' && (
            <div className="brief-options">
              <div className="brief-option-group">
                <label className="brief-option-label">Stil</label>
                <div className="brief-option-btns">
                  {['Telegrafisch', 'Präzise', 'Narrativ', 'Aufzählung'].map(s => (
                    <button key={s} className={`brief-opt-btn${style === s ? ' active' : ''}`} onClick={() => setStyle(s)}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="brief-option-group">
                <label className="brief-option-label">Länge</label>
                <div className="brief-option-btns">
                  {['Original', 'Kürzer', 'Länger'].map(l => (
                    <button key={l} className={`brief-opt-btn${length === l ? ' active' : ''}`} onClick={() => setLength(l)}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="brief-action-row">
            <button className={`btn-diktieren${recording ? ' diktieren-recording' : ''}`} onClick={toggleDictation}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
              {recording ? 'Stoppen' : 'Diktieren'}
            </button>
            <button className="brief-submit-btn" onClick={runAI}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><line x1="12" y1="7" x2="12" y2="11" /><line x1="8" y1="15" x2="8" y2="17" /><line x1="12" y1="15" x2="12" y2="17" /><line x1="16" y1="15" x2="16" y2="17" /></svg>
              KI analysieren
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="brief-panel">
          <div className="brief-panel-header">
            <span className="brief-panel-label">KI-Ergebnis</span>
            {state === 'result' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="result-action-btn" aria-label="Ergebnis kopieren" onClick={copyResult} title="Kopieren" style={copied ? { color: 'var(--orange)' } : {}}>
                  {copied
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  }
                </button>
                <button onClick={downloadDoc} title="Als Word herunterladen"
                  style={{ height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5, background: '#2B579A', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Word
                </button>
              </div>
            )}
          </div>

          {state === 'empty' && (
            <div className="brief-output-empty">
              <img src="/arvis-icon-light.svg" width="90" height="90" alt="" style={{ display: 'block', filter: 'grayscale(1) opacity(0.35)' }} />
              <div style={{ fontSize: 15, color: 'var(--text-3)', marginTop: 12 }}>KI-Ergebnis erscheint hier</div>
              <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>Text eingeben und analysieren</div>
            </div>
          )}

          {state === 'loading' && (
            <div className="brief-output-loading">
              <div className="scan-spinner" />
              <div style={{ fontSize: 15, color: 'var(--text-2)', marginTop: 14, fontWeight: 600 }}>KI verarbeitet...</div>
            </div>
          )}

          {state === 'result' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="brief-diff-toggle">
                <button className={`brief-diff-btn${diffMode === 'result' ? ' active' : ''}`} onClick={() => setDiffMode('result')}>Ergebnis</button>
                <button className={`brief-diff-btn${diffMode === 'diff' ? ' active' : ''}`} onClick={() => setDiffMode('diff')}>Änderungen</button>
              </div>
              {diffMode === 'result' && (
                <textarea className="brief-output-textarea" value={result} onChange={e => setResult(e.target.value)} />
              )}
              {diffMode === 'diff' && (
                <div className="brief-diff-view" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderDiff(orig, result)) }} />
              )}
            </div>
          )}
        </div>
      </div>

      {popup.visible && (
        <div id="placeholderPopup" style={{ position: 'fixed', zIndex: 9999, top: popup.y, left: popup.x, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: 8, boxShadow: 'var(--shadow-lg)', minWidth: 140, display: 'flex', flexDirection: 'column' }}>
          {popup.choices.map(c => (
            <button key={c} className="ph-popup-btn" onMouseDown={e => { e.preventDefault(); choosePopup(c) }}>{c}</button>
          ))}
          <button className="ph-popup-btn ph-andere" onMouseDown={e => { e.preventDefault(); andereEingeben() }}>Andere eingeben…</button>
        </div>
      )}

      {toast && <div className="app-toast">{toast}</div>}
    </div>
  )
}
