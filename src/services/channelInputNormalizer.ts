/**
 * Normalizes a user-provided Twitch channel input into a clean lowercase login.
 * Accepts:
 *  - "username"
 *  - "@username"
 *  - "twitch.tv/username"
 *  - "https://www.twitch.tv/username"
 *  - "https://twitch.tv/username/about"
 *  - " UserName "
 *
 * Returns null if the input cannot be normalized to a valid Twitch login.
 * Twitch logins: 4-25 chars, alphanumeric + underscore.
 */
export function normalizeChannelInput(raw: string): string | null {
  if (!raw) return null;
  let v = raw.trim().toLowerCase();
  if (!v) return null;

  // Strip leading @
  if (v.startsWith("@")) v = v.slice(1);

  // If it looks like a URL, parse it
  if (v.includes("twitch.tv") || v.startsWith("http")) {
    try {
      const withProto = v.startsWith("http") ? v : `https://${v}`;
      const url = new URL(withProto);
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length > 0) v = segments[0];
    } catch {
      // fallback: take the part after twitch.tv/
      const idx = v.indexOf("twitch.tv/");
      if (idx >= 0) {
        v = v.slice(idx + "twitch.tv/".length).split("/")[0];
      }
    }
  }

  // Strip query/fragment leftovers
  v = v.split("?")[0].split("#")[0].trim();

  if (!/^[a-z0-9_]{3,25}$/.test(v)) return null;
  return v;
}
