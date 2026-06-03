export type Platform = 'twitch' | 'youtube' | 'tiktok' | 'instagram';
export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error' | 'manual';

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: Platform;
  platform_user_id: string | null;
  username: string | null;
  display_name: string | null;
  profile_url: string | null;
  avatar_url: string | null;
  connection_status: ConnectionStatus;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformMetrics {
  id: string;
  user_id: string;
  connected_account_id: string;
  platform: Platform;
  snapshot_date: string;
  followers_count: number | null;
  subscribers_count: number | null;
  videos_count: number | null;
  posts_count: number | null;
  views_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  recent_posts_count: number | null;
  recent_activity_score: number | null;
  raw_metrics: Record<string, unknown> | null;
  created_at: string;
}

export interface StoredPresenceScore {
  id: string;
  user_id: string;
  score: number;
  twitch_score: number | null;
  youtube_score: number | null;
  tiktok_score: number | null;
  instagram_score: number | null;
  presence_score: number | null;
  consistency_score: number | null;
  content_recycling_score: number | null;
  diversification_score: number | null;
  diagnosis: string | null;
  recommendations: Recommendation[] | null;
  snapshot_date: string;
  created_at: string;
}

export interface Recommendation {
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  platform: Platform | 'all';
  actionLabel: string;
}

export interface PresenceScoreResult {
  total: number;
  presencePoints: number;
  activityPoints: number;
  diversificationPoints: number;
  consistencyPoints: number;
  diagnosis: string;
  statusLabel: string;
}
