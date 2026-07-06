// Studio Visuel — service layer
// Wraps edge functions + Supabase queries for the visual generation feature.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

export interface VisualTemplate {
  id: string;
  category: string;
  label: string;
  description: string;
  width: number;
  height: number;
  icon: string | null;
  base_prompt: string;
  sort_order: number;
}

export type VisualJobStatus = "queued" | "processing" | "succeeded" | "failed";

export interface VisualJob {
  id: string;
  user_id: string;
  template_id: string;
  status: VisualJobStatus;
  params: Record<string, any> | null;
  provider: string | null;
  model: string | null;
  prompt_used: string | null;
  error_code: string | null;
  error_message: string | null;
  provider_response_has_image: boolean | null;
  reference_asset_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface GeneratedVisual {
  id: string;
  job_id: string;
  template_id: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  variant_index: number;
  is_favorite: boolean;
  created_at: string;
  signedUrl?: string | null;
}

export interface CreateJobParams {
  template_id: string;
  params: Record<string, any>;
  reference_asset_id?: string | null;
}

export async function fetchTemplates(): Promise<VisualTemplate[]> {
  const { data, error } = await (supabase as any)
    .from("visual_templates")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as VisualTemplate[];
}

export async function createVisualJob(input: CreateJobParams): Promise<{ job_id: string }> {
  const { data, error } = await supabase.functions.invoke("visual-job-create", {
    body: input,
  });
  // Try to surface a structured error payload from non-2xx responses.
  let payload: any = data;
  if (error && (error as any)?.context?.response) {
    try {
      payload = await (error as any).context.response.clone().json();
    } catch { /* keep null */ }
  }
  if (payload?.error === "quota_exceeded" || payload?.error === "quota_and_credits_exceeded" || p?.error === "streamcoins_insufficient" || payload?.error === "streamcoins_insufficient") {
    const err: any = new Error("quota_exceeded");
    err.code = "quota_exceeded";
    err.limit = payload.limit ?? payload.quotaLimit;
    err.used = payload.used ?? payload.quotaUsed;
    err.plan = payload.plan;
    err.creditsRequired = payload.creditsRequired;
    err.creditsAvailable = payload.creditsAvailable;
    throw err;
  }
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { job_id: string };
}

export async function fetchJob(jobId: string): Promise<VisualJob | null> {
  const { data, error } = await (supabase as any)
    .from("visual_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as VisualJob | null;
}

export async function fetchJobVariants(jobId: string): Promise<GeneratedVisual[]> {
  const { data, error } = await (supabase as any)
    .from("generated_visuals")
    .select("*")
    .eq("job_id", jobId)
    .order("variant_index", { ascending: true });
  if (error) throw error;
  const variants = (data ?? []) as GeneratedVisual[];
  await Promise.all(
    variants.map(async (v) => {
      v.signedUrl = await signedUrlFor(v.storage_bucket, v.storage_path);
    }),
  );
  return variants;
}

export async function fetchLibrary(limit = 60): Promise<GeneratedVisual[]> {
  const { data, error } = await (supabase as any)
    .from("generated_visuals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const visuals = (data ?? []) as GeneratedVisual[];
  await Promise.all(
    visuals.map(async (v) => {
      v.signedUrl = await signedUrlFor(v.storage_bucket, v.storage_path);
    }),
  );
  return visuals;
}

export async function toggleFavorite(visualId: string, value: boolean): Promise<void> {
  const { error } = await (supabase as any)
    .from("generated_visuals")
    .update({ is_favorite: value })
    .eq("id", visualId);
  if (error) throw error;
}

export async function deleteVisual(visual: GeneratedVisual): Promise<void> {
  await supabase.storage.from(visual.storage_bucket).remove([visual.storage_path]);
  const { error } = await (supabase as any)
    .from("generated_visuals")
    .delete()
    .eq("id", visual.id);
  if (error) throw error;
}

export async function fetchBrandKit() {
  const { data, error } = await (supabase as any)
    .from("creator_brand_kit")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function uploadReferenceImage(file: File): Promise<string> {
  const { data, error } = await supabase.functions.invoke("visual-asset-upload-url", {
    body: {
      filename: file.name,
      mime_type: file.type || "image/png",
      size_bytes: file.size,
    },
  });
  if (error) throw error;
  const payload = data as any;
  if (payload?.error) throw new Error(payload.error);

  const uploadRes = await fetch(payload.upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/png" },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error(`upload_failed_${uploadRes.status}`);
  }
  return payload.asset_id as string;
}

async function signedUrlFor(bucket: string, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function downloadVisual(visual: GeneratedVisual, filename: string) {
  const url = visual.signedUrl ?? (await signedUrlFor(visual.storage_bucket, visual.storage_path));
  if (!url) throw new Error("no_url");

  const targetW = visual.width ?? 0;
  const targetH = visual.height ?? 0;

  let downloadHref: string;
  let revoke = true;

  if (targetW > 0 && targetH > 0) {
    // Render the source image cover-cropped to the exact template dimensions
    // so the downloaded file is ready-to-use (e.g. Twitch banner = 1920x480).
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");

    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const srcRatio = srcW / srcH;
    const dstRatio = targetW / targetH;
    let sx = 0, sy = 0, sW = srcW, sH = srcH;
    if (srcRatio > dstRatio) {
      // source wider than target -> crop horizontally
      sW = srcH * dstRatio;
      sx = (srcW - sW) / 2;
    } else if (srcRatio < dstRatio) {
      // source taller than target -> crop vertically
      sH = srcW / dstRatio;
      sy = (srcH - sH) / 2;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sW, sH, 0, 0, targetW, targetH);

    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode_failed"))), "image/png"),
    );
    downloadHref = URL.createObjectURL(blob);
  } else {
    const res = await fetch(url);
    const blob = await res.blob();
    downloadHref = URL.createObjectURL(blob);
  }

  const a = document.createElement("a");
  a.href = downloadHref;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (revoke) URL.revokeObjectURL(downloadHref);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  });
}
