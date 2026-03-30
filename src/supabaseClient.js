import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jmanxlmzvfnhpgcxsqly.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptYW54bG16dmZuaHBnY3hzcWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODE4NDYsImV4cCI6MjA4OTE1Nzg0Nn0.O6Mjh2KRydHtCj4ZxyZaaqzcleOQOq4jC01zoSaYxws'

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

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || data?.message || `HTTP ${response.status}`)
  if (data?.error) throw new Error(data.error)
  return data
}
