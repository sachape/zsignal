// Authenticated proxy that triggers the welcome email for the *calling* user.
// We never trust a client-supplied recipient — the recipient is derived from
// the JWT's user record. This keeps the generic `send-transactional-email`
// function locked to service_role while still allowing the signup flow to
// trigger a welcome email from the browser.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const PROJECT_URL = 'https://poblhczgdbnfunroshul.supabase.co'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const SYNTHETIC_PATTERNS: RegExp[] = [
  /^twitch[-_]/i,
  /@users\.stream/i,
  /@twitch\.local$/i,
  /@streamnco-oauth\.local$/i,
  /^no-?email@/i,
  /^placeholder@/i,
]

function isSyntheticEmail(email: string | null | undefined): boolean {
  if (!email) return true
  const lower = email.toLowerCase().trim()
  if (!lower.includes('@')) return true
  return SYNTHETIC_PATTERNS.some((re) => re.test(lower))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const token = authHeader.replace(/^[Bb]earer\s+/, '')
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
  if (claimsError || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const userId = claimsData.claims.sub as string

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId)
  if (userErr || !userRes?.user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const user = userRes.user
  const email = user.email ?? null
  if (isSyntheticEmail(email)) {
    return new Response(JSON.stringify({ skipped: 'no_real_email' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Idempotency: profiles.welcome_email_sent_at is the canonical guard.
  const { data: profile } = await admin
    .from('profiles')
    .select('welcome_email_sent_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (profile?.welcome_email_sent_at) {
    return new Response(JSON.stringify({ skipped: 'already_sent' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const displayName = [meta.display_name, meta.full_name, meta.name, meta.preferred_username]
    .find((c): c is string => typeof c === 'string' && c.trim().length > 0)
    ?.trim()

  const res = await fetch(`${PROJECT_URL}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      templateName: 'welcome-email',
      recipientEmail: email,
      idempotencyKey: `welcome-${userId}`,
      templateData: displayName ? { displayName } : {},
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.warn('welcome_email_proxy_error', res.status, body.slice(0, 200))
    return new Response(JSON.stringify({ error: 'send_failed' }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  await admin
    .from('profiles')
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq('user_id', userId)

  return new Response(JSON.stringify({ sent: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
