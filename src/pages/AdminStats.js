import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'

const ADMIN_EMAIL = 'amine.mabtoul@outlook.fr'
const MONTHLY_TOKEN_LIMIT = 1_000_000

function StatCard({ label, value, sub, highlight }) {
  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      <div style={{
        fontSize: 36,
        fontWeight: 700,
        color: highlight ? '#D94B0A' : 'var(--text)',
        lineHeight: 1.1,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function PlanRow({ plan, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const labels = {
    pro: 'Pro',
    trial: 'Trial',
    canceled_pending: 'Annulation en cours',
    canceled: 'Annulé',
  }
  const colors = {
    pro: '#16a34a',
    trial: '#D94B0A',
    canceled_pending: '#d97706',
    canceled: '#6b7280',
  }
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: colors[plan] || 'var(--text-muted)',
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, fontSize: 15, color: 'var(--text)' }}>{labels[plan] || plan}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', minWidth: 32, textAlign: 'right' }}>{count}</div>
      <div style={{
        fontSize: 13,
        color: 'var(--text-muted)',
        minWidth: 40,
        textAlign: 'right',
      }}>{pct}%</div>
      <div style={{ width: 80 }}>
        <div style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--border)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: colors[plan] || '#D94B0A',
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>
    </div>
  )
}

export default function AdminStats() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aiStats, setAiStats] = useState(null)

  // Protection admin
  useEffect(() => {
    if (!user) return
    if (user.email !== ADMIN_EMAIL) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return

    async function loadStats() {
      setLoading(true)
      setError('')
      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('plan, created_at')

        if (fetchError) throw fetchError

        const total = data.length

        // Par plan
        const byPlan = { trial: 0, pro: 0, canceled_pending: 0, canceled: 0 }
        data.forEach(u => {
          const p = u.plan || 'trial'
          if (byPlan.hasOwnProperty(p)) byPlan[p]++
          else byPlan[p] = (byPlan[p] || 0) + 1
        })

        // Taux de conversion : (pro + canceled_pending + canceled) / total
        const converted = (byPlan.pro || 0) + (byPlan.canceled_pending || 0) + (byPlan.canceled || 0)
        const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0'

        // Nouveaux cette semaine
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const newThisWeek = data.filter(u => new Date(u.created_at) > oneWeekAgo).length

        setStats({ total, byPlan, conversionRate, newThisWeek, converted })

        // KI-Kosten
        const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()
        const { data: aiData, error: aiError } = await supabase
          .from('users')
          .select('email, ai_tokens_used, ai_tokens_reset_at')
          .gte('ai_tokens_reset_at', startOfMonth)
          .order('ai_tokens_used', { ascending: false })
          .limit(10)

        if (!aiError && aiData) {
          const totalTokens = aiData.reduce((sum, u) => sum + (u.ai_tokens_used || 0), 0)
          const totalCost = totalTokens * 0.000002
          setAiStats({ rows: aiData, totalTokens, totalCost })
        }
      } catch (e) {
        console.error('AdminStats error:', e)
        setError('Impossible de charger les statistiques.')
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [user])

  // Accès refusé
  if (user && user.email !== ADMIN_EMAIL) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: 20,
        color: 'var(--text-muted)',
      }}>
        Accès refusé
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#D94B0A', fontSize: 16 }}>
        {error}
      </div>
    )
  }

  const planOrder = ['trial', 'pro', 'canceled_pending', 'canceled']

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-2, #f8f8f8)',
      padding: '40px 24px',
      boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Statistiques
          </div>
          <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>
            Vue d'ensemble des utilisateurs Arvis
          </div>
        </div>

        {/* Metric cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}>
          <StatCard
            label="Total utilisateurs"
            value={stats.total}
          />
          <StatCard
            label="Nouveaux cette semaine"
            value={stats.newThisWeek}
            highlight={stats.newThisWeek > 0}
          />
          <StatCard
            label="Taux de conversion"
            value={`${stats.conversionRate}%`}
            sub={`${stats.converted} ont souscrit un abonnement`}
            highlight
          />
          <StatCard
            label="Abonnés actifs (Pro)"
            value={stats.byPlan.pro || 0}
            highlight={stats.byPlan.pro > 0}
          />
        </div>

        {/* Par plan */}
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px 24px',
        }}>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: 4,
          }}>
            Répartition par plan
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {stats.total} utilisateurs au total
          </div>
          {planOrder.map(plan => (
            <PlanRow
              key={plan}
              plan={plan}
              count={stats.byPlan[plan] || 0}
              total={stats.total}
            />
          ))}
        </div>

        {/* KI-Kosten */}
        {aiStats && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginTop: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>KI-Kosten (geschätzt)</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Top 10 Nutzer · aktueller Monat · GPT-4o-mini</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)', fontWeight: 500 }}>E-Mail</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: 'var(--text-muted)', fontWeight: 500 }}>Tokens</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: 'var(--text-muted)', fontWeight: 500 }}>Kosten (€)</th>
                </tr>
              </thead>
              <tbody>
                {aiStats.rows.map((u, i) => {
                  const isHighUsage = u.ai_tokens_used > MONTHLY_TOKEN_LIMIT * 0.8
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: isHighUsage ? 'rgba(217, 75, 10, 0.06)' : 'transparent' }}>
                      <td style={{ padding: '10px 0', color: isHighUsage ? '#D94B0A' : 'var(--text)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', color: isHighUsage ? '#D94B0A' : 'var(--text)', fontWeight: isHighUsage ? 600 : 400 }}>{(u.ai_tokens_used || 0).toLocaleString('de-DE')}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', color: isHighUsage ? '#D94B0A' : 'var(--text)' }}>{((u.ai_tokens_used || 0) * 0.000002).toFixed(4)} €</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)' }}>
                  <td style={{ padding: '12px 0', fontWeight: 700, color: 'var(--text)' }}>Total</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{aiStats.totalTokens.toLocaleString('de-DE')}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{aiStats.totalCost.toFixed(4)} €</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Données en temps réel · Supabase
        </div>

      </div>
    </div>
  )
}
