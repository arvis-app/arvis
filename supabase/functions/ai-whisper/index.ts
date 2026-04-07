import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ALLOWED_ORIGINS: string[] = ['https://arvis-app.de', 'https://www.arvis-app.de',
  ...(Deno.env.get('ALLOW_LOCALHOST') === 'true' ? ['http://localhost:3000', 'http://localhost:5173'] : [])]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://arvis-app.de'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

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
      .select('plan, trial_started_at, subscription_end_date')
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

    // Rate limit horaire : max 100k tokens / heure (partagé avec ai-chat)
    const HOURLY_TOKEN_LIMIT = 100_000
    const { data: rateCols } = await supabaseAdmin
      .from('users')
      .select('ai_hourly_tokens, ai_hourly_reset_at')
      .eq('id', user.id)
      .single()

    let hourlyTokens = rateCols?.ai_hourly_tokens ?? 0
    const hourlyResetAt = rateCols?.ai_hourly_reset_at ? new Date(rateCols.ai_hourly_reset_at) : new Date(0)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    if (hourlyResetAt < oneHourAgo) {
      hourlyTokens = 0
      await supabaseAdmin
        .from('users')
        .update({ ai_hourly_tokens: 0, ai_hourly_reset_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    if (hourlyTokens >= HOURLY_TOKEN_LIMIT) {
      return new Response(
        JSON.stringify({ error: 'rate_limited', message: 'Bitte warten Sie einen Moment. Stündliches KI-Limit erreicht.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    const formData = await req.formData()
    const audioFile = formData.get('file')
    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(JSON.stringify({ error: 'Audiodatei fehlt' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const MAX_BYTES = 25 * 1024 * 1024
    if (audioFile.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'Datei zu groß (max. 25 MB)' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const ALLOWED_AUDIO = new Set(['audio/mpeg','audio/mp4','audio/wav','audio/webm','audio/ogg','audio/flac','video/mp4','video/webm'])
    if (!ALLOWED_AUDIO.has(audioFile.type)) {
      return new Response(JSON.stringify({ error: 'Ungültiges Dateiformat' }), {
        status: 415, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const prompt = formData.get('prompt') ?? ''

    const fd = new FormData()
    fd.append('file', audioFile)
    fd.append('model', 'whisper-1')
    fd.append('language', 'de')
    fd.append('prompt', prompt)

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey },
      body: fd,
    })

    const data = await response.json()
    if (!response.ok) return new Response(
      JSON.stringify({ error: data.error?.message || 'API Fehler ' + response.status }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    // Incrémenter compteur horaire (~1000 tokens estimés par transcription)
    const estimatedTokens = 1000
    await supabaseAdmin
      .from('users')
      .update({ ai_hourly_tokens: (hourlyTokens + estimatedTokens) })
      .eq('id', user.id)

    return new Response(
      JSON.stringify({ text: data.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('ai-whisper error:', e)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
