"use strict";

// Whole-word keyword matching. Mirrors src/lib/voiceKeyword.ts and
// supabase/functions/_shared/voiceClip.ts so the three layers agree.
// "clipping", "clips", "clippé" must NEVER trigger.

function normalize(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesKeyword(transcript, keyword) {
  const word = normalize(String(keyword).trim());
  if (!word) return false;
  const tokens = normalize(transcript)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return tokens.includes(word);
}

module.exports = { matchesKeyword, normalize };
