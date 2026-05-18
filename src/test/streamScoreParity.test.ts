// Parity test — guarantees the shared (Deno-compatible) StreamScore engine
// produces bit-identical output to the legacy frontend engine. If this ever
// fails, server-side scoring would drift from the dashboard.

import { describe, it, expect } from "vitest";
import { computeStreamScore as legacyCompute } from "@/services/streamScoreEngine";
import { computeStreamScore as sharedCompute } from "../../supabase/functions/_shared/streamScoreEngine";
import type { ChannelFact } from "@/types/analysis";

const f = (key: string, value: number): ChannelFact => ({
  key,
  value,
  label: key,
  confidence: 1,
});

type Scenario = { name: string; facts: ChannelFact[] };

const scenarios: Scenario[] = [
  {
    name: "active healthy channel",
    facts: [
      { key: "streams_30d", value: 14 },
      { key: "streams_7d", value: 3 },
      { key: "posting_consistency_score", value: 70 },
      { key: "avg_duration_minutes", value: 180 },
      { key: "clips_30d", value: 8 },
      { key: "category_switch_rate", value: 20 },
      { key: "avg_vod_views_30d", value: 25 },
      { key: "follower_count", value: 120 },
      { key: "followers_available", value: 1 },
      { key: "total_hours_30d", value: 42 },
      { key: "unique_stream_days_30d", value: 12 },
    ],
  },
  {
    name: "cold account",
    facts: [
      { key: "streams_30d", value: 1 },
      { key: "streams_7d", value: 0 },
      { key: "posting_consistency_score", value: 10 },
      { key: "avg_duration_minutes", value: 60 },
      { key: "clips_30d", value: 0 },
      { key: "category_switch_rate", value: 0 },
      { key: "follower_count", value: 5 },
      { key: "followers_available", value: 1 },
      { key: "total_hours_30d", value: 1 },
      { key: "unique_stream_days_30d", value: 1 },
    ],
  },
  {
    name: "no activity at all",
    facts: [
      { key: "streams_30d", value: 0 },
      { key: "streams_7d", value: 0 },
      { key: "clips_30d", value: 0 },
      { key: "followers_available", value: 0 },
    ],
  },
  {
    name: "followers unavailable (neutral monetization)",
    facts: [
      { key: "streams_30d", value: 10 },
      { key: "streams_7d", value: 2 },
      { key: "posting_consistency_score", value: 55 },
      { key: "avg_duration_minutes", value: 140 },
      { key: "clips_30d", value: 4 },
      { key: "category_switch_rate", value: 30 },
      { key: "avg_vod_views_30d", value: 12 },
      { key: "followers_available", value: 0 },
      { key: "total_hours_30d", value: 25 },
      { key: "unique_stream_days_30d", value: 8 },
    ],
  },
  {
    name: "VODs disabled (no avg_vod_views, falls back to avg_viewers=0)",
    facts: [
      { key: "streams_30d", value: 6 },
      { key: "streams_7d", value: 2 },
      { key: "posting_consistency_score", value: 60 },
      { key: "avg_duration_minutes", value: 200 },
      { key: "clips_30d", value: 3 },
      { key: "category_switch_rate", value: 10 },
      { key: "follower_count", value: 80 },
      { key: "followers_available", value: 1 },
      { key: "total_hours_30d", value: 20 },
      { key: "unique_stream_days_30d", value: 6 },
    ],
  },
  {
    name: "clips-heavy",
    facts: [
      { key: "streams_30d", value: 4 },
      { key: "streams_7d", value: 1 },
      { key: "posting_consistency_score", value: 40 },
      { key: "avg_duration_minutes", value: 110 },
      { key: "clips_30d", value: 25 },
      { key: "category_switch_rate", value: 15 },
      { key: "avg_vod_views_30d", value: 6 },
      { key: "follower_count", value: 200 },
      { key: "followers_available", value: 1 },
      { key: "total_hours_30d", value: 8 },
      { key: "unique_stream_days_30d", value: 4 },
    ],
  },
  {
    name: "high category switch rate",
    facts: [
      { key: "streams_30d", value: 10 },
      { key: "streams_7d", value: 3 },
      { key: "posting_consistency_score", value: 65 },
      { key: "avg_duration_minutes", value: 160 },
      { key: "clips_30d", value: 5 },
      { key: "category_switch_rate", value: 80 },
      { key: "avg_vod_views_30d", value: 15 },
      { key: "follower_count", value: 60 },
      { key: "followers_available", value: 1 },
      { key: "total_hours_30d", value: 28 },
      { key: "unique_stream_days_30d", value: 9 },
    ],
  },
];

describe("StreamScore engine parity (legacy ↔ shared)", () => {
  for (const sc of scenarios) {
    it(`identical output: ${sc.name}`, () => {
      const a = legacyCompute(sc.facts);
      // Shared engine uses a structurally compatible fact shape.
      const b = sharedCompute(
        sc.facts.map((f) => ({ key: f.key, value: f.value as never })),
      );
      expect(b).toEqual(a);
    });
  }
});
