// Format Réseaux — gestion des vidéos source (upload manuel ou Twitch VOD URL).
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VideoSourceType = "streamnco_detected" | "twitch_vod_url" | "manual_upload";

export interface VideoSource {
  id: string;
  user_id: string;
  source_type: VideoSourceType;
  source_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  platform: string | null;
  platform_video_id: string | null;
}

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

export function useVideoSources() {
  const uploadAndRegister = useCallback(async (file: File, onProgress?: (pct: number) => void) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("Le fichier est trop lourd. Limite : 500 Mo.");
    }
    const allowed = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"];
    if (!allowed.includes(file.type)) {
      throw new Error("Format non supporté. Utilise MP4, MOV ou WebM.");
    }

    const { data: signed, error: signedErr } = await supabase.functions.invoke("video-source-upload-url", {
      body: { filename: file.name, mime_type: file.type },
    });
    if (signedErr) throw new Error(signedErr.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = signed as any;
    const uploadUrl: string = s.upload_url;
    const storagePath: string = s.storage_path;
    const storageBucket: string = s.storage_bucket;

    // Upload via XHR for progress.
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("upload_failed"));
      xhr.onerror = () => reject(new Error("upload_failed"));
      xhr.send(file);
    });

    // Probe dimensions/duration client-side.
    const meta = await probeVideoMeta(file).catch(() => null);

    const { data: registered, error: regErr } = await supabase.functions.invoke("video-source-register", {
      body: {
        source_type: "manual_upload",
        storage_bucket: storageBucket,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type,
        duration_seconds: meta?.duration ?? null,
        width: meta?.width ?? null,
        height: meta?.height ?? null,
      },
    });
    if (regErr) throw new Error(regErr.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (registered as any).source as VideoSource;
  }, []);

  const registerTwitchVod = useCallback(async (twitchUrl: string) => {
    const url = new URL(twitchUrl);
    const m = url.pathname.match(/^\/videos\/(\d+)/);
    if (!m) throw new Error("URL Twitch VOD invalide.");
    const { data, error } = await supabase.functions.invoke("video-source-register", {
      body: {
        source_type: "twitch_vod_url",
        source_url: twitchUrl,
        platform: "twitch",
        platform_video_id: m[1],
      },
    });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any).source as VideoSource;
  }, []);

  return { uploadAndRegister, registerTwitchVod };
}

async function probeVideoMeta(file: File): Promise<{ duration: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    video.src = url;
  });
}
