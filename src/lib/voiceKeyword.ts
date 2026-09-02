/**
 * Whole-word keyword matching for the Voice Clip microphone test.
 * Mirrors supabase/functions/_shared/voiceClip.ts so the browser test and the
 * Companion agree on what counts as a real command.
 */
const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function matchesKeyword(transcript: string, keyword: string): boolean {
  const word = normalize(keyword.trim());
  if (!word) return false;
  const tokens = normalize(transcript).split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.includes(word);
}
