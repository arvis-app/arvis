import { useState, useEffect, useRef, useCallback } from 'react'
import { downloadAsWord } from '../utils/downloadWord'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'

function genId() { return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,7) }
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

// Sanitise le HTML stocké en base avant injection dans innerHTML.
// Supprime <script>, <iframe>, <object>, <embed>, et tous les attributs
// event-handler (onclick, onerror, onload…) ainsi que les href javascript:.
function sanitizeHtml(html) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll('script,style,iframe,object,embed,link,base').forEach(el => el.remove())
  tmp.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on')) { el.removeAttribute(attr.name); continue }
      if (attr.name === 'href' && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name)
      if (attr.name === 'src'  && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name)
    }
  })
  return tmp.innerHTML
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function fetchData(userId) {
  const [{ data: folders }, { data: notes }] = await Promise.all([
    supabase.from('folders').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('notes').select('*').eq('user_id', userId).order('modified_at', { ascending: false })
  ])
  return {
    folders: (folders || []).map(f => ({ ...f, parentId: f.parent_id })),
    notes:   (notes   || []).map(n => ({ ...n, folderId: n.folder_id, modified: new Date(n.modified_at||n.created_at).getTime() }))
  }
}

// Migration unique depuis localStorage
async function migrateDateienLocalStorage(userId) {
  if (localStorage.getItem('arvis_dateien_migrated_v1')) return
  try {
    const local = JSON.parse(localStorage.getItem('dateien_data') || '{"folders":[],"notes":[]}')
    if (local.folders?.length) {
      await supabase.from('folders').insert(local.folders.map(f => ({
        id: f.id, user_id: userId, name: f.name, parent_id: f.parentId || null
      })))
    }
    const textNotes = (local.notes || []).filter(n => !n.dataUrl)
    if (textNotes.length) {
      await supabase.from('notes').insert(textNotes.map(n => ({
        id: n.id, user_id: userId, folder_id: n.folderId || null,
        title: n.title || 'Ohne Titel', content: n.content || '',
        file_type: n.fileType || 'note',
        modified_at: n.modified ? new Date(n.modified).toISOString() : new Date().toISOString()
      })))
    }
    localStorage.setItem('arvis_dateien_migrated_v1', '1')
  } catch (e) { console.error('Dateien migration error:', e) }
}

const ICO = {
  folder: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  note:   <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  pdf:    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D63B3B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>,
  empty:  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  rename: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  del:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  folderSm: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  noteSm:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
}

function getNoteType(note) {
  if (note.fileType) return note.fileType
  if (note.dataUrl?.startsWith('data:image')) return 'image'
  if (note.dataUrl?.startsWith('data:application/pdf')) return 'pdf'
  const ext = (note.title||'').match(/\.([^.]+)$/)?.[1]?.toLowerCase() || ''
  if (/^(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(ext)) return 'image'
  if (ext==='pdf') return 'pdf'
  return 'note'
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ opts, onOk, onCancel }) {
  if (!opts) return null
  return (
    <div style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'var(--card)',borderRadius: 8,padding:24,width:'100%',maxWidth:360,margin:'0 16px',boxShadow:'0 8px 40px rgba(0,0,0,0.18)',display:'flex',flexDirection:'column',gap:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius: 6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:'#D63B3B'}} dangerouslySetInnerHTML={{__html:opts.icon||''}}/>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:'var(--text)'}}>{opts.title}</div>
            <div style={{fontSize:15,color:'var(--text-2)',marginTop:3}}>{opts.msg}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn-secondary" onClick={onCancel}>Abbrechen</button>
          <button className="btn-action" onClick={onOk} style={{background:'#D63B3B'}}>Löschen</button>
        </div>
      </div>
    </div>
  )
}

// ── Note Editor Panel ──────────────────────────────────────────────────────────
function NoteEditor({ note, folderId, onSave, onClose }) {
  const [title, setTitle]   = useState(note?.title || '')
  const [saved, setSaved]   = useState('Automatisch gespeichert')
  const editorRef           = useRef(null)
  const timerRef            = useRef(null)
  const noteIdRef           = useRef(note?.id || null)

  useEffect(() => {
    if (editorRef.current && note?.content) {
      editorRef.current.innerHTML = sanitizeHtml(note.content)
    }
    editorRef.current?.focus()
  }, [])

  function autoSave(newTitle, newContent) {
    clearTimeout(timerRef.current)
    setSaved('...')
    timerRef.current = setTimeout(async () => {
      try {
        const t = newTitle.trim() || 'Ohne Titel'
        const c = newContent || editorRef.current?.innerHTML || ''
        const now = new Date().toISOString()
        if (noteIdRef.current) {
          const { error } = await supabase.from('notes').update({ title: t, content: c, modified_at: now }).eq('id', noteIdRef.current)
          if (error) throw error
        } else {
          const { data: inserted, error } = await supabase.from('notes').insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            folder_id: folderId || null, title: t, content: c,
            file_type: 'note', modified_at: now
          }).select().single()
          if (error) throw error
          if (inserted) noteIdRef.current = inserted.id
        }
        onSave()
        setSaved('✓ ' + new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}))
      } catch (e) {
        setSaved('⚠ Fehler beim Speichern')
      }
    }, 600)
  }

  function format(cmd) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, null)
    autoSave(title, editorRef.current?.innerHTML)
  }

  async function downloadDoc() {
    const t = title.trim() || 'Notiz'
    const text = editorRef.current?.innerText || ''
    await downloadAsWord(text, t)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 10px',borderBottom:'1px solid var(--border)'}}>
        <input value={title} onChange={e=>{setTitle(e.target.value);autoSave(e.target.value,'')}}
          placeholder="Titel..."
          style={{flex:1,border:'none',background:'transparent',fontSize:18,fontWeight:700,color:'var(--text)',outline:'none',fontFamily:'Bricolage Grotesque,sans-serif'}}/>
        <div style={{display:'flex',gap:6}}>
          <button onClick={downloadDoc} style={{fontSize:14,height:32,padding:'0 10px',display:'flex',alignItems:'center',gap:5,background:'#2B579A',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:600}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Word
          </button>
          <button className="result-action-btn" onClick={onClose}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
        {[['bold','B',true],['italic','I',false],['underline','U',false]].map(([cmd,label,isBold])=>(
          <button key={cmd} onClick={()=>format(cmd)}
            style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',fontWeight:isBold?700:400,fontStyle:cmd==='italic'?'italic':'normal',textDecoration:cmd==='underline'?'underline':'none',fontSize:15,fontFamily:'serif'}}>
            {label}
          </button>
        ))}
        <span style={{width:1,height:20,background:'var(--border)',margin:'0 4px'}}/>
        <button onClick={()=>format('insertUnorderedList')} style={{padding:'0 8px',height:28,borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',fontSize:14}}>• Liste</button>
        <button onClick={()=>format('insertOrderedList')} style={{padding:'0 8px',height:28,borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',fontSize:14}}>1. Liste</button>
        <span style={{marginLeft:'auto',fontSize:13,color:'var(--text-3)'}}>{saved}</span>
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning
        onInput={()=>autoSave(title, editorRef.current?.innerHTML)}
        style={{flex:1,overflowY:'auto',padding:16,outline:'none',fontSize:16,lineHeight:1.7,color:'var(--text)',fontFamily:'DM Sans,sans-serif'}}
        data-placeholder="Schreiben..."/>
    </div>
  )
}

// ── Main Dateien ───────────────────────────────────────────────────────────────
export default function Dateien() {
  const { user } = useAuth()
  const [data, setData]             = useState({ folders: [], notes: [] })
  const [currentFolder, setCurrentFolder] = useState(null)
  const [view, setView]             = useState('grid')
  const [search, setSearch]         = useState('')
  const [detail, setDetail]         = useState(null) // {type:'note'|'image'|'pdf', note}
  const [confirm, setConfirm]       = useState(null)
  const [folderModal, setFolderModal] = useState(false)
  const [renameModal, setRenameModal] = useState(null) // {id, name}
  const [newFolderName, setNewFolderName] = useState('')
  const [renameName, setRenameName] = useState('')
  const [toast, setToast]           = useState('')
  const [imgPanX, setImgPanX]       = useState(0)
  const [imgPanY, setImgPanY]       = useState(0)
  const [imgZoom, setImgZoom]       = useState(1)
  const fileInputRef                = useRef(null)

  async function refresh() {
    if (!user) return
    const d = await fetchData(user.id)
    setData(d)
  }
  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),2200) }

  useEffect(() => {
    if (!user) return
    migrateDateienLocalStorage(user.id).then(() => refresh())
  }, [user]) // eslint-disable-line

  useEffect(() => { setImgPanX(0); setImgPanY(0); setImgZoom(1) }, [detail])

  function handleImgTouch(e) {
    if (e.touches.length === 2) {
      e.preventDefault()
      const t1 = e.touches[0], t2 = e.touches[1]
      const startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const startZoom = imgZoom
      const onMove = (ev) => {
        if (ev.touches.length !== 2) return
        ev.preventDefault()
        const dist = Math.hypot(ev.touches[1].clientX - ev.touches[0].clientX, ev.touches[1].clientY - ev.touches[0].clientY)
        setImgZoom(Math.max(1, Math.min(5, startZoom * dist / startDist)))
      }
      const onEnd = () => { document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd) }
      document.addEventListener('touchmove', onMove, { passive: false })
      document.addEventListener('touchend', onEnd)
    } else if (e.touches.length === 1 && imgZoom > 1) {
      e.preventDefault()
      const t = e.touches[0]
      const sx = t.clientX, sy = t.clientY
      const startX = imgPanX, startY = imgPanY
      const onMove = (ev) => {
        if (ev.touches.length !== 1) return
        ev.preventDefault()
        setImgPanX(startX + (ev.touches[0].clientX - sx))
        setImgPanY(startY + (ev.touches[0].clientY - sy))
      }
      const onEnd = () => { document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd) }
      document.addEventListener('touchmove', onMove, { passive: false })
      document.addEventListener('touchend', onEnd)
    }
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  const q = search.toLowerCase().trim()
  const folders = q
    ? data.folders.filter(f=>f.name.toLowerCase().includes(q))
    : data.folders.filter(f=>(f.parentId||null)===currentFolder)
  const notes = q
    ? data.notes.filter(n=>n.title?.toLowerCase().includes(q)||(n.content||'').replace(/<[^>]*>/g,'').toLowerCase().includes(q))
    : data.notes.filter(n=>(n.folderId||null)===currentFolder)
  folders.sort((a,b)=>a.name.localeCompare(b.name,'de'))
  notes.sort((a,b)=>(b.modified||b.created||0)-(a.modified||a.created||0))

  // ── Breadcrumb ─────────────────────────────────────────────────────────────
  const path = []
  let id = currentFolder
  while (id) {
    const f = data.folders.find(x=>x.id===id)
    if (!f) break
    path.unshift(f); id = f.parentId||null
  }

  // ── Folder ops ─────────────────────────────────────────────────────────────
  async function createFolder() {
    const name = newFolderName.trim(); if (!name) return
    await supabase.from('folders').insert({ user_id: user.id, name, parent_id: currentFolder || null })
    await refresh(); setFolderModal(false); setNewFolderName('')
    showToast('Ordner erstellt')
  }

  async function confirmRename() {
    const name = renameName.trim(); if (!name || !renameModal) return
    await supabase.from('folders').update({ name }).eq('id', renameModal.id)
    await refresh(); setRenameModal(null); setRenameName('')
    showToast('Umbenannt')
  }

  function deleteItem(id, type) {
    setConfirm({
      title: type==='folder' ? 'Ordner löschen' : 'Datei löschen',
      msg:   type==='folder' ? 'Ordner und Inhalt werden unwiderruflich gelöscht.' : 'Diese Datei wird unwiderruflich gelöscht.',
      icon:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>',
      onOk: async () => {
        if (type==='folder') {
          // Supprimer récursivement (Supabase ON DELETE CASCADE si configuré, sinon manuel)
          const toDelete = [id]
          let i = 0
          while (i < toDelete.length) {
            const fid = toDelete[i++]
            data.folders.filter(f => f.parentId === fid).forEach(f => toDelete.push(f.id))
          }
          await supabase.from('notes').delete().in('folder_id', toDelete)
          await supabase.from('folders').delete().in('id', toDelete)
        } else {
          await supabase.from('notes').delete().eq('id', id)
          if (detail?.note?.id === id) setDetail(null)
        }
        await refresh(); setConfirm(null); showToast('Gelöscht')
      }
    })
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  function handleUpload(files) {
    if (!files?.length) return
    let done = 0; const total = files.length
    Array.from(files).forEach(async file => {
      const ext = (file.name.match(/\.([^.]+)$/)||['',''])[1].toLowerCase()
      const isImage = /^(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(ext)||file.type.startsWith('image/')
      const isPDF   = ext==='pdf'||file.type==='application/pdf'
      const isText  = /^(txt|md|csv|json|xml|html|htm|js|css|py)$/.test(ext)||(!isImage&&!isPDF&&file.type.startsWith('text/'))

      const insertNote = async (entry) => {
        await supabase.from('notes').insert({
          user_id: user.id, folder_id: currentFolder || null,
          title: file.name, file_type: entry.fileType || 'other',
          content: entry.content || '', storage_path: entry.storage_path || null,
          modified_at: new Date().toISOString()
        })
        if (++done === total) { await refresh(); showToast(`${total} ${total===1?'Datei':'Dateien'} hochgeladen`) }
      }

      if (isImage || isPDF) {
        // Stocker dans Supabase Storage
        const path = `${user.id}/${Date.now()}_${file.name}`
        const { error } = await supabase.storage.from('user-files').upload(path, file)
        if (!error) {
          const { data: urlData } = supabase.storage.from('user-files').getPublicUrl(path)
          await insertNote({ fileType: isImage ? 'image' : 'pdf', storage_path: path, content: urlData?.publicUrl || '' })
        } else {
          // Fallback: stocker en base64 si Storage échoue
          const reader = new FileReader()
          reader.onload = async e => await insertNote({ fileType: isImage ? 'image' : 'pdf', content: e.target.result })
          reader.readAsDataURL(file)
        }
      } else if (isText) {
        const reader = new FileReader()
        reader.onload = async e => await insertNote({ fileType: 'text', content: `<pre style="white-space:pre-wrap;font-size:13px;">${escHtml(e.target.result)}</pre>` })
        reader.readAsText(file)
      } else {
        await insertNote({ fileType: 'other', content: '' })
      }
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function openNote(note) {
    const t = getNoteType(note)
    if (t==='image'||t==='pdf') setDetail({type:t, note})
    else setDetail({type:'note', note})
  }

  function getFileUrl(note) {
    if (note?.storage_path) {
      const { data } = supabase.storage.from('user-files').getPublicUrl(note.storage_path)
      return data?.publicUrl || note.content || ''
    }
    return note?.dataUrl || note?.content || ''
  }

  function downloadFile(note) {
    const url = getFileUrl(note)
    if (!url) return
    const a = document.createElement('a')
    a.href = url; a.download = note.title||'download'; a.click()
  }

  const isEmpty = !folders.length && !notes.length

  return (
    <div className="page active" onDragOver={e=>{e.preventDefault()}} onDrop={e=>{e.preventDefault();handleUpload(e.dataTransfer.files)}}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Meine Dateien</div>
          <div className="page-date">Persönlicher Dokumentenspeicher</div>
        </div>
        <div className="dateien-header-actions" style={{display:'flex',gap:8}}>
          <button className="btn-secondary" onClick={()=>setFolderModal(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
            Ordner
          </button>
          <button className="btn-secondary" onClick={()=>setDetail({type:'note',note:null})}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Notiz
          </button>
          <button className="btn-action" onClick={()=>fileInputRef.current?.click()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Hochladen
          </button>
          <input type="file" id="dateienFileInput" ref={fileInputRef} style={{display:'none'}} multiple onChange={e=>handleUpload(e.target.files)}/>
        </div>
      </div>


      <div>
        {/* Search + view toggle */}
        <div className="dateien-toolbar">
          <div className="dateien-search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Datei oder Notiz suchen..." id="dateienSearch" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="dateien-view-toggle">
            <button className={`dateien-view-btn${view==='grid'?' active':''}`} id="dateienViewGrid" onClick={()=>setView('grid')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </button>
            <button className={`dateien-view-btn${view==='list'?' active':''}`} id="dateienViewList" onClick={()=>setView('list')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="dateien-breadcrumb" id="dateienBreadcrumb">
          <span className={`dateien-bread-item${!currentFolder?' active':''}`} onClick={()=>{setCurrentFolder(null);setDetail(null)}} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:16,fontWeight:600}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            Meine Dateien
          </span>
          {path.map(f=>(
            <span key={f.id} style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{color:'var(--text-muted)',margin:'0 2px'}}>›</span>
              <span className="dateien-bread-item" onClick={()=>{setCurrentFolder(f.id);setDetail(null)}} style={{cursor:'pointer'}}>{f.name}</span>
            </span>
          ))}
        </div>

        {/* Main layout */}
        <div className={`dateien-layout${detail ? ' with-detail' : ''}`}>
          {/* File grid/list */}
          <div className="dateien-main">
            {isEmpty ? (
              <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-muted)',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                {ICO.empty}
                <div style={{fontSize:16}}>{q ? 'Keine Ergebnisse' : 'Leerer Ordner'}</div>
                {!q && <div style={{fontSize:14,color:'var(--text-muted)'}}>Notiz erstellen oder Datei hochladen</div>}
              </div>
            ) : view==='grid' ? (
              <div id="dateienGrid" className="dateien-grid">
                {folders.map(f=>(
                  <div key={f.id} className="dateien-item dateien-folder" onDoubleClick={()=>{setCurrentFolder(f.id);setDetail(null)}}
                    style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'16px 12px',cursor:'pointer',display:'grid',gridTemplateRows:'44px auto',justifyItems:'center',alignItems:'center',gap:8,position:'relative',transition:'border-color 0.15s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='var(--orange)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                    {ICO.folder}
                    <div style={{fontSize:14,fontWeight:600,color:'var(--text)',textAlign:'center',lineHeight:1.3,alignSelf:'start',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',wordBreak:'break-all'}}>{f.name}</div>
                    <div style={{position:'absolute',top:6,right:6,display:'flex',gap:2,opacity:0}} className="dateien-item-actions">
                      <button onClick={e=>{e.stopPropagation();setRenameModal({id:f.id,name:f.name});setRenameName(f.name)}} style={{width:22,height:22,borderRadius:4,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{ICO.rename}</button>
                      <button onClick={e=>{e.stopPropagation();deleteItem(f.id,'folder')}} style={{width:22,height:22,borderRadius:4,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#dc2626'}}>{ICO.del}</button>
                    </div>
                  </div>
                ))}
                {notes.map(n=>(
                  <div key={n.id} className="dateien-item dateien-note" onClick={()=>openNote(n)}
                    style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'16px 12px',cursor:'pointer',display:'grid',gridTemplateRows:'44px auto',justifyItems:'center',alignItems:'center',gap:8,position:'relative',transition:'border-color 0.15s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='var(--orange)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                    {getNoteType(n)==='image'&&n.dataUrl ? <img src={n.dataUrl} style={{width:44,height:44,objectFit:'cover',borderRadius:6}} alt=""/> : getNoteType(n)==='pdf' ? ICO.pdf : ICO.note}
                    <div style={{fontSize:14,fontWeight:600,color:'var(--text)',textAlign:'center',lineHeight:1.3,alignSelf:'start',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',wordBreak:'break-all'}}>{n.title||'Ohne Titel'}</div>
                    <div style={{position:'absolute',top:6,right:6,opacity:0}} className="dateien-item-actions">
                      <button onClick={e=>{e.stopPropagation();deleteItem(n.id,'note')}} style={{width:22,height:22,borderRadius:4,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#dc2626'}}>{ICO.del}</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div id="dateienList" className="dateien-list-view">
                <div style={{display:'grid',gridTemplateColumns:'1fr 120px 80px',gap:8,padding:'9px 16px',background:'var(--bg-3)',borderBottom:'1px solid var(--border)'}}>
                  {['Name','Geändert',''].map((h,i)=><span key={i} style={{fontSize:12,fontWeight:700,color:'var(--text-3)',letterSpacing:'0.1em',textTransform:'uppercase'}}>{h}</span>)}
                </div>
                {folders.map(f=>(
                  <div key={f.id} onDoubleClick={()=>{setCurrentFolder(f.id);setDetail(null)}}
                    style={{display:'grid',gridTemplateColumns:'1fr 120px 80px',gap:8,padding:'11px 16px',borderBottom:'1px solid var(--border)',cursor:'pointer',alignItems:'center'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <span style={{display:'flex',alignItems:'center',gap:8,fontSize:15,fontWeight:600,color:'var(--text)'}}>{ICO.folderSm}{f.name}</span>
                    <span style={{fontSize:15,color:'var(--text-muted)'}}>—</span>
                    <span style={{display:'flex',gap:4}}>
                      <button onClick={e=>{e.stopPropagation();setRenameModal({id:f.id,name:f.name});setRenameName(f.name)}} style={{width:24,height:24,borderRadius:4,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{ICO.rename}</button>
                      <button onClick={e=>{e.stopPropagation();deleteItem(f.id,'folder')}} style={{width:24,height:24,borderRadius:4,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#dc2626'}}>{ICO.del}</button>
                    </span>
                  </div>
                ))}
                {notes.map(n=>(
                  <div key={n.id} onClick={()=>openNote(n)}
                    style={{display:'grid',gridTemplateColumns:'1fr 120px 80px',gap:8,padding:'11px 16px',borderBottom:'1px solid var(--border)',cursor:'pointer',alignItems:'center'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <span style={{display:'flex',alignItems:'center',gap:8,fontSize:15,fontWeight:600,color:'var(--text)'}}>{ICO.noteSm}{n.title||'Ohne Titel'}</span>
                    <span style={{fontSize:15,color:'var(--text-muted)'}}>{n.modified?new Date(n.modified).toLocaleDateString('de-DE'):'—'}</span>
                    <span style={{display:'flex',gap:4}}>
                      <button onClick={e=>{e.stopPropagation();deleteItem(n.id,'note')}} style={{width:24,height:24,borderRadius:4,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#dc2626'}}>{ICO.del}</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail / Note editor panel */}
          {detail && (
            <div className="dateien-detail" id="dateienDetail" style={{display:'flex'}}>
              {detail.type !== 'note' && (
                <div className="dateien-detail-header">
                  <div className="dateien-detail-title" id="dateienDetailTitle">{detail.note?.title || 'Dokument'}</div>
                  <div style={{display:'flex',gap:6,flexShrink:0,alignItems:'center'}}>
                    <button className="result-action-btn" id="dateienDetailDlBtn" onClick={()=>downloadFile(detail.note)} title="Herunterladen">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button className="result-action-btn" onClick={()=>setDetail(null)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
              )}
              <div id="dateienDetailBody" style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                {detail.type==='note' && (
                  <NoteEditor note={detail.note} folderId={currentFolder} onSave={refresh} onClose={()=>setDetail(null)}/>
                )}
                {detail.type==='image' && (
                  <div style={{flex:1,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',padding:16,touchAction:'none'}} onTouchStart={handleImgTouch}>
                    <img src={detail.note.dataUrl} style={{maxWidth:'100%',maxHeight:'100%',borderRadius:8,objectFit:'contain',transform:`translate(${imgPanX}px,${imgPanY}px) scale(${imgZoom})`,transformOrigin:'center center',userSelect:'none',pointerEvents:'none'}} alt=""/>
                  </div>
                )}
                {detail.type==='pdf' && (
                  <iframe src={detail.note.dataUrl} style={{flex:1,width:'100%',border:'none'}} title="PDF"/>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New folder modal */}
      {folderModal && (
        <div className="dateien-modal" id="dateienFolderModal" style={{display:'flex'}}>
          <div className="dateien-modal-card">
            <div className="dateien-modal-title">Neuer Ordner</div>
            <input className="form-input" type="text" id="newFolderName" placeholder="Ordnername..." style={{marginBottom:12}}
              value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createFolder()} autoFocus/>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-action" style={{flex:1,justifyContent:'center'}} onClick={createFolder}>Erstellen</button>
              <button className="btn-secondary" onClick={()=>setFolderModal(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renameModal && (
        <div className="dateien-modal" id="dateienRenameModal" style={{display:'flex'}}>
          <div className="dateien-modal-card">
            <div className="dateien-modal-title">Umbenennen</div>
            <input className="form-input" type="text" id="dateienRenameInput" placeholder="Neuer Name..." style={{marginBottom:12}}
              value={renameName} onChange={e=>setRenameName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&confirmRename()} autoFocus/>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-action" style={{flex:1,justifyContent:'center'}} onClick={confirmRename}>Umbenennen</button>
              <button className="btn-secondary" onClick={()=>setRenameModal(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal opts={confirm} onOk={()=>confirm?.onOk?.()} onCancel={()=>setConfirm(null)}/>

      {toast && <div className="app-toast">{toast}</div>}

      <style>{`.dateien-item:hover .dateien-item-actions { opacity: 1 !important; }`}</style>
    </div>
  )
}
