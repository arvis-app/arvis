import { useState, useEffect, useMemo } from 'react'

const UEB_LANGS = [
  { key:'en', label:'English',    abbr:'EN' },
  { key:'es', label:'Español',    abbr:'ES' },
  { key:'fr', label:'Français',   abbr:'FR' },
  { key:'ru', label:'Русский',    abbr:'RU' },
  { key:'uk', label:'Українська', abbr:'UK' },
]

const FLAG_SVG = {
  de: '<svg width="22" height="15" viewBox="0 0 22 15" style="border-radius:2px;vertical-align:middle;display:inline-block;flex-shrink:0"><rect width="22" height="15" fill="#1a1a1a"/><rect y="5" width="22" height="5" fill="#DD0000"/><rect y="10" width="22" height="5" fill="#FFCE00"/></svg>',
  en: '<svg width="22" height="15" viewBox="0 0 22 15" style="border-radius:2px;vertical-align:middle;display:inline-block;flex-shrink:0"><rect width="22" height="15" fill="#012169"/><line x1="0" y1="0" x2="22" y2="15" stroke="white" stroke-width="3.5"/><line x1="22" y1="0" x2="0" y2="15" stroke="white" stroke-width="3.5"/><line x1="0" y1="0" x2="22" y2="15" stroke="#C8102E" stroke-width="1.8"/><line x1="22" y1="0" x2="0" y2="15" stroke="#C8102E" stroke-width="1.8"/><rect x="8.5" y="0" width="5" height="15" fill="white"/><rect x="0" y="5" width="22" height="5" fill="white"/><rect x="9.5" y="0" width="3" height="15" fill="#C8102E"/><rect x="0" y="6" width="22" height="3" fill="#C8102E"/></svg>',
  fr: '<svg width="22" height="15" viewBox="0 0 22 15" style="border-radius:2px;vertical-align:middle;display:inline-block;flex-shrink:0"><rect width="22" height="15" fill="#ED2939"/><rect width="14.67" height="15" fill="white"/><rect width="7.33" height="15" fill="#002395"/></svg>',
  ru: '<svg width="22" height="15" viewBox="0 0 22 15" style="border-radius:2px;vertical-align:middle;display:inline-block;flex-shrink:0"><rect width="22" height="15" fill="#D52B1E"/><rect width="22" height="10" fill="#0039A6"/><rect width="22" height="5" fill="white"/></svg>',
  uk: '<svg width="22" height="15" viewBox="0 0 22 15" style="border-radius:2px;vertical-align:middle;display:inline-block;flex-shrink:0"><rect width="22" height="15" fill="#FFD700"/><rect width="22" height="7.5" fill="#005BBB"/></svg>',
  es: '<svg width="22" height="15" viewBox="0 0 22 15" style="border-radius:2px;vertical-align:middle;display:inline-block;flex-shrink:0"><rect width="22" height="15" fill="#AA151B"/><rect y="3.75" width="22" height="7.5" fill="#F1BF00"/></svg>',
}

function Flag({ lang }) {
  return <span dangerouslySetInnerHTML={{__html: FLAG_SVG[lang] || ''}}/>
}

const COPY_ICON = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>

export default function Uebersetzung() {
  const [data, setData]           = useState([])
  const [search, setSearch]       = useState('')
  const [cat, setCat]             = useState('all')
  const [visibleLangs, setVisible] = useState({ en:true, es:true, fr:true, ru:true, uk:true })
  const [selected, setSelected]   = useState(null)
  const [toast, setToast]         = useState('')
  const [copiedKey, setCopiedKey] = useState(null)

  useEffect(() => {
    function tryLoad() {
      if (window._begriffe?.length) { setData(window._begriffe); return true }
      return false
    }
    if (!tryLoad()) {
      const iv = setInterval(() => { if (tryLoad()) clearInterval(iv) }, 100)
      return () => clearInterval(iv)
    }
  }, [])

  const categories = useMemo(() => {
    const cats = ['all']
    data.forEach(b => { if (b.cat && !cats.includes(b.cat)) cats.push(b.cat) })
    return cats
  }, [data])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let items = data.filter(b => {
      if (cat !== 'all' && b.cat !== cat) return false
      if (!q) return true
      return [b.de, b.de_allg, b.en, b.es, b.fr, b.ru, b.uk].filter(Boolean).some(f => f.toLowerCase().includes(q))
    })
    items.sort((a,b) => {
      const aH = a.de_allg ? 1 : 0, bH = b.de_allg ? 1 : 0
      if (bH !== aH) return bH - aH
      return a.de.localeCompare(b.de, 'de', {sensitivity:'base'})
    })
    return items.slice(0, 200)
  }, [data, search, cat])

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(''),2000) }

  function copyVal(val, key) {
    navigator.clipboard.writeText(val)
    setCopiedKey(key)
    setTimeout(()=>setCopiedKey(null), 1800)
  }

  function copyAll() {
    if (!selected) return
    const lines = [`Fachbegriff: ${selected.de}`]
    if (selected.de_allg) lines.push(`Allgemeinbegriff: ${selected.de_allg}`)
    UEB_LANGS.forEach(l => { if (selected[l.key]) lines.push(`${l.label}: ${selected[l.key]}`) })
    navigator.clipboard.writeText(lines.join('\n'))
    showToast('✓ Alle Übersetzungen kopiert')
  }

  function toggleLang(key) {
    setVisible(prev => ({...prev, [key]: !prev[key]}))
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <div className="page-title">Übersetzung</div>
          <div className="page-date">1.585 medizinische Fachbegriffe · 7 Sprachen</div>
        </div>
      </div>

      <div style={{padding:'0 28px 28px'}}>
        {/* Controls */}
        <div className="ueb-controls">
          {/* Search */}
          <div className="ueb-search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Begriff suchen..." autoComplete="off"
              value={search} onChange={e=>{setSearch(e.target.value);setSelected(null)}}/>
            {search && (
              <button className="ueb-clear-btn" onClick={()=>{setSearch('');setSelected(null)}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="ueb-filter-row">
            <div className="ueb-cat-select-wrap">
              <select className="ueb-cat-select" value={cat} onChange={e=>{setCat(e.target.value);setSelected(null)}}>
                {categories.map(c=><option key={c} value={c}>{c==='all'?'Alle Kategorien':c}</option>)}
              </select>
              <svg className="ueb-cat-select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div className="ueb-lang-toggles">
              {UEB_LANGS.map(l=>(
                <button key={l.key} className={`ueb-lang-toggle${visibleLangs[l.key]?' active':''}`}
                  onClick={()=>toggleLang(l.key)} title={l.label}>
                  <Flag lang={l.key}/> {l.abbr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="ueb-results-info">{filtered.length} Ergebnis{filtered.length!==1?'se':''}</div>

        {/* Layout */}
        <div className="ueb-layout">

          {/* List */}
          <div className="ueb-list-container">
            {data.length === 0 && (
              <div className="ueb-empty">Daten werden geladen…</div>
            )}
            {data.length > 0 && filtered.length === 0 && (
              <div className="ueb-empty">Keine Ergebnisse</div>
            )}
            <div className="ueb-list">
              {filtered.map((b,i)=>(
                <div key={i} className={`ueb-item${selected===b?' selected':''}`} onClick={()=>setSelected(b)}>
                  <div className="ueb-item-term">{b.de}</div>
                  {b.de_allg && <div className="ueb-item-sub">{b.de_allg}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="ueb-detail-card">
            {!selected && (
              <div className="ueb-detail-empty">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <div style={{fontSize:13,color:'var(--text-3)',marginTop:12}}>Begriff auswählen</div>
              </div>
            )}
            {selected && (
              <>
                <div className="ueb-detail-header">
                  <div>
                    <div className="ueb-detail-term">{selected.de}</div>
                    <div className="ueb-detail-cat">{selected.cat}</div>
                  </div>
                  <button className="result-action-btn" onClick={copyAll} title="Alle kopieren" style={{flexShrink:0}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
                <div className="ueb-detail-rows">
                  {/* DE Fachbegriff */}
                  <div className="ueb-detail-row">
                    <span className="ueb-detail-lang"><Flag lang="de"/></span>
                    <span className="ueb-detail-label"><span className="ueb-lbl-full">Fachbegriff</span><span className="ueb-lbl-abbr">Fach.</span></span>
                    <span className="ueb-detail-val">{selected.de}</span>
                    <button className="ueb-detail-copy ueb-detail-copy-visible" onClick={()=>copyVal(selected.de,'de_fach')} style={{color:copiedKey==='de_fach'?'var(--orange)':''}}>
                      {copiedKey==='de_fach' ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : COPY_ICON}
                    </button>
                  </div>
                  {/* DE Allgemeinbegriff */}
                  <div className="ueb-detail-row">
                    <span className="ueb-detail-lang"><Flag lang="de"/></span>
                    <span className="ueb-detail-label"><span className="ueb-lbl-full">Allgemeinbegriff</span><span className="ueb-lbl-abbr">Allg.</span></span>
                    {selected.de_allg
                      ? <><span className="ueb-detail-val">{selected.de_allg}</span>
                          <button className="ueb-detail-copy ueb-detail-copy-visible" onClick={()=>copyVal(selected.de_allg,'de_allg')} style={{color:copiedKey==='de_allg'?'var(--orange)':''}}>
                            {copiedKey==='de_allg' ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : COPY_ICON}
                          </button></>
                      : <><span className="ueb-detail-val empty">—</span><span style={{width:26,flexShrink:0}}/></>
                    }
                  </div>
                  <div className="ueb-detail-divider"/>
                  {/* Other langs */}
                  {UEB_LANGS.filter(l=>visibleLangs[l.key]).map(l=>(
                    selected[l.key] ? (
                      <div key={l.key} className="ueb-detail-row">
                        <span className="ueb-detail-lang"><Flag lang={l.key}/></span>
                        <span className="ueb-detail-label"><span className="ueb-lbl-full">{l.label}</span><span className="ueb-lbl-abbr">{l.abbr}</span></span>
                        <span className="ueb-detail-val">{selected[l.key]}</span>
                        <button className="ueb-detail-copy" onClick={()=>copyVal(selected[l.key],l.key)} style={{color:copiedKey===l.key?'var(--orange)':''}}>
                          {copiedKey===l.key ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : COPY_ICON}
                        </button>
                      </div>
                    ) : null
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && <div style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',background:'var(--orange)',color:'white',padding:'10px 22px',borderRadius:10,fontSize:14,fontWeight:600,zIndex:99999}}>{toast}</div>}
    </div>
  )
}
