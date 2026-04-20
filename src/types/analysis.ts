// Domain types for the StreamPulse analysis pipeline

export type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

export interface AnalysisJob {
  id: string;
  user_id: string;
  channel_name: string;
  status: JobStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface TwitchProfile {
  id: string;
  user_id: string;
  twitch_user_id: string;
  login: string;
  display_name: string;
  description: string;
  profile_image_url: string;
  view_count: number;
  follower_count: number;
  /** True when follower_count was retrieved live from the Twitch API. */
  followers_available?: boolean;
  /** True when the followers scope is missing on the connected account. */
  followers_missing_scope?: boolean;
  broadcaster_type: string;
  created_at_twitch: string;
  fetched_at: string;
}

export interface TwitchVideo {
  id: string;
  twitch_video_id: string;
  title: string;
  view_count: number;
  duration: string; // e.g. "3h21m"
  created_at: string;
  stream_id: string;
  language: string;
  type: string; // "archive" | "highlight" | "upload"
}

export interface TwitchClip {
  id: string;
  twitch_clip_id: string;
  title: string;
  view_count: number;
  creator_name: string;
  created_at: string;
  duration: number; // seconds
  game_id: string;
}

export interface ChannelFact {
  key: string;
  value: number | string;
  label: string;
  confidence: number; // 0-1
}

export interface StreamScore {
  overall: number;
  regularity: number;
  structure: number;
  content: number;
  positioning: number;
  momentum: number;
  monetization: number;
  confidence: number;
  freshness: number;
  breakdown: ScoreBreakdownItem[];
}

export interface ScoreBreakdownItem {
  dimension: string;
  score: number;
  weight: number;
  reasons: string[];
  levers: string[];
}

export interface CompetitorGroup {
  type: 'direct' | 'catch-up' | 'inspiration';
  label: string;
  matches: CompetitorMatch[];
}

export interface CompetitorMatch {
  id: string;
  competitor_login: string;
  display_name: string;
  /** Canonical Twitch avatar URL. Null when enrichment failed. */
  profile_image_url?: string | null;
  similarity_score: number;
  follower_count: number;
  avg_viewers: number;
  group: 'direct' | 'catch-up' | 'inspiration';
  match_reasons: string[];
  strengths: string[]; // where competitor is better
  /** 0-100 weighted multi-dim fit (lang, type, format, size, activity, category). */
  fit_score?: number;
  /** 0-100 confidence in the suggestion (how much real signal we have). */
  confidence_score?: number;
  /** Inferred channel type (solo / team / media / event / hybrid). */
  channel_type?: 'solo' | 'team' | 'media' | 'event' | 'hybrid' | 'unknown';
  /** Inferred content format (ranked / chill / casting / event / variety …). */
  content_format?: string;
  /** Relative size band vs target (micro / small / medium / large / event-media). */
  size_band?: 'micro' | 'small' | 'medium' | 'large' | 'event-media' | 'unknown';
  /**
   * True when the engine considers this match credible but not fully
   * confirmed (medium confidence, or promoted to "direct" from a slightly
   * larger size band). UI should label these as "concurrent direct potentiel".
   */
  is_potential?: boolean;
}

export interface Recommendation {
  id: string;
  priority: number;
  type: 'priority' | 'next-action' | 'short-term-goal';
  title: string;
  reason: string;
  action: string;
  category: string;
  is_locked: boolean;
}

export interface ChannelSummary {
  channel_name: string;
  display_name: string;
  category: string;
  avg_viewers: number;
  broadcaster_type: string;
  follower_count: number;
  /**
   * True when follower_count is the real value returned by the Twitch API.
   * False when followers could not be retrieved (missing scope, transient API
   * failure, no live source). The UI must NOT display follower_count as a
   * trustworthy number in that case — show "Followers indisponibles" instead.
   */
  followers_available?: boolean;
  /** True when the followers scope (moderator:read:followers) is missing. */
  followers_missing_scope?: boolean;
  description: string;
  /**
   * True when the report was generated from PUBLIC Twitch data only
   * (no user OAuth). Some metrics (exact followers, unique chatters, live
   * viewer history) are not retrievable in that mode — UI must frame the
   * report as a "public teaser" with an unlock CTA.
   */
  is_partial?: boolean;
  /** True if the channel is live right now (Get Streams). */
  is_live?: boolean;
  /** Current live viewer count (only when is_live === true). */
  live_viewer_count?: number | null;
  /** Title of the current live broadcast (only when is_live === true). */
  live_title?: string | null;
}

export interface ReportIdentity {
  platform: string | null;
  platform_user_id: string | null;
  platform_login: string;
  display_name: string;
  avatar_url: string | null;
  is_demo: boolean;
}

export interface AffiliateProgress {
  avg_viewers: { current: number; target: number };
  stream_days: { current: number; target: number };
  unique_chatters: { current: number; target: number };
  stream_hours: { current: number; target: number };
  followers: { current: number | null; target: number; available?: boolean };
}

export interface AnalysisReport {
  job_id: string;
  identity?: ReportIdentity;
  channel_summary: ChannelSummary;
  facts: ChannelFact[];
  score: StreamScore;
  affiliate_progress: AffiliateProgress;
  competitor_groups: CompetitorGroup[];
  recommendations: Recommendation[];
  weak_point: {
    label: string;
    description: string;
  };
  next_best_action: Recommendation;
}

// Raw mock input shape
export interface MockStreamerData {
  profile: TwitchProfile;
  videos: TwitchVideo[];
  clips: TwitchClip[];
}
