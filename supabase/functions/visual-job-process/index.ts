// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  generateImage,
  ImageProviderError,
  pickOpenAISize,
} from "../_shared/visualImageProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VARIANT_COUNT = 3;
const ASSETS_BUCKET = "creator-visual-assets";
const UPLOADS_BUCKET = "creator-visual-uploads";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // Internal-only endpoint: only callable by visual-job-create (service role)
  // or pg_cron retries. Anything else would let a user re-trigger OpenAI
  // generation on an arbitrary job_id and burn quota/$.
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (bearer !== SERVICE_KEY) {
    return json({ error: "forbidden" }, 403);
  }
  try {
    const { job_id } = await req.json();
    if (!job_id) return json({ error: "job_id_required" }, 400);
    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(processJob(String(job_id)));
    return json({ ok: true, job_id }, 202);
  } catch (e) {
    console.error("[visual-job-process] error", e);
    return json({ error: "internal_error" }, 500);
  }
});


async function processJob(jobId: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  console.log("[visual_job_started]", jobId);

  // Guard: provider key
  if (!Deno.env.get("LOVABLE_API_KEY")) {
    console.error("[visual_job_failed] missing_lovable_api_key", jobId);
    await fail(admin, jobId, "missing_provider_key");
    return;
  }

  const { data: job, error: jobErr } = await admin
    .from("visual_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (jobErr || !job) {
    console.error("[visual-job-process] job_not_found", jobId, jobErr);
    return;
  }

  const { data: template } = await admin
    .from("visual_templates")
    .select("*")
    .eq("id", job.template_id)
    .maybeSingle();
  if (!template) {
    await fail(admin, jobId, "template_missing");
    return;
  }

  // Load brand kit (optional)
  const { data: brand } = await admin
    .from("creator_brand_kit")
    .select("*")
    .eq("user_id", job.user_id)
    .maybeSingle();

  await admin
    .from("visual_generation_jobs")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", jobId);

  // Load reference image if any
  let referenceDataUrl: string | null = null;
  if (job.reference_asset_id) {
    const { data: ref } = await admin
      .from("visual_uploaded_assets")
      .select("*")
      .eq("id", job.reference_asset_id)
      .maybeSingle();
    if (ref) {
      const { data: blob } = await admin.storage
        .from(ref.storage_bucket || UPLOADS_BUCKET)
        .download(ref.storage_path);
      if (blob) {
        const buf = new Uint8Array(await blob.arrayBuffer());
        const b64 = base64Encode(buf);
        referenceDataUrl = `data:${ref.mime_type || "image/png"};base64,${b64}`;
      }
    }
  }

  const prompt = buildPrompt(template, job.params || {}, brand);
  const requestedSize = pickOpenAISize(template.width, template.height);
  console.log("[visual_job_prompt]", jobId, "size=", requestedSize, prompt.slice(0, 200));

  await admin
    .from("visual_generation_jobs")
    .update({
      provider: Deno.env.get("VISUAL_IMAGE_PROVIDER") || "openai",
      model: "openai/gpt-image-2",
      prompt_used: prompt,
      error_code: null,
      provider_response_has_image: null,
    })
    .eq("id", jobId);

  let successCount = 0;
  let lastErrorCode: string | null = null;

  for (let i = 0; i < VARIANT_COUNT; i++) {
    try {
      const result = await generateImage({
        prompt,
        width: template.width,
        height: template.height,
        variantIndex: i,
        referenceDataUrl,
      });
      const path = `${job.user_id}/${jobId}/variant-${i}.png`;
      const { error: upErr } = await admin.storage
        .from(ASSETS_BUCKET)
        .upload(path, result.bytes, {
          contentType: result.mimeType,
          upsert: true,
        });
      if (upErr) {
        console.error("[visual_variant_upload_failed]", jobId, i, upErr);
        lastErrorCode = "storage_upload_failed";
        continue;
      }
      await admin.from("generated_visuals").insert({
        user_id: job.user_id,
        job_id: jobId,
        template_id: job.template_id,
        storage_bucket: ASSETS_BUCKET,
        storage_path: path,
        mime_type: result.mimeType,
        // Storage holds the model's native size; template width/height remain
        // the canonical target (frontend renders responsive).
        width: template.width,
        height: template.height,
        variant_index: i,
        prompt_used: prompt,
      });
      await admin
        .from("visual_generation_jobs")
        .update({ provider_response_has_image: result.hasImage, error_code: null })
        .eq("id", jobId);
      successCount++;
      console.log("[visual_variant_ok]", jobId, "i=", i, "provider=", result.provider, "model=", result.model);
    } catch (e) {
      if (e instanceof ImageProviderError) {
        lastErrorCode = e.code;
        console.error("[visual_variant_failed]", jobId, i, e.code, e.message);
        // Hard-stop on terminal errors — no point retrying same body 3x.
        if (
          e.code === "missing_lovable_api_key" ||
          e.code === "credits_exhausted" ||
          e.code === "provider_rejected"
        ) {
          break;
        }
      } else {
        lastErrorCode = "unknown_error";
        console.error("[visual_variant_failed]", jobId, i, e);
      }
    }
  }

  if (successCount === 0) {
    await fail(admin, jobId, lastErrorCode ?? "generation_failed");
    return;
  }
  await admin
    .from("visual_generation_jobs")
    .update({
      status: "succeeded",
      completed_at: new Date().toISOString(),
      error_code: null,
    })
    .eq("id", jobId);
  console.log("[visual_job_succeeded]", jobId, `${successCount}/${VARIANT_COUNT}`);
}

function buildPrompt(template: any, params: Record<string, any>, brand: any): string {
  const lines: string[] = [];
  lines.push(template.base_prompt);
  lines.push(
    `Target format ${template.width}x${template.height} (${ratioLabel(template.width, template.height)}).`,
  );
  if (params.headline) lines.push(`Featured headline concept: "${params.headline}".`);
  if (params.subtext) lines.push(`Secondary concept: "${params.subtext}".`);
  if (params.game) lines.push(`Game / category context: ${params.game}.`);
  if (params.style) lines.push(`Visual style: ${params.style}.`);
  if (params.palette) lines.push(`Color palette: ${params.palette}.`);
  if (params.mood) lines.push(`Mood: ${params.mood}.`);
  if (params.display_name) lines.push(`Streamer alias: ${params.display_name}.`);
  if (params.handle) lines.push(`Streamer handle: ${params.handle}.`);
  if (params.cta) lines.push(`Call to action intent: ${params.cta}.`);
  if (params.notes) lines.push(`Additional direction: ${params.notes}.`);
  if (brand?.primary_color) lines.push(`Brand primary color: ${brand.primary_color}.`);
  if (brand?.secondary_color) lines.push(`Brand secondary color: ${brand.secondary_color}.`);
  if (brand?.brand_tone) lines.push(`Brand tone: ${brand.brand_tone}.`);
  lines.push(
    "Premium streamer/gaming marketing visual. Clean modern composition, dramatic lighting, depth, sharp focal subject, leave breathing room for overlay text. Avoid: cluttered layout, cheesy AI look, distorted faces, illegible or misspelled text, watermarks, UI chrome, fake logos. Keep any rendered text short and stylistically integrated.",
  );
  return lines.join(" ");
}

function ratioLabel(w: number, h: number): string {
  if (w === h) return "1:1 square";
  if (Math.abs(w / h - 16 / 9) < 0.05) return "16:9 horizontal";
  if (Math.abs(w / h - 9 / 16) < 0.05) return "9:16 vertical";
  if (Math.abs(w / h - 4 / 5) < 0.05) return "4:5 portrait";
  if (Math.abs(w / h - 4 / 1) < 0.2) return "wide banner";
  return `${w}:${h}`;
}

async function fail(admin: any, jobId: string, reason: string) {
  await admin
    .from("visual_generation_jobs")
    .update({
      status: "failed",
      error_code: reason,
      error_message: reason,
      provider_response_has_image: reason === "provider_no_image" ? false : null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  // Refund credits idempotently if this job was paid by credits.
  await admin.rpc("refund_failed_job_credits", {
    p_job_id: jobId,
    p_job_table: "visual_generation_jobs",
  }).catch?.((e: unknown) => console.warn("[visual_job_refund_failed]", (e as Error)?.message));
  console.error("[visual_job_failed]", jobId, reason);
}

function base64Encode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
