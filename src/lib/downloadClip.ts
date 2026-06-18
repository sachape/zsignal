// Utility to force-download a generated clip from Supabase Storage.
// Uses the signed URL `download` option when available, falls back to a Blob.
import { supabase } from "@/integrations/supabase/client";

const GENERATED_CLIPS_BUCKET = "creator-generated-clips";
const SIGNED_URL_TTL_SECONDS = 60 * 10;

export interface DownloadClipInput {
  storageBucket?: string | null;
  storagePath?: string | null;
  fallbackUrl?: string | null;
  clipId: string;
  platform?: string | null;
  createdAt?: string | null;
}

export function buildClipFilename(input: Pick<DownloadClipInput, "clipId" | "platform" | "createdAt">): string {
  const platform = (input.platform || "clip").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const date = (() => {
    const d = input.createdAt ? new Date(input.createdAt) : new Date();
    if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
  })();
  const shortId = input.clipId.slice(0, 8);
  return `streamnco-${platform}-${date}-${shortId}.mp4`;
}

async function getDownloadUrl(input: DownloadClipInput, filename: string): Promise<string | null> {
  const bucket = input.storageBucket || GENERATED_CLIPS_BUCKET;
  const path = input.storagePath;
  if (bucket && path) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, { download: filename });
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  if (input.fallbackUrl) {
    const sep = input.fallbackUrl.includes("?") ? "&" : "?";
    return `${input.fallbackUrl}${sep}download=${encodeURIComponent(filename)}`;
  }
  return null;
}

function triggerAnchorDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadClip(input: DownloadClipInput): Promise<void> {
  const filename = buildClipFilename(input);
  const url = await getDownloadUrl(input, filename);
  if (!url) throw new Error("no_download_url");

  // Try direct anchor first — Supabase honors ?download=... and sets
  // Content-Disposition: attachment, which makes Chrome download instead of play.
  try {
    triggerAnchorDownload(url, filename);
    return;
  } catch {
    // fall through to blob fallback
  }

  // Blob fallback in case the browser still tried to navigate.
  const res = await fetch(url);
  if (!res.ok) throw new Error("download_failed");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerAnchorDownload(objectUrl, filename);
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  }
}
