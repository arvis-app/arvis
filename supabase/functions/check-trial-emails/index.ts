import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { buildEmailHtml } from '../_shared/email-templates.ts'

serve(async (req) => {
  // Accept only authorized calls (pg_cron via service_role or manual)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer '))
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  const now = new Date()
  let reminderCount = 0
  let expiredCount = 0

  // Fetch all trial users who haven't received all emails yet
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, trial_started_at, welcome_email_sent, trial_reminder_sent, trial_expired_sent')
    .eq('plan', 'trial')
    .or('trial_reminder_sent.eq.false,trial_expired_sent.eq.false')

  if (error) {
    console.error('DB query error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  for (const user of (users || [])) {
    if (!user.trial_started_at || !user.email) continue

    const trialStart = new Date(user.trial_started_at)
    const daysSinceStart = (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24)

    // J-3 reminder: day 11 to 13 (3 days before end)
    if (daysSinceStart >= 11 && daysSinceStart < 14 && !user.trial_reminder_sent) {
      const sent = await sendEmail(resendKey, user.email, 'trial_reminder', user.first_name)
      if (sent) {
        await supabaseAdmin.from('users').update({ trial_reminder_sent: true }).eq('id', user.id)
        reminderCount++
      }
    }

    // Trial expired: day 14+
    if (daysSinceStart >= 14 && !user.trial_expired_sent) {
      const sent = await sendEmail(resendKey, user.email, 'trial_expired', user.first_name)
      if (sent) {
        await supabaseAdmin.from('users').update({ trial_expired_sent: true }).eq('id', user.id)
        expiredCount++
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, reminderCount, expiredCount, checked: users?.length || 0 }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

async function sendEmail(resendKey: string, to: string, type: string, firstName?: string): Promise<boolean> {
  try {
    const { subject, html } = buildEmailHtml(type, firstName || undefined)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Arvis <noreply@arvis-app.de>',
        to: [to],
        reply_to: 'support@arvis-app.de',
        subject,
        html,
      }),
    })
    if (!res.ok) {
      console.error(`Resend error for ${to}:`, await res.text())
      return false
    }
    return true
  } catch (e) {
    console.error(`Email send error for ${to}:`, e)
    return false
  }
}
