import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { logError } from '../utils/logger'

function renderWithBlackouts(src, bkOuts, containerWidth) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      if (bkOuts.length > 0) {
        const displayHeight = (img.naturalHeight / img.naturalWidth) * containerWidth
        const scaleX = img.naturalWidth / containerWidth
        const scaleY = img.naturalHeight / displayHeight
        ctx.fillStyle = '#000'
        bkOuts.forEach(box => {
          ctx.fillRect(box.x * scaleX, box.y * scaleY, box.w * scaleX, box.h * scaleY)
        })
      }
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = reject
    img.src = src
  })
}

export default function MobileScan() {
  const { token } = useParams()
  const [status, setStatus] = useState('ready')
  const [photos, setPhotos] = useState([])
  const [addingPhoto, setAddingPhoto] = useState(false)

  // Schwarzen state
  const [sIdx, setSIdx] = useState(0)
  const [blackouts, setBlackouts] = useState([])
  const [selectedBk, setSelectedBk] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const imgRef = useRef(null)
  const cropInnerRef = useRef(null)
  const viewerRef = useRef(null)
  const blackoutsByPhotoRef = useRef({})
  const lastPinchDistRef = useRef(null)
  const zoomRef = useRef(1)
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  // ── Validation du token QR au montage ─────────────────────────────────────
  // Rejette les tokens déjà utilisés (status !== 'waiting'), expirés, ou appartenant à un autre compte.
  useEffect(() => {
    if (!token) { setStatus('error'); return }
    Promise.all([
      supabase.from('scan_sessions').select('status, expires_at, user_id').eq('token', token).maybeSingle(),
      supabase.auth.getUser()
    ]).then(([{ data, error }, { data: { user } }]) => {
      if (error || !data) { setStatus('error'); return }
      if (data.status !== 'waiting') { setStatus('already_used'); return }
      if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return }
      if (user && user.id !== data.user_id) { setStatus('wrong_account'); return }
    })
  }, [token])

  // ── Pinch-to-zoom — non-passive, refs to avoid stale closures ─────────────
  useEffect(() => {
    if (status !== 'schwarzen') return
    const viewer = viewerRef.current
    if (!viewer) return
    const onStart = (e) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1]
        lastPinchDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      }
    }
    const onMove = (e) => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      const t1 = e.touches[0], t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      if (lastPinchDistRef.current === null) { lastPinchDistRef.current = dist; return }
      const newZ = Math.max(1, Math.min(4, zoomRef.current * (dist / lastPinchDistRef.current)))
      zoomRef.current = newZ
      setZoom(newZ)
      if (newZ === 1) { setPanX(0); setPanY(0) }
      lastPinchDistRef.current = dist
    }
    const onEnd = (e) => { if (e.touches.length < 2) lastPinchDistRef.current = null }
    viewer.addEventListener('touchstart', onStart, { passive: true })
    viewer.addEventListener('touchmove', onMove, { passive: false })
    viewer.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      viewer.removeEventListener('touchstart', onStart)
      viewer.removeEventListener('touchmove', onMove)
      viewer.removeEventListener('touchend', onEnd)
    }
  }, [status, sIdx])

  function handleImageLoad() {
    setZoom(1); zoomRef.current = 1
    setPanX(0); setPanY(0)
  }

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setAddingPhoto(true)
    setPhotos(prev => [...prev, { preview: URL.createObjectURL(file) }])
    setAddingPhoto(false)
  }

  function handleFinish() {
    blackoutsByPhotoRef.current = {}
    setSIdx(0)
    setBlackouts([])
    setSelectedBk(null)
    setZoom(1); zoomRef.current = 1; setPanX(0); setPanY(0)
    setStatus('schwarzen')
  }

  function handleBack() {
    blackoutsByPhotoRef.current = {}
    setSIdx(0)
    setBlackouts([])
    setSelectedBk(null)
    setZoom(1); zoomRef.current = 1; setPanX(0); setPanY(0)
    setStatus('ready')
  }

  // ── Pan — clamped exactly like Scan.js ────────────────────────────────────
  function startPan(e) {
    if (e.touches && e.touches.length !== 1) return
    if (zoom <= 1) return
    e.preventDefault()
    setIsDragging(true)
    const touch = e.touches ? e.touches[0] : e
    const sx = touch.clientX, sy = touch.clientY
    const spx = panX, spy = panY
    // Capture dimensions now (same as Scan.js)
    const cw = viewerRef.current?.offsetWidth || 0
    const ch = viewerRef.current?.offsetHeight || 0
    const onMove = (ev) => {
      const t = ev.touches ? ev.touches[0] : ev
      // Scan.js clamping: image cannot leave the container
      const minX = Math.min(0, cw - cw * zoom)
      const minY = Math.min(0, ch - ch * zoom)
      setPanX(Math.max(minX, Math.min(0, spx + (t.clientX - sx))))
      setPanY(Math.max(minY, Math.min(0, spy + (t.clientY - sy))))
    }
    const onUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)
  }

  // ── Blackout functions ────────────────────────────────────────────────────
  function addBlackout() {
    const img = imgRef.current
    if (!cropInnerRef.current || !img) return
    const box = { id: Date.now(), x: Math.round(img.offsetWidth / 2 - 80), y: Math.round(img.offsetHeight / 4), w: 160, h: 40 }
    setBlackouts(prev => [...prev, box])
    setSelectedBk(box.id)
  }
  function undoBlackout() { setBlackouts(prev => prev.slice(0, -1)); setSelectedBk(null) }
  function deleteBlackout(id) { setBlackouts(prev => prev.filter(b => b.id !== id)); setSelectedBk(null) }

  function startDragBlackout(e, box) {
    if (e.target !== e.currentTarget) return
    e.preventDefault(); e.stopPropagation()
    if (selectedBk !== box.id) { setSelectedBk(box.id); return }
    const cr = cropInnerRef.current.getBoundingClientRect()
    const touch = e.touches ? e.touches[0] : e
    const ox = (touch.clientX - cr.left) / zoom - box.x
    const oy = (touch.clientY - cr.top) / zoom - box.y
    const onMove = (ev) => {
      const t = ev.touches ? ev.touches[0] : ev
      const cw = cr.width / zoom
      const ch = cr.height / zoom
      box.x = Math.max(0, Math.min(cw - box.w, (t.clientX - cr.left) / zoom - ox))
      box.y = Math.max(0, Math.min(ch - box.h, (t.clientY - cr.top) / zoom - oy))
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
    const cr = cropInnerRef.current.getBoundingClientRect()
    const onMove = (ev) => {
      const t = ev.touches ? ev.touches[0] : ev
      const cw = cr.width / zoom
      const ch = cr.height / zoom
      box.w = Math.max(20, Math.min(cw - box.x, sw + (t.clientX - sx) / zoom))
      box.h = Math.max(10, Math.min(ch - box.y, sh + (t.clientY - sy) / zoom))
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

  // ── Page navigation ───────────────────────────────────────────────────────
  function goToPhoto(newIdx) {
    if (newIdx < 0 || newIdx >= photos.length) return
    blackoutsByPhotoRef.current[sIdx] = blackouts.map(b => ({ ...b }))
    setBlackouts(blackoutsByPhotoRef.current[newIdx]?.map(b => ({ ...b })) || [])
    setSelectedBk(null)
    setZoom(1); zoomRef.current = 1; setPanX(0); setPanY(0)
    setSIdx(newIdx)
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  async function handleSend() {
    blackoutsByPhotoRef.current[sIdx] = blackouts.map(b => ({ ...b }))
    const containerWidth = viewerRef.current?.offsetWidth || 400
    setStatus('uploading')
    try {
      // Re-vérification serveur : protège contre la réutilisation concurrente du token
      const { data: session } = await supabase
        .from('scan_sessions')
        .select('status, expires_at')
        .eq('token', token)
        .maybeSingle()
      if (!session || session.status !== 'waiting' || new Date(session.expires_at) < new Date()) {
        setStatus('already_used')
        return
      }
      const filenames = []
      for (let i = 0; i < photos.length; i++) {
        const bkOuts = blackoutsByPhotoRef.current[i] || []
        const dataUrl = await renderWithBlackouts(photos[i].preview, bkOuts, containerWidth)
        const filename = `scan_${token}_${Date.now()}_${i}.jpg`
        const blob = await (await fetch(dataUrl)).blob()
        const { error } = await supabase.storage
          .from('scan-images')
          .upload(filename, blob, { contentType: 'image/jpeg' })
        if (error) throw error
        filenames.push(filename)
      }
      await supabase
        .from('scan_sessions')
        .update({ status: 'completed', image_url: JSON.stringify(filenames) })
        .eq('token', token)
      setStatus('done')
    } catch (err) {
      logError('MobileScan.upload', err)
      setStatus('error')
    }
  }

  const btnSchwärzen = { height: 32, padding: '0 12px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', background: '#1C1C1E', color: 'white', border: 'none', borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }

  // ── Schwarzen screen ──────────────────────────────────────────────────────
  if (status === 'schwarzen') {
    return (
      // Outer: natural height, scrollable if photo is very tall
      <div style={{ minHeight: '100vh', background: 'var(--bg, #F6F4F1)', overflowY: 'auto', padding: '12px 16px 16px' }}>

        {/* Back link — outside the card */}
        <button onClick={handleBack} onTouchEnd={e => e.currentTarget.blur()} style={{ background: 'none', border: 'none', padding: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, fontWeight: 600, color: 'var(--text-2, #3A3A3C)', cursor: 'pointer' }}>
          ← Zurück
        </button>

        {/* Card: height = banner + toolbar + photo */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border, #E5E5EA)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Warning banner — border top + bottom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEE2E2', borderTop: '1px solid #FCA5A5', borderBottom: '1px solid #FCA5A5', padding: '10px 16px', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#DC2626' }}>Bitte alle Patientendaten schwärzen, bevor Sie fortfahren.</span>
          </div>

          {/* Page navigation — inside card */}
          {photos.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', justifyContent: 'center', borderBottom: '1px solid var(--border, #E5E5EA)', flexShrink: 0 }}>
              <button className="btn-secondary" style={{ padding: '4px 12px', minWidth: 0 }} onClick={() => goToPhoto(sIdx - 1)} disabled={sIdx === 0} onTouchEnd={e => e.currentTarget.blur()}>←</button>
              <span style={{ fontSize: 15, color: 'var(--text-2, #3A3A3C)' }}>Seite {sIdx + 1} / {photos.length}</span>
              <button className="btn-secondary" style={{ padding: '4px 12px', minWidth: 0 }} onClick={() => goToPhoto(sIdx + 1)} disabled={sIdx === photos.length - 1} onTouchEnd={e => e.currentTarget.blur()}>→</button>
            </div>
          )}

          {/* Toolbar — séparateur haut seulement si nav pages visible */}
          <div className="scan-viewer-toolbar" style={{ flexShrink: 0, position: 'relative', zIndex: 2, borderTop: photos.length > 1 ? undefined : 'none', flexWrap: 'nowrap' }}>
            <button onClick={addBlackout} style={btnSchwärzen} onTouchEnd={e => e.currentTarget.blur()}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>
              Schwärzen
            </button>
            <button className="btn-secondary" onClick={undoBlackout} title="Rückgängig" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onTouchEnd={e => e.currentTarget.blur()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
            </button>
            <div className="scan-toolbar-zoom" style={{ margin: 0 }}>
              <button className="btn-secondary" onClick={() => { const z = Math.max(1, zoom - 0.25); setZoom(z); zoomRef.current = z; if (z === 1) { setPanX(0); setPanY(0) } }} title="Verkleinern" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onTouchEnd={e => e.currentTarget.blur()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
              </button>
              <button className="btn-secondary" onClick={() => { setZoom(1); zoomRef.current = 1; setPanX(0); setPanY(0) }} title="Zurücksetzen" style={{ height: 32, minWidth: 42, padding: '0 6px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }} onTouchEnd={e => e.currentTarget.blur()}>
                {Math.round(zoom * 100)}%
              </button>
              <button className="btn-secondary" onClick={() => { const z = Math.min(4, zoom + 0.25); setZoom(z); zoomRef.current = z }} title="Vergrößern" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onTouchEnd={e => e.currentTarget.blur()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
              </button>
            </div>
            <button className="btn-action scan-toolbar-weiter" onClick={handleSend} onTouchEnd={e => e.currentTarget.blur()} style={{ marginLeft: 'auto' }}>
              Senden
            </button>
          </div>

          {/* Viewer — flex:1 fills remaining space, scrolls at zoom=1, clips at zoom>1 */}
          <div
            ref={viewerRef}
            onMouseDown={startPan}
            onTouchStart={startPan}
            onClick={(e) => { if (e.target === viewerRef.current || e.target === imgRef.current) setSelectedBk(null) }}
            style={{
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
              touchAction: zoom > 1 ? 'none' : 'pan-y'
            }}
          >
            <div
              ref={cropInnerRef}
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                transformOrigin: 'top left',
                transform: zoom > 1 ? `translate(${panX}px,${panY}px) scale(${zoom})` : 'none'
              }}
            >
              <img
                ref={imgRef}
                src={photos[sIdx]?.preview}
                alt={`Seite ${sIdx + 1}`}
                style={{ width: '100%', display: 'block', userSelect: 'none' }}
                draggable={false}
                onLoad={handleImageLoad}
                onClick={() => setSelectedBk(null)}
              />
              {blackouts.map(box => (
                <div key={box.id}
                  onMouseDown={e => startDragBlackout(e, box)}
                  onTouchStart={e => startDragBlackout(e, box)}
                  style={{ position: 'absolute', background: '#000', boxSizing: 'border-box', left: box.x, top: box.y, width: box.w, height: box.h, border: selectedBk === box.id ? '2px solid #EF4444' : '2px solid transparent', cursor: 'move', minWidth: 20, minHeight: 10, userSelect: 'none', touchAction: 'none' }}
                >
                  {selectedBk === box.id && (<>
                    <div onMouseDown={e => e.stopPropagation()} onTouchStart={e => { e.stopPropagation(); e.preventDefault() }} onClick={() => deleteBlackout(box.id)}
                      style={{ position: 'absolute', top: -10, right: -10, width: 20, height: 20, borderRadius: '50%', background: '#EF4444', color: 'white', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20 }}>×</div>
                    <div onMouseDown={e => startResizeBlackout(e, box)} onTouchStart={e => startResizeBlackout(e, box)}
                      style={{ position: 'absolute', bottom: -9, right: -9, width: 18, height: 18, background: '#EF4444', borderRadius: '50%', cursor: 'se-resize', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleY(-1)' }}><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                    </div>
                  </>)}
                </div>
              ))}
            </div>
          </div>

        </div>{/* end card */}
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, background: '#fff', gap: 20, paddingTop: 48 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: '#FDEAE0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D94B0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', textAlign: 'center' }}>Dokument fotografieren</div>

      {status === 'ready' && (<>
        {photos.length > 0 && (
          <div style={{ width: '100%', maxWidth: 360 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#8E8E93', marginBottom: 10 }}>{photos.length} Seite{photos.length > 1 ? 'n' : ''} hinzugefügt</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p.preview} alt={`Seite ${i + 1}`} style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #E5E5EA' }} />
                  <div style={{ position: 'absolute', top: 4, left: 4, background: '#D94B0A', color: 'white', borderRadius: 10, fontSize: 12, fontWeight: 700, padding: '1px 6px' }}>{i + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <label style={{ width: '100%', maxWidth: 360, boxSizing: 'border-box', padding: '14px 0', background: photos.length === 0 ? (addingPhoto ? '#E5E5EA' : '#D94B0A') : 'white', color: photos.length === 0 ? (addingPhoto ? '#8E8E93' : 'white') : '#D94B0A', border: photos.length === 0 ? '2px solid transparent' : '2px solid #D94B0A', borderRadius: 10, fontSize: 18, fontWeight: 600, textAlign: 'center', cursor: addingPhoto ? 'not-allowed' : 'pointer', display: 'block', opacity: photos.length > 0 && addingPhoto ? 0.6 : 1 }}>
          {addingPhoto ? 'Wird geladen…' : (<>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={photos.length === 0 ? 'white' : '#D94B0A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle' }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            {photos.length === 0 ? 'Foto aufnehmen' : 'Weitere Seite aufnehmen'}
          </>)}
          <input type="file" accept="image/jpeg, image/png, image/webp" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} disabled={addingPhoto} />
        </label>
        {photos.length > 0 && (
          <button onClick={handleFinish} disabled={addingPhoto} style={{ width: '100%', maxWidth: 360, boxSizing: 'border-box', padding: '14px 0', background: addingPhoto ? '#E5E5EA' : '#1C1C1E', color: addingPhoto ? '#8E8E93' : 'white', border: '2px solid transparent', borderRadius: 10, fontSize: 18, fontWeight: 600, textAlign: 'center', cursor: addingPhoto ? 'not-allowed' : 'pointer' }}>
            Weiter zur Anonymisierung
          </button>
        )}
        {!photos.length && <div style={{ fontSize: 15, color: '#8E8E93', textAlign: 'center' }}>Das Foto wird nach dem Schwärzen auf Ihren Computer übertragen</div>}
      </>)}

      {status === 'uploading' && <div style={{ textAlign: 'center', color: '#D94B0A', fontSize: 18, fontWeight: 600 }}>Wird übertragen…</div>}

      {status === 'done' && (<>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E' }}>{photos.length} Seite{photos.length > 1 ? 'n' : ''} übertragen!</div>
        <div style={{ fontSize: 16, color: '#8E8E93' }}>Sie können zu Ihrem Computer zurückkehren</div>
      </>)}

      {status === 'error' && <div style={{ color: '#EF4444', fontSize: 17, fontWeight: 600 }}>Fehler beim Übertragen. Bitte erneut versuchen.</div>}
      {status === 'already_used' && <div style={{ color: '#EF4444', fontSize: 17, fontWeight: 600 }}>Dieser QR-Code wurde bereits verwendet. Bitte einen neuen QR-Code scannen.</div>}
      {status === 'expired' && <div style={{ color: '#EF4444', fontSize: 17, fontWeight: 600 }}>Dieser QR-Code ist abgelaufen. Bitte einen neuen QR-Code scannen.</div>}
      {status === 'wrong_account' && <div style={{ color: '#EF4444', fontSize: 17, fontWeight: 600, textAlign: 'center' }}>Dieser QR-Code gehört zu einem anderen Konto. Bitte melden Sie sich mit dem richtigen Konto an oder scannen Sie einen neuen QR-Code.</div>}
    </div>
  )
}
