// StreamScore engine — scenario / cap regression tests.
// The frontend service delegates to the shared Deno engine, so we only test
// the shared module directly here. Each scenario asserts that maturity caps
// and per-dimension caps behave per the v3 spec.

import { describe, it, expect } from "vitest";
import {
  computeStreamScore,
  type SharedChannelFact,
} from "../../supabase/functions/_shared/streamScoreEngine";

const f = (key: string, value: number | string): SharedChannelFact => ({ key, value });

function build(overrides: Record<string, number | string> = {}): SharedChannelFact[] {
  const base: Record<string, number | string> = {
    streams_30d: 0,
    streams_7d: 0,
    posting_consistency_score: 0,
    avg_duration_minutes: 0,
    clips_30d: 0,
    exported_clips_30d: 0,
    category_switch_rate: 0,
    avg_viewers: 0,
    live_avg_viewers: 0,
    follower_count: 0,
    followers_available: 1,
    total_hours_30d: 0,
    unique_stream_days_30d: 0,
    connected_social_accounts_count: 0,
    has_description: 1,
    has_avatar: 1,
    dominant_category: "Just Chatting",
    ...overrides,
  };
  return Object.entries(base).map(([k, v]) => f(k, v));
}

describe("StreamScore v3 — maturity caps", () => {
  it("cold account (0 lives) caps overall ≤ 20", () => {
    const s = computeStreamScore(build());
    expect(s.overall).toBeLessThanOrEqual(20);
    expect(s.content).toBe(0);
    expect(s.regularity).toBe(0);
  });

  it("single live (fleevalo) — strict per-dimension ranges", () => {
    const s = computeStreamScore(
      build({
        streams_30d: 1,
        streams_7d: 1,
        avg_duration_minutes: 60,
        follower_count: 23,
        live_avg_viewers: 11,
        avg_viewers: 11,
        total_hours_30d: 1,
        unique_stream_days_30d: 1,
        posting_consistency_score: 30,
      }),
    );
    expect(s.overall).toBeGreaterThanOrEqual(26);
    expect(s.overall).toBeLessThanOrEqual(30);
    expect(s.regularity).toBeGreaterThanOrEqual(10);
    expect(s.regularity).toBeLessThanOrEqual(18);
    expect(s.content).toBe(0);
    expect(s.structure).toBeGreaterThanOrEqual(25);
    expect(s.structure).toBeLessThanOrEqual(40);
    expect(s.positioning).toBeGreaterThanOrEqual(35);
    expect(s.positioning).toBeLessThanOrEqual(50);
    expect(s.momentum).toBeGreaterThanOrEqual(35);
    expect(s.momentum).toBeLessThanOrEqual(45);
    expect(s.monetization).toBeGreaterThanOrEqual(38);
    expect(s.monetization).toBeLessThanOrEqual(45);
  });

  it("4 lives same day caps overall ≤ 55", () => {
    const s = computeStreamScore(
      build({
        streams_30d: 4,
        streams_7d: 4,
        avg_duration_minutes: 90,
        total_hours_30d: 6,
        unique_stream_days_30d: 1,
        follower_count: 100,
        avg_viewers: 10,
        clips_30d: 4,
        posting_consistency_score: 60,
      }),
    );
    expect(s.overall).toBeLessThanOrEqual(55);
  });

  it("4 lives over 4 days but <4h caps overall ≤ 55", () => {
    const s = computeStreamScore(
      build({
        streams_30d: 4,
        streams_7d: 2,
        avg_duration_minutes: 45,
        total_hours_30d: 3,
        unique_stream_days_30d: 4,
        follower_count: 60,
        clips_30d: 3,
        posting_consistency_score: 70,
      }),
    );
    expect(s.overall).toBeLessThanOrEqual(55);
  });

  it("2-3 lives caps overall ≤ 45", () => {
    const s = computeStreamScore(
      build({
        streams_30d: 3,
        streams_7d: 2,
        avg_duration_minutes: 150,
        follower_count: 40,
        avg_viewers: 5,
        clips_30d: 2,
        total_hours_30d: 8,
        unique_stream_days_30d: 3,
        posting_consistency_score: 60,
      }),
    );
    expect(s.overall).toBeLessThanOrEqual(45);
  });

  it("≥4 lives but <4h streamed caps overall ≤ 55", () => {
    const s = computeStreamScore(
      build({
        streams_30d: 5,
        streams_7d: 2,
        avg_duration_minutes: 40,
        total_hours_30d: 3,
        unique_stream_days_30d: 5,
        follower_count: 60,
        clips_30d: 3,
        posting_consistency_score: 70,
      }),
    );
    expect(s.overall).toBeLessThanOrEqual(55);
  });

  it("mature account is not capped artificially", () => {
    const s = computeStreamScore(
      build({
        streams_30d: 14,
        streams_7d: 3,
        avg_duration_minutes: 180,
        clips_30d: 20,
        exported_clips_30d: 10,
        connected_social_accounts_count: 2,
        total_hours_30d: 45,
        unique_stream_days_30d: 14,
        follower_count: 200,
        avg_viewers: 25,
        live_avg_viewers: 25,
        posting_consistency_score: 80,
      }),
    );
    expect(s.overall).toBeGreaterThan(55);
  });

  it("no sub-score reaches 100 with <4 unique days", () => {
    const s = computeStreamScore(
      build({
        streams_30d: 3,
        streams_7d: 3,
        clips_30d: 30,
        exported_clips_30d: 20,
        connected_social_accounts_count: 3,
        total_hours_30d: 12,
        unique_stream_days_30d: 3,
        follower_count: 500,
        avg_viewers: 50,
        live_avg_viewers: 50,
        posting_consistency_score: 100,
      }),
    );
    for (const b of s.breakdown) {
      expect(b.score).toBeLessThan(100);
    }
  });

  it("breakdown exposes Affiliation (not raw 'Monétisation' label)", () => {
    const s = computeStreamScore(build({ streams_30d: 5, total_hours_30d: 6, unique_stream_days_30d: 4 }));
    const labels = s.breakdown.map((b) => b.dimension);
    expect(labels).toContain("Affiliation");
  });
});
