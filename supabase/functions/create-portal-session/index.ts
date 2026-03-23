import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://arvis-app.de',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const token = authHeader.replace('Bearer ', '')

    // Admin client pour valider le JWT (même pattern que ai-chat, realtime-token)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) throw new Error('Not authenticated')

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      throw new Error('Kein Stripe-Konto gefunden.')
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY nicht konfiguriert')

    const origin = req.headers.get('origin') || 'https://arvis-app.de'

    let body = {}
    try { body = await req.json() } catch { /* no body is ok */ }

    const params = new URLSearchParams()
    params.append('customer', profile.stripe_customer_id)
    params.append('return_url', (body as any)?.returnUrl || `${origin}/profil`)

    const stripeRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(stripeKey + ':')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    })

    const session = await stripeRes.json()
    if (!stripeRes.ok) throw new Error(session.error?.message || 'Fehler bei Stripe')

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
