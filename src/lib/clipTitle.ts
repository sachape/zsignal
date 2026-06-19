// Render-time normalization of clip titles.
// Strips legacy auto-generated prefixes like "Clip Twitch — ", "Clip VOD — ",
// "Clip YouTube — " and collapses obvious placeholder subjects to a clean
// fallback. The source platform is shown elsewhere as a badge.

const PREFIX_PATTERNS: RegExp[] = [
  /^\s*clip\s+twitch\s*[—–\-:]\s*/i,
  /^\s*clip\s+vod\s*[—–\-:]\s*/i,
  /^\s*clip\s+youtube\s*[—–\-:]\s*/i,
];

const PLACEHOLDER_SUBJECTS = new Set<string>([
  "ton clip twitch",
  "ta vod",
  "ton clip",
]);

const DEFAULT_FALLBACK = "Nouveau clip";

export function normalizeClipTitle(
  raw: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK,
): string {
  if (!raw) return fallback;
  let title = String(raw).trim();
  if (!title) return fallback;

  // Strip legacy auto-generated source prefixes (repeat in case of nesting).
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of PREFIX_PATTERNS) {
      if (pattern.test(title)) {
        title = title.replace(pattern, "").trim();
        changed = true;
      }
    }
  }

  if (!title) return fallback;
  if (PLACEHOLDER_SUBJECTS.has(title.toLowerCase())) return fallback;
  return title;
}
