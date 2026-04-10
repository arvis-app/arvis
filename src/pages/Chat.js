import { useState, useRef, useEffect } from 'react'
import { invokeEdgeFunction } from '../supabaseClient'
import { logError } from '../utils/logger'
import DOMPurify from 'dompurify'

const SYSTEM_PROMPT = 'Du bist ein erfahrener Arzt und medizinischer Wissenschaftler. Du sprichst mit einem Arzt — Fachsprache ist erwünscht. Wenn der Nutzer explizit nach einer Erklärung fragt (z.B. "Was ist X?"), erkläre vollständig inklusive Abkürzungen. Antworte auf hohem medizinischen und wissenschaftlichen Niveau, aber prägnant und strukturiert. Beantworte genau das, was gefragt wird — nicht mehr. Bei offenen Fragen (z.B. nur ein Wirkstoffname) gib eine kompakte Übersicht in maximal 300 Wörtern. Längere Antworten nur wenn die Frage es erfordert. STIL: Vermeide übermäßige Abkürzungen — schreibe z.B. "zweimal täglich" statt "bid", "nicht-valvuläres Vorhofflimmern" statt "NVAF" bei der ersten Nennung. Gängige Abkürzungen wie eGFR, CKD, TVT sind erlaubt, aber nicht jedes zweite Wort abkürzen.'

const STORAGE_KEY = 'arvis_chat_history'
const MAX_MESSAGES = 18 // + 1 system + 1 user = 20 (limite edge function)

function markdownToHtml(text) {
  return text.split('\n').map(line => {
    // Escape HTML
    let h = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Horizontal rule
    if (/^---+$/.test(h.trim())) return '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0">'
    // Headers
    if (/^#{3,}\s/.test(h)) return `<div style="font-weight:700;font-size:14px;margin-top:12px;margin-bottom:4px">${h.replace(/^#{3,}\s*/, '')}</div>`
    if (/^##\s/.test(h)) return `<div style="font-weight:700;font-size:15px;margin-top:14px;margin-bottom:4px">${h.replace(/^##\s*/, '')}</div>`
    if (/^#\s/.test(h)) return `<div style="font-weight:800;font-size:16px;margin-top:16px;margin-bottom:6px">${h.replace(/^#\s*/, '')}</div>`
    // Bold
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    h = h.replace(/`([^`]+)`/g, '<code style="background:var(--bg);padding:2px 5px;border-radius:4px;font-size:13px">$1</code>')
    // Bullet list
    if (/^\s*[-•]\s/.test(h)) return `<div style="padding-left:16px">${h.replace(/^\s*[-•]\s*/, '• ')}</div>`
    // Empty line
    if (!h.trim()) return '<div style="height:8px"></div>'
    return h + '<br>'
  }).join('')
}

export default function Chat() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Persist to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError('')
    const userMsg = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)

    try {
      // Build messages array: system + conversation (truncated to fit limit)
      const history = updated.length > MAX_MESSAGES
        ? updated.slice(-MAX_MESSAGES)
        : updated
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history
      ]

      const data = await invokeEdgeFunction('ai-chat', {
        model: 'gpt-5.4',
        messages: apiMessages,
        max_tokens: 4000,
      })

      const assistantMsg = { role: 'assistant', content: data.content || '' }
      setMessages(prev => [...prev, assistantMsg])
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

  function handleClear() {
    setMessages([])
    sessionStorage.removeItem(STORAGE_KEY)
    setError('')
    inputRef.current?.focus()
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 28px 20px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: 820, width: '100%', margin: '0 auto', padding: '0 16px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '24px 0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Bricolage Grotesque', sans-serif", color: 'var(--text)', margin: 0 }}>Chat</h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '4px 0 0' }}>Medizinischer KI-Assistent</p>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear}
            style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            Neuer Chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16, paddingRight: 12 }}>

        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', textAlign: 'center', padding: '40px 20px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Stellen Sie Ihre Frage</div>
            <div style={{ fontSize: 14, maxWidth: 360, lineHeight: 1.5 }}>Medizinische Fragen, Differentialdiagnosen, Leitlinien, Pharmakologie — auf Facharztniveau.</div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
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
