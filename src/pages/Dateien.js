import { useState, useEffect, useRef, useCallback } from 'react'
import { downloadAsWord } from '../utils/downloadWord'

function genId() { return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,7) }
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function load() { try { return JSON.parse(localStorage.getItem('dateien_data') || '{"folders":[],"notes":[]}') } catch { return {folders:[],notes:[]} } }
function save(data) { try { localStorage.setItem('dateien_data', JSON.stringify(data)); return true } catch { return false } }

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
            <div style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>{opts.title}</div>
            <div style={{fontSize:13,color:'var(--text-2)',marginTop:3}}>{opts.msg}</div>
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
      editorRef.current.innerHTML = note.content
    }
    editorRef.current?.focus()
  }, [])

  function autoSave(newTitle, newContent) {
    clearTimeout(timerRef.current)
    setSaved('...')
    timerRef.current = setTimeout(() => {
      const t = newTitle.trim() || 'Ohne Titel'
      const c = newContent || editorRef.current?.innerHTML || ''
      const data = load()
      if (noteIdRef.current) {
        const n = data.notes.find(x=>x.id===noteIdRef.current)
        if (n) { n.title=t; n.content=c; n.modified=Date.now() }
      } else {
        const newNote = {id:genId(), title:t, content:c, folderId, created:Date.now(), modified:Date.now()}
        noteIdRef.current = newNote.id
        data.notes.push(newNote)
      }
      save(data)
      onSave()
      setSaved('✓ ' + new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}))
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
          style={{flex:1,border:'none',background:'transparent',fontSize:16,fontWeight:700,color:'var(--text)',outline:'none',fontFamily:'Bricolage Grotesque,sans-serif'}}/>
        <div style={{display:'flex',gap:6}}>
          <button onClick={downloadDoc} style={{fontSize:12,height:32,padding:'0 10px',display:'flex',alignItems:'center',gap:5,background:'#2B579A',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:600}}>
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
            style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',fontWeight:isBold?700:400,fontStyle:cmd==='italic'?'italic':'normal',textDecoration:cmd==='underline'?'underline':'none',fontSize:13,fontFamily:'serif'}}>
            {label}
          </button>
        ))}
        <span style={{width:1,height:20,background:'var(--border)',margin:'0 4px'}}/>
        <button onClick={()=>format('insertUnorderedList')} style={{padding:'0 8px',height:28,borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',fontSize:12}}>• Liste</button>
        <button onClick={()=>format('insertOrderedList')} style={{padding:'0 8px',height:28,borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',fontSize:12}}>1. Liste</button>
        <span style={{marginLeft:'auto',fontSize:11,color:'var(--text-3)'}}>{saved}</span>
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning
        onInput={()=>autoSave(title, editorRef.current?.innerHTML)}
        style={{flex:1,overflowY:'auto',padding:16,outline:'none',fontSize:14,lineHeight:1.7,color:'var(--text)',fontFamily:'DM Sans,sans-serif'}}
        data-placeholder="Schreiben..."/>
    </div>
  )
}

// ── Main Dateien ───────────────────────────────────────────────────────────────
export default function Dateien() {
  const [data, setData]             = useState(load)
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
  const fileInputRef                = useRef(null)

  function refresh() { setData(load()) }
  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),2200) }

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
  function createFolder() {
    const name = newFolderName.trim(); if (!name) return
    const d = load()
    d.folders.push({id:genId(), name, parentId:currentFolder, created:Date.now()})
    save(d); refresh(); setFolderModal(false); setNewFolderName('')
    showToast('✓ Ordner erstellt')
  }

  function confirmRename() {
    const name = renameName.trim(); if (!name || !renameModal) return
    const d = load()
    const item = d.folders.find(f=>f.id===renameModal.id)
    if (item) item.name = name
    save(d); refresh(); setRenameModal(null); setRenameName('')
    showToast('✓ Umbenannt')
  }

  function deleteItem(id, type) {
    setConfirm({
      title: type==='folder' ? 'Ordner löschen' : 'Datei löschen',
      msg:   type==='folder' ? 'Ordner und Inhalt werden unwiderruflich gelöscht.' : 'Diese Datei wird unwiderruflich gelöscht.',
      icon:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>',
      onOk: () => {
        const d = load()
        if (type==='folder') {
          const toDelete = [id]; let i=0
          while (i<toDelete.length) { const fid=toDelete[i++]; d.folders.filter(f=>f.parentId===fid).forEach(f=>toDelete.push(f.id)) }
          d.folders = d.folders.filter(f=>!toDelete.includes(f.id))
          d.notes   = d.notes.filter(n=>!toDelete.includes(n.folderId))
        } else {
          d.notes = d.notes.filter(n=>n.id!==id)
          if (detail?.note?.id===id) setDetail(null)
        }
        save(d); refresh(); setConfirm(null); showToast('✓ Gelöscht')
      }
    })
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  function handleUpload(files) {
    if (!files?.length) return
    const d = load(); let done=0; const total=files.length
    Array.from(files).forEach(file => {
      const ext = (file.name.match(/\.([^.]+)$/)||['',''])[1].toLowerCase()
      const isImage = /^(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(ext)||file.type.startsWith('image/')
      const isPDF   = ext==='pdf'||file.type==='application/pdf'
      const isText  = /^(txt|md|csv|json|xml|html|htm|js|css|py)$/.test(ext)||(!isImage&&!isPDF&&file.type.startsWith('text/'))
      const finish = entry => {
        d.notes.push({id:genId(), title:file.name, folderId:currentFolder, created:Date.now(), modified:Date.now(), ...entry})
        if (++done===total) { const ok=save(d); if(ok!==false) showToast(`✓ ${total} Datei(en) hochgeladen`); refresh() }
      }
      const reader = new FileReader()
      if (isImage) { reader.onload=e=>finish({fileType:'image',dataUrl:e.target.result,content:''}); reader.readAsDataURL(file) }
      else if (isPDF) { reader.onload=e=>finish({fileType:'pdf',dataUrl:e.target.result,content:''}); reader.readAsDataURL(file) }
      else if (isText) { reader.onload=e=>finish({fileType:'text',content:`<pre style="white-space:pre-wrap;font-size:13px;">${escHtml(e.target.result)}</pre>`}); reader.readAsText(file) }
      else finish({fileType:'other',content:''})
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function openNote(note) {
    const t = getNoteType(note)
    if (t==='image'||t==='pdf') setDetail({type:t, note})
    else setDetail({type:'note', note})
  }

  function downloadFile(note) {
    if (!note?.dataUrl) return
    const a = document.createElement('a')
    a.href = note.dataUrl; a.download = note.title||'download'; a.click()
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
        <div style={{display:'flex',gap:8}}>
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
          <span className={`dateien-bread-item${!currentFolder?' active':''}`} onClick={()=>{setCurrentFolder(null);setDetail(null)}} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:14,fontWeight:600}}>
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
                <div style={{fontSize:14}}>{q ? 'Keine Ergebnisse' : 'Leerer Ordner'}</div>
                {!q && <div style={{fontSize:12,color:'var(--text-muted)'}}>Notiz erstellen oder Datei hochladen</div>}
              </div>
            ) : view==='grid' ? (
              <div id="dateienGrid" className="dateien-grid">
                {folders.map(f=>(
                  <div key={f.id} className="dateien-item dateien-folder" onDoubleClick={()=>{setCurrentFolder(f.id);setDetail(null)}}
                    style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'16px 12px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:8,position:'relative',transition:'border-color 0.15s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='var(--orange)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                    {ICO.folder}
                    <div style={{fontSize:12,fontWeight:600,color:'var(--text)',textAlign:'center',wordBreak:'break-word',lineHeight:1.3}}>{f.name}</div>
                    <div style={{position:'absolute',top:6,right:6,display:'flex',gap:2,opacity:0}} className="dateien-item-actions">
                      <button onClick={e=>{e.stopPropagation();setRenameModal({id:f.id,name:f.name});setRenameName(f.name)}} style={{width:22,height:22,borderRadius:4,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{ICO.rename}</button>
                      <button onClick={e=>{e.stopPropagation();deleteItem(f.id,'folder')}} style={{width:22,height:22,borderRadius:4,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#dc2626'}}>{ICO.del}</button>
                    </div>
                  </div>
                ))}
                {notes.map(n=>(
                  <div key={n.id} className="dateien-item dateien-note" onClick={()=>openNote(n)}
                    style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'16px 12px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:8,position:'relative',transition:'border-color 0.15s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='var(--orange)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                    {getNoteType(n)==='image'&&n.dataUrl ? <img src={n.dataUrl} style={{width:48,height:48,objectFit:'cover',borderRadius:6}} alt=""/> : getNoteType(n)==='pdf' ? ICO.pdf : ICO.note}
                    <div style={{fontSize:12,fontWeight:600,color:'var(--text)',textAlign:'center',wordBreak:'break-word',lineHeight:1.3}}>{n.title||'Ohne Titel'}</div>
                    <div style={{position:'absolute',top:6,right:6,opacity:0}} className="dateien-item-actions">
                      <button onClick={e=>{e.stopPropagation();deleteItem(n.id,'note')}} style={{width:22,height:22,borderRadius:4,border:'1px solid var(--border)',background:'var(--bg)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#dc2626'}}>{ICO.del}</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div id="dateienList" className="dateien-list-view">
                <div style={{display:'grid',gridTemplateColumns:'1fr 120px 80px',gap:8,padding:'9px 16px',background:'var(--bg-3)',borderBottom:'1px solid var(--border)'}}>
                  {['Name','Geändert',''].map((h,i)=><span key={i} style={{fontSize:10,fontWeight:700,color:'var(--text-3)',letterSpacing:'0.1em',textTransform:'uppercase'}}>{h}</span>)}
                </div>
                {folders.map(f=>(
                  <div key={f.id} onDoubleClick={()=>{setCurrentFolder(f.id);setDetail(null)}}
                    style={{display:'grid',gridTemplateColumns:'1fr 120px 80px',gap:8,padding:'11px 16px',borderBottom:'1px solid var(--border)',cursor:'pointer',alignItems:'center'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <span style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,color:'var(--text)'}}>{ICO.folderSm}{f.name}</span>
                    <span style={{fontSize:13,color:'var(--text-muted)'}}>—</span>
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
                    <span style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:600,color:'var(--text)'}}>{ICO.noteSm}{n.title||'Ohne Titel'}</span>
                    <span style={{fontSize:13,color:'var(--text-muted)'}}>{n.modified?new Date(n.modified).toLocaleDateString('de-DE'):'—'}</span>
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
                  <div style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
                    <img src={detail.note.dataUrl} style={{maxWidth:'100%',maxHeight:'100%',borderRadius:8,objectFit:'contain'}} alt=""/>
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

      {toast && <div style={{position:'fixed',bottom:28,left:'calc(50% + 120px)',transform:'translateX(-50%)',background:'var(--orange-ghost)',color:'var(--orange)',border:'none',padding:'10px 22px',borderRadius: 6,fontSize:14,fontWeight:600,zIndex:99999}}>{toast}</div>}

      <style>{`.dateien-item:hover .dateien-item-actions { opacity: 1 !important; }`}</style>
    </div>
  )
}
