import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Not authenticated')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, email, first_name, last_name')
      .eq('id', user.id)
      .single()

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY nicht konfiguriert')

    const { priceId } = await req.json()
    if (!priceId) throw new Error('priceId fehlt')

    const origin = req.headers.get('origin') || 'https://arvis.app'

    let customerId = profile?.stripe_customer_id

    // Stripe-Kunde erstellen falls noch nicht vorhanden
    if (!customerId) {
      const customerParams = new URLSearchParams()
      customerParams.append('email', user.email ?? '')
      if (profile?.first_name || profile?.last_name) {
        customerParams.append('name', `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim())
      }
      customerParams.append('metadata[user_id]', user.id)

      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(stripeKey + ':')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: customerParams.toString()
      })

      const customer = await customerRes.json()
      if (!customerRes.ok) throw new Error(customer.error?.message || 'Fehler beim Erstellen des Stripe-Kunden')

      customerId = customer.id

      // Customer ID in Supabase speichern
      await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Checkout-Session erstellen
    const sessionParams = new URLSearchParams()
    sessionParams.append('customer', customerId)
    sessionParams.append('mode', 'subscription')
    sessionParams.append('line_items[0][price]', priceId)
    sessionParams.append('line_items[0][quantity]', '1')
    sessionParams.append('success_url', `${origin}/profil?success=true`)
    sessionParams.append('cancel_url', `${origin}/profil?canceled=true`)
    sessionParams.append('allow_promotion_codes', 'true')
    sessionParams.append('billing_address_collection', 'auto')
    sessionParams.append('automatic_payment_methods[enabled]', 'true')
    sessionParams.append('automatic_payment_methods[allow_redirects]', 'never')
    sessionParams.append('subscription_data[metadata][user_id]', user.id)

    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(stripeKey + ':')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sessionParams.toString()
    })

    const session = await sessionRes.json()
    if (!sessionRes.ok) throw new Error(session.error?.message || 'Fehler beim Erstellen der Checkout-Session')

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
