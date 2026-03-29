import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://arvis-app.de',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {

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

    // Plan check
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

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

    // Create ephemeral token for OpenAI Realtime API
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        modalities: ['text'],
        input_audio_transcription: { model: 'whisper-1', language: 'de' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600,
          create_response: false,
        },
        instructions: 'Transkribiere präzise medizinische Fachsprache auf Deutsch. Keine Antworten, nur Transkription.',
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Realtime session creation failed')
    }

    const data = await response.json()
    return new Response(
      JSON.stringify({ token: data.client_secret?.value }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
