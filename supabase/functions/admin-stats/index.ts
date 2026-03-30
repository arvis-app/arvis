import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')
if (!ADMIN_EMAIL) throw new Error('ADMIN_EMAIL secret is not set')

const ALLOWED_ORIGINS = ['https://arvis-app.de', 'https://www.arvis-app.de', 'http://localhost:3000', 'http://localhost:5173']

serve(async (req) => {
  const origin = req.headers.get('Origin') ?? ''
  const CORS = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : 'https://arvis-app.de',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify JWT and get authenticated user identity
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    // Server-side admin check — cannot be bypassed from the client
    if (user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    // Fetch all users (service role bypasses RLS)
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('plan, created_at')

    if (fetchError) throw fetchError

    const total = users.length
    const byPlan: Record<string, number> = { trial: 0, pro: 0, canceled_pending: 0, canceled: 0 }
    users.forEach((u: any) => {
      const p = u.plan || 'trial'
      byPlan[p] = (byPlan[p] || 0) + 1
    })

    const converted = (byPlan.pro || 0) + (byPlan.canceled_pending || 0) + (byPlan.canceled || 0)
    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0'

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const newThisWeek = users.filter((u: any) => u.created_at > oneWeekAgo).length

    // AI costs — top 10 this month
    const startOfMonth = new Date(Date.UTC(
      new Date().getUTCFullYear(), new Date().getUTCMonth(), 1
    )).toISOString()

    const { data: aiData } = await supabaseAdmin
      .from('users')
      .select('email, ai_tokens_used, ai_tokens_reset_at')
      .gte('ai_tokens_reset_at', startOfMonth)
      .order('ai_tokens_used', { ascending: false })
      .limit(10)

    const rows = aiData || []
    const totalTokens = rows.reduce((sum: number, u: any) => sum + (u.ai_tokens_used || 0), 0)
    const totalCost = totalTokens * 0.000002

    return new Response(JSON.stringify({
      stats: { total, byPlan, conversionRate, newThisWeek, converted },
      aiStats: { rows, totalTokens, totalCost },
    }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('admin-stats error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }
})
