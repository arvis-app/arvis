import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'

const SPECIAL_FIRST = ['Notaufnahme','Aufnahme','Befunde','OP-Berichte','Verlauf','Entlassung','Sozialmedizin/Gutachten','Diverses']



function formatBausteinText(s) {
  if (!s) return ''
  s = s.replace(/\[X[X,.×\-–/+0-9]*\]/g, '_')
  s = s.replace(/\[([^\]]+)\]/g, '($1)')
  return s
}

function renderPlaceholders(text) {
  let h = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  h = h.replace(/\[([^\][]{0,80})\]/g, (match) => `<span class="ph-chip" data-encoded="${encodeURIComponent(match)}" contenteditable="false">${match}</span>`)
  return h
}

function getPlainText(el) {
  if (!el) return ''
  let h = el.innerHTML
  h = h.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '')
  return h.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
}

// ── Migration unique depuis localStorage ─────────────────────────────────────
async function migrateBausteineLocalStorage(userId) {
  if (localStorage.getItem('arvis_bausteine_migrated_v1')) return
  try {
    const localCustom = JSON.parse(localStorage.getItem('arvis_bausteine_custom') || '[]')
    const localFavs   = JSON.parse(localStorage.getItem('arvis_bausteine_favs') || '[]')
    if (localCustom.length) {
      await supabase.from('bausteine').insert(localCustom.map(b => ({
        id: b.id, user_id: userId, title: b.title || '', category: b.category || '',
        text: b.text || '', keywords: b.keywords || '', forked_from: b.forked_from || null,
        is_fav: localFavs.includes(b.id)
      })))
    }
    localStorage.setItem('arvis_bausteine_migrated_v1', '1')
  } catch (e) { console.error('[Bausteine] Bausteine migration error:', e) }
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ opts, onOk, onCancel }) {
  if (!opts) return null
  return (
    <div style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'var(--card)',borderRadius: 8,padding:24,width:'100%',maxWidth:380,margin:'0 16px',boxShadow:'0 8px 40px rgba(0,0,0,0.18)',display:'flex',flexDirection:'column',gap:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {opts.icon && <div style={{width:36,height:36,borderRadius: 6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:opts.iconBg||'var(--bg-3)'}} dangerouslySetInnerHTML={{__html:opts.icon}}/>}
          <div>
            <div style={{fontSize:17,fontWeight:700,color:'var(--text)'}}>{opts.title}</div>
            <div style={{fontSize:15,color:'var(--text-2)',marginTop:3,lineHeight:1.5,whiteSpace:'pre-line'}}>{opts.msg}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn-secondary" onClick={onCancel}>Abbrechen</button>
          <button className="btn-action" onClick={onOk} style={{...(opts.btnStyle ? {background:'#dc2626'} : {})}}>{opts.btnLabel||'OK'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Neu Baustein Modal ─────────────────────────────────────────────────────────
function NeuBausteinModal({ open, editingBaustein, categories, onSave, onClose }) {
  const [titel, setTitel]       = useState('')
  const [category, setCategory] = useState('')
  const [text, setText]         = useState('')
  const [keywords, setKeywords] = useState('')
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!open) return
    if (editingBaustein) {
      setTitel(editingBaustein.title || '')
      setCategory(editingBaustein.category || '')
      setText(editingBaustein.text || '')
      setKeywords(editingBaustein.keywords || '')
    } else {
      setTitel(''); setCategory(categories[0]||''); setText(''); setKeywords('')
    }
    setError('')
  }, [open, editingBaustein, categories])

  function handleSave() {
    if (!titel.trim() || !text.trim()) { setError('Bitte Titel und Text ausfüllen.'); return }
    onSave({ titel: titel.trim(), category, text: text.trim(), keywords: keywords.trim() })
  }

  if (!open) return null
  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'var(--card)',borderRadius: 8,padding:24,width:'100%',maxWidth:520,margin:'0 16px',boxShadow:'0 8px 40px rgba(0,0,0,0.18)',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:18,fontWeight:700,color:'var(--text)'}}>{editingBaustein ? 'Baustein bearbeiten' : 'Neuen Baustein erstellen'}</span>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:22,lineHeight:1,padding:'2px 6px'}}>&times;</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <label style={{fontSize:14,fontWeight:600,color:'var(--text-2)'}}>Titel *</label>
          <input value={titel} onChange={e=>setTitel(e.target.value)} type="text" placeholder="z.B. Allgemeine Anamnese"
            style={{padding:'9px 12px',border:'1px solid var(--border)',borderRadius:8,fontSize:16,fontFamily:'DM Sans,sans-serif',background:'var(--bg)',color:'var(--text)',outline:'none'}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <label style={{fontSize:14,fontWeight:600,color:'var(--text-2)'}}>Kategorie *</label>
          <select value={category} onChange={e=>setCategory(e.target.value)}
            style={{padding:'9px 12px',border:'1px solid var(--border)',borderRadius:8,fontSize:16,fontFamily:'DM Sans,sans-serif',background:'var(--bg)',color:'var(--text)',outline:'none'}}>
            {categories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <label style={{fontSize:14,fontWeight:600,color:'var(--text-2)'}}>Text *</label>
          <textarea value={text} onChange={e=>setText(e.target.value)} rows={6} placeholder="Bausteintext eingeben…"
            style={{padding:'9px 12px',border:'1px solid var(--border)',borderRadius:8,fontSize:15,fontFamily:'DM Sans,sans-serif',background:'var(--bg)',color:'var(--text)',outline:'none',resize:'vertical',lineHeight:1.6}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <label style={{fontSize:14,fontWeight:600,color:'var(--text-2)'}}>Schlüsselwörter <span style={{fontWeight:400,color:'var(--text-3)'}}>(optional, durch Komma getrennt)</span></label>
          <input value={keywords} onChange={e=>setKeywords(e.target.value)} type="text" placeholder="z.B. anamnese, aufnahme, patient"
            style={{padding:'9px 12px',border:'1px solid var(--border)',borderRadius:8,fontSize:16,fontFamily:'DM Sans,sans-serif',background:'var(--bg)',color:'var(--text)',outline:'none'}}/>
        </div>
        {error && <div style={{fontSize:14,color:'var(--orange)',padding:'6px 10px',background:'rgba(217,75,10,0.07)',borderRadius:6}}>{error}</div>}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4}}>
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-action" onClick={handleSave}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Bausteine ─────────────────────────────────────────────────────────────
export default function Bausteine() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch]             = useState('')
  const [activeCat, setActiveCat]       = useState(null)
  const [selected, setSelected]         = useState(null)
  const [_pendingSelectedId, _setPendingSelectedId] = useState(() => sessionStorage.getItem('arvis_bausteine_selected_id') || null)
  const [custom, setCustom]             = useState([])
  const [favs, setFavs]                 = useState([]) // array of IDs

  // ── Charger depuis Supabase au montage ──────────────────────────────────────
  useEffect(() => {
    if (!user) return
    migrateBausteineLocalStorage(user.id).then(async () => {
      const [bausteineRes, favsRes] = await Promise.all([
        supabase.from('bausteine').select('*').eq('user_id', user.id),
        supabase.from('user_bausteine_favs').select('baustein_id').eq('user_id', user.id)
      ])
      if (bausteineRes.data) setCustom(bausteineRes.data.map(b => ({ ...b, custom: true })))
      const newTableFavs = favsRes.data ? favsRes.data.map(f => f.baustein_id) : []
      const oldFavs = bausteineRes.data ? bausteineRes.data.filter(b => b.is_fav).map(b => b.id) : []
      setFavs([...new Set([...newTableFavs, ...oldFavs])])
      // Migration one-shot : déplacer is_fav de bausteine → user_bausteine_favs
      if (oldFavs.length > 0 && newTableFavs.length === 0) {
        await supabase.from('user_bausteine_favs').insert(oldFavs.map(id => ({ user_id: user.id, baustein_id: id })))
      }
    })
  }, [user])
  const [basket, setBasket]             = useState(() => { try { return JSON.parse(sessionStorage.getItem('arvis_bausteine_basket') || '[]') } catch { return [] } })
  const basketListRef                   = useRef(null)
  const [neuOpen, setNeuOpen]           = useState(false)
  const [editingB, setEditingB]         = useState(null)
  const [confirm, setConfirm]           = useState(null)
  const [copied, setCopied]             = useState(false)
  const [toast, setToast]               = useState('')
  const [suggestion, setSuggestion]     = useState('')
  const [baudataVersion, setBaudataVersion] = useState(0)
  const rightRef                        = useRef(null)
  const [rightH, setRightH]             = useState(0)
  const previewRef                      = useRef(null)
  const popupChipRef                    = useRef(null)
  const [popup, setPopup]               = useState({ visible: false, choices: [], x: 0, y: 0 })

  // Sync left panel height with right panel
  useEffect(() => {
    if (!rightRef.current) return
    const obs = new ResizeObserver(([e]) => setRightH(e.contentRect.height))
    obs.observe(rightRef.current)
    return () => obs.disconnect()
  }, [])

  // Scroll automatique vers le dernier élément du panier + persistence
  useEffect(() => {
    if (basketListRef.current && basket.length > 0) {
      basketListRef.current.scrollTop = basketListRef.current.scrollHeight
    }
    sessionStorage.setItem('arvis_bausteine_basket', JSON.stringify(basket))
  }, [basket])

  // Attendre que bausteine_data.js soit chargé
  useEffect(() => {
    if (window.BAUSTEINE_DATA) return
    const interval = setInterval(() => {
      if (window.BAUSTEINE_DATA) { setBaudataVersion(v => v + 1); clearInterval(interval) }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const allData = useMemo(() => {
    if (!window.BAUSTEINE_DATA) return custom
    const forkedIds = custom.filter(b=>b.forked_from).map(b=>b.forked_from)
    const base = window.BAUSTEINE_DATA.filter(b=>!forkedIds.includes(b.id))
    return [...base, ...custom]
  }, [custom, baudataVersion]) // eslint-disable-line react-hooks/exhaustive-deps -- baudataVersion triggers recompute when window.BAUSTEINE_DATA loads

  // Restore selected baustein once allData is available
  useEffect(() => {
    if (!_pendingSelectedId || !allData.length) return
    const found = allData.find(b => b.id === _pendingSelectedId)
    if (found) { setSelected(found); _setPendingSelectedId(null) }
  }, [allData, _pendingSelectedId])

  // Persist selected id + render placeholders in preview
  useEffect(() => {
    if (selected) {
      sessionStorage.setItem('arvis_bausteine_selected_id', selected.id)
      if (previewRef.current) previewRef.current.innerHTML = renderPlaceholders(selected.text)
    } else {
      sessionStorage.removeItem('arvis_bausteine_selected_id')
      if (previewRef.current) previewRef.current.innerHTML = ''
    }
    hidePopup()
  }, [selected])

  const categories = useMemo(() => {
    const allCats = [...new Set(allData.map(b=>b.category))]
    const special = SPECIAL_FIRST.filter(c=>allCats.includes(c))
    const rest = allCats.filter(c=>!SPECIAL_FIRST.includes(c)).sort()
    return [...special, ...rest]
  }, [allData])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allData.filter(b => {
      const mc = !activeCat ? true
        : activeCat==='Favoriten' ? favs.includes(b.id)
        : activeCat==='MeineBausteine' ? !!b.custom
        : b.category===activeCat
      const mq = !q || b.title.toLowerCase().includes(q) || (q.length>=4 && b.keywords && b.keywords.toLowerCase().includes(q))
      return mc && mq
    }).slice(0, 80)
  }, [allData, activeCat, search, favs])

  function showToast(msg, light=true) { setToast({msg,light}); setTimeout(()=>setToast(null),2200) }

  // ── Search autocomplete ────────────────────────────────────
  function handleSearchInput(e) {
    const q = e.target.value
    setSearch(q)
    if (q.length < 2) { setSuggestion(''); return }
    const ql = q.toLowerCase()
    const words = {}
    allData.forEach(b => b.title.split(/\s+/).forEach(w => {
      if (w.toLowerCase().startsWith(ql) && w.length > q.length) words[w] = 1
    }))
    const suggs = Object.keys(words)
    setSuggestion(suggs.length > 0 ? suggs[0] : '')
  }

  function handleSearchKeydown(e) {
    if ((e.key==='Tab'||e.key==='ArrowRight') && suggestion) {
      e.preventDefault()
      setSearch(suggestion)
      setSuggestion('')
    }
  }

  // ── Favourites ─────────────────────────────────────────────
  async function toggleFav(b) {
    const isFav = favs.includes(b.id)
    if (!isFav) {
      await supabase.from('user_bausteine_favs').insert({ user_id: user.id, baustein_id: b.id })
      setFavs(prev => [...prev, b.id])
    } else {
      setConfirm({
        title:'Aus Favoriten entfernen',
        msg:`"${b.title}" aus den Favoriten entfernen?`,
        icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        iconBg:'var(--orange-ghost)',
        btnLabel:'Entfernen',
        onOk: async () => {
          await supabase.from('user_bausteine_favs').delete().eq('user_id', user.id).eq('baustein_id', b.id)
          setFavs(prev => prev.filter(id => id !== b.id))
          setConfirm(null)
        }
      })
    }
  }

  // ── Custom CRUD ────────────────────────────────────────────
  async function handleSaveNeu({ titel, category, text, keywords }) {
    if (editingB) {
      const existingIdx = custom.findIndex(b=>b.id===editingB.id)
      if (existingIdx !== -1) {
        const updates = { title: titel, category, text, keywords }
        await supabase.from('bausteine').update(updates).eq('id', editingB.id).eq('user_id', user.id)
        const updated = [...custom]
        updated[existingIdx] = { ...updated[existingIdx], ...updates }
        setCustom(updated); setSelected(updated[existingIdx])
      } else {
        // Fork d'un baustein standard
        const { data: inserted } = await supabase.from('bausteine').insert({
          user_id: user.id, title: titel, category, text, keywords,
          forked_from: editingB.id, is_fav: false
        }).select().single()
        if (inserted) {
          const newB = { ...inserted, custom: true }
          setCustom(prev => [...prev, newB]); setSelected(newB)
        }
      }
      showToast('Baustein gespeichert')
    } else {
      const { data: inserted } = await supabase.from('bausteine').insert({
        user_id: user.id, title: titel, category, text, keywords, is_fav: false
      }).select().single()
      if (inserted) {
        const newB = { ...inserted, custom: true }
        setCustom(prev => [...prev, newB]); setSelected(newB)
      }
    }
    setNeuOpen(false); setEditingB(null)
  }

  function handleDelete(b) {
    const isForked = !!b.forked_from
    setConfirm({
      title:'Baustein löschen',
      msg: isForked ? 'Ihre persönliche Version wird gelöscht.\nDer Originalbaustein wird wiederhergestellt.' : `"${b.title}" wird endgültig gelöscht.`,
      icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>',
      iconBg:'rgba(220,38,38,0.1)',
      btnLabel:'Löschen',
      btnStyle:'danger',
      onOk: async () => {
        await supabase.from('bausteine').delete().eq('id', b.id).eq('user_id', user.id)
        setCustom(prev => prev.filter(c => c.id !== b.id))
        setFavs(prev => prev.filter(id => id !== b.id))
        setSelected(null); setConfirm(null)
      }
    })
  }

  // ── Placeholder interaction ────────────────────────────────
  function hidePopup() { popupChipRef.current = null; setPopup({ visible: false, choices: [], x: 0, y: 0 }) }

  function replaceChipWithCursor(chip) {
    const textNode = document.createTextNode('')
    chip.parentNode.replaceChild(textNode, chip)
    const range = document.createRange(), sel = window.getSelection()
    range.setStart(textNode, 0); range.collapse(true)
    sel.removeAllRanges(); sel.addRange(range)
    previewRef.current?.focus()
  }

  function replaceChipWithText(chip, text) {
    const textNode = document.createTextNode(text)
    chip.parentNode.replaceChild(textNode, chip)
    const range = document.createRange(), sel = window.getSelection()
    range.setStartAfter(textNode); range.collapse(true)
    sel.removeAllRanges(); sel.addRange(range)
    previewRef.current?.focus()
  }

  function handlePreviewClick(e) {
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

  function choosePopup(val) { const chip = popupChipRef.current; if (chip) replaceChipWithText(chip, val); hidePopup() }
  function andereEingeben() { const chip = popupChipRef.current; if (chip) replaceChipWithCursor(chip); hidePopup() }

  useEffect(() => {
    if (!popup.visible) return
    function onDocClick(e) {
      const el = document.getElementById('bausteinePlaceholderPopup')
      if (el && !el.contains(e.target) && !e.target.closest('.ph-chip')) hidePopup()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [popup.visible])

  // ── Copy ───────────────────────────────────────────────────
  function copyBaustein() {
    if (!selected) return
    const text = getPlainText(previewRef.current)
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(()=>setCopied(false), 1500)
  }

  // ── Basket ─────────────────────────────────────────────────
  function addToBasket() {
    if (!selected) return
    if (basket.find(b=>b.id===selected.id)) { showToast('Bereits im Warenkorb', true); return }
    setBasket(prev=>[...prev, selected])
    showToast('Zum Warenkorb hinzugefügt', true)
  }

  function removeFromBasket(id) { setBasket(prev=>prev.filter(b=>b.id!==id)) }
  function clearBasket() { setBasket([]) }

  function sendBasketToBrief() {
    if (!basket.length) return
    const text = basket.map(b=>b.text).join('\n\n')
    sessionStorage.setItem('arvis_brief_input', text)
    navigate('/briefschreiber')
  }

  function sendDirectToBrief() {
    if (!selected) return
    sessionStorage.setItem('arvis_brief_input', selected.text)
    navigate('/briefschreiber')
  }

  const isFav = selected && favs.includes(selected.id)

  return (
    <div className="page active" id="page-bausteine">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Bausteine</div>
          <div className="page-date">Vorgefertigte Textbausteine - einfügen per Klick</div>
        </div>
        <button className="btn-action" onClick={()=>{setEditingB(null);setNeuOpen(true)}} style={{gap:6,display:'flex',alignItems:'center'}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Neu
        </button>
      </div>

      <div className="bausteine-layout" style={{paddingTop:4}}>

        {/* LEFT: Search + List */}
        <div className="bausteine-left bausteine-left-col" style={{height:basket.length>0?Math.max(560,rightH):560}}>

          {/* Search */}
          <div id="bausteineSearchBox" style={{position:'relative',background:'var(--card)',border:'1.5px solid var(--border)',borderRadius:8,overflow:'hidden',boxShadow:'var(--shadow)'}}>
            <input
              type="text" placeholder="Suchen…" autoComplete="off"
              value={search}
              onChange={handleSearchInput}
              onKeyDown={handleSearchKeydown}
              style={{position:'relative',zIndex:1,width:'100%',padding:'10px 14px',border:'none',outline:'none',fontSize:17,lineHeight:1.5,fontFamily:'DM Sans,sans-serif',background:'transparent',color:'var(--text)',boxSizing:'border-box'}}
            />
            {suggestion && search && (
              <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,padding:'10px 14px',fontSize:17,lineHeight:1.5,fontFamily:'DM Sans,sans-serif',color:'var(--text-3)',pointerEvents:'none',whiteSpace:'pre',overflow:'hidden',boxSizing:'border-box',zIndex:2}}>
                <span style={{visibility:'hidden'}}>{search}</span>{suggestion.slice(search.length)}
              </div>
            )}
          </div>

          {/* Category select */}
          <div className="kat-select-wrap">
            <select
              value={activeCat||''}
              onChange={e=>{setActiveCat(e.target.value||null); e.target.blur()}}
              style={{width:'100%',appearance:'none',WebkitAppearance:'none',padding:'11px 40px 11px 14px',fontSize:16,lineHeight:1.5,fontFamily:'DM Sans,sans-serif',color:'var(--text)',fontWeight:700,cursor:'pointer',boxSizing:'border-box',border:'none',borderRadius:0,background:'transparent',outline:'none'}}>
              <option value="">Alle Kategorien</option>
              <option value="Favoriten">★ Favoriten</option>
              <option value="MeineBausteine">✎ Meine Bausteine</option>
              {categories.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <svg style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          {/* List */}
          <div className="bausteine-list" style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',minHeight:0,background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,boxShadow:'var(--shadow)'}}>
            {filtered.length===0 && (
              <div style={{padding:32,textAlign:'center',color:'var(--text-3)',fontSize:15}}>Keine Ergebnisse</div>
            )}
            {filtered.map(b=>(
              <div key={b.id}
                className={`baustein-item${selected?.id===b.id?' selected':''}`}
                onClick={()=>setSelected(b)}>
                <div className="baustein-item-title" style={{display:'flex',alignItems:'center',gap:4}}>
                  {b.title}
                  {favs.includes(b.id) && <span style={{color:'var(--orange)',fontSize:12}} title="Favorit">★</span>}
                  {b.custom && <span style={{fontSize:11,fontWeight:700,color:'var(--orange)',background:'var(--orange-ghost)',borderRadius:4,padding:'1px 5px'}}>MEIN</span>}
                </div>
                <div className="baustein-item-cat">{b.category}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Preview + Basket */}
        <div ref={rightRef} className="bausteine-right">

          {/* Preview */}
          <div style={{border:'1px solid var(--border)',borderRadius:8,padding:16,background:'var(--card)',boxShadow:'var(--shadow)',display:'flex',flexDirection:'column',flexShrink:0}}>
            {!selected && (
              <div style={{minHeight:218,color:'var(--text-2)',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>Baustein auswählen</div>
            )}
            {selected && (
              <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
                <div className="baustein-preview-header">
                  <div>
                    <div className="baustein-preview-title">{selected.title}</div>
                    <div className="baustein-preview-cat">{selected.category}{selected.custom ? '  ·  Mein Baustein' : ''}</div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button className="result-action-btn" onClick={copyBaustein} title="Kopieren" style={copied?{color:'var(--orange)'}:{}}>
                      {copied
                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      }
                    </button>
                    <button className="result-action-btn" onClick={()=>toggleFav(selected)} title={isFav?'Aus Favoriten entfernen':'Zu Favoriten hinzufügen'} style={{color:isFav?'var(--orange)':''}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={isFav?'var(--orange)':'none'} stroke={isFav?'var(--orange)':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                    <button className="result-action-btn" onClick={()=>{setEditingB(selected);setNeuOpen(true)}} title="Bearbeiten" style={{color:'var(--orange)'}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    {selected.custom && (
                      <button className="result-action-btn" onClick={()=>handleDelete(selected)} title="Löschen" style={{color:'#dc2626'}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    )}
                  </div>
                </div>
                <div ref={previewRef} className="baustein-preview-text" contentEditable suppressContentEditableWarning spellCheck={false}
                  onClick={handlePreviewClick}
                  style={{overflowY:'auto',flex:1,outline:'none',lineHeight:1.8,fontSize:14,color:'var(--text-2)'}} />
                <div style={{display:'flex',gap:8,marginTop:16}}>
                  <button className="btn-secondary" onClick={addToBasket} style={{flex:1,justifyContent:'center',display:'flex',gap:6,borderColor:'var(--orange)',color:'var(--orange)'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Zum Warenkorb
                  </button>
                  <button className="btn-action" onClick={sendDirectToBrief} style={{flex:1,justifyContent:'center',display:'flex',gap:6}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    An Brief Schreiber
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Basket */}
          {basket.length > 0 && (
            <div style={{border:'1px solid var(--border)',background:'var(--card)',borderRadius:8,padding:14,boxShadow:'var(--shadow)',display:'flex',flexDirection:'column',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexShrink:0}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                <span className="baustein-basket-title">Warenkorb</span>
                <span className="baustein-basket-count">{basket.length} Baustein{basket.length>1?'e':''}</span>
                <button className="result-action-btn" onClick={clearBasket} style={{marginLeft:'auto',width:'auto',padding:'0 10px',fontSize:14,fontWeight:600,fontFamily:'DM Sans,sans-serif'}}>Leeren</button>
              </div>
              <div ref={basketListRef} className="baustein-basket-items" style={{overflowY:'auto'}}>
                {basket.map(b=>(
                  <div key={b.id} className="baustein-basket-item">
                    <span className="baustein-basket-item-title" onClick={()=>setSelected(b)}>{b.title}</span>
                    <span className="baustein-basket-remove" onClick={()=>removeFromBasket(b.id)}>&#215;</span>
                  </div>
                ))}
              </div>
              <button className="btn-action" onClick={sendBasketToBrief} style={{width:'100%',justifyContent:'center',display:'flex',gap:6,marginTop:8}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                An Brief Schreiber senden
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Placeholder popup */}
      {popup.visible && (
        <div id="bausteinePlaceholderPopup" style={{position:'fixed',zIndex:9999,top:popup.y,left:popup.x,background:'var(--card)',border:'1px solid var(--border)',borderRadius:6,padding:8,boxShadow:'var(--shadow-lg)',minWidth:140,display:'flex',flexDirection:'column'}}>
          {popup.choices.map(c => (
            <button key={c} className="ph-popup-btn" onMouseDown={e=>{e.preventDefault();choosePopup(c)}}>{c}</button>
          ))}
          <button className="ph-popup-btn ph-andere" onMouseDown={e=>{e.preventDefault();andereEingeben()}}>Andere eingeben…</button>
        </div>
      )}

      {/* Modals */}
      <NeuBausteinModal
        open={neuOpen}
        editingBaustein={editingB}
        categories={categories}
        onSave={handleSaveNeu}
        onClose={()=>{setNeuOpen(false);setEditingB(null)}}
      />

      <ConfirmModal
        opts={confirm}
        onOk={()=>confirm?.onOk?.()}
        onCancel={()=>setConfirm(null)}
      />

      {/* Toast */}
      {toast && <div className={`app-toast${toast.light ? '' : ' app-toast--solid'}`}>{toast.msg}</div>}
    </div>
  )
}
