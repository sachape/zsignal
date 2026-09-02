// Shared, pure helpers for the Voice Clip pipeline.
// Kept side-effect free so they can be unit tested without network or DB.
//
// PRIVACY: nothing in this module handles audio. The Companion only ever sends
// { voice_event_id, keyword, confidence, detected_at } — no PCM, no blob,
// no transcript. There is deliberately no audio upload endpoint anywhere.

/** Canonical Voice Clip error codes. Never displayed raw to the user. */
export const VOICE_CLIP_ERROR = {
  STREAM_OFFLINE: "STREAM_OFFLINE",
  TWITCH_SCOPE_MISSING: "TWITCH_SCOPE_MISSING",
  TWITCH_TOKEN_EXPIRED: "TWITCH_TOKEN_EXPIRED",
  TWITCH_REAUTH_REQUIRED: "TWITCH_REAUTH_REQUIRED",
  TWITCH_CREATE_CLIP_FAILED: "TWITCH_CREATE_CLIP_FAILED",
  TWITCH_CLIP_NOT_READY: "TWITCH_CLIP_NOT_READY",
  TWITCH_UNAVAILABLE: "TWITCH_UNAVAILABLE",
  COMPANION_UNAUTHORIZED: "COMPANION_UNAUTHORIZED",
  VOICE_EVENT_DUPLICATE: "VOICE_EVENT_DUPLICATE",
  VOICE_EVENT_COOLDOWN: "VOICE_EVENT_COOLDOWN",
  VOICE_CLIP_DISABLED: "VOICE_CLIP_DISABLED",
  LOW_CONFIDENCE: "LOW_CONFIDENCE",
  MICROPHONE_UNAVAILABLE: "MICROPHONE_UNAVAILABLE",
  CONTENT_QUEUE_INSERT_FAILED: "CONTENT_QUEUE_INSERT_FAILED",
  SERVER_MISCONFIGURED: "SERVER_MISCONFIGURED",
  TWITCH_NOT_CONNECTED: "TWITCH_NOT_CONNECTED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type VoiceClipErrorCode = typeof VOICE_CLIP_ERROR[keyof typeof VOICE_CLIP_ERROR];

/** Maps the shared Twitch auth helper failures onto Voice Clip error codes. */
export function mapTwitchAuthError(error: string): VoiceClipErrorCode {
  switch (error) {
    case "server_misconfigured":
      return VOICE_CLIP_ERROR.SERVER_MISCONFIGURED;
    case "twitch_not_connected":
      return VOICE_CLIP_ERROR.TWITCH_NOT_CONNECTED;
    case "token_unavailable":
      return VOICE_CLIP_ERROR.TWITCH_REAUTH_REQUIRED;
    default:
      return VOICE_CLIP_ERROR.UNKNOWN_ERROR;
  }
}

/**
 * Backend safety net for the Companion-side cooldown.
 * Returns true when a new detection arrives too soon after the previous one.
 */
export function isWithinCooldown(
  previousDetectedAt: string | null | undefined,
  detectedAt: string,
  cooldownSeconds: number,
): boolean {
  if (!previousDetectedAt) return false;
  const previous = Date.parse(previousDetectedAt);
  const current = Date.parse(detectedAt);
  if (Number.isNaN(previous) || Number.isNaN(current)) return false;
  const delta = current - previous;
  if (delta < 0) return true; // out-of-order replay
  return delta < Math.max(0, cooldownSeconds) * 1000;
}

/** Progressive backoff (ms) while Twitch finishes processing the clip. */
export const CLIP_FETCH_DELAYS_MS = [2000, 3000, 4000, 6000, 8000, 10000];

/** Whole-word keyword match — "clipping" / "ce clip est fou" must not trigger. */
export function matchesKeyword(transcript: string, keyword: string): boolean {
  const word = keyword.trim().toLowerCase();
  if (!word) return false;
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const tokens = normalize(transcript).split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.includes(normalize(word));
}

/** Structured log helper — never logs tokens, audio or transcripts. */
export function logVoiceClip(event: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ event: `voice_clip_${event}`, ...fields, at: new Date().toISOString() }));
}

/** Latency breakdown in milliseconds, all optional (missing = null). */
export function computeLatencies(marks: {
  detectedAt?: string | null;
  companionSentAt?: string | null;
  receivedAt?: string | null;
  twitchRequestAt?: string | null;
  twitchResponseAt?: string | null;
  clipReadyAt?: string | null;
  contentQueuedAt?: string | null;
}): Record<string, number | null> {
  const ms = (a?: string | null, b?: string | null): number | null => {
    if (!a || !b) return null;
    const start = Date.parse(a);
    const end = Date.parse(b);
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
    return end - start;
  };
  return {
    voice_detection_latency: ms(marks.detectedAt, marks.companionSentAt),
    companion_to_backend_latency: ms(marks.companionSentAt ?? marks.detectedAt, marks.receivedAt),
    twitch_creation_latency: ms(marks.twitchRequestAt, marks.twitchResponseAt),
    clip_ready_latency: ms(marks.twitchResponseAt, marks.clipReadyAt),
    total_voice_to_clip_latency: ms(marks.detectedAt, marks.contentQueuedAt ?? marks.clipReadyAt),
  };
}
