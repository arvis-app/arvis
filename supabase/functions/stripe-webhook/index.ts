import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import Stripe from 'npm:stripe@^14.19.0'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured')
const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16',
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

/**
 * Log a failed DB update to stripe_events_failed so it can be processed manually.
 * If this insert also fails, we at minimum log to console — Stripe will NOT be asked to retry.
 */
async function logFailedEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  event: Stripe.Event,
  customerId: string | null,
  errorMessage: string
) {
  try {
    await supabaseAdmin.from('stripe_events_failed').insert({
      event_id: event.id,
      event_type: event.type,
      customer_id: customerId,
      error_message: errorMessage,
      event_data: event.data.object as unknown as Record<string, unknown>,
    })
  } catch (insertErr) {
    console.error('stripe_events_failed insert error:', insertErr)
  }
  console.error(`[stripe-webhook] DB error for event ${event.id} (${event.type}): ${errorMessage}`)
}

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  let event: Stripe.Event
  try {
    const body = await req.text()
    // Verify Stripe signature — a 400 here is correct (invalid/tampered request)
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // After signature is verified we ALWAYS return 200 to Stripe.
  // DB errors are logged and stored for manual recovery — never retried by Stripe.
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Idempotency — ignore events already successfully processed
  const { data: alreadyProcessed } = await supabaseAdmin
    .from('stripe_events_processed')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle()
  if (alreadyProcessed) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const status = subscription.status
        const cancelAtPeriodEnd = subscription.cancel_at_period_end
        const cancelAt = subscription.cancel_at

        if (status === 'incomplete') break

        let plan = 'trial'
        if (status === 'active' && (cancelAtPeriodEnd || cancelAt)) plan = 'canceled_pending'
        else if (status === 'active') plan = 'pro'
        else if (status === 'past_due' || status === 'unpaid') plan = 'trial'
        else if (status === 'canceled' || status === 'incomplete_expired') plan = 'canceled'

        const updateData: Record<string, unknown> = { plan }

        const endTimestamp = cancelAt || subscription.current_period_end
        if (endTimestamp) {
          updateData.subscription_end_date = new Date(endTimestamp * 1000).toISOString()
        }

        if (subscription.default_payment_method) {
          try {
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
          } catch (pmErr: any) {
            // Non-fatal: plan update still proceeds even if payment method retrieval fails
            console.error('payment method retrieval error:', pmErr.message)
          }
        }

        try {
          const { error } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('stripe_customer_id', customerId)
          if (error) {
            await logFailedEvent(supabaseAdmin, event, customerId, error.message)
          }
        } catch (dbErr: any) {
          await logFailedEvent(supabaseAdmin, event, customerId, dbErr.message)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        try {
          const { error } = await supabaseAdmin
            .from('users')
            .update({ plan: 'canceled' })
            .eq('stripe_customer_id', customerId)
          if (error) {
            await logFailedEvent(supabaseAdmin, event, customerId, error.message)
          }
        } catch (dbErr: any) {
          await logFailedEvent(supabaseAdmin, event, customerId, dbErr.message)
        }
        break
      }

      case 'payment_method.attached': {
        const pm = event.data.object as Stripe.PaymentMethod
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
          try {
            const { error } = await supabaseAdmin
              .from('users')
              .update({ card_brand: brand, card_last4: last4 })
              .eq('stripe_customer_id', customerId)
            if (error) {
              await logFailedEvent(supabaseAdmin, event, customerId, error.message)
            }
          } catch (dbErr: any) {
            await logFailedEvent(supabaseAdmin, event, customerId, dbErr.message)
          }
        }
        break
      }

      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent
        const customerId = setupIntent.customer as string
        const paymentMethodId = setupIntent.payment_method as string

        if (customerId && paymentMethodId) {
          try {
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
            if (error) {
              await logFailedEvent(supabaseAdmin, event, customerId, error.message)
            }
          } catch (dbErr: any) {
            await logFailedEvent(supabaseAdmin, event, customerId, dbErr.message)
          }
        }
        break
      }

      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer
        const customerId = customer.id

        if (customer.invoice_settings?.default_payment_method) {
          try {
            const pmId = typeof customer.invoice_settings.default_payment_method === 'string'
              ? customer.invoice_settings.default_payment_method
              : (customer.invoice_settings.default_payment_method as Stripe.PaymentMethod).id

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
            if (error) {
              await logFailedEvent(supabaseAdmin, event, customerId, error.message)
            }
          } catch (dbErr: any) {
            await logFailedEvent(supabaseAdmin, event, customerId, dbErr.message)
          }
        }
        break
      }
    }
  } catch (unexpectedErr: any) {
    // Catch-all for truly unexpected errors (e.g. switch block bug)
    console.error('[stripe-webhook] unexpected error:', unexpectedErr)
    try {
      await logFailedEvent(supabaseAdmin, event, null, unexpectedErr.message)
    } catch (_) { /* ignore */ }
  }

  // Mark event as processed (idempotency)
  await supabaseAdmin.from('stripe_events_processed').insert({ event_id: event.id }).catch(() => {})

  // Always acknowledge to Stripe — prevents duplicate retries
  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
