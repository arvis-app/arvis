import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

serve(async (req) => {
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

    // Verify JWT — ensures the token is genuine and not forged
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    // Read plan from DB server-side using service role (bypasses RLS, authoritative)
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('plan, trial_started_at, subscription_end_date')
      .eq('id', user.id)
      .maybeSingle()

    if (fetchError) throw fetchError

    // Compute is_pro server-side — this result cannot be tampered with by the client
    let is_pro = false
    let plan = 'trial'
    let trial_days_left = 0

    if (profile) {
      plan = profile.plan || 'trial'

      if (plan === 'pro' || plan === 'active') {
        is_pro = true
      } else if (plan === 'trial' && profile.trial_started_at) {
        const daysUsed = Math.floor(
          (Date.now() - new Date(profile.trial_started_at).getTime()) / 86400000
        )
        trial_days_left = Math.max(0, 14 - daysUsed)
        is_pro = trial_days_left > 0
      } else if (plan === 'canceled_pending' && profile.subscription_end_date) {
        is_pro = new Date(profile.subscription_end_date) > new Date()
      }
    }

    return new Response(JSON.stringify({ is_pro, plan, trial_days_left }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('get-plan-status error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }
})
