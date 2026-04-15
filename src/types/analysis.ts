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
  broadcaster_type: string;
  fetched_at: string;
}

export interface StreamScore {
  overall_score: number;
  regularity: number;
  engagement: number;
  growth: number;
  discoverability: number;
  content_quality: number;
  community: number;
  monetization_readiness: number;
  affiliate_progress: number;
}

export interface CompetitorMatch {
  id: string;
  competitor_login: string;
  display_name: string;
  similarity_score: number;
  follower_count: number;
  avg_viewers: number;
}

export interface Recommendation {
  id: string;
  priority: number;
  title: string;
  description: string;
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
}

export interface AffiliateProgress {
  avg_viewers: { current: number; target: number };
  stream_days: { current: number; target: number };
  unique_chatters: { current: number; target: number };
}

export interface AnalysisReport {
  job_id: string;
  channel_summary: ChannelSummary;
  score: StreamScore;
  affiliate_progress: AffiliateProgress;
  competitors: CompetitorMatch[];
  recommendations: Recommendation[];
  weak_point: {
    label: string;
    description: string;
  };
}
