import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { logError } from '../utils/logger'

// Helper: build ISO date key "YYYY-MM-DD" from JS components (month is 0-indexed)
function toDateKey(y, m0, d) { return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` }

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const MONTHS_S = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const DAYS_S = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const DAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

// ── Supabase helpers ─────────────────────────────────────────────────────────
async function fetchEvents(userId) {
  const { data, error } = await supabase
    .from('events').select('*').eq('user_id', userId)
    .abortSignal(AbortSignal.timeout(8000))
  if (error) { logError('Dashboard.fetchEvents', error); return {} }
  const map = {}
  data?.forEach(e => {
    if (!map[e.date]) map[e.date] = []
    map[e.date].push({ id: e.id, time: e.time, title: e.title, type: e.type || 'task' })
  })
  return map
}

async function fetchPatients(userId) {
  const { data, error } = await supabase
    .from('patients').select('*').eq('user_id', userId).order('created_at')
    .abortSignal(AbortSignal.timeout(8000))
  if (error) { logError('Dashboard.fetchPatients', error); return [] }
  return data || []
}

// Migration unique depuis localStorage
async function migrateLocalStorage(userId) {
  if (localStorage.getItem('arvis_migrated_v1')) return
  try {
    const localEvents = JSON.parse(localStorage.getItem('arvis_events') || '{}')
    const eventRows = []
    Object.entries(localEvents).forEach(([date, evs]) => {
      evs.forEach(e => eventRows.push({ user_id: userId, date, time: e.time || '08:00', title: e.title || '', type: e.type || 'task' }))
    })
    if (eventRows.length) await supabase.from('events').insert(eventRows)

    const localPatients = JSON.parse(localStorage.getItem('arvis_patients') || '[]')
    const realPatients = localPatients.filter(p => p.name && !['Müller, Hans','Schmidt, Anna','Weber, Klaus','Fischer, Maria','Wagner, Peter'].includes(p.name))
    if (realPatients.length) {
      await supabase.from('patients').insert(realPatients.map(p => ({ user_id: userId, room: p.room || '—', name: p.name, note: p.note || '' })))
    }
    localStorage.setItem('arvis_migrated_v1', '1')
  } catch (e) { logError('Dashboard.migrateLocalStorage', e) }
}

function Toast({ msg }) {
  if (!msg) return null
  return <div className="app-toast">{msg}</div>
}

function Calendar({ currentDate, setCurrentDate, selectedDay, setSelectedDay, events, onDayClick }) {
  const year = currentDate.getFullYear(), month = currentDate.getMonth()
  const today = new Date()
  let startDow = new Date(year, month, 1).getDay()
  startDow = startDow === 0 ? 6 : startDow - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = startDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, other: true })
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, other: false })
  const rem = 42 - (startDow + daysInMonth)
  for (let i = 1; i <= rem; i++) cells.push({ day: i, other: true })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 8px' }}>
        <button aria-label="Vorheriger Monat" className="cal-nav-btn" onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); setSelectedDay(1) }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{MONTHS[month]} {year}</span>
        <button aria-label="Nächster Monat" className="cal-nav-btn" onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); setSelectedDay(1) }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
      <div className="cal-grid" style={{ fontSize: 14 }}>
        {DAYS_S.map(d => <div key={d} className="cal-day-header">{d}</div>)}
        {cells.map((c, i) => {
          const isToday = !c.other && c.day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const isSel = !c.other && c.day === selectedDay
          const hasEv = !c.other && (events[toDateKey(year, month, c.day)] || []).length > 0
          let cls = 'cal-day' + (c.other ? ' other-month' : '') + (isToday ? ' today' : '') + (!isToday && isSel ? ' selected' : '')
          return (
            <div key={i} className={cls} style={{ position: 'relative' }} onClick={() => {
              if (c.other) return
              setSelectedDay(c.day)
              const dd = String(c.day).padStart(2, '0') + '.' + String(month + 1).padStart(2, '0') + '.' + year
              if (onDayClick) onDayClick(dd)
            }}>
              {c.day}
              {hasEv && <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--orange)' }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EventsList({ currentDate, selectedDay, events, setEvents, showToast, calClickedDate, userId }) {
  const [addOpen, setAddOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [hour, setHour] = useState('08')
  const [minute, setMinute] = useState('00')
  const [editing, setEditing] = useState(null)

  // Si le form est déjà ouvert et qu'on clique sur un autre jour, met à jour la date
  useEffect(() => {
    if (addOpen && calClickedDate) setDate(calClickedDate)
  }, [calClickedDate]) // eslint-disable-line

  function openAddForm() {
    if (calClickedDate) setDate(calClickedDate)
    setAddOpen(v => !v)
  }
  const now = new Date()
  const year = currentDate.getFullYear(), month = currentDate.getMonth()
  const day = selectedDay || now.getDate()
  const clicked = new Date(year, month, day)
  const isToday = clicked.toDateString() === now.toDateString()
  const dayLabel = isToday ? 'Heute' : `${DAYS_LONG[clicked.getDay()]}, ${day}. ${MONTHS_S[month]}`
  const key = toDateKey(year, month, day)
  const dayEvs = (events[key] || []).map(e => ({ ...e, date: clicked })).sort((a, b) => a.time.localeCompare(b.time))
  function isPast(e, d) { const [h, m] = e.time.split(':').map(Number); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m) < now }
  async function handleAdd() {
    if (!title.trim()) return
    let y = year, mo = month, d2 = day
    if (date && date.includes('.')) { const p = date.split('.'); d2 = parseInt(p[0]); mo = parseInt(p[1]) - 1; y = parseInt(p[2]) }
    const k = toDateKey(y, mo, d2)
    const ne = { ...events }

    if (editing) {
      // Supprimer l'ancien événement
      if (editing.id) {
        await supabase.from('events').delete().eq('id', editing.id)
      }
      const ok = toDateKey(editing.year, editing.month, editing.day)
      if (ne[ok]) { ne[ok] = ne[ok].filter(e => e.id !== editing.id); if (!ne[ok].length) delete ne[ok] }
      setEditing(null)
    }

    const { data: inserted } = await supabase.from('events').insert({
      user_id: userId,
      date: k, time: `${hour}:${minute}`, title: title.trim(), type: 'task'
    }).select().single()

    if (!ne[k]) ne[k] = []
    ne[k].push({ id: inserted?.id, time: `${hour}:${minute}`, title: title.trim(), type: 'task' })
    setEvents(ne); setTitle(''); setAddOpen(false); showToast('Termin gespeichert')
  }

  async function handleDel(e, d) {
    if (e.id) await supabase.from('events').delete().eq('id', e.id)
    const k = toDateKey(d.getFullYear(), d.getMonth(), d.getDate()), ne = { ...events }
    if (ne[k]) { ne[k] = ne[k].filter(ev => ev.id !== e.id); if (!ne[k].length) delete ne[k] }
    setEvents(ne)
  }
  function startEdit(e, d) {
    setEditing({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), time: e.time, title: e.title })
    setTitle(e.title); const [h, m] = e.time.split(':'); setHour(h); setMinute(m)
    setDate(String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear())
    setAddOpen(true)
  }
  const hours = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22']
  const mins = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 12, padding: '0 8px' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--orange)' }}>{dayLabel}</span>
        <button className="btn-action" onClick={openAddForm} style={{ width: 28, height: 28, padding: 0, fontSize: 20, lineHeight: 1, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 0 }}>+</button>
      </div>
      {dayEvs.length === 0 && !addOpen && <div style={{ textAlign: 'center', padding: '4px 0 16px', color: 'var(--text-muted)', fontSize: 15, fontStyle: 'italic' }}>Kein Termin</div>}
      <div className="events-list" style={{ paddingBottom: 8 }}>
        {dayEvs.map((e, i) => (
          <div key={i} className="event-item" style={{ opacity: isPast(e, e.date) ? 0.45 : 1 }}>
            <div className="event-time" style={{ minWidth: 50, fontSize: 15, cursor: 'pointer' }} onClick={() => startEdit(e, e.date)}>{e.time}</div>
            <div className="event-content" style={{ flex: 1, cursor: 'pointer' }} onClick={() => startEdit(e, e.date)}><div className="event-title" style={{ fontSize: 16 }}>{e.title}</div></div>
            <button aria-label="Termin löschen" onClick={() => handleDel(e, e.date)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        ))}
      </div>
      {addOpen && (
        <div className="add-event-form show" style={{ marginTop: 8 }}>
          <textarea className="mini-input" placeholder="Terminbezeichnung..." rows={1} value={title} onChange={e => setTitle(e.target.value)} style={{ margin: 0, resize: 'none', lineHeight: 1.5, overflow: 'hidden' }} onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleAdd() } }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input className="mini-input" type="text" placeholder="TT.MM.JJJJ" maxLength={10} value={date} onChange={e => setDate(e.target.value)} style={{ margin: 0, height: 38, boxSizing: 'border-box' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, height: 38 }}>
              <select className="mini-input" value={hour} onChange={e => setHour(e.target.value)} style={{ margin: 0, height: 38, boxSizing: 'border-box', cursor: 'pointer' }}>{hours.map(h => <option key={h}>{h}</option>)}</select>
              <select className="mini-input" value={minute} onChange={e => setMinute(e.target.value)} style={{ margin: 0, height: 38, boxSizing: 'border-box', cursor: 'pointer' }}>{mins.map(m => <option key={m}>{m}</option>)}</select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="btn-action" onClick={handleAdd} style={{ height: 40, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Hinzufügen</button>
            <button className="btn-secondary" onClick={() => { setAddOpen(false); setEditing(null); setTitle('') }} style={{ height: 40, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  )
}

function PatientsList({ patients, setPatients, showToast, addOpen, setAddOpen, userId }) {
  const [selected, setSelected] = useState(null)
  const [newRoom, setNewRoom] = useState('')
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [detailNote, setDetailNote] = useState('')
  const [detailRoom, setDetailRoom] = useState('')
  const [detailName, setDetailName] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  async function handleAdd() {
    if (!newName.trim()) return
    const { data: inserted } = await supabase.from('patients').insert({
      user_id: userId,
      room: newRoom || '—', name: newName.trim(), note: newNote
    }).select().single()
    if (inserted) setPatients(prev => [...prev, inserted])
    setNewRoom(''); setNewName(''); setNewNote(''); setAddOpen(false); showToast('Patient hinzugefügt')
  }
  function handleSel(i) { setSelected(i); setDetailRoom(patients[i].room || ''); setDetailName(patients[i].name || ''); setDetailNote(patients[i].note || '') }
  async function handleSave() {
    const p = patients[selected]
    if (!p?.id) return
    await supabase.from('patients').update({ room: detailRoom, name: detailName, note: detailNote }).eq('id', p.id)
    setPatients(prev => prev.map((pt, i) => i === selected ? { ...pt, room: detailRoom, name: detailName, note: detailNote } : pt))
    setSelected(null); showToast('Gespeichert')
  }
  async function handleDel() {
    const p = patients[confirmDel]
    if (p?.id) await supabase.from('patients').delete().eq('id', p.id)
    setPatients(prev => prev.filter((_, i) => i !== confirmDel))
    setSelected(null); setConfirmDel(null); showToast('Patient gelöscht')
  }
  return (
    <div>
      <div className="patient-thead">
        <span>Zi.</span>
        <span>Name</span>
        <span>Notiz</span>
      </div>
      <div id="patientList">
        {patients.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 15, fontStyle: 'italic' }}>Keine Patienten</div>}
        {patients.map((p, i) => (
          <div key={i} className={`patient-row${selected === i ? ' selected' : ''}`} onClick={() => handleSel(i)}>
            <span className="patient-room">{p.room}</span>
            <span className="patient-name">{p.name}</span>
            <span className="patient-note">{p.note}</span>
          </div>
        ))}
      </div>

      {/* Add patient form */}
      {addOpen && (
        <div style={{ marginTop: 12, padding: 16, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 8 }}>
            <input className="mini-input" type="text" placeholder="101" value={newRoom} onChange={e => setNewRoom(e.target.value)} style={{ margin: 0, height: 40, fontSize: 16, boxSizing: 'border-box' }} />
            <input className="mini-input" type="text" placeholder="Name, Vorname" value={newName} onChange={e => setNewName(e.target.value)} style={{ margin: 0, height: 40, fontSize: 16, boxSizing: 'border-box' }} />
          </div>
          <textarea className="mini-input" placeholder="Notiz..." rows={1} value={newNote} onChange={e => setNewNote(e.target.value)} style={{ resize: 'none', lineHeight: 1.5, margin: 0, overflow: 'hidden', fontSize: 16 }} onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="btn-action" onClick={handleAdd} style={{ fontSize: 16, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Hinzufügen</button>
            <button className="btn-secondary" onClick={() => setAddOpen(false)} style={{ fontSize: 16, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Abbrechen</button>
          </div>
        </div>
      )}

      {/* Patient detail */}
      {selected !== null && (
        <div className="patient-detail" id="patientDetail" style={{ marginTop: 12, padding: 16, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 8 }}>
            <input className="mini-input" type="text" placeholder="101" value={detailRoom} onChange={e => setDetailRoom(e.target.value)} style={{ margin: 0, height: 40, fontSize: 16, boxSizing: 'border-box' }} />
            <input className="mini-input" type="text" placeholder="Name, Vorname" value={detailName} onChange={e => setDetailName(e.target.value)} style={{ margin: 0, height: 40, fontSize: 16, boxSizing: 'border-box' }} />
          </div>
          <textarea className="mini-input" placeholder="Notiz..." rows={1} value={detailNote} onChange={e => setDetailNote(e.target.value)} style={{ resize: 'none', lineHeight: 1.5, margin: 0, overflow: 'hidden', fontSize: 16 }} ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }} onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-action" onClick={handleSave} style={{ fontSize: 16, height: 40, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Speichern</button>
            <button className="btn-danger" onClick={() => setConfirmDel(selected)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 1a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h1v14a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V5h1a1 1 0 1 0 0-2h-4V2a1 1 0 0 0-1-1H9zm0 2h6v1H9V3z"/></svg></button>
          </div>
        </div>
      )}

      {confirmDel !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 28, maxWidth: 340, width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>{patients[confirmDel]?.name} wirklich löschen?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setConfirmDel(null)} style={{ height: 40, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Abbrechen</button>
              <button className="btn-action" onClick={handleDel} style={{ height: 40, fontSize: 16, background: '#e53e3e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { getGreeting, user } = useAuth()
  const navigate = useNavigate()
  const today = new Date()
  const dateStr = `${DAYS_LONG[today.getDay()]}, ${today.getDate()}. ${MONTHS[today.getMonth()]} ${today.getFullYear()}`
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [events, setEvents] = useState({})
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [toast, setToast] = useState('')
  const [calClickedDate, setCalClickedDate] = useState('')
  const [patientAddOpen, setPatientAddOpen] = useState(false)
  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 2200) }, [])

  useEffect(() => {
    if (!user) return
    setFetchError('')
    migrateLocalStorage(user.id)
      .then(() => Promise.all([
        fetchEvents(user.id).then(setEvents),
        fetchPatients(user.id).then(setPatients)
      ]))
      .catch(e => {
        logError('Dashboard.load', e)
        setFetchError('Daten konnten nicht geladen werden. Bitte Seite neu laden.')
      })
      .finally(() => setLoading(false))
  }, [user])
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div className="spinner" /></div>

  return (
    <div className="page active" id="page-dashboard">
      {fetchError && (
        <div style={{ margin: '0 0 16px', padding: '10px 16px', borderRadius: 8, background: 'rgba(217,75,10,0.07)', color: '#D94B0A', fontWeight: 600, fontSize: 15 }}>
          {fetchError}
        </div>
      )}
      <div className="page-header">
        <div>
          <div className="page-title">{getGreeting()}</div>
          <div className="page-date">{dateStr}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-action" onClick={() => navigate('/scan')}>Scan starten</button>
        </div>
      </div>

      <div className="dashboard-grid">

        {/* Left: Calendar */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                Kalender
              </div>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              <Calendar currentDate={currentDate} setCurrentDate={setCurrentDate} selectedDay={selectedDay} setSelectedDay={setSelectedDay} events={events} onDayClick={dd => setCalClickedDate(dd)} />
              <EventsList currentDate={currentDate} selectedDay={selectedDay} events={events} setEvents={setEvents} showToast={showToast} calClickedDate={calClickedDate} userId={user?.id} />
            </div>
          </div>
        </div>

        {/* Right: Patients */}
        <div>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                Patienten
              </div>
              <button className="btn-action" onClick={() => setPatientAddOpen(v => !v)} style={{ width: 28, height: 28, padding: 0, fontSize: 20, lineHeight: 1, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
            <div className="card-body" style={{ padding: 14 }}>
              <PatientsList patients={patients} setPatients={setPatients} showToast={showToast} addOpen={patientAddOpen} setAddOpen={setPatientAddOpen} userId={user?.id} />
            </div>
          </div>
        </div>

      </div>
      <Toast msg={toast} />
    </div>
  )
}
