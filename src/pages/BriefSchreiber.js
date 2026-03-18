import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function escHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function renderPlaceholders(text) {
  let h = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
  h = h.replace(/\[([^\]\[]{0,80})\]/g,(match)=>`<span class="ph-chip" data-encoded="${encodeURIComponent(match)}" contenteditable="false">${match}</span>`)
  return h
}

function getBriefText(el) {
  if (!el) return ''
  let h = el.innerHTML
  h = h.replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,'')
  return h.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
}

function renderDiff(orig, result) {
  const origWords = orig.split(/(\s+)/), resultWords = result.split(/(\s+)/)
  const origSet = new Set(origWords.filter(w=>w.trim())), resultSet = new Set(resultWords.filter(w=>w.trim()))
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
  const si = mode==='umformulierung' ? (style==='Telegrafisch'?' Telegrafisch: kurze Sätze, keine Füllwörter.':style==='Präzise'?' Präzise und strukturiert.':style==='Narrativ'?' Narrativ: fließende Sätze.':style==='Aufzählung'?' Als Aufzählung mit Stichpunkten.':'') : ''
  const li = mode==='umformulierung' ? (length==='Kürzer'?' Kürze deutlich.':length==='Länger'?' Ergänze relevante Details.':'') : ''
  const ph = '1. PLATZHALTER FÜLLEN: [_Wert], [Wert_], [Wert1/Wert2] → Wert in Satz integrieren. Leere [_] → "[nicht angegeben]".'
  const ord = '2. REIHENFOLGE: Anamnese → Befunde → Diagnose → Verlauf → OP → Empfehlungen.'
  if (mode==='korrektur') return `${ph}\n${ord}\n3. BAUSTEINE SCHONEN: nur Tipp-/Grammatikfehler korrigieren.\n4. ÜBERGÄNGE: flüssig verbinden. Keine neuen Inhalte erfinden.\n5. ROHTEXT GLÄTTEN: in medizinischen Stil anpassen.${si}${li}\n\nText:\n${input}`
  if (mode==='umformulierung') return `${ph}\n${ord}\n3. UMFORMULIEREN: jeden Satz neu schreiben, gleicher Inhalt. Alle Werte exakt beibehalten.${si}${li}\n\nText:\n${input}`
  return `${ph}\n2. ZUSAMMENFASSUNG in 5-10 Zeilen: Aufnahmegrund, Befunde, Diagnose(n), Maßnahmen, Weiteres.${si}${li}\n\nText:\n${input}`
}

export default function BriefSchreiber() {
  const [mode, setMode]       = useState('korrektur')
  const [style, setStyle]     = useState('Telegrafisch')
  const [length, setLength]   = useState('Original')
  const [chars, setChars]     = useState(0)
  const [state, setState]     = useState('empty') // empty|loading|result
  const [result, setResult]   = useState('')
  const [orig, setOrig]       = useState('')
  const [diffMode, setDiffMode] = useState('result')
  const [toast, setToast]     = useState('')
  const [recording, setRecording] = useState(false)

  const inputRef     = useRef(null)
  const mediaRef     = useRef(null)
  const chunksRef    = useRef([])
  const popupChipRef = useRef(null)
  const [popup, setPopup] = useState({ visible:false, choices:[], x:0, y:0 })

  useEffect(() => {
    const saved = localStorage.getItem('arvis_brief_input')
    if (saved && inputRef.current) {
      const existing = inputRef.current.innerHTML.trim()
      const newContent = renderPlaceholders(saved)
      inputRef.current.innerHTML = existing ? existing + '<br><br>' + newContent : newContent
      setChars(getBriefText(inputRef.current).length)
      localStorage.removeItem('arvis_brief_input')
    }
  }, [])

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),2200) }
  function updateCount() { setChars(getBriefText(inputRef.current).length) }
  function clearInput() { if(inputRef.current) inputRef.current.innerHTML=''; setChars(0) }
  function clearAll() { clearInput(); setState('empty'); setResult(''); setOrig('') }

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
    setPopup({ visible:false, choices:[], x:0, y:0 })
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
      setPopup({ visible:true, choices, x: rect.left, y: rect.bottom + 6 })
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
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [popup.visible])

  async function toggleDictation() {
    if (recording) { mediaRef.current?.stop(); setRecording(false); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const mr = new MediaRecorder(stream, { mimeType })
      mr.ondataavailable = e => { if(e.data.size>0) chunksRef.current.push(e.data) }
      mr.onstop = () => { stream.getTracks().forEach(t=>t.stop()); sendWhisper(chunksRef.current, mr.mimeType) }
      mr.start(100); mediaRef.current = mr; setRecording(true)
    } catch(err) { showToast('Mikrofon-Zugriff verweigert: '+err.message) }
  }

  async function sendWhisper(chunks, mimeType) {
    const ext = mimeType.includes('mp4')?'mp4':mimeType.includes('ogg')?'ogg':'webm'
    const fd = new FormData()
    fd.append('file', new Blob(chunks,{type:mimeType}), 'aufnahme.'+ext)
    fd.append('prompt','Arztbrief, medizinische Fachsprache, Diagnosen, Befunde, Therapie.')
    try {
      const { data, error } = await supabase.functions.invoke('ai-whisper', { body: fd })
      if (data?.text) { insertAtCursor(data.text.trim()); showToast('Diktat eingefügt') }
      else showToast('Transkription fehlgeschlagen')
    } catch(err) { showToast('Fehler: '+err.message) }
  }

  function insertAtCursor(text) {
    const el = inputRef.current; if(!el) return
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
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { model:'gpt-4o', max_tokens:3000, messages:[{role:'system',content:SYS},{role:'user',content:buildPrompt(mode,style,length,input)}] }
      })
      if (error || data?.error) throw new Error(error?.message || data?.error || 'API Fehler')
      const content = data?.content
      if (!content) throw new Error('Leere Antwort.')
      setResult(content.trim()); setState('result'); setDiffMode('result')
      showToast({korrektur:'Korrektur',umformulierung:'Umformulierung',zusammenfassung:'Zusammenfassung'}[mode]+' abgeschlossen')
    } catch(e) { setState('empty'); showToast('Fehler: '+e.message) }
  }

  const [copied, setCopied] = useState(false)
  function copyResult() {
    navigator.clipboard.writeText(result)
    setCopied(true); setTimeout(()=>setCopied(false), 1500)
  }

  const modes = [
    { key:'korrektur',       label:'Korrektur',
      icon:<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></> },
    { key:'umformulierung',  label:'Umformulierung',
      icon:<><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></> },
    { key:'zusammenfassung', label:'Zusammenfassung',
      icon:<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></> },
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">AI Brief Schreiber</div>
          <div className="page-date">KI korrigiert und reformuliert Ihre medizinischen Briefe</div>
        </div>
        <button className="btn-secondary" onClick={clearAll} style={{display:'flex',alignItems:'center',gap:6}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.45"/></svg>
          Zurücksetzen
        </button>
      </div>

      <div className="brief-modes">
        {modes.map(m=>(
          <button key={m.key} className={`brief-mode-btn${mode===m.key?' active':''}`} onClick={()=>setMode(m.key)}>
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
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <span className="brief-char-count">{chars} Zeichen</span>
              <button className="result-action-btn" onClick={clearInput} title="Leeren">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
          </div>

          <div ref={inputRef} className="brief-textarea" contentEditable suppressContentEditableWarning spellCheck={false}
            data-placeholder="Diktieren, Text eingeben oder Bausteine hinzufügen…"
            onInput={updateCount} onClick={handleInputClick} />

          {mode==='umformulierung' && (
            <div className="brief-options">
              <div className="brief-option-group">
                <label className="brief-option-label">Stil</label>
                <div className="brief-option-btns">
                  {['Telegrafisch','Präzise','Narrativ','Aufzählung'].map(s=>(
                    <button key={s} className={`brief-opt-btn${style===s?' active':''}`} onClick={()=>setStyle(s)}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="brief-option-group">
                <label className="brief-option-label">Länge</label>
                <div className="brief-option-btns">
                  {['Original','Kürzer','Länger'].map(l=>(
                    <button key={l} className={`brief-opt-btn${length===l?' active':''}`} onClick={()=>setLength(l)}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="brief-action-row">
            <button className={`btn-diktieren${recording?' diktieren-recording':''}`} onClick={toggleDictation}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              {recording ? 'Stoppen' : 'Diktieren'}
            </button>
            <button className="brief-submit-btn" onClick={runAI}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="15" x2="8" y2="17"/><line x1="12" y1="15" x2="12" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg>
              KI analysieren
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="brief-panel">
          <div className="brief-panel-header">
            <span className="brief-panel-label">KI-Ergebnis</span>
            {state==='result' && (
              <button className="result-action-btn" onClick={copyResult} title="Kopieren" style={copied?{color:'var(--orange)'}:{}}>
                {copied
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                }
              </button>
            )}
          </div>

          {state==='empty' && (
            <div className="brief-output-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/></svg>
              <div style={{fontSize:13,color:'var(--text-3)',marginTop:12}}>KI-Ergebnis erscheint hier</div>
              <div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>Text eingeben und analysieren</div>
            </div>
          )}

          {state==='loading' && (
            <div className="brief-output-loading">
              <div className="scan-spinner"/>
              <div style={{fontSize:13,color:'var(--text-2)',marginTop:14,fontWeight:600}}>KI verarbeitet...</div>
            </div>
          )}

          {state==='result' && (
            <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
              <div className="brief-diff-toggle">
                <button className={`brief-diff-btn${diffMode==='result'?' active':''}`} onClick={()=>setDiffMode('result')}>Ergebnis</button>
                <button className={`brief-diff-btn${diffMode==='diff'?' active':''}`} onClick={()=>setDiffMode('diff')}>Änderungen</button>
              </div>
              {diffMode==='result' && (
                <textarea className="brief-output-textarea" value={result} onChange={e=>setResult(e.target.value)}/>
              )}
              {diffMode==='diff' && (
                <div className="brief-diff-view" dangerouslySetInnerHTML={{__html:renderDiff(orig,result)}}/>
              )}
            </div>
          )}
        </div>
      </div>

      {popup.visible && (
        <div id="placeholderPopup" style={{position:'fixed',zIndex:9999,top:popup.y,left:popup.x,background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:8,boxShadow:'var(--shadow-lg)',minWidth:140,display:'flex',flexDirection:'column'}}>
          {popup.choices.map(c=>(
            <button key={c} className="ph-popup-btn" onMouseDown={e=>{e.preventDefault();choosePopup(c)}}>{c}</button>
          ))}
          <button className="ph-popup-btn ph-andere" onMouseDown={e=>{e.preventDefault();andereEingeben()}}>Andere eingeben…</button>
        </div>
      )}

      {toast && <div style={{position:'fixed',bottom:28,left:'calc(50% + 120px)',transform:'translateX(-50%)',background:'var(--orange-ghost)',color:'var(--orange)',border:'none',padding:'10px 22px',borderRadius:10,fontSize:14,fontWeight:600,zIndex:99999}}>{toast}</div>}
    </div>
  )
}
