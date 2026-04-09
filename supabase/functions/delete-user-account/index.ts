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
    if (!authHeader?.startsWith('Bearer '))
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) throw new Error('Not authenticated')

    const userId = user.id

    // 1. Charger le profil pour le stripe_customer_id
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    // 2. Supprimer le client Stripe (annule automatiquement les abos)
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (stripeKey && profile?.stripe_customer_id) {
      try {
        await fetch(`https://api.stripe.com/v1/customers/${profile.stripe_customer_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Basic ${btoa(stripeKey + ':')}` },
        })
      } catch (e) {
        console.error('Stripe customer delete failed (non-bloquant):', e)
      }
    }

    // 3. Supprimer les fichiers Storage de l'utilisateur
    const buckets = ['avatars', 'user-files', 'bug-reports', 'scan-images']
    for (const bucket of buckets) {
      try {
        const { data: files } = await supabaseAdmin.storage
          .from(bucket)
          .list(userId)
        if (files && files.length > 0) {
          const paths = files.map(f => `${userId}/${f.name}`)
          await supabaseAdmin.storage.from(bucket).remove(paths)
        }
      } catch {
        // Bucket peut ne pas exister — ignorer
      }
    }

    // 4. Supprimer les données DB (tables avec user_id)
    // L'ordre est important : d'abord les tables filles (FK), puis users
    const tables = ['user_bausteine_favs', 'scan_sessions', 'notes', 'events', 'patients', 'folders', 'bug_reports']
    for (const table of tables) {
      await supabaseAdmin.from(table).delete().eq('user_id', userId)
    }
    // Bausteine custom (user_id)
    await supabaseAdmin.from('bausteine').delete().eq('user_id', userId)
    // Table users (id = user_id)
    await supabaseAdmin.from('users').delete().eq('id', userId)

    // 5. Supprimer le compte auth (dernier, car après ça le token est invalide)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('Auth user delete error:', deleteError)
      throw new Error('Kontolöschung fehlgeschlagen')
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('delete-user-account error:', e)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
