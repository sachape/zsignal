// Streamnco — Speech-to-text proxy for the clip worker.
// Receives an audio file from the Fly worker, calls ElevenLabs Scribe v2,
// returns word-level timestamps used to generate burn-in subtitles.
//
// Auth: X-Worker-Secret (shared with worker). No user JWT — called server-to-server.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WORKER_SHARED_SECRET = Deno.env.get("WORKER_SHARED_SECRET") ?? "";
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = req.headers.get("x-worker-secret") ?? "";
  if (!WORKER_SHARED_SECRET || secret !== WORKER_SHARED_SECRET) {
    return json({ error: "forbidden" }, 403);
  }
  if (!ELEVENLABS_API_KEY) {
    return json({ error: "transcription_not_configured" }, 503);
  }

  let inForm: FormData;
  try {
    inForm = await req.formData();
  } catch {
    return json({ error: "invalid_multipart" }, 400);
  }
  const file = inForm.get("audio");
  if (!(file instanceof File)) return json({ error: "missing_audio" }, 400);

  const language = (inForm.get("language") as string | null) ?? null;

  const fwd = new FormData();
  fwd.append("file", file, file.name || "audio.mp3");
  fwd.append("model_id", "scribe_v2");
  fwd.append("tag_audio_events", "false");
  fwd.append("diarize", "false");
  if (language) fwd.append("language_code", language);

  const startedAt = Date.now();
  let resp: Response;
  try {
    resp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: fwd,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error(JSON.stringify({ event: "stt_fetch_failed", message }));
    return json({ error: "stt_fetch_failed", message }, 502);
  }

  const text = await resp.text();
  if (!resp.ok) {
    console.error(JSON.stringify({ event: "stt_upstream_error", status: resp.status, body: text.slice(0, 400) }));
    return json({ error: "stt_upstream_error", status: resp.status, detail: text.slice(0, 400) }, 502);
  }

  let parsed: { text?: string; words?: Array<{ text: string; start: number; end: number; type?: string }> };
  try { parsed = JSON.parse(text); } catch {
    return json({ error: "stt_bad_response" }, 502);
  }

  const words = Array.isArray(parsed.words)
    ? parsed.words
        .filter((w) => w && typeof w.text === "string" && Number.isFinite(w.start) && Number.isFinite(w.end))
        .filter((w) => (w.type ?? "word") === "word")
        .map((w) => ({ text: w.text, start: Number(w.start), end: Number(w.end) }))
    : [];

  console.info(JSON.stringify({
    event: "stt_completed",
    duration_ms: Date.now() - startedAt,
    word_count: words.length,
    text_len: (parsed.text ?? "").length,
  }));

  return json({
    success: true,
    text: parsed.text ?? "",
    words,
    duration_ms: Date.now() - startedAt,
  });
});
