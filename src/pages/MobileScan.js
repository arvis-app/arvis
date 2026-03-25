import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function MobileScan() {
  const { token } = useParams()
  const [status, setStatus] = useState('ready') // ready | schwarzen | uploading | done | error
  const [photos, setPhotos] = useState([]) // { preview: objectURL }
  const [addingPhoto, setAddingPhoto] = useState(false)

  // Schwarzen state
  const [sIdx, setSIdx] = useState(0)
  const [blackouts, setBlackouts] = useState([])
  const [selectedBk, setSelectedBk] = useState(null)
  const imgRef = useRef(null)
  const containerRef = useRef(null)

  // ── Photo capture (local only, no upload yet) ─────────────────────────────
  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setAddingPhoto(true)
    const preview = URL.createObjectURL(file)
    setPhotos(prev => [...prev, { preview }])
    setAddingPhoto(false)
  }

  // Start Schwarzen flow
  function handleFinish() {
    setSIdx(0)
    setBlackouts([])
    setSelectedBk(null)
    setStatus('schwarzen')
  }

  // ── Blackout functions ────────────────────────────────────────────────────
  function addBlackout() {
    const img = imgRef.current
    if (!img) return
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
    const cr = containerRef.current.getBoundingClientRect()
    const touch = e.touches ? e.touches[0] : e
    const ox = touch.clientX - cr.left - box.x
    const oy = touch.clientY - cr.top - box.y
    const onMove = (ev) => {
      const t = ev.touches ? ev.touches[0] : ev
      box.x = t.clientX - cr.left - ox
      box.y = t.clientY - cr.top - oy
      setBlackouts(prev => prev.map(b => b.id === box.id ? { ...box } : b))
    }
    const onUp = () => {
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

  function startResizeBlackout(e, box) {
    e.stopPropagation(); e.preventDefault()
    const touch = e.touches ? e.touches[0] : e
    const sx = touch.clientX, sy = touch.clientY, sw = box.w, sh = box.h
    const onMove = (ev) => {
      const t = ev.touches ? ev.touches[0] : ev
      box.w = Math.max(20, sw + (t.clientX - sx))
      box.h = Math.max(10, sh + (t.clientY - sy))
      setBlackouts(prev => prev.map(b => b.id === box.id ? { ...box } : b))
    }
    const onUp = () => {
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

  // Apply blackouts on canvas and return anonymized data URL
  function getAnonymizedDataUrl() {
    const img = imgRef.current
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const scaleX = canvas.width / img.offsetWidth
    const scaleY = canvas.height / img.offsetHeight
    ctx.fillStyle = '#000'
    blackouts.forEach(box => {
      ctx.fillRect(box.x * scaleX, box.y * scaleY, box.w * scaleX, box.h * scaleY)
    })
    return canvas.toDataURL('image/jpeg', 0.92)
  }

  // Confirm current page, move to next or upload all
  async function handleNextOrSend() {
    const anonymizedDataUrl = getAnonymizedDataUrl()
    const updated = photos.map((p, i) =>
      i === sIdx ? { ...p, anonymizedDataUrl } : p
    )

    if (sIdx < photos.length - 1) {
      setPhotos(updated)
      setSIdx(sIdx + 1)
      setBlackouts([])
      setSelectedBk(null)
    } else {
      await uploadAndSend(updated)
    }
  }

  async function uploadAndSend(finalPhotos) {
    setStatus('uploading')
    try {
      const filenames = []
      for (let i = 0; i < finalPhotos.length; i++) {
        const filename = `scan_${token}_${Date.now()}_${i}.jpg`
        const blob = await (await fetch(finalPhotos[i].anonymizedDataUrl)).blob()
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
      console.error(err)
      setStatus('error')
    }
  }

  // ── Schwarzen screen ──────────────────────────────────────────────────────
  if (status === 'schwarzen') {
    const currentPhoto = photos[sIdx]
    const isLast = sIdx === photos.length - 1

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E5EA', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>
            Schwärzen — Seite {sIdx + 1} / {photos.length}
          </div>
          <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>
            Patientendaten vor dem Senden unkenntlich machen
          </div>
        </div>

        {/* Warning */}
        <div style={{ margin: '10px 16px 0', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, fontSize: 13, color: '#DC2626', fontWeight: 500, flexShrink: 0 }}>
          Alle Patientendaten schwärzen (Name, Geburtsdatum, Adresse) — erst dann weiter!
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', flexShrink: 0 }}>
          <button
            onClick={addBlackout}
            style={{ padding: '9px 16px', background: '#D94B0A', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            + Schwärzen
          </button>
          {blackouts.length > 0 && (
            <button
              onClick={undoBlackout}
              style={{ padding: '9px 16px', background: 'white', color: '#D94B0A', border: '2px solid #D94B0A', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Rückgängig
            </button>
          )}
        </div>

        {/* Image with blackout overlay */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 16px', WebkitOverflowScrolling: 'touch' }}>
          <div
            ref={containerRef}
            style={{ position: 'relative', display: 'inline-block', touchAction: blackouts.length > 0 ? 'none' : 'pan-y' }}
          >
            <img
              ref={imgRef}
              src={currentPhoto.preview}
              alt={`Seite ${sIdx + 1}`}
              style={{ maxWidth: '100%', display: 'block', userSelect: 'none' }}
              draggable={false}
            />
            {blackouts.map(box => (
              <div
                key={box.id}
                onMouseDown={e => startDragBlackout(e, box)}
                onTouchStart={e => startDragBlackout(e, box)}
                style={{
                  position: 'absolute',
                  left: box.x, top: box.y, width: box.w, height: box.h,
                  background: '#000',
                  border: selectedBk === box.id ? '2px solid #EF4444' : '2px solid transparent',
                  boxSizing: 'border-box',
                  cursor: 'move',
                  touchAction: 'none'
                }}
              >
                {selectedBk === box.id && (
                  <>
                    <button
                      onMouseDown={e => { e.stopPropagation(); deleteBlackout(box.id) }}
                      onTouchStart={e => { e.stopPropagation(); e.preventDefault(); deleteBlackout(box.id) }}
                      style={{ position: 'absolute', top: -10, right: -10, width: 22, height: 22, borderRadius: '50%', background: '#EF4444', border: 'none', color: 'white', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}
                    >×</button>
                    <div
                      onMouseDown={e => startResizeBlackout(e, box)}
                      onTouchStart={e => startResizeBlackout(e, box)}
                      style={{ position: 'absolute', bottom: -6, right: -6, width: 14, height: 14, background: '#EF4444', borderRadius: 3, cursor: 'se-resize', touchAction: 'none' }}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Proceed button */}
        <div style={{ padding: '12px 16px', flexShrink: 0, borderTop: '1px solid #E5E5EA' }}>
          <button
            onClick={handleNextOrSend}
            style={{ width: '100%', padding: '14px 0', background: '#D94B0A', color: 'white', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
          >
            {isLast
              ? `Senden — ${photos.length} Seite${photos.length > 1 ? 'n' : ''}`
              : `Weiter — Seite ${sIdx + 2} / ${photos.length}`}
          </button>
        </div>
      </div>
    )
  }

  // ── Main render (ready / uploading / done / error) ────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, background: '#fff', gap: 20, paddingTop: 48 }}>

      {/* Header icon + title */}
      <div style={{ width: 64, height: 64, borderRadius: 16, background: '#FDEAE0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D94B0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', textAlign: 'center' }}>Dokument fotografieren</div>

      {status === 'ready' && (
        <>
          {/* Photo thumbnails */}
          {photos.length > 0 && (
            <div style={{ width: '100%', maxWidth: 360 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93', marginBottom: 10 }}>
                {photos.length} Seite{photos.length > 1 ? 'n' : ''} hinzugefügt
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img
                      src={p.preview}
                      alt={`Seite ${i + 1}`}
                      style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #E5E5EA' }}
                    />
                    <div style={{ position: 'absolute', top: 4, left: 4, background: '#D94B0A', color: 'white', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Take photo button */}
          <label style={{ width: '100%', maxWidth: 360, padding: '14px 0', background: addingPhoto ? '#E5E5EA' : '#D94B0A', color: addingPhoto ? '#8E8E93' : 'white', borderRadius: 10, fontSize: 16, fontWeight: 600, textAlign: 'center', cursor: addingPhoto ? 'not-allowed' : 'pointer', display: 'block' }}>
            {addingPhoto ? (
              'Wird geladen…'
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle' }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                {photos.length === 0 ? 'Foto aufnehmen' : 'Weitere Seite'}
              </>
            )}
            <input type="file" accept="image/jpeg, image/png, image/webp" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} disabled={addingPhoto} />
          </label>

          {/* Finish button — goes to Schwarzen */}
          {photos.length > 0 && (
            <button
              onClick={handleFinish}
              disabled={addingPhoto}
              style={{ width: '100%', maxWidth: 360, padding: '14px 0', background: 'white', color: '#D94B0A', border: '2px solid #D94B0A', borderRadius: 10, fontSize: 16, fontWeight: 600, textAlign: 'center', cursor: addingPhoto ? 'not-allowed' : 'pointer' }}
            >
              Fertig — {photos.length} Seite{photos.length > 1 ? 'n' : ''} schwärzen & senden
            </button>
          )}

          {!photos.length && (
            <div style={{ fontSize: 13, color: '#8E8E93', textAlign: 'center' }}>
              Das Foto wird nach dem Schwärzen auf Ihren Computer übertragen
            </div>
          )}
        </>
      )}

      {status === 'uploading' && (
        <div style={{ textAlign: 'center', color: '#D94B0A', fontSize: 16, fontWeight: 600 }}>Wird übertragen…</div>
      )}

      {status === 'done' && (
        <>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>{photos.length} Seite{photos.length > 1 ? 'n' : ''} übertragen!</div>
          <div style={{ fontSize: 14, color: '#8E8E93' }}>Sie können zu Ihrem Computer zurückkehren</div>
        </>
      )}

      {status === 'error' && (
        <div style={{ color: '#EF4444', fontSize: 15, fontWeight: 600 }}>Fehler beim Übertragen. Bitte erneut versuchen.</div>
      )}
    </div>
  )
}
