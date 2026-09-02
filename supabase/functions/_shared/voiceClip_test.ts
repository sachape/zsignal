import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  computeLatencies,
  isWithinCooldown,
  matchesKeyword,
  mapTwitchAuthError,
  VOICE_CLIP_ERROR,
} from "./voiceClip.ts";

Deno.test("matchesKeyword only fires on the isolated word", () => {
  assertEquals(matchesKeyword("clip", "clip"), true);
  assertEquals(matchesKeyword("allez, clip !", "clip"), true);
  assertEquals(matchesKeyword("clipping", "clip"), false);
  assertEquals(matchesKeyword("clips", "clip"), false);
  assertEquals(matchesKeyword("clippé", "clip"), false);
  assertEquals(matchesKeyword("ce clip est incroyable", "clip"), true);
  assertEquals(matchesKeyword("sauvegarde", "sauvegarde"), true);
  assertEquals(matchesKeyword("je sauvegarderai", "sauvegarde"), false);
});

Deno.test("isWithinCooldown blocks rapid repeats only", () => {
  const base = "2026-01-01T10:00:00.000Z";
  assertEquals(isWithinCooldown(null, base, 5), false);
  assertEquals(isWithinCooldown(base, "2026-01-01T10:00:03.000Z", 5), true);
  assertEquals(isWithinCooldown(base, "2026-01-01T10:00:06.000Z", 5), false);
  // Out-of-order replay is rejected.
  assertEquals(isWithinCooldown(base, "2026-01-01T09:59:59.000Z", 5), true);
});

Deno.test("mapTwitchAuthError maps to canonical codes", () => {
  assertEquals(mapTwitchAuthError("twitch_not_connected"), VOICE_CLIP_ERROR.TWITCH_NOT_CONNECTED);
  assertEquals(mapTwitchAuthError("token_unavailable"), VOICE_CLIP_ERROR.TWITCH_REAUTH_REQUIRED);
  assertEquals(mapTwitchAuthError("server_misconfigured"), VOICE_CLIP_ERROR.SERVER_MISCONFIGURED);
  assertEquals(mapTwitchAuthError("nope"), VOICE_CLIP_ERROR.UNKNOWN_ERROR);
});

Deno.test("computeLatencies returns null for missing marks", () => {
  const result = computeLatencies({
    detectedAt: "2026-01-01T10:00:00.000Z",
    companionSentAt: "2026-01-01T10:00:00.200Z",
    receivedAt: "2026-01-01T10:00:00.500Z",
    twitchRequestAt: "2026-01-01T10:00:00.600Z",
    twitchResponseAt: "2026-01-01T10:00:01.600Z",
  });
  assertEquals(result.voice_detection_latency, 200);
  assertEquals(result.companion_to_backend_latency, 300);
  assertEquals(result.twitch_creation_latency, 1000);
  assertEquals(result.clip_ready_latency, null);
  assertEquals(result.total_voice_to_clip_latency, null);
});
