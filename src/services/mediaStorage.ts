import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Source of truth for a content item's media URL.
 *
 * Storage rule for manually-uploaded media:
 *   - `generated_video_storage_bucket` + `generated_video_storage_path` are the
 *     PERMANENT pointer. They always stay valid.
 *   - `generated_video_url` is only a short-lived signed URL used for the
 *     initial preview right after upload — never trust it as the source of
 *     truth, it can expire.
 *
 * For worker-generated clips that already expose a stable URL (no storage
 * path), we just return that URL as-is.
 */

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour — enough for a session

export interface MediaPointer {
  generated_video_url: string | null;
  generated_video_storage_bucket?: string | null;
  generated_video_storage_path?: string | null;
}

/**
 * Returns a freshly-signed URL for the item's media when we have a permanent
 * storage path, otherwise falls back to whatever URL is already on the item.
 */
export async function resolveFreshMediaUrl(
  item: MediaPointer,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<string | null> {
  const bucket = item.generated_video_storage_bucket;
  const path = item.generated_video_storage_path;
  if (bucket && path) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, ttlSeconds);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  return item.generated_video_url ?? null;
}

/**
 * React hook variant. Re-resolves the URL whenever the underlying pointer
 * changes (bucket / path / fallback URL).
 */
export function useFreshMediaUrl(
  item: MediaPointer | null | undefined,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string | null {
  const [url, setUrl] = useState<string | null>(
    item?.generated_video_url ?? null,
  );

  const bucket = item?.generated_video_storage_bucket ?? null;
  const path = item?.generated_video_storage_path ?? null;
  const fallback = item?.generated_video_url ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!bucket || !path) {
      setUrl(fallback);
      return;
    }
    void supabase.storage
      .from(bucket)
      .createSignedUrl(path, ttlSeconds)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.signedUrl) setUrl(data.signedUrl);
        else setUrl(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [bucket, path, fallback, ttlSeconds]);

  return url;
}
