export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analysis_jobs: {
        Row: {
          channel_name: string
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          platform: string | null
          platform_login: string | null
          platform_user_id: string | null
          started_at: string | null
          status: string
          trigger_source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_name: string
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          platform?: string | null
          platform_login?: string | null
          platform_user_id?: string | null
          started_at?: string | null
          status?: string
          trigger_source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_name?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          platform?: string | null
          platform_login?: string | null
          platform_user_id?: string | null
          started_at?: string | null
          status?: string
          trigger_source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_reports: {
        Row: {
          analysis_job_id: string
          channel_summary: string | null
          created_at: string
          id: string
          report_data: Json | null
          user_id: string
        }
        Insert: {
          analysis_job_id: string
          channel_summary?: string | null
          created_at?: string
          id?: string
          report_data?: Json | null
          user_id: string
        }
        Update: {
          analysis_job_id?: string
          channel_summary?: string | null
          created_at?: string
          id?: string
          report_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_reports_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_facts: {
        Row: {
          analysis_job_id: string
          confidence: number | null
          created_at: string
          fact_key: string
          fact_value: string | null
          id: string
        }
        Insert: {
          analysis_job_id: string
          confidence?: number | null
          created_at?: string
          fact_key: string
          fact_value?: string | null
          id?: string
        }
        Update: {
          analysis_job_id?: string
          confidence?: number | null
          created_at?: string
          fact_key?: string
          fact_value?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_facts_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_update_history: {
        Row: {
          broadcaster_user_id: string
          category_id: string | null
          category_name: string | null
          changed_at: string
          content_classification_labels: Json | null
          created_at: string
          id: string
          language: string | null
          source_message_id: string | null
          title: string | null
        }
        Insert: {
          broadcaster_user_id: string
          category_id?: string | null
          category_name?: string | null
          changed_at?: string
          content_classification_labels?: Json | null
          created_at?: string
          id?: string
          language?: string | null
          source_message_id?: string | null
          title?: string | null
        }
        Update: {
          broadcaster_user_id?: string
          category_id?: string | null
          category_name?: string | null
          changed_at?: string
          content_classification_labels?: Json | null
          created_at?: string
          id?: string
          language?: string | null
          source_message_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      community_events: {
        Row: {
          actor_hash: string | null
          broadcaster_user_id: string
          created_at: string
          id: string
          is_gift: boolean | null
          kind: string
          metadata: Json
          occurred_at: string
          source_message_id: string | null
          tier: string | null
        }
        Insert: {
          actor_hash?: string | null
          broadcaster_user_id: string
          created_at?: string
          id?: string
          is_gift?: boolean | null
          kind: string
          metadata?: Json
          occurred_at?: string
          source_message_id?: string | null
          tier?: string | null
        }
        Update: {
          actor_hash?: string | null
          broadcaster_user_id?: string
          created_at?: string
          id?: string
          is_gift?: boolean | null
          kind?: string
          metadata?: Json
          occurred_at?: string
          source_message_id?: string | null
          tier?: string | null
        }
        Relationships: []
      }
      competitor_feedback: {
        Row: {
          competitor_key: string
          created_at: string
          feedback_type: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          competitor_key: string
          created_at?: string
          feedback_type: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          competitor_key?: string
          created_at?: string
          feedback_type?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_feedback_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "analysis_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_matches: {
        Row: {
          analysis_job_id: string
          avg_viewers: number | null
          competitor_login: string
          created_at: string
          display_name: string | null
          follower_count: number | null
          id: string
          similarity_score: number | null
        }
        Insert: {
          analysis_job_id: string
          avg_viewers?: number | null
          competitor_login: string
          created_at?: string
          display_name?: string | null
          follower_count?: number | null
          id?: string
          similarity_score?: number | null
        }
        Update: {
          analysis_job_id?: string
          avg_viewers?: number | null
          competitor_login?: string
          created_at?: string
          display_name?: string | null
          follower_count?: number | null
          id?: string
          similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_matches_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_accounts: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          expires_at: string | null
          id: string
          last_auto_refresh_at: string | null
          next_auto_refresh_at: string | null
          platform: string
          platform_display_name: string | null
          platform_login: string | null
          platform_user_id: string | null
          refresh_token_encrypted: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_auto_refresh_at?: string | null
          next_auto_refresh_at?: string | null
          platform?: string
          platform_display_name?: string | null
          platform_login?: string | null
          platform_user_id?: string | null
          refresh_token_encrypted?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_auto_refresh_at?: string | null
          next_auto_refresh_at?: string | null
          platform?: string
          platform_display_name?: string | null
          platform_login?: string | null
          platform_user_id?: string | null
          refresh_token_encrypted?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_alerts: {
        Row: {
          body: string | null
          broadcaster_user_id: string
          created_at: string
          id: string
          kind: string
          metadata: Json
          read_at: string | null
          severity: string
          source_event_type: string | null
          source_message_id: string | null
          title: string
        }
        Insert: {
          body?: string | null
          broadcaster_user_id: string
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          read_at?: string | null
          severity?: string
          source_event_type?: string | null
          source_message_id?: string | null
          title: string
        }
        Update: {
          body?: string | null
          broadcaster_user_id?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          read_at?: string | null
          severity?: string
          source_event_type?: string | null
          source_message_id?: string | null
          title?: string
        }
        Relationships: []
      }
      live_debriefs: {
        Row: {
          comparison_data: Json | null
          confidence: string | null
          created_at: string
          evidence: Json | null
          generated_at: string | null
          has_enough_signal: boolean
          id: string
          live_session_id: string
          main_strength: string | null
          main_weakness: string | null
          next_live_focus: string | null
          overall_score: number | null
          priority_action: string | null
          score_hold: number | null
          score_start: number | null
          score_structure: number | null
          signal_quality: string | null
          strength: string | null
          summary: string | null
          updated_at: string
          user_id: string
          verdict: string | null
          weakness: string | null
        }
        Insert: {
          comparison_data?: Json | null
          confidence?: string | null
          created_at?: string
          evidence?: Json | null
          generated_at?: string | null
          has_enough_signal?: boolean
          id?: string
          live_session_id: string
          main_strength?: string | null
          main_weakness?: string | null
          next_live_focus?: string | null
          overall_score?: number | null
          priority_action?: string | null
          score_hold?: number | null
          score_start?: number | null
          score_structure?: number | null
          signal_quality?: string | null
          strength?: string | null
          summary?: string | null
          updated_at?: string
          user_id: string
          verdict?: string | null
          weakness?: string | null
        }
        Update: {
          comparison_data?: Json | null
          confidence?: string | null
          created_at?: string
          evidence?: Json | null
          generated_at?: string | null
          has_enough_signal?: boolean
          id?: string
          live_session_id?: string
          main_strength?: string | null
          main_weakness?: string | null
          next_live_focus?: string | null
          overall_score?: number | null
          priority_action?: string | null
          score_hold?: number | null
          score_start?: number | null
          score_structure?: number | null
          signal_quality?: string | null
          strength?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
          verdict?: string | null
          weakness?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_debriefs_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: true
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          avg_viewers: number | null
          category_name: string | null
          connected_account_id: string
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          language: string | null
          peak_viewers: number | null
          platform: string
          platform_display_name: string | null
          platform_login: string | null
          platform_user_id: string
          snapshots_count: number
          start_title: string | null
          started_at: string
          status: string
          twitch_stream_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_viewers?: number | null
          category_name?: string | null
          connected_account_id: string
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          language?: string | null
          peak_viewers?: number | null
          platform?: string
          platform_display_name?: string | null
          platform_login?: string | null
          platform_user_id: string
          snapshots_count?: number
          start_title?: string | null
          started_at: string
          status?: string
          twitch_stream_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_viewers?: number | null
          category_name?: string | null
          connected_account_id?: string
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          language?: string | null
          peak_viewers?: number | null
          platform?: string
          platform_display_name?: string | null
          platform_login?: string | null
          platform_user_id?: string
          snapshots_count?: number
          start_title?: string | null
          started_at?: string
          status?: string
          twitch_stream_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      live_snapshots: {
        Row: {
          captured_at: string
          category_name: string | null
          id: string
          live_session_id: string
          title: string | null
          viewer_count: number
        }
        Insert: {
          captured_at?: string
          category_name?: string | null
          id?: string
          live_session_id: string
          title?: string | null
          viewer_count?: number
        }
        Update: {
          captured_at?: string
          category_name?: string | null
          id?: string
          live_session_id?: string
          title?: string | null
          viewer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_snapshots_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          analysis_job_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_locked: boolean | null
          priority: number | null
          title: string
        }
        Insert: {
          analysis_job_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_locked?: boolean | null
          priority?: number | null
          title: string
        }
        Update: {
          analysis_job_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_locked?: boolean | null
          priority?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_score_snapshots: {
        Row: {
          analysis_job_id: string | null
          confidence: string
          content: number | null
          created_at: string
          evidence: Json | null
          id: string
          momentum: number | null
          monetization: number | null
          overall: number
          positioning: number | null
          priority_dimension: string | null
          regularity: number | null
          signal_quality: string
          structure: number | null
          top_drag: string | null
          top_support: string | null
          user_id: string
        }
        Insert: {
          analysis_job_id?: string | null
          confidence: string
          content?: number | null
          created_at?: string
          evidence?: Json | null
          id?: string
          momentum?: number | null
          monetization?: number | null
          overall: number
          positioning?: number | null
          priority_dimension?: string | null
          regularity?: number | null
          signal_quality: string
          structure?: number | null
          top_drag?: string | null
          top_support?: string | null
          user_id: string
        }
        Update: {
          analysis_job_id?: string | null
          confidence?: string
          content?: number | null
          created_at?: string
          evidence?: Json | null
          id?: string
          momentum?: number | null
          monetization?: number | null
          overall?: number
          positioning?: number | null
          priority_dimension?: string | null
          regularity?: number | null
          signal_quality?: string
          structure?: number | null
          top_drag?: string | null
          top_support?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_score_snapshots_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_scores: {
        Row: {
          affiliate_progress: number | null
          analysis_job_id: string
          community: number | null
          content_quality: number | null
          created_at: string
          discoverability: number | null
          engagement: number | null
          growth: number | null
          id: string
          monetization_readiness: number | null
          overall_score: number | null
          regularity: number | null
        }
        Insert: {
          affiliate_progress?: number | null
          analysis_job_id: string
          community?: number | null
          content_quality?: number | null
          created_at?: string
          discoverability?: number | null
          engagement?: number | null
          growth?: number | null
          id?: string
          monetization_readiness?: number | null
          overall_score?: number | null
          regularity?: number | null
        }
        Update: {
          affiliate_progress?: number | null
          analysis_job_id?: string
          community?: number | null
          content_quality?: number | null
          created_at?: string
          discoverability?: number | null
          engagement?: number | null
          growth?: number | null
          id?: string
          monetization_readiness?: number | null
          overall_score?: number | null
          regularity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_scores_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      twitch_clip_snapshots: {
        Row: {
          broadcaster_id: string
          clip_created_at: string
          created_at: string
          creator_id: string | null
          duration: number | null
          fetched_at: string
          game_id: string | null
          id: string
          is_featured: boolean | null
          thumbnail_url: string | null
          title: string | null
          twitch_clip_id: string
          updated_at: string
          url: string | null
          user_id: string
          video_id: string | null
          view_count: number | null
          vod_offset: number | null
        }
        Insert: {
          broadcaster_id: string
          clip_created_at: string
          created_at?: string
          creator_id?: string | null
          duration?: number | null
          fetched_at?: string
          game_id?: string | null
          id?: string
          is_featured?: boolean | null
          thumbnail_url?: string | null
          title?: string | null
          twitch_clip_id: string
          updated_at?: string
          url?: string | null
          user_id: string
          video_id?: string | null
          view_count?: number | null
          vod_offset?: number | null
        }
        Update: {
          broadcaster_id?: string
          clip_created_at?: string
          created_at?: string
          creator_id?: string | null
          duration?: number | null
          fetched_at?: string
          game_id?: string | null
          id?: string
          is_featured?: boolean | null
          thumbnail_url?: string | null
          title?: string | null
          twitch_clip_id?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          video_id?: string | null
          view_count?: number | null
          vod_offset?: number | null
        }
        Relationships: []
      }
      twitch_clips: {
        Row: {
          analysis_job_id: string
          created_at: string
          creator_name: string | null
          id: string
          title: string | null
          twitch_clip_id: string | null
          view_count: number | null
        }
        Insert: {
          analysis_job_id: string
          created_at?: string
          creator_name?: string | null
          id?: string
          title?: string | null
          twitch_clip_id?: string | null
          view_count?: number | null
        }
        Update: {
          analysis_job_id?: string
          created_at?: string
          creator_name?: string | null
          id?: string
          title?: string | null
          twitch_clip_id?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "twitch_clips_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      twitch_eventsub_events: {
        Row: {
          broadcaster_user_id: string | null
          created_at: string
          id: string
          message_id: string
          message_type: string
          payload: Json
          processed_at: string | null
          processing_attempts: number
          processing_error: string | null
          processing_status: string
          received_at: string
          subscription_type: string | null
          subscription_version: string | null
        }
        Insert: {
          broadcaster_user_id?: string | null
          created_at?: string
          id?: string
          message_id: string
          message_type: string
          payload?: Json
          processed_at?: string | null
          processing_attempts?: number
          processing_error?: string | null
          processing_status?: string
          received_at?: string
          subscription_type?: string | null
          subscription_version?: string | null
        }
        Update: {
          broadcaster_user_id?: string | null
          created_at?: string
          id?: string
          message_id?: string
          message_type?: string
          payload?: Json
          processed_at?: string | null
          processing_attempts?: number
          processing_error?: string | null
          processing_status?: string
          received_at?: string
          subscription_type?: string | null
          subscription_version?: string | null
        }
        Relationships: []
      }
      twitch_eventsub_processing_logs: {
        Row: {
          context: Json | null
          created_at: string
          event: string
          id: string
          level: string
          message: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          event: string
          id?: string
          level?: string
          message?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          event?: string
          id?: string
          level?: string
          message?: string | null
        }
        Relationships: []
      }
      twitch_eventsub_subscriptions: {
        Row: {
          broadcaster_user_id: string
          callback_url: string | null
          condition: Json
          cost: number | null
          created_at: string
          id: string
          revoked_at: string | null
          revoked_reason: string | null
          status: string
          transport: Json
          twitch_subscription_id: string | null
          type: string
          updated_at: string
          version: string
        }
        Insert: {
          broadcaster_user_id: string
          callback_url?: string | null
          condition?: Json
          cost?: number | null
          created_at?: string
          id?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: string
          transport?: Json
          twitch_subscription_id?: string | null
          type: string
          updated_at?: string
          version: string
        }
        Update: {
          broadcaster_user_id?: string
          callback_url?: string | null
          condition?: Json
          cost?: number | null
          created_at?: string
          id?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: string
          transport?: Json
          twitch_subscription_id?: string | null
          type?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      twitch_profiles: {
        Row: {
          broadcaster_type: string | null
          created_at: string
          description: string | null
          display_name: string | null
          fetched_at: string | null
          follower_count: number | null
          id: string
          login: string | null
          profile_image_url: string | null
          twitch_user_id: string | null
          updated_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          broadcaster_type?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          fetched_at?: string | null
          follower_count?: number | null
          id?: string
          login?: string | null
          profile_image_url?: string | null
          twitch_user_id?: string | null
          updated_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          broadcaster_type?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          fetched_at?: string | null
          follower_count?: number | null
          id?: string
          login?: string | null
          profile_image_url?: string | null
          twitch_user_id?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      twitch_videos: {
        Row: {
          analysis_job_id: string
          created_at: string
          duration: string | null
          id: string
          title: string | null
          twitch_video_id: string | null
          view_count: number | null
        }
        Insert: {
          analysis_job_id: string
          created_at?: string
          duration?: string | null
          id?: string
          title?: string | null
          twitch_video_id?: string | null
          view_count?: number | null
        }
        Update: {
          analysis_job_id?: string
          created_at?: string
          duration?: string | null
          id?: string
          title?: string | null
          twitch_video_id?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "twitch_videos_analysis_job_id_fkey"
            columns: ["analysis_job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_action_items: {
        Row: {
          action_key: string | null
          auto_verifiable: boolean
          category: string
          completed_at: string | null
          confidence: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          evidence: Json | null
          expected_impact: string | null
          id: string
          position: number
          priority_score: number | null
          reason: string | null
          skipped_at: string | null
          skipped_reason: string | null
          source: string | null
          source_ref_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          verification_signal: string | null
          weekly_milestone_id: string
        }
        Insert: {
          action_key?: string | null
          auto_verifiable?: boolean
          category: string
          completed_at?: string | null
          confidence?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          evidence?: Json | null
          expected_impact?: string | null
          id?: string
          position: number
          priority_score?: number | null
          reason?: string | null
          skipped_at?: string | null
          skipped_reason?: string | null
          source?: string | null
          source_ref_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          verification_signal?: string | null
          weekly_milestone_id: string
        }
        Update: {
          action_key?: string | null
          auto_verifiable?: boolean
          category?: string
          completed_at?: string | null
          confidence?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          evidence?: Json | null
          expected_impact?: string | null
          id?: string
          position?: number
          priority_score?: number | null
          reason?: string | null
          skipped_at?: string | null
          skipped_reason?: string | null
          source?: string | null
          source_ref_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          verification_signal?: string | null
          weekly_milestone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_action_items_weekly_milestone_id_fkey"
            columns: ["weekly_milestone_id"]
            isOneToOne: false
            referencedRelation: "weekly_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_action_outcomes: {
        Row: {
          action_key: string
          after_value: number | null
          before_value: number | null
          confidence: string
          created_at: string
          delta: number | null
          dimension: string | null
          evaluated_at: string
          evidence: Json | null
          id: string
          note: string | null
          outcome_status: string
          signal_kind: string
          updated_at: string
          user_id: string
          weekly_action_item_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          action_key: string
          after_value?: number | null
          before_value?: number | null
          confidence: string
          created_at?: string
          delta?: number | null
          dimension?: string | null
          evaluated_at?: string
          evidence?: Json | null
          id?: string
          note?: string | null
          outcome_status: string
          signal_kind: string
          updated_at?: string
          user_id: string
          weekly_action_item_id: string
          window_end: string
          window_start: string
        }
        Update: {
          action_key?: string
          after_value?: number | null
          before_value?: number | null
          confidence?: string
          created_at?: string
          delta?: number | null
          dimension?: string | null
          evaluated_at?: string
          evidence?: Json | null
          id?: string
          note?: string | null
          outcome_status?: string
          signal_kind?: string
          updated_at?: string
          user_id?: string
          weekly_action_item_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_action_outcomes_weekly_action_item_id_fkey"
            columns: ["weekly_action_item_id"]
            isOneToOne: false
            referencedRelation: "weekly_action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_milestones: {
        Row: {
          created_at: string
          diagnosis: string | null
          generated_at: string | null
          generated_signals: Json | null
          id: string
          kind: string
          rationale: string
          reached_at: string | null
          source_debrief_id: string | null
          source_session_id: string | null
          status: string
          target_count: number
          title: string
          updated_at: string
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          diagnosis?: string | null
          generated_at?: string | null
          generated_signals?: Json | null
          id?: string
          kind: string
          rationale: string
          reached_at?: string | null
          source_debrief_id?: string | null
          source_session_id?: string | null
          status?: string
          target_count?: number
          title: string
          updated_at?: string
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          diagnosis?: string | null
          generated_at?: string | null
          generated_signals?: Json | null
          id?: string
          kind?: string
          rationale?: string
          reached_at?: string | null
          source_debrief_id?: string | null
          source_session_id?: string | null
          status?: string
          target_count?: number
          title?: string
          updated_at?: string
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      verify_eventsub_cron_secret: { Args: { token: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
