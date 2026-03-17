import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Markdown → HTML (fidèle à l'original) ─────────────────────────────────────
function markdownToHtml(md) {
  const lines = md.split('\n')
  let html = '', inList = false
  for (const line of lines) {
    if (/^## /.test(line)) {
      if (inList) { html += '</div>'; inList = false }
      const text = line.replace(/^## /, '').replace(/\*\*(.+?)\*\*/g, '$1')
      const mt = html === '' ? '0' : '22px'
      html += `<div style="font-size:17px;font-weight:800;color:var(--text);margin-top:${mt};margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid var(--orange);letter-spacing:0.01em;">${text}</div>`
    } else if (/^\*\*[^*]+\*\*:?\s*$/.test(line.trim())) {
      if (inList) { html += '</div>'; inList = false }
      const text = line.replace(/\*\*(.+?)\*\*/g, '$1')
      html += `<div style="font-size:15px;font-weight:700;color:var(--text);margin-top:10px;margin-bottom:4px;">${text}</div>`
    } else if (/^[-] /.test(line)) {
      if (!inList) { html += '<div style="display:flex;flex-direction:column;gap:5px;margin-top:2px;">'; inList = true }
      let text = line.replace(/^[-] /, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      let bg = 'transparent', color = 'var(--text-2)', border = 'var(--border)'
      if (text.indexOf('🔴') === 0) { bg='rgba(220,38,38,0.07)'; color='#DC2626'; border='rgba(220,38,38,0.3)' }
      else if (text.indexOf('🟡') === 0) { bg='rgba(217,119,6,0.07)'; color='#B45309'; border='rgba(217,119,6,0.3)' }
      else if (text.indexOf('🟢') === 0) { bg='rgba(22,163,74,0.07)'; color='#15803D'; border='rgba(22,163,74,0.3)' }
      html += `<div style="font-size:12.5px;color:${color};background:${bg};border-left:3px solid ${border};border-radius:0 6px 6px 0;padding:5px 10px;line-height:1.55;">${text}</div>`
    } else if (line.trim() === '') {
      if (inList) { html += '</div>'; inList = false }
    } else {
      if (inList) { html += '</div>'; inList = false }
      const text = line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text);font-weight:700;">$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
      html += `<div style="font-size:12.5px;color:var(--text-2);padding:2px 0;line-height:1.6;">${text}</div>`
    }
  }
  if (inList) html += '</div>'
  return html
}

const SYSTEM_PROMPT = 'Du bist ein klinischer Entscheidungsassistent für Krankenhausärzte in Deutschland. Deine Aufgabe ist nicht nur zusammenzufassen, sondern aktiv mitzudenken — wie ein erfahrener Kollege, der das Dokument mitliest. Verwende klinische Abkürzungen (Z.n., ED, V.a., RR, NAS, etc.). Führe nur Abschnitte auf, die im Text vorhanden sind: 1) Wenn genau eine Hauptdiagnose: Titel "Hauptdiagnose", wenn mehrere: "Hauptdiagnosen". 2) Wenn genau eine weitere Diagnose: Titel "Weitere Diagnose", wenn mehrere: "Weitere Diagnosen". 3) Aufenthalt: Aufnahmegrund in einem Satz ("Grund:") + kurzer Verlauf 2-3 Sätze ("Verlauf:") — nur klinisch relevante Wendepunkte, chronologisch sortiert. 4) Wichtige Befunde — nur pathologische oder klinisch entscheidende Werte. 5) Aktuelle Medikation. 6) Aktuelle Empfehlungen. 7) Nächste Schritte. 8) ⚠️ Nicht übersehen — IMMER aufführen: Widersprüche, fehlende Angaben, klinische Lücken, fehlende Standardmedikamente. Sortiere nach: 🔴 kritisch · 🟡 wichtig · 🟢 beachten. Keine Schlussformeln. Kein Disclaimer.'

export default function Scan() {
  const navigate = useNavigate()

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep]               = useState(1)
  const [panel, setPanel]             = useState('upload') // 'upload' | 'crop'
  const [mode, setMode]               = useState('ai')     // 'ai' | 'ocr'
  const [result, setResult]           = useState('empty')  // 'empty' | 'loading' | 'ai' | 'ocr'
  const [aiHtml, setAiHtml]           = useState('')
  const [ocrText, setOcrText]         = useState('')
  const [loadingText, setLoadingText] = useState('Analysiere Dokument...')
  const [errorMsg, setErrorMsg]       = useState('')
  const [zoom, setZoom]               = useState(1)
  const [blackouts, setBlackouts]     = useState([])
  const [selectedBk, setSelectedBk]  = useState(null)

  // PDF state
  const pdfDocRef      = useRef(null)
  const pdfPageRef     = useRef(1)
  const pdfTotalRef    = useRef(1)
  const [pdfPage, setPdfPage]   = useState(1)
  const [pdfTotal, setPdfTotal] = useState(1)
  const blackoutsByPageRef      = useRef({})

  const imgRef       = useRef(null)
  const cropInnerRef = useRef(null)
  const fileInputRef = useRef(null)
  const imgDataRef   = useRef(null) // current image data url

  // ── Steps ─────────────────────────────────────────────────────────────────
  function goStep(n) { setStep(n) }

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
          setPanel('crop')
          goStep(2)
        } catch(err) { alert('PDF konnte nicht geladen werden: ' + err.message) }
      }
      reader.readAsArrayBuffer(file)
    } else {
      pdfDocRef.current = null
      blackoutsByPageRef.current = {}
      const reader = new FileReader()
      reader.onload = (e) => {
        imgDataRef.current = e.target.result
        setBlackouts([])
        setSelectedBk(null)
        if (imgRef.current) imgRef.current.src = e.target.result
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
    setBlackouts(blackoutsByPageRef.current[pageNum]?.map(b=>({...b})) || [])
    setSelectedBk(null)
  }

  async function changePdfPage(dir) {
    blackoutsByPageRef.current[pdfPageRef.current] = blackouts.map(b=>({...b}))
    const next = Math.max(1, Math.min(pdfTotalRef.current, pdfPageRef.current + dir))
    if (next === pdfPageRef.current) return
    await renderPdfPage(next)
  }

  // ── Blackouts ──────────────────────────────────────────────────────────────
  function addBlackout() {
    const inner = cropInnerRef.current
    const img   = imgRef.current
    if (!inner || !img) return
    const cr = inner.getBoundingClientRect()
    const ir = img.getBoundingClientRect()
    const box = {
      id: Date.now(),
      x: Math.round(ir.left - cr.left + ir.width/2 - 80),
      y: Math.round(ir.top  - cr.top  + ir.height/4),
      w: 160, h: 40
    }
    setBlackouts(prev => [...prev, box])
    setSelectedBk(box.id)
  }

  function undoBlackout() {
    setBlackouts(prev => prev.slice(0,-1))
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
    const cr = cropInnerRef.current.getBoundingClientRect()
    const ox = e.clientX - cr.left - box.x
    const oy = e.clientY - cr.top  - box.y
    const onMove = (ev) => {
      box.x = ev.clientX - cr.left - ox
      box.y = ev.clientY - cr.top  - oy
      setBlackouts(prev => prev.map(b => b.id===box.id ? {...box} : b))
    }
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function startResizeBlackout(e, box) {
    e.stopPropagation(); e.preventDefault()
    const sx=e.clientX, sy=e.clientY, sw=box.w, sh=box.h
    const onMove = (ev) => {
      box.w = Math.max(20, sw + ev.clientX - sx)
      box.h = Math.max(10, sh + ev.clientY - sy)
      setBlackouts(prev => prev.map(b => b.id===box.id ? {...box} : b))
    }
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Get anonymized image ───────────────────────────────────────────────────
  function getAnonymizedDataUrl() {
    const img = imgRef.current
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const ir = img.getBoundingClientRect()
    const cr = cropInnerRef.current.getBoundingClientRect()
    const scaleX = canvas.width / ir.width
    const scaleY = canvas.height / ir.height
    ctx.fillStyle = '#000'
    blackouts.forEach(box => {
      const bx = (box.x - (ir.left - cr.left)) * scaleX
      const by = (box.y - (ir.top  - cr.top )) * scaleY
      ctx.fillRect(bx, by, box.w*scaleX, box.h*scaleY)
    })
    return canvas.toDataURL('image/jpeg', 0.92)
  }

  // ── OCR ────────────────────────────────────────────────────────────────────
  async function runTesseract(imageDataUrl, pageInfo) {
    setLoadingText(pageInfo ? `Seite ${pageInfo} — OCR wird gestartet...` : 'OCR wird gestartet...')
    const worker = await window.Tesseract.createWorker('deu', 1, {
      logger: m => {
        if (m.status === 'recognizing text')
          setLoadingText(`${pageInfo ? 'Seite '+pageInfo+' — ' : ''}Text wird erkannt... ${Math.round(m.progress*100)}%`)
      }
    })
    const { data: { text } } = await worker.recognize(imageDataUrl)
    await worker.terminate()
    return text.trim()
  }

  // ── AI Analysis ────────────────────────────────────────────────────────────
  async function runAIAnalysis(ocrText) {
    const apiKey = localStorage.getItem('openai_api_key') || ''
    if (!apiKey) throw new Error('Kein API-Key gespeichert. Bitte im Profil eintragen.')
    setLoadingText('KI analysiert Dokument...')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: 'Anonymisierter Dokumententext:\n\n' + ocrText }
        ]
      })
    })
    if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'API Fehler ' + response.status) }
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Leere Antwort vom Modell.')
    return content
  }

  // ── Proceed to analysis ────────────────────────────────────────────────────
  async function proceedToAnalysis() {
    if (pdfDocRef.current) blackoutsByPageRef.current[pdfPageRef.current] = blackouts.map(b=>({...b}))
    goStep(3)
    setResult('loading')
    setErrorMsg('')
    try {
      let fullOcrText = ''
      if (pdfDocRef.current && pdfTotalRef.current > 1) {
        for (let p = 1; p <= pdfTotalRef.current; p++) {
          setLoadingText(`Seite ${p}/${pdfTotalRef.current} - OCR läuft...`)
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
            const scaleX = canvas.width/ir.width, scaleY = canvas.height/ir.height
            ctx.fillStyle = '#000'
            pageBlackouts.forEach(box => ctx.fillRect((box.x-(ir.left-cr.left))*scaleX,(box.y-(ir.top-cr.top))*scaleY,box.w*scaleX,box.h*scaleY))
          }
          const pageText = await runTesseract(canvas.toDataURL('image/jpeg', 0.92), `${p}/${pdfTotalRef.current}`)
          if (pageText) fullOcrText += `[Seite ${p}]\n${pageText}\n\n`
        }
      } else {
        fullOcrText = await runTesseract(getAnonymizedDataUrl())
      }

      if (mode === 'ocr') {
        setOcrText(fullOcrText || 'Kein Text erkannt.')
        setResult('ocr')
      } else {
        if (!fullOcrText || fullOcrText.length < 10) throw new Error('Kein Text erkannt')
        const analysis = await runAIAnalysis(fullOcrText)
        setAiHtml(markdownToHtml(analysis))
        window._lastOcrText = fullOcrText
        setResult('ai')
      }
      goStep(4)
    } catch(err) {
      setErrorMsg(err.message)
      setResult('error')
      goStep(2)
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
    setPanel('upload'); setResult('empty')
    setZoom(1); setErrorMsg('')
    goStep(1)
  }

  // ── Copy / Download ────────────────────────────────────────────────────────
  function copyResult() {
    const text = mode==='ai' ? document.getElementById('aiSummaryDiv')?.innerText : ocrText
    if (text) navigator.clipboard.writeText(text)
  }
  function downloadResult() {
    const text = mode==='ai' ? document.getElementById('aiSummaryDiv')?.innerText : ocrText
    if (!text) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], {type:'text/plain;charset=utf-8'}))
    a.download = mode==='ai' ? 'KI-Analyse.txt' : 'OCR-Text.txt'
    a.click()
  }
  function sendToBrief() {
    const text = mode==='ai' ? document.getElementById('aiSummaryDiv')?.innerText : ocrText
    if (text) { localStorage.setItem('arvis_brief_input', text); navigate('/briefschreiber') }
  }

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
    <div className="page active" id="page-scan" style={{paddingBottom:20}}>

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Scan & Analyse</div>
          <div className="page-date">Dokument fotografieren · anonymisieren · analysieren</div>
        </div>
        <button className="btn-secondary" onClick={resetScan} style={{display:'flex',alignItems:'center',gap:6}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.45"/></svg>
          Zurücksetzen
        </button>
      </div>

      {/* Steps */}
      <div className="scan-steps">
        {['Dokument laden','Anonymisieren','Analysieren','Ergebnis'].map((label,i) => (
          <div key={i} style={{display:'flex',alignItems:'center'}}>
            <div className={`scan-step${step===i+1?' active':step>i+1?' done':''}`}>
              <div className="scan-step-num">{step>i+1?'✓':i+1}</div>
              <div className="scan-step-label">{label}</div>
            </div>
            {i<3&&<div className="scan-step-line"/>}
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="scan-layout">

        {/* LEFT */}
        <div className="scan-left">

          {/* Upload panel */}
          {panel==='upload'&&(
            <div className="scan-panel">
              <div className="scan-panel-header">
                <span className="scan-panel-title">Dokument laden</span>
                <span className="scan-panel-sub">Foto aufnehmen oder Datei hochladen</span>
              </div>
              <div className="scan-drop-zone" onClick={()=>fileInputRef.current.click()}
                onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag-over')}}
                onDragLeave={e=>e.currentTarget.classList.remove('drag-over')}
                onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f)loadFile(f)}}>
                <div className="scan-drop-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <div className="scan-drop-title">Datei hierher ziehen</div>
                <div className="scan-drop-sub">oder klicken zum Auswählen</div>
                <div className="scan-drop-formats">JPG · PNG · PDF · HEIC</div>
              </div>
              <input type="file" ref={fileInputRef} accept="image/*,application/pdf" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f)loadFile(f)}}/>
              <div style={{marginTop:'auto'}}>
                <div style={{textAlign:'center',marginTop:12}}><span style={{fontSize:12,color:'var(--text-3)'}}>oder</span></div>
                <div style={{margin:'0 20px'}}>
                  <button className="btn-action" onClick={()=>fileInputRef.current.click()} style={{width:'100%',marginTop:12,justifyContent:'center',display:'flex',boxSizing:'border-box',gap:6}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Foto aufnehmen / Datei wählen
                  </button>
                </div>
                <div className="scan-dsgvo-note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span>Keine Daten werden gespeichert — alles läuft lokal in Ihrem Browser</span>
                </div>
              </div>
            </div>
          )}

          {/* Crop panel */}
          {panel==='crop'&&(
            <div className="scan-panel">
              <div className="scan-panel-header">
                <span className="scan-panel-title">Anonymisieren</span>
                <span className="scan-panel-sub">Patientendaten mit dem Schwärzungs-Tool entfernen</span>
              </div>
              {/* Warning */}
              <div style={{display:'flex',alignItems:'center',gap:8,background:'#FEE2E2',border:'1px solid #FCA5A5',borderRadius:8,padding:'10px 14px',marginBottom:10}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{fontSize:13,fontWeight:600,color:'#DC2626'}}>Bitte alle Patientendaten schwärzen, bevor Sie fortfahren.</span>
              </div>
              {/* PDF nav */}
              {pdfDocRef.current&&(
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,justifyContent:'center'}}>
                  <button className="btn-secondary" style={{padding:'4px 12px',minWidth:0}} onClick={()=>changePdfPage(-1)}>←</button>
                  <span style={{fontSize:13,color:'var(--text-2)'}}>Seite {pdfPage} / {pdfTotal}</span>
                  <button className="btn-secondary" style={{padding:'4px 12px',minWidth:0}} onClick={()=>changePdfPage(1)}>→</button>
                </div>
              )}
              {/* Toolbar */}
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',borderBottom:'1px solid var(--border)',borderTop:'1px solid var(--border)'}}>
                <button className="btn-secondary" onClick={addBlackout} style={{height:32,padding:'0 12px',fontSize:12,display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                  Schwärzen
                </button>
                <button className="btn-secondary" onClick={undoBlackout} title="Rückgängig" style={{height:32,width:32,padding:0,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                </button>
                <div style={{display:'flex',gap:4,margin:'0 auto'}}>
                  <button className="btn-secondary" onClick={()=>setZoom(z=>Math.max(1,z-0.25))} style={{height:32,width:32,padding:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  </button>
                  <button className="btn-secondary" onClick={()=>setZoom(z=>Math.min(4,z+0.25))} style={{height:32,width:32,padding:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  </button>
                </div>
                <button className="btn-action" onClick={proceedToAnalysis} style={{height:32,padding:'0 14px',fontSize:12,display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
                  Weiter zur Analyse
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              {/* Document viewer */}
              <div style={{position:'relative',overflow:'hidden',background:'var(--bg-3)'}}>
                <div ref={cropInnerRef} style={{position:'relative',width:'100%',transformOrigin:'top left',transform:`scale(${zoom})`}}>
                  <img ref={imgRef} style={{width:'100%',display:'block',background:'var(--bg-2)'}} alt="" onClick={()=>setSelectedBk(null)}/>
                  {/* Blackout boxes */}
                  {blackouts.map(box=>(
                    <div key={box.id} onMouseDown={e=>startDragBlackout(e,box)}
                      style={{position:'absolute',background:'#000',boxSizing:'border-box',left:box.x,top:box.y,width:box.w,height:box.h,border:selectedBk===box.id?'2px solid #EF4444':'2px solid transparent',cursor:'move',minWidth:20,minHeight:10,userSelect:'none'}}>
                      {selectedBk===box.id&&(
                        <>
                          <div onMouseDown={e=>e.stopPropagation()} onClick={()=>deleteBlackout(box.id)}
                            style={{position:'absolute',top:-10,right:-10,width:20,height:20,borderRadius:'50%',background:'#EF4444',color:'white',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:20}}>×</div>
                          <div onMouseDown={e=>startResizeBlackout(e,box)}
                            style={{position:'absolute',bottom:-5,right:-5,width:14,height:14,background:'#EF4444',borderRadius:3,cursor:'se-resize',zIndex:20}}/>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="scan-right">
          {/* Mode selector */}
          <div className="scan-mode-card">
            <div className="scan-mode-title">Analysemodus</div>
            <div className="scan-mode-toggle">
              <div className={`scan-mode-btn${mode==='ai'?' active':''}`} onClick={()=>setMode('ai')}>
                <div className="scan-mode-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="15" x2="8" y2="17"/><line x1="12" y1="15" x2="12" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg>
                </div>
                <div>
                  <div className="scan-mode-name">KI-Analyse</div>
                  <div className="scan-mode-desc">Intelligente Zusammenfassung + Schlüsselpunkte</div>
                </div>
              </div>
              <div className={`scan-mode-btn${mode==='ocr'?' active':''}`} onClick={()=>setMode('ocr')}>
                <div className="scan-mode-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
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
            {(result==='empty')&&(
              <div className="scan-result-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <div style={{fontSize:14,color:'var(--text-3)',marginTop:12}}>Ergebnis erscheint hier</div>
                <div style={{fontSize:12,color:'var(--text-3)',marginTop:4}}>Laden Sie zuerst ein Dokument</div>
              </div>
            )}
            {/* Loading */}
            {result==='loading'&&(
              <div className="scan-result-loading">
                <div className="scan-spinner"/>
                <div style={{fontSize:14,color:'var(--text-2)',marginTop:16,fontWeight:600}}>{loadingText}</div>
                <div style={{fontSize:12,color:'var(--text-3)',marginTop:6}}>KI verarbeitet den Inhalt</div>
              </div>
            )}
            {/* Error */}
            {result==='error'&&(
              <div style={{textAlign:'center',color:'var(--text-3)',padding:24}}>
                <div style={{fontSize:13,marginTop:4,color:'#DC2626'}}>{errorMsg}</div>
              </div>
            )}
            {/* AI result */}
            {result==='ai'&&(
              <div>
                <div className="result-header">
                  <div className="result-badge ai">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/></svg>
                    KI-Analyse
                  </div>
                  <div className="result-actions">
                    <button className="result-action-btn" onClick={copyResult} title="Kopieren">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button className="result-action-btn" onClick={downloadResult} title="Herunterladen">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                  </div>
                </div>
                <div className="result-text" id="aiSummaryDiv" dangerouslySetInnerHTML={{__html:aiHtml}}/>
                <button className="btn-send-briefschreiber" onClick={sendToBrief} style={{marginTop:16}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  An Brief Schreiber senden
                </button>
              </div>
            )}
            {/* OCR result */}
            {result==='ocr'&&(
              <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
                <div className="result-header">
                  <div className="result-badge ocr">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    OCR Text
                  </div>
                  <div className="result-actions">
                    <button className="result-action-btn" onClick={copyResult} title="Kopieren">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button className="result-action-btn" onClick={downloadResult} title="Herunterladen">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                  </div>
                </div>
                <textarea className="ocr-textarea" value={ocrText} onChange={e=>setOcrText(e.target.value)} placeholder="OCR Text erscheint hier..."/>
                <button className="btn-send-briefschreiber" onClick={sendToBrief} style={{marginTop:12}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  An Brief Schreiber senden
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
