// Pipeline / lifecycle tests for process-analysis-job.
//
// Covers:
//   - claim_next_analysis_job atomicity (FOR UPDATE SKIP LOCKED)
//   - lock expiry (>10min) takes precedence over recent lock
//   - fail_analysis_job retry vs final-failure semantics
//   - completed jobs are never re-claimed
//   - HTTP auth (queued_batch + single_admin require valid CRON_SECRET)
//
// These tests touch the live Supabase project using the service-role key.
// They create + clean up disposable rows in public.analysis_jobs.
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
const _env = await load({ envPath: ".env", examplePath: null, export: true });
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assert,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/process-analysis-job`;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

// A real user id is required because analysis_jobs.user_id is NOT NULL and
// FKs auth.users. We pick any existing user; tests do not need a specific one.
async function pickUserId(): Promise<string> {
  const { data } = await admin.from("analysis_jobs").select("user_id").limit(1).maybeSingle();
  if (!data?.user_id) throw new Error("no existing user_id to clone for tests");
  return data.user_id as string;
}

let _userId: string | null = null;
async function getUserId() {
  if (!_userId) _userId = await pickUserId();
  return _userId;
}

async function insertTestJob(opts: {
  status?: string;
  retry_count?: number;
  max_retries?: number;
  locked_at?: string | null;
  platform_user_id?: string;
}): Promise<string> {
  const uid = await getUserId();
  const { data, error } = await admin
    .from("analysis_jobs")
    .insert({
      user_id: uid,
      platform: "twitch",
      platform_user_id: opts.platform_user_id ?? `test_pipeline_${crypto.randomUUID()}`,
      platform_login: "pipeline-test",
      status: opts.status ?? "queued",
      retry_count: opts.retry_count ?? 0,
      max_retries: opts.max_retries ?? 3,
      locked_at: opts.locked_at ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function cleanup(jobId: string) {
  await admin.from("stream_score_snapshots").delete().eq("analysis_job_id", jobId);
  await admin.from("analysis_reports").delete().eq("analysis_job_id", jobId);
  await admin.from("analysis_jobs").delete().eq("id", jobId);
}

Deno.test("queued_batch without Authorization returns 401", async () => {
  const r = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "queued_batch" }),
  });
  const body = await r.json();
  assertEquals(r.status, 401);
  assert(typeof body.error === "string");
});

Deno.test("queued_batch with wrong CRON_SECRET returns 401", async () => {
  const r = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer not-the-real-secret-xyz",
    },
    body: JSON.stringify({ mode: "queued_batch" }),
  });
  await r.json();
  assertEquals(r.status, 401);
});

Deno.test("single_admin without Authorization returns 401", async () => {
  const r = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "single_admin", analysis_job_id: crypto.randomUUID() }),
  });
  await r.json();
  assertEquals(r.status, 401);
});

Deno.test("single_admin with wrong CRON_SECRET returns 401", async () => {
  const r = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer wrong-token",
    },
    body: JSON.stringify({ mode: "single_admin", analysis_job_id: crypto.randomUUID() }),
  });
  await r.json();
  assertEquals(r.status, 401);
});

Deno.test("claim_next_analysis_job: queued job is claimed and locked", async () => {
  const id = await insertTestJob({});
  try {
    const { data, error } = await admin.rpc("claim_next_analysis_job", {
      p_processor: "test",
      p_lock_timeout_minutes: 10,
    });
    if (error) throw error;
    // Must include our job somewhere up the queue, but at minimum SOME job is claimed.
    const claimed = Array.isArray(data) ? data : [data];
    assert(claimed.length > 0, "expected at least one claim");
    // Verify the claimed job is marked processing with a lock.
    const claimedId = claimed[0].id as string;
    const { data: row } = await admin
      .from("analysis_jobs")
      .select("status, locked_at, processed_by")
      .eq("id", claimedId)
      .single();
    assertEquals(row?.status, "processing");
    assert(row?.locked_at !== null);
    assertEquals(row?.processed_by, "test");
    // release for next tests
    await admin.from("analysis_jobs").update({ status: "queued", locked_at: null }).eq("id", claimedId);
  } finally {
    await cleanup(id);
  }
});

Deno.test("claim_next_analysis_job: concurrent calls do not claim the same job", async () => {
  // Drain everything queued first by claiming until empty, then put ONE job.
  // (Tests run serially in same process; SKIP LOCKED is the real guarantee.)
  // We simulate by issuing two parallel claims and asserting different ids.
  const id1 = await insertTestJob({});
  const id2 = await insertTestJob({});
  try {
    const [a, b] = await Promise.all([
      admin.rpc("claim_next_analysis_job", { p_processor: "racer-a", p_lock_timeout_minutes: 10 }),
      admin.rpc("claim_next_analysis_job", { p_processor: "racer-b", p_lock_timeout_minutes: 10 }),
    ]);
    const ra = (Array.isArray(a.data) ? a.data[0] : a.data) as { id: string } | null;
    const rb = (Array.isArray(b.data) ? b.data[0] : b.data) as { id: string } | null;
    if (ra && rb) {
      assertNotEquals(ra.id, rb.id, "two concurrent claims returned the same job id");
    }
  } finally {
    await cleanup(id1);
    await cleanup(id2);
  }
});

Deno.test("claim_next_analysis_job: processing job with FRESH lock is NOT reclaimed", async () => {
  const id = await insertTestJob({ status: "processing", locked_at: new Date().toISOString() });
  try {
    // Try to claim; our fresh-locked job must not appear among claimed rows
    // because its lock is < 10 min. (Other queued jobs may be claimed; we
    // assert only that OUR id is not.)
    for (let i = 0; i < 5; i++) {
      const { data } = await admin.rpc("claim_next_analysis_job", {
        p_processor: "test",
        p_lock_timeout_minutes: 10,
      });
      const row = (Array.isArray(data) ? data[0] : data) as { id: string } | null;
      if (!row) break;
      assertNotEquals(row.id, id, "fresh-locked job was reclaimed");
      // release the other test job so we don't poison shared queue
      await admin.from("analysis_jobs").update({ status: "queued", locked_at: null }).eq("id", row.id);
    }
  } finally {
    await cleanup(id);
  }
});

Deno.test("claim_next_analysis_job: processing job with EXPIRED lock IS reclaimed", async () => {
  const oldLock = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago
  const id = await insertTestJob({ status: "processing", locked_at: oldLock });
  try {
    // We may have to issue multiple claims if other queued jobs are ahead.
    let found = false;
    for (let i = 0; i < 25; i++) {
      const { data } = await admin.rpc("claim_next_analysis_job", {
        p_processor: "test-expired",
        p_lock_timeout_minutes: 10,
      });
      const row = (Array.isArray(data) ? data[0] : data) as { id: string } | null;
      if (!row) break;
      if (row.id === id) {
        found = true;
        break;
      }
      // release others
      await admin.from("analysis_jobs").update({ status: "queued", locked_at: null }).eq("id", row.id);
    }
    assert(found, "expired-lock job was never reclaimed within 25 attempts");
  } finally {
    await cleanup(id);
  }
});

Deno.test("fail_analysis_job: retries below max_retries → status returns to queued, retry_count++", async () => {
  const id = await insertTestJob({ status: "processing", retry_count: 0, max_retries: 3 });
  try {
    const { data: newStatus } = await admin.rpc("fail_analysis_job", {
      p_job_id: id,
      p_error: "transient_failure_x",
    });
    assertEquals(newStatus, "queued");
    const { data: row } = await admin
      .from("analysis_jobs")
      .select("status, retry_count, error_message, locked_at")
      .eq("id", id)
      .single();
    assertEquals(row?.status, "queued");
    assertEquals(row?.retry_count, 1);
    assert((row?.error_message as string).includes("transient_failure_x"));
    assertEquals(row?.locked_at, null);
  } finally {
    await cleanup(id);
  }
});

Deno.test("fail_analysis_job: at max_retries → status becomes failed, failed_at set", async () => {
  const id = await insertTestJob({ status: "processing", retry_count: 2, max_retries: 3 });
  try {
    const { data: newStatus } = await admin.rpc("fail_analysis_job", {
      p_job_id: id,
      p_error: "final_failure_y",
    });
    assertEquals(newStatus, "failed");
    const { data: row } = await admin
      .from("analysis_jobs")
      .select("status, retry_count, error_message, failed_at")
      .eq("id", id)
      .single();
    assertEquals(row?.status, "failed");
    assertEquals(row?.retry_count, 3);
    assert((row?.error_message as string).includes("final_failure_y"));
    assert(row?.failed_at !== null);
  } finally {
    await cleanup(id);
  }
});

Deno.test("claim_next_analysis_job: completed jobs are never reclaimed", async () => {
  const id = await insertTestJob({
    status: "queued",
    platform_user_id: `test_completed_${crypto.randomUUID()}`,
  });
  // mark it completed
  await admin
    .from("analysis_jobs")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  try {
    for (let i = 0; i < 30; i++) {
      const { data } = await admin.rpc("claim_next_analysis_job", {
        p_processor: "test-completed",
        p_lock_timeout_minutes: 10,
      });
      const row = (Array.isArray(data) ? data[0] : data) as { id: string } | null;
      if (!row) break;
      assertNotEquals(row.id, id, "completed job was reclaimed");
      await admin.from("analysis_jobs").update({ status: "queued", locked_at: null }).eq("id", row.id);
    }
  } finally {
    await cleanup(id);
  }
});

Deno.test("claim_next_analysis_job: failed (final) jobs are never reclaimed", async () => {
  const id = await insertTestJob({
    status: "failed",
    platform_user_id: `test_failed_${crypto.randomUUID()}`,
  });
  await admin
    .from("analysis_jobs")
    .update({ failed_at: new Date().toISOString() })
    .eq("id", id);
  try {
    for (let i = 0; i < 30; i++) {
      const { data } = await admin.rpc("claim_next_analysis_job", {
        p_processor: "test-failed",
        p_lock_timeout_minutes: 10,
      });
      const row = (Array.isArray(data) ? data[0] : data) as { id: string } | null;
      if (!row) break;
      assertNotEquals(row.id, id, "failed job was reclaimed");
      await admin.from("analysis_jobs").update({ status: "queued", locked_at: null }).eq("id", row.id);
    }
  } finally {
    await cleanup(id);
  }
});
