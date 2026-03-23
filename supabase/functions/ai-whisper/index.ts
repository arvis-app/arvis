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

    const token = authHeader.replace('Bearer ', '')
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
        isPro = !profile.subscription_end_date || new Date(profile.subscription_end_date) > now
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

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    const formData = await req.formData()
    const audioFile = formData.get('file')
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

    return new Response(
      JSON.stringify({ text: data.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
