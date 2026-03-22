import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import Stripe from 'npm:stripe@^14.19.0'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || ''
const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16',
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  try {
    const body = await req.text()
    
    // Verify signature using native Web Crypto API (SubtleCrypto)
    // This avoids all Node polyfill microtask issues in the Edge Runtime.
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object
        const customerId = subscription.customer as string
        const status = subscription.status
        const cancelAtPeriodEnd = subscription.cancel_at_period_end

        let plan = 'trial'
        if (status === 'active' && cancelAtPeriodEnd) plan = 'canceled_pending'
        else if (status === 'active') plan = 'pro'
        else if (status === 'past_due' || status === 'unpaid') plan = 'trial'
        else if (status === 'canceled') plan = 'canceled'

        const updateData: any = { plan }

        // Sauvegarder la date de fin de période
        if (subscription.current_period_end) {
          updateData.subscription_end_date = new Date(subscription.current_period_end * 1000).toISOString()
        }
        
        // If a default payment method is attached natively to the subscription
        if (subscription.default_payment_method) {
          const pmId = typeof subscription.default_payment_method === 'string' 
            ? subscription.default_payment_method 
            : subscription.default_payment_method.id
            
          const pm = await stripe.paymentMethods.retrieve(pmId)
          if (pm.type === 'card' && pm.card) {
            updateData.card_brand = pm.card.brand
            updateData.card_last4 = pm.card.last4
          } else if (pm.type === 'paypal' && pm.paypal) {
            updateData.card_brand = 'paypal'
            updateData.card_last4 = pm.paypal.payer_email || 'PayPal'
          } else if (pm.type === 'sepa_debit' && pm.sepa_debit) {
            updateData.card_brand = 'sepa'
            updateData.card_last4 = pm.sepa_debit.last4
          } else {
            updateData.card_brand = pm.type
            updateData.card_last4 = ''
          }
        }

        const { error } = await supabaseAdmin
          .from('users')
          .update(updateData)
          .eq('stripe_customer_id', customerId)
        
        if (error) throw new Error('DB Error: ' + error.message)
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer as string
        const { error } = await supabaseAdmin
          .from('users')
          .update({ plan: 'canceled' })
          .eq('stripe_customer_id', customerId)
        if (error) throw new Error('DB Error: ' + error.message)
        break
      }

      case 'payment_method.attached': {
        const pm = event.data.object
        const customerId = pm.customer as string
        if (customerId) {
          let brand = pm.type
          let last4 = ''
          
          if (pm.type === 'card' && pm.card) {
            brand = pm.card.brand
            last4 = pm.card.last4
          } else if (pm.type === 'paypal' && pm.paypal) {
            brand = 'paypal'
            last4 = pm.paypal.payer_email || 'PayPal'
          } else if (pm.type === 'sepa_debit' && pm.sepa_debit) {
            brand = 'sepa'
            last4 = pm.sepa_debit.last4
          }

          const { error } = await supabaseAdmin
            .from('users')
            .update({ card_brand: brand, card_last4: last4 })
            .eq('stripe_customer_id', customerId)
          if (error) throw new Error('DB Error: ' + error.message)
        }
        break
      }
      
      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object
        const customerId = setupIntent.customer as string
        const paymentMethodId = setupIntent.payment_method as string
        
        if (customerId && paymentMethodId) {
          const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
          let brand = pm.type
          let last4 = ''
          
          if (pm.type === 'card' && pm.card) {
            brand = pm.card.brand
            last4 = pm.card.last4
          } else if (pm.type === 'paypal' && pm.paypal) {
            brand = 'paypal'
            last4 = pm.paypal.payer_email || 'PayPal'
          } else if (pm.type === 'sepa_debit' && pm.sepa_debit) {
            brand = 'sepa'
            last4 = pm.sepa_debit.last4
          }

          const { error } = await supabaseAdmin
            .from('users')
            .update({ card_brand: brand, card_last4: last4 })
            .eq('stripe_customer_id', customerId)
          if (error) throw new Error('DB Error: ' + error.message)
        }
        break
      }
      
      case 'customer.updated': {
        const customer = event.data.object
        const customerId = customer.id
        
        if (customer.invoice_settings?.default_payment_method) {
          const pmId = typeof customer.invoice_settings.default_payment_method === 'string'
            ? customer.invoice_settings.default_payment_method
            : customer.invoice_settings.default_payment_method.id
            
          const pm = await stripe.paymentMethods.retrieve(pmId)
          let brand = pm.type
          let last4 = ''
          
          if (pm.type === 'card' && pm.card) {
            brand = pm.card.brand
            last4 = pm.card.last4
          } else if (pm.type === 'paypal' && pm.paypal) {
            brand = 'paypal'
            last4 = pm.paypal.payer_email || 'PayPal'
          } else if (pm.type === 'sepa_debit' && pm.sepa_debit) {
            brand = 'sepa'
            last4 = pm.sepa_debit.last4
          }

          const { error } = await supabaseAdmin
            .from('users')
            .update({ card_brand: brand, card_last4: last4 })
            .eq('stripe_customer_id', customerId)
          if (error) throw new Error('DB Error: ' + error.message)
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
