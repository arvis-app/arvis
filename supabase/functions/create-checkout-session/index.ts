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
      .select('stripe_customer_id, email, first_name, last_name')
      .eq('id', user.id)
      .single()

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY nicht konfiguriert')

    const { priceId } = await req.json()
    if (!priceId) throw new Error('priceId fehlt')

    const origin = req.headers.get('origin') || 'https://arvis-app.de'

    let customerId = profile?.stripe_customer_id

    // Vérifier que le client Stripe existe encore (peut avoir été supprimé)
    if (customerId) {
      const checkRes = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
        headers: { 'Authorization': `Basic ${btoa(stripeKey + ':')}` }
      })
      const checkData = await checkRes.json()
      if (!checkRes.ok || checkData.deleted) {
        // Client supprimé dans Stripe → réinitialiser
        customerId = null
        await supabaseAdmin
          .from('users')
          .update({ stripe_customer_id: null, card_brand: null, card_last4: null, plan: 'trial' })
          .eq('id', user.id)
      }
    }

    // Créer un nouveau client Stripe si nécessaire
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
    sessionParams.append('success_url', `${origin}/app/profil?success=true`)
    sessionParams.append('cancel_url', `${origin}/app/profil?canceled=true`)
    sessionParams.append('billing_address_collection', 'auto')
    sessionParams.append('subscription_data[metadata][user_id]', user.id)

    // Récupérer le produit associé au prix pour filtrer les coupons
    const priceRes = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
      headers: { 'Authorization': `Basic ${btoa(stripeKey + ':')}` }
    })
    const priceData = await priceRes.json()
    const productId = priceData?.product as string | undefined

    // Récupérer les coupons actifs et ne garder que ceux qui s'appliquent à ce produit
    const couponsRes = await fetch('https://api.stripe.com/v1/coupons?limit=20', {
      headers: { 'Authorization': `Basic ${btoa(stripeKey + ':')}` }
    })
    const couponsData = await couponsRes.json()
    const activeCoupon = couponsData?.data?.find((c: any) => {
      if (!c.valid) return false

      // Priorité 1 : restriction par price_id dans les métadonnées du coupon
      if (c.metadata?.price_id) {
        return c.metadata.price_id === priceId
      }

      // Priorité 2 : restriction par produit (applies_to)
      if (c.applies_to?.products?.length > 0) {
        return productId && c.applies_to.products.includes(productId)
      }

      // Pas de restriction → applicable à tous les prix
      return true
    })

    if (activeCoupon) {
      sessionParams.append('discounts[0][coupon]', activeCoupon.id)
    } else {
      sessionParams.append('allow_promotion_codes', 'true')
    }

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
