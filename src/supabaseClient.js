import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/**
 * Appel sécurisé d'une Edge Function via fetch() natif.
 * Contourne supabase.functions.invoke() qui peut lever FunctionsFetchError
 * de façon aléatoire en v2.99.x. fetch() natif est plus fiable.
 */
export async function invokeEdgeFunction(fnName, body = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sitzung abgelaufen – bitte neu anmelden.')

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(async () => {
    const text = await response.text().catch(() => '')
    if (text) console.warn('[invokeEdgeFunction] Non-JSON response from', fnName, ':', text.slice(0, 200))
    return {}
  })
  if (!response.ok) throw new Error(data?.error || data?.message || `HTTP ${response.status}`)
  if (data?.error) throw new Error(data.error)
  return data
}
