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
  error_message: string | null;
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
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function downloadVisual(visual: GeneratedVisual, filename: string) {
  const url = visual.signedUrl ?? (await signedUrlFor(visual.storage_bucket, visual.storage_path));
  if (!url) throw new Error("no_url");
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
