// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-2.5-flash-image-preview";
const VARIANT_COUNT = 3;
const ASSETS_BUCKET = "creator-visual-assets";
const UPLOADS_BUCKET = "creator-visual-uploads";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { job_id } = await req.json();
    if (!job_id) return json({ error: "job_id_required" }, 400);

    // Run async, return immediately
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

  const prompt = buildPrompt(template, job.params || {});
  console.log("[visual_job_prompt]", jobId, prompt.slice(0, 160));

  let successCount = 0;
  for (let i = 0; i < VARIANT_COUNT; i++) {
    try {
      const imgBytes = await generateImage(prompt, referenceDataUrl, i);
      if (!imgBytes) {
        console.warn("[visual_variant_empty]", jobId, i);
        continue;
      }
      const path = `${job.user_id}/${jobId}/variant-${i}.png`;
      const { error: upErr } = await admin.storage
        .from(ASSETS_BUCKET)
        .upload(path, imgBytes, {
          contentType: "image/png",
          upsert: true,
        });
      if (upErr) {
        console.error("[visual_variant_upload_failed]", jobId, i, upErr);
        continue;
      }
      await admin.from("generated_visuals").insert({
        user_id: job.user_id,
        job_id: jobId,
        template_id: job.template_id,
        storage_bucket: ASSETS_BUCKET,
        storage_path: path,
        width: template.width,
        height: template.height,
        variant_index: i,
        prompt_used: prompt,
      });
      successCount++;
      console.log("[visual_variant_ok]", jobId, i);
    } catch (e) {
      console.error("[visual_variant_failed]", jobId, i, e);
    }
  }

  if (successCount === 0) {
    await fail(admin, jobId, "generation_failed_all_variants");
    return;
  }
  await admin
    .from("visual_generation_jobs")
    .update({
      status: "succeeded",
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  console.log("[visual_job_succeeded]", jobId, `${successCount}/${VARIANT_COUNT}`);
}

function buildPrompt(template: any, params: Record<string, any>): string {
  const lines: string[] = [];
  lines.push(template.base_prompt);
  lines.push(
    `Aspect ratio ${template.width}:${template.height} (${ratioLabel(template.width, template.height)}).`,
  );
  if (params.headline) lines.push(`Main visible text: "${params.headline}".`);
  if (params.subtext) lines.push(`Secondary text: "${params.subtext}".`);
  if (params.game) lines.push(`Featured game / category: ${params.game}.`);
  if (params.style) lines.push(`Visual style: ${params.style}.`);
  if (params.palette) lines.push(`Color palette: ${params.palette}.`);
  if (params.mood) lines.push(`Mood: ${params.mood}.`);
  if (params.display_name) lines.push(`Streamer name to feature: ${params.display_name}.`);
  if (params.handle) lines.push(`Streamer handle: ${params.handle}.`);
  if (params.cta) lines.push(`Call to action: ${params.cta}.`);
  if (params.notes) lines.push(`Extra direction: ${params.notes}.`);
  lines.push(
    "High-end graphic design quality, crisp typography, no watermark, no logo placeholder, no UI chrome.",
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

async function generateImage(
  prompt: string,
  referenceDataUrl: string | null,
  variantIdx: number,
): Promise<Uint8Array | null> {
  const variantHint = [
    "Variant A — vibrant high-energy version.",
    "Variant B — moody cinematic version with deeper shadows.",
    "Variant C — minimalist editorial version with clean typography.",
  ][variantIdx] ?? "";

  const content: any[] = [{ type: "text", text: `${prompt} ${variantHint}` }];
  if (referenceDataUrl) {
    content.push({
      type: "image_url",
      image_url: { url: referenceDataUrl },
    });
  }

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });

  if (res.status === 429) throw new Error("rate_limited");
  if (res.status === 402) throw new Error("credits_exhausted");
  if (!res.ok) {
    const text = await res.text();
    console.error("[visual_ai_error]", res.status, text.slice(0, 200));
    throw new Error(`ai_${res.status}`);
  }
  const data = await res.json();
  const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url || !url.startsWith("data:image")) return null;
  const b64 = url.split(",")[1];
  return base64Decode(b64);
}

async function fail(admin: any, jobId: string, reason: string) {
  await admin
    .from("visual_generation_jobs")
    .update({
      status: "failed",
      error_message: reason,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  console.error("[visual_job_failed]", jobId, reason);
}

function base64Decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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
