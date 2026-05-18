import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Synthetic OAuth/placeholder email patterns we must never email.
const SYNTHETIC_EMAIL_PATTERNS: RegExp[] = [
  /^twitch[-_]/i,
  /@users\.stream/i,
  /@twitch\.local$/i,
  /@streamnco-oauth\.local$/i,
  /^no-?email@/i,
  /^placeholder@/i,
];

function isSyntheticEmail(email: string | null | undefined): boolean {
  if (!email) return true;
  const lower = email.toLowerCase().trim();
  if (!lower.includes("@")) return true;
  return SYNTHETIC_EMAIL_PATTERNS.some((re) => re.test(lower));
}

function pickRealEmail(user: User): string | null {
  const candidates = [
    user.email,
    (user.user_metadata as Record<string, unknown> | null)?.email as string | undefined,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && !isSyntheticEmail(c)) return c.trim();
  }
  return null;
}

function pickDisplayName(user: User): string | undefined {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates = [meta.display_name, meta.full_name, meta.name, meta.preferred_username];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  return undefined;
}

/**
 * Sends the welcome email exactly once per user.
 * Safe to call on every SIGNED_IN — guarded by:
 * - localStorage flag (avoids invocation cost on reloads)
 * - profiles.welcome_email_sent_at (DB-side guarantee)
 * - send-transactional-email idempotencyKey (server-side dedupe)
 */
export async function sendWelcomeEmailOnce(user: User): Promise<void> {
  if (!user?.id) return;

  const localKey = `streamnco:welcome_email_sent:${user.id}`;
  if (localStorage.getItem(localKey)) return;

  // DB-side guard — true source of truth across devices.
  const { data: profile } = await supabase
    .from("profiles")
    .select("welcome_email_sent_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.welcome_email_sent_at) {
    localStorage.setItem(localKey, "1");
    console.info("welcome_email_already_sent");
    return;
  }

  const email = pickRealEmail(user);
  if (!email) {
    console.info("welcome_email_skipped_no_real_email");
    return;
  }

  // Server-side proxy: recipient is derived from the authenticated user on
  // the edge function side, so the client cannot send to arbitrary addresses.
  const { error } = await supabase.functions.invoke("send-welcome-email", {
    body: {},
  });

  if (error) {
    console.warn("welcome_email_error");
    return;
  }

  // Persist sent-state locally — the edge function already updated profiles.
  localStorage.setItem(localKey, "1");
  console.info("welcome_email_sent");
}
