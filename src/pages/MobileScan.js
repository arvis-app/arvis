import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function MobileScan() {
  const { token } = useParams()
  const [status, setStatus] = useState('ready') // ready | uploading | done | error

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setStatus('uploading')

    try {
      // Upload dans Supabase Storage
      const filename = `scan_${token}_${Date.now()}.jpg`
      const { data, error } = await supabase.storage
        .from('scan-images')
        .upload(filename, file, { contentType: file.type })
      
      if (error) throw error

      // On enregistre simplement le nom de fichier au lieu d'une URL publique
      // Le PC, qui est authentifié, le téléchargera de manière sécurisée
      await supabase
        .from('scan_sessions')
        .update({ 
          status: 'completed', 
          image_url: filename 
        })
        .eq('token', token)

      setStatus('done')
    } catch(e) {
      console.error(e)
      setStatus('error')
    }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,background:'#fff',gap:24}}>
      {status === 'ready' && (
        <>
          <div style={{width:64,height:64,borderRadius:16,background:'#FDEAE0',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D94B0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <div style={{fontSize:20,fontWeight:700,color:'#1C1C1E',textAlign:'center'}}>Dokument fotografieren</div>
          <div style={{fontSize:14,color:'#8E8E93',textAlign:'center'}}>Das Foto wird direkt auf Ihren Computer übertragen</div>
          <label style={{width:'100%',maxWidth:320,padding:'14px 0',background:'#D94B0A',color:'white',borderRadius:10,fontSize:16,fontWeight:600,textAlign:'center',cursor:'pointer',display:'block'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8,verticalAlign:'middle'}}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Foto aufnehmen
            <input type="file" accept="image/jpeg, image/png, image/webp" capture="environment" onChange={handlePhoto} style={{display:'none'}}/>
          </label>
        </>
      )}
      {status === 'uploading' && (
        <div style={{textAlign:'center',color:'#D94B0A',fontSize:16,fontWeight:600}}>Wird übertragen…</div>
      )}
      {status === 'done' && (
        <>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
          <div style={{fontSize:18,fontWeight:700,color:'#1C1C1E'}}>Foto übertragen!</div>
          <div style={{fontSize:14,color:'#8E8E93'}}>Sie können zu Ihrem Computer zurückkehren</div>
        </>
      )}
      {status === 'error' && (
        <div style={{color:'#EF4444',fontSize:15,fontWeight:600}}>Fehler beim Übertragen. Bitte erneut versuchen.</div>
      )}
    </div>
  )
}
