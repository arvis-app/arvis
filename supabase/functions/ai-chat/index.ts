import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ALLOWED_ORIGINS = ['https://arvis-app.de', 'https://www.arvis-app.de', 'http://localhost:3000', 'http://localhost:5173']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://arvis-app.de'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const MONTHLY_TOKEN_LIMIT = 1_000_000

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) throw new Error('Not authenticated')

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('plan, trial_started_at, subscription_end_date, ai_tokens_used, ai_tokens_reset_at')
      .eq('id', user.id)
      .single()

    const now = new Date()
    let isPro = false
    if (profile) {
      if (profile.plan === 'pro' || profile.plan === 'active') {
        isPro = true
      } else if (profile.plan === 'canceled_pending') {
        // Accès maintenu jusqu'à la fin de la période payée — la date DOIT être présente (fail-closed)
        isPro = !!profile.subscription_end_date && new Date(profile.subscription_end_date) > now
      } else if (profile.plan === 'trial' && profile.trial_started_at) {
        const start = new Date(profile.trial_started_at)
        const daysUsed = Math.floor((now.getTime() - start.getTime()) / 86400000)
        if (daysUsed < 14) isPro = true
      }
    }

    if (!isPro) {
      return new Response(
        JSON.stringify({ error: 'Pro-Abonnement erforderlich' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // ────────────────────────────────────────────────────────

    // Budget cap : vérifier/reset les tokens mensuels
    let tokensUsed = profile?.ai_tokens_used ?? 0
    const resetAt = profile?.ai_tokens_reset_at ? new Date(profile.ai_tokens_reset_at) : new Date()
    const now_utc = new Date()
    const firstOfMonth = new Date(Date.UTC(now_utc.getUTCFullYear(), now_utc.getUTCMonth(), 1))

    if (resetAt < firstOfMonth) {
      // Reset mensuel
      tokensUsed = 0
      await supabaseAdmin
        .from('users')
        .update({ ai_tokens_used: 0, ai_tokens_reset_at: now_utc.toISOString() })
        .eq('id', user.id)
    }

    if (tokensUsed >= MONTHLY_TOKEN_LIMIT) {
      return new Response(
        JSON.stringify({ error: 'limit_reached', message: 'Ihr monatliches KI-Kontingent wurde erreicht.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ALLOWED_MODELS = new Set(['gpt-4o', 'gpt-4o-mini'])
    const { model: requestedModel = 'gpt-4o', max_tokens: requestedTokens = 4000, messages } = await req.json()
    const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : 'gpt-4o'
    const max_tokens = Math.min(requestedTokens, 4000) // plafond serveur : jamais plus de 4000

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model, max_tokens, messages }),
    })

    const data = await response.json()
    if (!response.ok) return new Response(
      JSON.stringify({ error: data.error?.message || 'API Fehler ' + response.status }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    const content = data.choices?.[0]?.message?.content ?? null

    // Incrémenter les tokens utilisés
    const tokensConsumed = data.usage?.total_tokens ?? 0
    if (tokensConsumed > 0) {
      await supabaseAdmin
        .rpc('increment_ai_tokens', { p_user_id: user.id, p_tokens: tokensConsumed })
    }

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
