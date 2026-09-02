"use strict";

/**
 * Streamnco backend client.
 *
 * SECURITY: the Companion authenticates with its own pairing token only.
 * It never holds, sees or sends a Twitch OAuth token, and it never sends a
 * user id — the backend resolves the user from the pairing token.
 *
 * PRIVACY: the only payloads sent are small JSON detection events. No audio
 * buffer, blob, PCM, file or transcript is ever transmitted.
 */

const DEFAULT_BASE =
  process.env.STREAMNCO_API_BASE ||
  "https://poblhczgdbnfunroshul.supabase.co/functions/v1";

class StreamncoApi {
  constructor(options = {}) {
    this.base = options.base || DEFAULT_BASE;
    this.token = options.token || null;
    this.version = options.version || "1.0.0";
    this.platform = options.platform || process.platform;
  }

  setToken(token) {
    this.token = token;
  }

  async post(pathname, body) {
    if (!this.token) throw new Error("COMPANION_NOT_PAIRED");
    const res = await fetch(`${this.base}/${pathname}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-companion-token": this.token,
      },
      body: JSON.stringify(body ?? {}),
    });
    const payload = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, payload };
  }

  /** Liveness + config pull. Also carries the microphone test result. */
  heartbeat(extra = {}) {
    return this.post("voice-clip-heartbeat", {
      version: this.version,
      platform: this.platform,
      ...extra,
    });
  }

  /**
   * Reports one detected voice command. Retries are safe: the same
   * voice_event_id can never produce a second clip (unique index server-side).
   */
  trigger({ voiceEventId, keyword, confidence, detectedAt }) {
    return this.post("voice-clip-trigger", {
      voice_event_id: voiceEventId,
      keyword,
      confidence,
      detected_at: detectedAt,
      sent_at: new Date().toISOString(),
    });
  }
}

/** Bounded retry with backoff — reuses the SAME voice_event_id on purpose. */
async function withRetries(fn, { attempts = 3, delays = [1000, 3000, 6000], onRetry } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await fn();
      // 5xx is transient; anything else (including 4xx) is terminal.
      if (result.status >= 500) throw new Error(`HTTP_${result.status}`);
      return result;
    } catch (error) {
      lastError = error;
      if (i === attempts - 1) break;
      if (onRetry) onRetry(i + 1, error);
      await new Promise((r) => setTimeout(r, delays[i] ?? 5000));
    }
  }
  throw lastError;
}

module.exports = { StreamncoApi, withRetries, DEFAULT_BASE };
