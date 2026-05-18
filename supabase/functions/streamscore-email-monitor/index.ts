// Scheduled monitor: scans recent stream_score_snapshots, compares each to the
// previous snapshot for the same user, and dispatches a StreamScore movement
// email (improved / dropped / tier_changed) when send rules are satisfied.
//
// Send rules (must ALL hold):
//   - confidence != 'low'
//   - user has a real (non-synthetic) email
//   - improved:        delta >= +5  AND no movement email in last 7 days
//   - dropped:         delta <= -5  AND no movement email in last 7 days
//   - tier_changed:    tier(prev) != tier(latest), per-transition idempotent
//   - snapshot/email_key not already recorded in streamscore_email_events
//
// Tracking: streamscore_email_events(user_id, snapshot_id, email_key) UNIQUE.
import { createClient } from 'npm:@supabase/supabase-js@2'

const PROJECT_URL = 'https://poblhczgdbnfunroshul.supabase.co'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
const MIN_DELTA = 5
// Look back window for "recent" snapshots to consider (avoids reprocessing
// ancient backlog every hour).
const LOOKBACK_HOURS = 24
const LOOKBACK_MS = LOOKBACK_HOURS * 60 * 60 * 1000

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
  const n = email.trim().toLowerCase()
  if (!n || !n.includes('@')) return true
  return SYNTHETIC_PATTERNS.some((p) => p.test(n))
}

function tierOf(overall: number): 'low' | 'mid' | 'high' {
  if (overall >= 70) return 'high'
  if (overall >= 35) return 'mid'
  return 'low'
}

const DIM_LABEL: Record<string, string> = {
  regularity: 'Régularité',
  structure: 'Structure',
  content: 'Contenu',
  positioning: 'Positionnement',
  momentum: 'Momentum',
  monetization: 'Monétisation',
}

type Snapshot = {
  id: string
  user_id: string
  created_at: string
  overall: number
  regularity: number | null
  structure: number | null
  content: number | null
  positioning: number | null
  momentum: number | null
  monetization: number | null
  confidence: string
  signal_quality: string
  priority_dimension: string | null
  top_drag: string | null
  top_support: string | null
}

function safeLog(event: string, ctx: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...ctx }))
}

async function sendEmail(
  templateName: string,
  recipientEmail: string,
  idempotencyKey: string,
  templateData: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(`${PROJECT_URL}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ templateName, recipientEmail, idempotencyKey, templateData }),
  })
  const body = await res.text().catch(() => '')
  return { ok: res.ok, status: res.status, body: body.slice(0, 200) }
}

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Cron-secret auth — this function is invoked by pg_cron, not by users.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: ok } = await supabase.rpc('verify_eventsub_cron_secret', { token })
  if (ok !== true) {
    return new Response('Unauthorized', { status: 401 })
  }

  const sinceIso = new Date(Date.now() - LOOKBACK_MS).toISOString()

  // 1) Fetch recent snapshots
  const { data: recent, error: recentErr } = await supabase
    .from('stream_score_snapshots')
    .select(
      'id, user_id, created_at, overall, regularity, structure, content, positioning, momentum, monetization, confidence, signal_quality, priority_dimension, top_drag, top_support',
    )
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })

  if (recentErr) {
    safeLog('streamscore_email_error', { stage: 'list_recent', message: recentErr.message })
    return new Response('error', { status: 500 })
  }

  // Keep latest snapshot per user
  const latestByUser = new Map<string, Snapshot>()
  for (const s of (recent ?? []) as Snapshot[]) {
    if (!latestByUser.has(s.user_id)) latestByUser.set(s.user_id, s)
  }

  let scanned = 0
  let sentImproved = 0
  let sentDropped = 0
  let sentTier = 0
  let skippedSmallDelta = 0
  let skippedLowConfidence = 0
  let skippedNoEmail = 0
  let skippedCooldown = 0
  let skippedAlreadyProcessed = 0
  let skippedNoPrevious = 0
  let errors = 0

  for (const latest of latestByUser.values()) {
    scanned++
    try {
      // Skip low confidence early
      if (latest.confidence === 'low') {
        skippedLowConfidence++
        continue
      }

      // Find the previous snapshot for this user (strictly before latest)
      const { data: prevRows, error: prevErr } = await supabase
        .from('stream_score_snapshots')
        .select('id, overall, created_at')
        .eq('user_id', latest.user_id)
        .lt('created_at', latest.created_at)
        .order('created_at', { ascending: false })
        .limit(1)

      if (prevErr) {
        errors++
        safeLog('streamscore_email_error', {
          stage: 'fetch_prev',
          user_id: latest.user_id,
          message: prevErr.message,
        })
        continue
      }
      const previous = prevRows?.[0]
      if (!previous) {
        skippedNoPrevious++
        continue
      }

      const delta = latest.overall - previous.overall
      const prevTier = tierOf(previous.overall)
      const curTier = tierOf(latest.overall)
      const tierChanged = prevTier !== curTier

      // Decide which email (priority: tier_changed > improved/dropped)
      let emailKey: string | null = null
      let templateName = ''
      let templateData: Record<string, unknown> = {}

      if (tierChanged) {
        emailKey = `streamscore_tier_changed_${prevTier}_to_${curTier}`
        templateName = 'streamscore-tier-changed'
        templateData = {
          previousTier: prevTier,
          currentTier: curTier,
          previousScore: previous.overall,
          currentScore: latest.overall,
        }
      } else if (delta >= MIN_DELTA) {
        emailKey = 'streamscore_improved'
        templateName = 'streamscore-improved'
        const dimKey = latest.top_support ?? null
        templateData = {
          previousScore: previous.overall,
          currentScore: latest.overall,
          topPositiveDimension: dimKey ? (DIM_LABEL[dimKey] ?? dimKey) : undefined,
        }
      } else if (delta <= -MIN_DELTA) {
        emailKey = 'streamscore_dropped'
        templateName = 'streamscore-dropped'
        const dimKey = latest.priority_dimension ?? latest.top_drag ?? null
        templateData = {
          previousScore: previous.overall,
          currentScore: latest.overall,
          priorityDimension: dimKey ? (DIM_LABEL[dimKey] ?? dimKey) : undefined,
        }
      } else {
        skippedSmallDelta++
        continue
      }

      // Idempotency: already processed this snapshot/email_key?
      const { data: alreadyEvent } = await supabase
        .from('streamscore_email_events')
        .select('id')
        .eq('user_id', latest.user_id)
        .eq('snapshot_id', latest.id)
        .eq('email_key', emailKey)
        .maybeSingle()

      if (alreadyEvent) {
        skippedAlreadyProcessed++
        continue
      }

      // 7-day cooldown for improved/dropped (NOT for tier_changed — those are
      // per-transition idempotent and rare enough to not need a cooldown).
      if (emailKey === 'streamscore_improved' || emailKey === 'streamscore_dropped') {
        const cooldownSince = new Date(Date.now() - COOLDOWN_MS).toISOString()
        const { data: recentMovement } = await supabase
          .from('streamscore_email_events')
          .select('id')
          .eq('user_id', latest.user_id)
          .in('email_key', ['streamscore_improved', 'streamscore_dropped'])
          .gte('sent_at', cooldownSince)
          .limit(1)

        if (recentMovement && recentMovement.length > 0) {
          skippedCooldown++
          continue
        }
      } else {
        // Tier-change: ensure same transition not already sent at any point.
        const { data: priorTier } = await supabase
          .from('streamscore_email_events')
          .select('id')
          .eq('user_id', latest.user_id)
          .eq('email_key', emailKey)
          .limit(1)
        if (priorTier && priorTier.length > 0) {
          skippedAlreadyProcessed++
          continue
        }
      }

      // Resolve recipient email from auth.users
      const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(
        latest.user_id,
      )
      if (userErr || !userRes?.user) {
        errors++
        safeLog('streamscore_email_error', {
          stage: 'fetch_user',
          user_id: latest.user_id,
          message: userErr?.message,
        })
        continue
      }
      const email = userRes.user.email ?? null
      if (isSyntheticEmail(email)) {
        skippedNoEmail++
        safeLog('streamscore_email_skipped_no_real_email', { user_id: latest.user_id })
        continue
      }

      const idempotencyKey = `${emailKey}-${latest.id}`
      const sendRes = await sendEmail(templateName, email!, idempotencyKey, templateData)
      if (!sendRes.ok) {
        errors++
        safeLog('streamscore_email_error', {
          stage: 'invoke',
          user_id: latest.user_id,
          email_key: emailKey,
          status: sendRes.status,
          message: sendRes.body,
        })
        continue
      }

      const { error: insertErr } = await supabase.from('streamscore_email_events').insert({
        user_id: latest.user_id,
        snapshot_id: latest.id,
        email_key: emailKey,
      })
      if (insertErr && !insertErr.message.includes('duplicate')) {
        safeLog('streamscore_email_error', {
          stage: 'mark_sent',
          user_id: latest.user_id,
          email_key: emailKey,
          message: insertErr.message,
        })
      }

      if (emailKey === 'streamscore_improved') sentImproved++
      else if (emailKey === 'streamscore_dropped') sentDropped++
      else sentTier++

      safeLog('streamscore_email_sent', {
        user_id: latest.user_id,
        snapshot_id: latest.id,
        email_key: emailKey,
        delta,
        prev_tier: prevTier,
        cur_tier: curTier,
      })
    } catch (err) {
      errors++
      safeLog('streamscore_email_error', {
        user_id: latest.user_id,
        message: (err as Error).message,
      })
    }
  }

  const summary = {
    scanned,
    sent_improved: sentImproved,
    sent_dropped: sentDropped,
    sent_tier_changed: sentTier,
    skipped_small_delta: skippedSmallDelta,
    skipped_low_confidence: skippedLowConfidence,
    skipped_no_real_email: skippedNoEmail,
    skipped_cooldown: skippedCooldown,
    skipped_already_processed: skippedAlreadyProcessed,
    skipped_no_previous: skippedNoPrevious,
    errors,
  }
  safeLog('streamscore_email_run_complete', summary)

  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
  })
})
