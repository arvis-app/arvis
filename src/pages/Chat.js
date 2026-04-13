import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase, invokeEdgeFunction } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { logError } from '../utils/logger'
import DOMPurify from 'dompurify'

const SYSTEM_PROMPT = 'Du bist ein erfahrener Arzt und medizinischer Wissenschaftler. Du sprichst mit einem Arzt — Fachsprache ist erwünscht. Wenn der Nutzer explizit nach einer Erklärung fragt (z.B. "Was ist X?"), erkläre vollständig inklusive Abkürzungen. Antworte auf hohem medizinischen und wissenschaftlichen Niveau, aber prägnant und strukturiert. Beantworte genau das, was gefragt wird — nicht mehr. Bei offenen Fragen (z.B. nur ein Wirkstoffname) gib eine kompakte Übersicht in maximal 300 Wörtern. Längere Antworten nur wenn die Frage es erfordert. STIL: Vermeide übermäßige Abkürzungen — schreibe z.B. "zweimal täglich" statt "bid", "nicht-valvuläres Vorhofflimmern" statt "NVAF" bei der ersten Nennung. Gängige Abkürzungen wie eGFR, CKD, TVT sind erlaubt, aber nicht jedes zweite Wort abkürzen. WICHTIG: Keine Vorschläge, Angebote oder Fragen am Ende der Antwort wie "Falls Sie möchten, kann ich..." oder "Soll ich auch...". Antworte nur auf die gestellte Frage und höre dann auf. Keine Wiederholung der Antwort in anderer Form (z.B. keine "Kurz:"-Zusammenfassung wenn die Antwort bereits kurz ist).'

const MAX_MESSAGES = 18

function markdownToHtml(text) {
  return text.split('\n').map(line => {
    let h = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (/^---+$/.test(h.trim())) return '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0">'
    if (/^#{3,}\s/.test(h)) return `<div style="font-weight:700;font-size:14px;margin-top:12px;margin-bottom:4px">${h.replace(/^#{3,}\s*/, '')}</div>`
    if (/^##\s/.test(h)) return `<div style="font-weight:700;font-size:15px;margin-top:14px;margin-bottom:4px">${h.replace(/^##\s*/, '')}</div>`
    if (/^#\s/.test(h)) return `<div style="font-weight:800;font-size:16px;margin-top:16px;margin-bottom:6px">${h.replace(/^#\s*/, '')}</div>`
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>')
    h = h.replace(/`([^`]+)`/g, '<code style="background:var(--bg);padding:2px 5px;border-radius:4px;font-size:13px">$1</code>')
    if (/^\s*[-•]\s/.test(h)) return `<div style="padding-left:16px">${h.replace(/^\s*[-•]\s*/, '• ')}</div>`
    if (!h.trim()) return '<div style="height:8px"></div>'
    return h + '<br>'
  }).join('')
}

export default function Chat() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listLoading, setListLoading] = useState(true)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const saveTimer = useRef(null)
  const chipsRef = useRef(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragScrollLeft = useRef(0)

  // Load conversation list on mount
  useEffect(() => {
    if (!user) return
    supabase.from('chat_conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)
      .then(({ data, error: err }) => {
        if (err) { logError('Chat:loadList', err); setListLoading(false); return }
        setConversations(data || [])
        setListLoading(false)
      })
  }, [user])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Save conversation to Supabase (debounced)
  const saveConversation = useCallback((id, msgs) => {
    if (!user || !id || msgs.length === 0) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const title = msgs.find(m => m.role === 'user')?.content?.slice(0, 60) || 'Chat'
        await supabase.from('chat_conversations')
          .update({ messages: msgs, title, updated_at: new Date().toISOString() })
          .eq('id', id).eq('user_id', user.id)
        setConversations(prev => {
          const exists = prev.find(c => c.id === id)
          if (exists) return prev.map(c => c.id === id ? { ...c, title, updated_at: new Date().toISOString() } : c)
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
          return [{ id, title, updated_at: new Date().toISOString() }, ...prev]
        })
      } catch (err) { logError('Chat:save', err) }
    }, 800)
  }, [user])

  async function loadConversation(id) {
    setActiveId(id)
    setError('')
    const { data, error: err } = await supabase.from('chat_conversations')
      .select('messages').eq('id', id).eq('user_id', user.id).single()
    if (err) { logError('Chat:load', err); return }
    setMessages(data?.messages || [])
    inputRef.current?.focus()
  }

  async function startNewChat() {
    setActiveId(null)
    setMessages([])
    setError('')
    inputRef.current?.focus()
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError('')
    const userMsg = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)

    // Create conversation if new
    let convId = activeId
    if (!convId) {
      try {
        const { data, error: err } = await supabase.from('chat_conversations')
          .insert({ user_id: user.id, title: text.slice(0, 60), messages: updated })
          .select('id').single()
        if (err) throw err
        convId = data.id
        setActiveId(convId)
        setConversations(prev => [{ id: convId, title: text.slice(0, 60), updated_at: new Date().toISOString() }, ...prev])
      } catch (err) {
        logError('Chat:create', err)
      }
    }

    try {
      const history = updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated
      const apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history]

      const data = await invokeEdgeFunction('ai-chat', {
        model: 'gpt-5.4',
        messages: apiMessages,
        max_tokens: 4000,
      })

      const assistantMsg = { role: 'assistant', content: data.content || '' }
      const final = [...updated, assistantMsg]
      setMessages(final)
      if (convId) saveConversation(convId, final)
    } catch (err) {
      logError('Chat', err)
      const msg = err.message || ''
      if (msg.includes('limit_reached') || msg.includes('Kontingent')) {
        setError('Ihr monatliches KI-Kontingent wurde erreicht.')
      } else if (msg.includes('rate_limited') || msg.includes('Stündlich')) {
        setError('Bitte warten Sie einen Moment. Stündliches KI-Limit erreicht.')
      } else if (msg.includes('Sitzung abgelaufen')) {
        setError('Sitzung abgelaufen — bitte neu anmelden.')
      } else {
        setError(msg || 'Fehler bei der Verbindung. Bitte erneut versuchen.')
      }
      // Still save what we have
      if (convId) saveConversation(convId, updated)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    await supabase.from('chat_conversations').delete().eq('id', id).eq('user_id', user.id)
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) { setActiveId(null); setMessages([]) }
  }

  // Check if arrows should show
  function updateArrows() {
    const el = chipsRef.current
    if (!el) return
    setShowLeftArrow(el.scrollLeft > 4)
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  useEffect(() => { updateArrows() }, [conversations, activeId])

  function scrollChips(dir) {
    chipsRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  // Drag-to-scroll handlers
  function onDragStart(e) {
    const el = chipsRef.current
    if (!el) return
    isDragging.current = true
    dragStartX.current = e.clientX || e.touches?.[0]?.clientX || 0
    dragScrollLeft.current = el.scrollLeft
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }

  function onDragMove(e) {
    if (!isDragging.current) return
    const x = e.clientX || e.touches?.[0]?.clientX || 0
    chipsRef.current.scrollLeft = dragScrollLeft.current - (x - dragStartX.current)
  }

  function onDragEnd() {
    if (!isDragging.current) return
    isDragging.current = false
    if (chipsRef.current) {
      chipsRef.current.style.cursor = 'grab'
      chipsRef.current.style.userSelect = ''
    }
  }

  useEffect(() => {
    document.addEventListener('mouseup', onDragEnd)
    document.addEventListener('mousemove', onDragMove)
    return () => {
      document.removeEventListener('mouseup', onDragEnd)
      document.removeEventListener('mousemove', onDragMove)
    }
  }, [])

  return (
    <div className="chat-layout-outer" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 28px 20px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: 820, width: '100%', margin: '0 auto', padding: '0 16px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '24px 0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Bricolage Grotesque', sans-serif", color: 'var(--text)', margin: 0 }}>Chat</h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '4px 0 0' }}>Medizinischer KI-Assistent</p>
        </div>
        <button onClick={startNewChat} className="chat-new-btn"
          style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Neuer Chat
        </button>
      </div>

      {/* Conversation chips */}
      {conversations.length > 0 && (
        <div style={{ position: 'relative', flexShrink: 0, paddingBottom: 10 }}>
          {showLeftArrow && (
            <button onClick={() => scrollChips(-1)} aria-label="Zurück"
              style={{ position: 'absolute', left: -2, top: 0, bottom: 10, width: 64, zIndex: 2, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 4, background: 'linear-gradient(to right, var(--bg) 40%, transparent)', borderRadius: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          {showRightArrow && (
            <button onClick={() => scrollChips(1)} aria-label="Weiter"
              style={{ position: 'absolute', right: -2, top: 0, bottom: 10, width: 64, zIndex: 2, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4, background: 'linear-gradient(to left, var(--bg) 40%, transparent)', borderRadius: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
          <div ref={chipsRef} onScroll={updateArrows} onMouseDown={onDragStart}
            style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', cursor: 'grab', padding: '0 2px' }}>
            {conversations.map(c => (
              <div key={c.id} onClick={() => { if (!isDragging.current) loadConversation(c.id) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                  background: activeId === c.id ? 'var(--orange-ghost)' : 'var(--card)',
                  color: activeId === c.id ? 'var(--orange)' : 'var(--text-2)',
                  border: `1px solid ${activeId === c.id ? 'var(--orange)' : 'var(--border)'}`,
                  transition: 'all 0.15s',
                  maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title || 'Chat'}</span>
                <svg onClick={(e) => handleDelete(c.id, e)} width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, opacity: 0.4, cursor: 'pointer' }}
                  onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0.4}>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16, paddingRight: 12 }}>

        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', textAlign: 'center', padding: '40px 20px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Stellen Sie Ihre Frage</div>
            <div style={{ fontSize: 14, maxWidth: 360, lineHeight: 1.5 }}>Medizinische Fragen, Differentialdiagnosen, Leitlinien, Pharmakologie — auf Facharztniveau.</div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div key={i} className="chat-msg-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            {msg.role === 'user' && (
              <button onClick={() => { navigator.clipboard.writeText(msg.content); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1500) }}
                title="Kopieren" className="chat-copy-btn"
                style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: copiedIdx === i ? 'var(--bg-3)' : 'transparent', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 8, padding: 0, opacity: copiedIdx === i ? 1 : 0, transition: 'opacity 0.15s' }}>
                {copiedIdx === i
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                }
              </button>
            )}
            <div style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? 'var(--orange)' : 'var(--card)',
              color: msg.role === 'user' ? 'white' : 'var(--text)',
              fontFamily: "'DM Sans', Inter, sans-serif",
              fontSize: 15,
              lineHeight: 1.6,
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              boxShadow: msg.role === 'assistant' ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
              wordBreak: 'break-word',
            }}>
              {msg.role === 'user'
                ? msg.content
                : <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(markdownToHtml(msg.content)) }} />
              }
            </div>
            {msg.role === 'assistant' && (
              <button onClick={() => { navigator.clipboard.writeText(msg.content); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1500) }}
                title="Kopieren" className="chat-copy-btn"
                style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: copiedIdx === i ? 'var(--bg-3)' : 'transparent', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 8, padding: 0, opacity: copiedIdx === i ? 1 : 0, transition: 'opacity 0.15s' }}>
                {copiedIdx === i
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                }
              </button>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div style={{
              padding: '12px 20px', borderRadius: '16px 16px 16px 4px',
              background: 'var(--card)', border: '1px solid var(--border)',
              display: 'flex', gap: 6, alignItems: 'center'
            }}>
              <span className="chat-dot" style={{ animationDelay: '0ms' }} />
              <span className="chat-dot" style={{ animationDelay: '150ms' }} />
              <span className="chat-dot" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '8px 12px', fontSize: 13, color: '#DC2626', background: 'rgba(220,38,38,0.06)', borderRadius: 8, marginBottom: 8, flexShrink: 0 }}>
          {error}
        </div>
      )}

      {/* Input area */}
      <div style={{ flexShrink: 0, paddingBottom: 20, paddingTop: 8 }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '8px 8px 8px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ihre Frage eingeben..."
            rows={1}
            style={{
              flex: 1, border: 'none', outline: 'none', resize: 'none',
              fontSize: 15, fontFamily: 'Inter, sans-serif', color: 'var(--text)',
              background: 'transparent', padding: '6px 0', maxHeight: 120,
              lineHeight: 1.5
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              width: 40, height: 40, borderRadius: 10, border: 'none',
              background: input.trim() && !loading ? 'var(--orange)' : 'var(--bg-3)',
              color: input.trim() && !loading ? 'white' : 'var(--text-3)',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s, color 0.15s'
            }}
            aria-label="Senden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
          KI-Antworten können Fehler enthalten — kein Ersatz für klinische Entscheidungen.
        </div>
      </div>
    </div>
    </div>
  )
}
