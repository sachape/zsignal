// Scheduled job: scans users created >= 3 days ago who are unpaid and sends
// the upsell-unpaid-3-days email once per user. Designed to be invoked by
// pg_cron daily.
import { createClient } from 'npm:@supabase/supabase-js@2'

const EMAIL_KEY = 'upsell_unpaid_3_days'
const TEMPLATE_NAME = 'upsell-unpaid-3-days'

// Use the public project URL for function-to-function calls so the gateway
// validates auth headers correctly (the internal SUPABASE_URL may bypass it).
const PROJECT_URL = 'https://poblhczgdbnfunroshul.supabase.co'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Hardcoded anon JWT used only as gateway-validated Bearer for internal
// function-to-function calls (verify_jwt is true on send-transactional-email).
// This is a public publishable key, not a secret.
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmxoY3pnZGJuZnVucm9zaHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyODE1MTksImV4cCI6MjA5MTg1NzUxOX0.AZytxuMjgJQGYWV7UpKLD3Sbd6x6PbUEGL1wlr4l8M0'

// Synthetic OAuth email patterns to skip
const SYNTHETIC_PATTERNS: RegExp[] = [
  /^twitch[-_]/i,
  /@users\.stream/i,
  /@twitch\.local$/i,
  /@streamnco-oauth\.local$/i,
  /^no-email@/i,
  /@placeholder\./i,
]

function isSyntheticEmail(email: string | null | undefined): boolean {
  if (!email) return true
  const normalized = email.trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) return true
  return SYNTHETIC_PATTERNS.some((p) => p.test(normalized))
}

function safeLog(event: string, ctx: Record<string, unknown> = {}) {
  // Only log keys / non-sensitive ids
  console.log(JSON.stringify({ event, ...ctx }))
}

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  // Eligibility baseline = profiles.welcome_email_sent_at.
  // We only target users whose welcome email was sent at least 3 days ago.
  // Users without a welcome_email_sent_at are intentionally skipped to avoid
  // blasting pre-existing accounts that never went through the welcome flow.
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('user_id, welcome_email_sent_at')
    .not('welcome_email_sent_at', 'is', null)
    .lte('welcome_email_sent_at', cutoff)

  if (profilesErr) {
    safeLog('upsell_email_error', { stage: 'list_profiles', message: profilesErr.message })
    return new Response('error', { status: 500 })
  }

  const { data: usersList, error: usersErr } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (usersErr) {
    safeLog('upsell_email_error', { stage: 'list_users', message: usersErr.message })
    return new Response('error', { status: 500 })
  }

  const eligibleIds = new Set((profiles ?? []).map((p) => p.user_id))
  const candidates = usersList.users.filter((u) => eligibleIds.has(u.id))

  let sent = 0
  let skippedPaid = 0
  let skippedNoEmail = 0
  let skippedAlreadySent = 0
  let errors = 0

  for (const user of candidates) {
    try {
      const email = user.email ?? null

      if (isSyntheticEmail(email)) {
        skippedNoEmail++
        safeLog('upsell_email_skipped_no_real_email', { user_id: user.id })
        continue
      }

      // Already sent?
      const { data: existing } = await supabase
        .from('user_email_events')
        .select('id')
        .eq('user_id', user.id)
        .eq('email_key', EMAIL_KEY)
        .maybeSingle()

      if (existing) {
        skippedAlreadySent++
        safeLog('upsell_email_already_sent', { user_id: user.id })
        continue
      }

      // Paid? Check subscriptions table
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle()

      if (sub) {
        skippedPaid++
        safeLog('upsell_email_skipped_paid_user', { user_id: user.id })
        continue
      }

      // Send via the standard transactional pipeline
      const displayName =
        (user.user_metadata?.display_name as string | undefined) ??
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined)

      const invokeRes = await fetch(
        `${PROJECT_URL}/functions/v1/send-transactional-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ANON_KEY}`,
            apikey: ANON_KEY,
          },
          body: JSON.stringify({
            templateName: TEMPLATE_NAME,
            recipientEmail: email,
            idempotencyKey: `${EMAIL_KEY}-${user.id}`,
            templateData: displayName ? { displayName } : {},
          }),
        },
      )

      if (!invokeRes.ok) {
        const errBody = await invokeRes.text().catch(() => '')
        errors++
        safeLog('upsell_email_error', {
          user_id: user.id,
          stage: 'invoke',
          status: invokeRes.status,
          message: errBody.slice(0, 200),
        })
        continue
      }

      // Mark as sent (unique constraint protects us from double-marks)
      const { error: insertErr } = await supabase
        .from('user_email_events')
        .insert({ user_id: user.id, email_key: EMAIL_KEY })

      if (insertErr && !insertErr.message.includes('duplicate')) {
        safeLog('upsell_email_error', {
          user_id: user.id,
          stage: 'mark_sent',
          message: insertErr.message,
        })
      }

      sent++
      safeLog('upsell_email_sent', { user_id: user.id })
    } catch (err) {
      errors++
      safeLog('upsell_email_error', {
        user_id: user.id,
        message: (err as Error).message,
      })
    }
  }

  const summary = {
    total_candidates: candidates.length,
    sent,
    skipped_paid: skippedPaid,
    skipped_no_real_email: skippedNoEmail,
    skipped_already_sent: skippedAlreadySent,
    errors,
  }
  safeLog('upsell_email_run_complete', summary)

  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
  })
})
