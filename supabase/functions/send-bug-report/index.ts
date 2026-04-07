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

    const { email, message, photoUrls } = await req.json()
    if (!message?.trim()) throw new Error('Nachricht ist erforderlich')

    function escapeHtml(str: string): string {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    }

    // Validate photoUrls are actual Supabase Storage URLs
    const STORAGE_PREFIX = Deno.env.get('SUPABASE_URL') + '/storage/v1/object/public/'
    const safePhotoUrls = (photoUrls || []).filter((url: string) =>
      typeof url === 'string' && url.startsWith(STORAGE_PREFIX)
    )

    // 1. Store in database
    const { error: dbError } = await supabaseAdmin
      .from('bug_reports')
      .insert({
        user_id: user.id,
        email: email || user.email,
        message: message.trim(),
        photo_urls: photoUrls || [],
      })
    if (dbError) console.error('DB insert error:', dbError)

    // 2. Send notification email via Resend (if configured)
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const senderEmail = escapeHtml(email || user.email || 'unknown')
      const photoHtml = safePhotoUrls.length > 0
        ? `<h3>Screenshots:</h3>${safePhotoUrls.map((url: string, i: number) =>
            `<p><a href="${escapeHtml(url)}">Foto ${i + 1}</a></p><img src="${escapeHtml(url)}" style="max-width:400px;border-radius:8px;margin:8px 0;" />`
          ).join('')}`
        : ''

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Arvis Bug Report <noreply@arvis-app.de>',
          to: ['support@arvis-app.de'],
          reply_to: email || user.email || 'unknown',
          subject: `Bug Report von ${senderEmail}`,
          html: `<h2>Neuer Bug Report</h2>
<p><strong>Von:</strong> ${senderEmail}</p>
<p><strong>User ID:</strong> ${escapeHtml(user.id)}</p>
<p><strong>Datum:</strong> ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>
<hr/>
<h3>Beschreibung:</h3>
<p style="white-space:pre-wrap;">${escapeHtml(message.trim())}</p>
${photoHtml}`,
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        console.error('Resend error:', err)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('send-bug-report error:', e)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
