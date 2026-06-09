// deno-lint-ignore-file no-explicit-any
// Visual image provider abstraction for Studio Visuel.
// V1: OpenAI gpt-image-2 via Lovable AI Gateway (no separate OPENAI_API_KEY needed).
// V2-ready: swap providers behind the same interface.

export type ProviderName = "openai" | "gemini";

export interface GenerateImageInput {
  prompt: string;
  /** Width hint requested by the template (worker will best-fit). */
  width: number;
  /** Height hint requested by the template. */
  height: number;
  /** Variant index (0..n) so the provider can diversify outputs. */
  variantIndex: number;
  /** Optional reference image as a data URL (data:image/png;base64,...). */
  referenceDataUrl?: string | null;
}

export interface GenerateImageResult {
  bytes: Uint8Array;
  mimeType: string;
  /** The size that was actually requested upstream (e.g. "1024x1024"). */
  requestedSize: string;
  provider: ProviderName;
  model: string;
}

export class ImageProviderError extends Error {
  code: string;
  status?: number;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/images/generations";
const OPENAI_MODEL = "openai/gpt-image-2";

/** Map any (w,h) request to one of the OpenAI gpt-image-2 supported sizes. */
export function pickOpenAISize(width: number, height: number): "1024x1024" | "1024x1536" | "1536x1024" {
  const ratio = width / height;
  if (ratio > 1.2) return "1536x1024"; // landscape (banners)
  if (ratio < 0.85) return "1024x1536"; // portrait (story, 4:5)
  return "1024x1024"; // square
}

function variantHint(idx: number): string {
  return [
    "Variant A — high-energy, vivid contrast, dynamic composition.",
    "Variant B — cinematic, deeper shadows, premium editorial mood.",
    "Variant C — modern minimalist, refined negative space, clean focal subject.",
  ][idx % 3];
}

export async function generateImage(
  input: GenerateImageInput,
  opts: { provider?: ProviderName } = {},
): Promise<GenerateImageResult> {
  const provider = opts.provider ?? (Deno.env.get("VISUAL_IMAGE_PROVIDER") as ProviderName) ?? "openai";
  if (provider !== "openai") {
    throw new ImageProviderError("provider_not_supported", `provider ${provider} not implemented`);
  }
  return await generateWithOpenAI(input);
}

async function generateWithOpenAI(input: GenerateImageInput): Promise<GenerateImageResult> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    throw new ImageProviderError("missing_lovable_api_key", "LOVABLE_API_KEY not configured");
  }
  const size = pickOpenAISize(input.width, input.height);
  const prompt = `${input.prompt}\n\n${variantHint(input.variantIndex)}`;

  const body: Record<string, unknown> = {
    model: OPENAI_MODEL,
    prompt,
    size,
    n: 1,
    quality: "low",
  };

  const res = await fetch(LOVABLE_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new ImageProviderError("rate_limited", "AI gateway rate limited", 429);
  }
  if (res.status === 402) {
    throw new ImageProviderError("credits_exhausted", "AI credits exhausted", 402);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[visual_provider_openai_error]", res.status, text.slice(0, 300));
    // 4xx are terminal (content policy, bad body) — surface code.
    const code = res.status >= 400 && res.status < 500 ? "provider_rejected" : `provider_${res.status}`;
    throw new ImageProviderError(code, `openai ${res.status}`, res.status);
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64 || typeof b64 !== "string") {
    console.error("[visual_provider_openai_empty]", JSON.stringify(data).slice(0, 300));
    throw new ImageProviderError("empty_response", "no image returned");
  }
  return {
    bytes: base64Decode(b64),
    mimeType: "image/png",
    requestedSize: size,
    provider: "openai",
    model: OPENAI_MODEL,
  };
}

function base64Decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
