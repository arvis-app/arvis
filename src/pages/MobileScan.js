import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function MobileScan() {
  const { token } = useParams()
  const [status, setStatus] = useState('ready') // ready | uploading | done | error
  const [photos, setPhotos] = useState([]) // list of { filename, preview }
  const [uploading, setUploading] = useState(false)

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)

    try {
      const filename = `scan_${token}_${Date.now()}.jpg`
      const { error } = await supabase.storage
        .from('scan-images')
        .upload(filename, file, { contentType: file.type })

      if (error) throw error

      const preview = URL.createObjectURL(file)
      setPhotos(prev => [...prev, { filename, preview }])
    } catch (e) {
      console.error(e)
      setStatus('error')
    } finally {
      setUploading(false)
    }
  }

  async function handleFinish() {
    setStatus('uploading')
    try {
      const filenames = photos.map(p => p.filename)
      await supabase
        .from('scan_sessions')
        .update({
          status: 'completed',
          image_url: JSON.stringify(filenames)
        })
        .eq('token', token)

      setStatus('done')
    } catch (e) {
      console.error(e)
      setStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, background: '#fff', gap: 20, paddingTop: 48 }}>

      {/* Header */}
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
                  <div key={p.filename} style={{ position: 'relative' }}>
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
          <label style={{ width: '100%', maxWidth: 360, padding: '14px 0', background: uploading ? '#E5E5EA' : '#D94B0A', color: uploading ? '#8E8E93' : 'white', borderRadius: 10, fontSize: 16, fontWeight: 600, textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer', display: 'block' }}>
            {uploading ? (
              'Wird hochgeladen…'
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle' }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                {photos.length === 0 ? 'Foto aufnehmen' : 'Weitere Seite'}
              </>
            )}
            <input type="file" accept="image/jpeg, image/png, image/webp" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} disabled={uploading} />
          </label>

          {/* Finish button */}
          {photos.length > 0 && (
            <button
              onClick={handleFinish}
              disabled={uploading}
              style={{ width: '100%', maxWidth: 360, padding: '14px 0', background: 'white', color: '#D94B0A', border: '2px solid #D94B0A', borderRadius: 10, fontSize: 16, fontWeight: 600, textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer' }}
            >
              Fertig — {photos.length} Seite{photos.length > 1 ? 'n' : ''} senden
            </button>
          )}

          {!photos.length && (
            <div style={{ fontSize: 13, color: '#8E8E93', textAlign: 'center' }}>
              Das Foto wird direkt auf Ihren Computer übertragen
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
