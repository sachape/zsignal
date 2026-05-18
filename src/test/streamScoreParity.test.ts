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
      f("streams_30d", 14),
      f("streams_7d", 3),
      f("posting_consistency_score", 70),
      f("avg_duration_minutes", 180),
      f("clips_30d", 8),
      f("category_switch_rate", 20),
      f("avg_vod_views_30d", 25),
      f("follower_count", 120),
      f("followers_available", 1),
      f("total_hours_30d", 42),
      f("unique_stream_days_30d", 12),
    ],
  },
  {
    name: "cold account",
    facts: [
      f("streams_30d", 1),
      f("streams_7d", 0),
      f("posting_consistency_score", 10),
      f("avg_duration_minutes", 60),
      f("clips_30d", 0),
      f("category_switch_rate", 0),
      f("follower_count", 5),
      f("followers_available", 1),
      f("total_hours_30d", 1),
      f("unique_stream_days_30d", 1),
    ],
  },
  {
    name: "no activity at all",
    facts: [
      f("streams_30d", 0),
      f("streams_7d", 0),
      f("clips_30d", 0),
      f("followers_available", 0),
    ],
  },
  {
    name: "followers unavailable (neutral monetization)",
    facts: [
      f("streams_30d", 10),
      f("streams_7d", 2),
      f("posting_consistency_score", 55),
      f("avg_duration_minutes", 140),
      f("clips_30d", 4),
      f("category_switch_rate", 30),
      f("avg_vod_views_30d", 12),
      f("followers_available", 0),
      f("total_hours_30d", 25),
      f("unique_stream_days_30d", 8),
    ],
  },
  {
    name: "VODs disabled (no avg_vod_views, falls back to avg_viewers=0)",
    facts: [
      f("streams_30d", 6),
      f("streams_7d", 2),
      f("posting_consistency_score", 60),
      f("avg_duration_minutes", 200),
      f("clips_30d", 3),
      f("category_switch_rate", 10),
      f("follower_count", 80),
      f("followers_available", 1),
      f("total_hours_30d", 20),
      f("unique_stream_days_30d", 6),
    ],
  },
  {
    name: "clips-heavy",
    facts: [
      f("streams_30d", 4),
      f("streams_7d", 1),
      f("posting_consistency_score", 40),
      f("avg_duration_minutes", 110),
      f("clips_30d", 25),
      f("category_switch_rate", 15),
      f("avg_vod_views_30d", 6),
      f("follower_count", 200),
      f("followers_available", 1),
      f("total_hours_30d", 8),
      f("unique_stream_days_30d", 4),
    ],
  },
  {
    name: "high category switch rate",
    facts: [
      f("streams_30d", 10),
      f("streams_7d", 3),
      f("posting_consistency_score", 65),
      f("avg_duration_minutes", 160),
      f("clips_30d", 5),
      f("category_switch_rate", 80),
      f("avg_vod_views_30d", 15),
      f("follower_count", 60),
      f("followers_available", 1),
      f("total_hours_30d", 28),
      f("unique_stream_days_30d", 9),
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
