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
          error_message: string | null
          failed_at: string | null
          id: string
          last_error: string | null
          locked_at: string | null
          max_retries: number
          platform: string | null
          platform_login: string | null
          platform_user_id: string | null
          processed_by: string | null
          processing_started_at: string | null
          retry_count: number
          score_computed_at: string | null
          score_error_message: string | null
          score_processed_by: string | null
          score_status: string | null
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
          error_message?: string | null
          failed_at?: string | null
          id?: string
          last_error?: string | null
          locked_at?: string | null
          max_retries?: number
          platform?: string | null
          platform_login?: string | null
          platform_user_id?: string | null
          processed_by?: string | null
          processing_started_at?: string | null
          retry_count?: number
          score_computed_at?: string | null
          score_error_message?: string | null
          score_processed_by?: string | null
          score_status?: string | null
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
          error_message?: string | null
          failed_at?: string | null
          id?: string
          last_error?: string | null
          locked_at?: string | null
          max_retries?: number
          platform?: string | null
          platform_login?: string | null
          platform_user_id?: string | null
          processed_by?: string | null
          processing_started_at?: string | null
          retry_count?: number
          score_computed_at?: string | null
          score_error_message?: string | null
          score_processed_by?: string | null
          score_status?: string | null
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
      billing_customers: {
        Row: {
          created_at: string
          stripe_customer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          stripe_customer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          stripe_customer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      channel_stream_scores: {
        Row: {
          broadcaster_type: string | null
          confidence: string | null
          created_at: string
          discovery_source: string | null
          display_name: string
          game_id: string | null
          game_name: string
          id: string
          is_live: boolean
          language: string
          last_seen_in_category_at: string | null
          last_seen_live_at: string | null
          live_updated_at: string | null
          live_viewer_count: number | null
          login: string
          platform: string
          platform_user_id: string
          profile_image_url: string | null
          score_updated_at: string
          signal_quality: string | null
          stream_score: number
          updated_at: string
        }
        Insert: {
          broadcaster_type?: string | null
          confidence?: string | null
          created_at?: string
          discovery_source?: string | null
          display_name: string
          game_id?: string | null
          game_name: string
          id?: string
          is_live?: boolean
          language?: string
          last_seen_in_category_at?: string | null
          last_seen_live_at?: string | null
          live_updated_at?: string | null
          live_viewer_count?: number | null
          login: string
          platform?: string
          platform_user_id: string
          profile_image_url?: string | null
          score_updated_at?: string
          signal_quality?: string | null
          stream_score: number
          updated_at?: string
        }
        Update: {
          broadcaster_type?: string | null
          confidence?: string | null
          created_at?: string
          discovery_source?: string | null
          display_name?: string
          game_id?: string | null
          game_name?: string
          id?: string
          is_live?: boolean
          language?: string
          last_seen_in_category_at?: string | null
          last_seen_live_at?: string | null
          live_updated_at?: string | null
          live_viewer_count?: number | null
          login?: string
          platform?: string
          platform_user_id?: string
          profile_image_url?: string | null
          score_updated_at?: string
          signal_quality?: string | null
          stream_score?: number
          updated_at?: string
        }
        Relationships: []
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
      competitor_snapshots: {
        Row: {
          captured_at: string
          captured_on: string
          clips_30d: number | null
          created_at: string
          game_id: string | null
          game_name: string | null
          id: string
          is_live: boolean
          login: string
          platform: string
          platform_user_id: string | null
          stream_score: number | null
          streams_30d: number | null
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          captured_at?: string
          captured_on?: string
          clips_30d?: number | null
          created_at?: string
          game_id?: string | null
          game_name?: string | null
          id?: string
          is_live?: boolean
          login: string
          platform?: string
          platform_user_id?: string | null
          stream_score?: number | null
          streams_30d?: number | null
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          captured_at?: string
          captured_on?: string
          clips_30d?: number | null
          created_at?: string
          game_id?: string | null
          game_name?: string | null
          id?: string
          is_live?: boolean
          login?: string
          platform?: string
          platform_user_id?: string | null
          stream_score?: number | null
          streams_30d?: number | null
          user_id?: string
          viewer_count?: number | null
        }
        Relationships: []
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
      creator_brand_kit: {
        Row: {
          accent_color: string | null
          created_at: string
          display_name: string | null
          handle: string | null
          id: string
          logo_storage_bucket: string | null
          logo_storage_path: string | null
          notes: string | null
          preferred_style: string | null
          primary_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          logo_storage_bucket?: string | null
          logo_storage_path?: string | null
          notes?: string | null
          preferred_style?: string | null
          primary_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          logo_storage_bucket?: string | null
          logo_storage_path?: string | null
          notes?: string | null
          preferred_style?: string | null
          primary_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_connected_accounts: {
        Row: {
          access_token_encrypted: string | null
          avatar_url: string | null
          connection_status: string
          created_at: string
          display_name: string | null
          id: string
          last_synced_at: string | null
          platform: string
          platform_user_id: string | null
          profile_url: string | null
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          username: string | null
          zernio_account_id: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          avatar_url?: string | null
          connection_status?: string
          created_at?: string
          display_name?: string | null
          id?: string
          last_synced_at?: string | null
          platform: string
          platform_user_id?: string | null
          profile_url?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          zernio_account_id?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          avatar_url?: string | null
          connection_status?: string
          created_at?: string
          display_name?: string | null
          id?: string
          last_synced_at?: string | null
          platform?: string
          platform_user_id?: string | null
          profile_url?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          zernio_account_id?: string | null
        }
        Relationships: []
      }
      creator_content_items: {
        Row: {
          created_at: string
          creation_method: string
          description: string | null
          description_variants: Json
          duration: string | null
          external_platform_id: string | null
          format: string | null
          generated_video_storage_bucket: string | null
          generated_video_storage_path: string | null
          generated_video_url: string | null
          generation_error: string | null
          generation_status: string | null
          hashtag_variants: Json
          hashtags: Json
          id: string
          last_metrics_sync_at: string | null
          layout_type: string | null
          live_session_id: string | null
          notes: string | null
          opportunity_label: string | null
          opportunity_reason: string | null
          opportunity_score: number | null
          output_format: string | null
          platform: string
          post_publish_metrics: Json | null
          priority: string
          published_at: string | null
          published_platform: string | null
          published_url: string | null
          reason: string | null
          recommended_publish_at: string | null
          selected_description_variant: string | null
          selected_hashtags: Json
          selected_title_variant: string | null
          source_channel_login: string | null
          source_duration: number | null
          source_end_time: number | null
          source_idea_id: string | null
          source_platform: string | null
          source_start_time: number | null
          source_video_url: string | null
          status: string
          thumbnail_url: string | null
          title: string
          title_variants: Json
          updated_at: string
          user_id: string
          video_source_id: string | null
          youtube_privacy_status: string | null
          youtube_uploaded_at: string | null
          youtube_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          created_at?: string
          creation_method?: string
          description?: string | null
          description_variants?: Json
          duration?: string | null
          external_platform_id?: string | null
          format?: string | null
          generated_video_storage_bucket?: string | null
          generated_video_storage_path?: string | null
          generated_video_url?: string | null
          generation_error?: string | null
          generation_status?: string | null
          hashtag_variants?: Json
          hashtags?: Json
          id?: string
          last_metrics_sync_at?: string | null
          layout_type?: string | null
          live_session_id?: string | null
          notes?: string | null
          opportunity_label?: string | null
          opportunity_reason?: string | null
          opportunity_score?: number | null
          output_format?: string | null
          platform: string
          post_publish_metrics?: Json | null
          priority?: string
          published_at?: string | null
          published_platform?: string | null
          published_url?: string | null
          reason?: string | null
          recommended_publish_at?: string | null
          selected_description_variant?: string | null
          selected_hashtags?: Json
          selected_title_variant?: string | null
          source_channel_login?: string | null
          source_duration?: number | null
          source_end_time?: number | null
          source_idea_id?: string | null
          source_platform?: string | null
          source_start_time?: number | null
          source_video_url?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          title_variants?: Json
          updated_at?: string
          user_id: string
          video_source_id?: string | null
          youtube_privacy_status?: string | null
          youtube_uploaded_at?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          created_at?: string
          creation_method?: string
          description?: string | null
          description_variants?: Json
          duration?: string | null
          external_platform_id?: string | null
          format?: string | null
          generated_video_storage_bucket?: string | null
          generated_video_storage_path?: string | null
          generated_video_url?: string | null
          generation_error?: string | null
          generation_status?: string | null
          hashtag_variants?: Json
          hashtags?: Json
          id?: string
          last_metrics_sync_at?: string | null
          layout_type?: string | null
          live_session_id?: string | null
          notes?: string | null
          opportunity_label?: string | null
          opportunity_reason?: string | null
          opportunity_score?: number | null
          output_format?: string | null
          platform?: string
          post_publish_metrics?: Json | null
          priority?: string
          published_at?: string | null
          published_platform?: string | null
          published_url?: string | null
          reason?: string | null
          recommended_publish_at?: string | null
          selected_description_variant?: string | null
          selected_hashtags?: Json
          selected_title_variant?: string | null
          source_channel_login?: string | null
          source_duration?: number | null
          source_end_time?: number | null
          source_idea_id?: string | null
          source_platform?: string | null
          source_start_time?: number | null
          source_video_url?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          title_variants?: Json
          updated_at?: string
          user_id?: string
          video_source_id?: string | null
          youtube_privacy_status?: string | null
          youtube_uploaded_at?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_content_items_video_source_id_fkey"
            columns: ["video_source_id"]
            isOneToOne: false
            referencedRelation: "creator_video_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_credit_ledger: {
        Row: {
          created_at: string
          credit_package_id: string | null
          delta: number
          expires_at: string | null
          feature: string | null
          id: string
          metadata: Json
          reason: string
          related_job_id: string | null
          related_job_table: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_package_id?: string | null
          delta: number
          expires_at?: string | null
          feature?: string | null
          id?: string
          metadata?: Json
          reason: string
          related_job_id?: string | null
          related_job_table?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credit_package_id?: string | null
          delta?: number
          expires_at?: string | null
          feature?: string | null
          id?: string
          metadata?: Json
          reason?: string
          related_job_id?: string | null
          related_job_table?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_credit_ledger_credit_package_id_fkey"
            columns: ["credit_package_id"]
            isOneToOne: false
            referencedRelation: "credit_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_live_sessions: {
        Row: {
          checklist: Json
          created_at: string
          game_category: string | null
          generated_metadata: Json
          id: string
          language: string | null
          objective: string | null
          platforms: Json
          scheduled_at: string | null
          status: string
          target_audience: string | null
          title_raw: string
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          game_category?: string | null
          generated_metadata?: Json
          id?: string
          language?: string | null
          objective?: string | null
          platforms?: Json
          scheduled_at?: string | null
          status?: string
          target_audience?: string | null
          title_raw?: string
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          game_category?: string | null
          generated_metadata?: Json
          id?: string
          language?: string | null
          objective?: string | null
          platforms?: Json
          scheduled_at?: string | null
          status?: string
          target_audience?: string | null
          title_raw?: string
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_meta_connections: {
        Row: {
          access_token_encrypted: string | null
          account_type: string | null
          connection_status: string
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          instagram_account_id: string | null
          instagram_profile_picture_url: string | null
          instagram_username: string | null
          last_sync_at: string | null
          meta_user_id: string | null
          page_id: string | null
          page_name: string | null
          platform: string
          refresh_token_encrypted: string | null
          scopes_granted: string[] | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          account_type?: string | null
          connection_status?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          instagram_account_id?: string | null
          instagram_profile_picture_url?: string | null
          instagram_username?: string | null
          last_sync_at?: string | null
          meta_user_id?: string | null
          page_id?: string | null
          page_name?: string | null
          platform?: string
          refresh_token_encrypted?: string | null
          scopes_granted?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          account_type?: string | null
          connection_status?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          instagram_account_id?: string | null
          instagram_profile_picture_url?: string | null
          instagram_username?: string | null
          last_sync_at?: string | null
          meta_user_id?: string | null
          page_id?: string | null
          page_name?: string | null
          platform?: string
          refresh_token_encrypted?: string | null
          scopes_granted?: string[] | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_platform_metrics: {
        Row: {
          comments_count: number | null
          connected_account_id: string | null
          created_at: string
          followers_count: number | null
          id: string
          likes_count: number | null
          platform: string
          posts_count: number | null
          raw_metrics: Json | null
          recent_activity_score: number | null
          recent_posts_count: number | null
          shares_count: number | null
          snapshot_date: string
          subscribers_count: number | null
          user_id: string
          videos_count: number | null
          views_count: number | null
        }
        Insert: {
          comments_count?: number | null
          connected_account_id?: string | null
          created_at?: string
          followers_count?: number | null
          id?: string
          likes_count?: number | null
          platform: string
          posts_count?: number | null
          raw_metrics?: Json | null
          recent_activity_score?: number | null
          recent_posts_count?: number | null
          shares_count?: number | null
          snapshot_date: string
          subscribers_count?: number | null
          user_id: string
          videos_count?: number | null
          views_count?: number | null
        }
        Update: {
          comments_count?: number | null
          connected_account_id?: string | null
          created_at?: string
          followers_count?: number | null
          id?: string
          likes_count?: number | null
          platform?: string
          posts_count?: number | null
          raw_metrics?: Json | null
          recent_activity_score?: number | null
          recent_posts_count?: number | null
          shares_count?: number | null
          snapshot_date?: string
          subscribers_count?: number | null
          user_id?: string
          videos_count?: number | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_platform_metrics_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "creator_connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_presence_scores: {
        Row: {
          consistency_score: number | null
          content_recycling_score: number | null
          created_at: string
          diagnosis: string | null
          diversification_score: number | null
          id: string
          instagram_score: number | null
          presence_score: number | null
          recommendations: Json | null
          score: number
          snapshot_date: string
          tiktok_score: number | null
          twitch_score: number | null
          user_id: string
          youtube_score: number | null
        }
        Insert: {
          consistency_score?: number | null
          content_recycling_score?: number | null
          created_at?: string
          diagnosis?: string | null
          diversification_score?: number | null
          id?: string
          instagram_score?: number | null
          presence_score?: number | null
          recommendations?: Json | null
          score: number
          snapshot_date: string
          tiktok_score?: number | null
          twitch_score?: number | null
          user_id: string
          youtube_score?: number | null
        }
        Update: {
          consistency_score?: number | null
          content_recycling_score?: number | null
          created_at?: string
          diagnosis?: string | null
          diversification_score?: number | null
          id?: string
          instagram_score?: number | null
          presence_score?: number | null
          recommendations?: Json | null
          score?: number
          snapshot_date?: string
          tiktok_score?: number | null
          twitch_score?: number | null
          user_id?: string
          youtube_score?: number | null
        }
        Relationships: []
      }
      creator_social_posts: {
        Row: {
          caption: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          external_platform_id: string | null
          format: string
          hashtags: string[]
          id: string
          media_mime_type: string | null
          media_storage_path: string | null
          media_url: string | null
          platform: string
          published_at: string | null
          published_url: string | null
          scheduled_at: string | null
          source_content_item_id: string | null
          status: string
          target_account_ids: Json | null
          updated_at: string
          user_id: string
          zernio_post_id: string | null
          zernio_raw_response: Json | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          external_platform_id?: string | null
          format: string
          hashtags?: string[]
          id?: string
          media_mime_type?: string | null
          media_storage_path?: string | null
          media_url?: string | null
          platform?: string
          published_at?: string | null
          published_url?: string | null
          scheduled_at?: string | null
          source_content_item_id?: string | null
          status?: string
          target_account_ids?: Json | null
          updated_at?: string
          user_id: string
          zernio_post_id?: string | null
          zernio_raw_response?: Json | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          external_platform_id?: string | null
          format?: string
          hashtags?: string[]
          id?: string
          media_mime_type?: string | null
          media_storage_path?: string | null
          media_url?: string | null
          platform?: string
          published_at?: string | null
          published_url?: string | null
          scheduled_at?: string | null
          source_content_item_id?: string | null
          status?: string
          target_account_ids?: Json | null
          updated_at?: string
          user_id?: string
          zernio_post_id?: string | null
          zernio_raw_response?: Json | null
        }
        Relationships: []
      }
      creator_video_generation_jobs: {
        Row: {
          billing_source: string | null
          callback_status: string | null
          completed_at: string | null
          content_item_id: string
          created_at: string
          credit_ledger_entry_id: string | null
          credits_spent: number
          duration_seconds: number
          end_time_seconds: number
          error_code: string | null
          error_message: string | null
          generation_stage: string
          id: string
          layout_preset_id: string | null
          layout_type: string | null
          metadata: Json | null
          output_format: string
          output_height: number | null
          output_storage_path: string | null
          output_url: string | null
          output_width: number | null
          progress: number | null
          source_storage_path: string | null
          source_type: string
          source_url: string | null
          start_time_seconds: number
          status: string
          updated_at: string
          user_id: string
          video_source_id: string | null
          worker_completed_at: string | null
          worker_last_seen_at: string | null
          worker_started_at: string | null
        }
        Insert: {
          billing_source?: string | null
          callback_status?: string | null
          completed_at?: string | null
          content_item_id: string
          created_at?: string
          credit_ledger_entry_id?: string | null
          credits_spent?: number
          duration_seconds: number
          end_time_seconds: number
          error_code?: string | null
          error_message?: string | null
          generation_stage?: string
          id?: string
          layout_preset_id?: string | null
          layout_type?: string | null
          metadata?: Json | null
          output_format?: string
          output_height?: number | null
          output_storage_path?: string | null
          output_url?: string | null
          output_width?: number | null
          progress?: number | null
          source_storage_path?: string | null
          source_type: string
          source_url?: string | null
          start_time_seconds: number
          status?: string
          updated_at?: string
          user_id: string
          video_source_id?: string | null
          worker_completed_at?: string | null
          worker_last_seen_at?: string | null
          worker_started_at?: string | null
        }
        Update: {
          billing_source?: string | null
          callback_status?: string | null
          completed_at?: string | null
          content_item_id?: string
          created_at?: string
          credit_ledger_entry_id?: string | null
          credits_spent?: number
          duration_seconds?: number
          end_time_seconds?: number
          error_code?: string | null
          error_message?: string | null
          generation_stage?: string
          id?: string
          layout_preset_id?: string | null
          layout_type?: string | null
          metadata?: Json | null
          output_format?: string
          output_height?: number | null
          output_storage_path?: string | null
          output_url?: string | null
          output_width?: number | null
          progress?: number | null
          source_storage_path?: string | null
          source_type?: string
          source_url?: string | null
          start_time_seconds?: number
          status?: string
          updated_at?: string
          user_id?: string
          video_source_id?: string | null
          worker_completed_at?: string | null
          worker_last_seen_at?: string | null
          worker_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_video_generation_jobs_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "creator_content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_video_generation_jobs_credit_ledger_entry_id_fkey"
            columns: ["credit_ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "creator_credit_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_video_generation_jobs_layout_preset_id_fkey"
            columns: ["layout_preset_id"]
            isOneToOne: false
            referencedRelation: "creator_video_layout_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_video_generation_jobs_video_source_id_fkey"
            columns: ["video_source_id"]
            isOneToOne: false
            referencedRelation: "creator_video_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_video_layout_presets: {
        Row: {
          created_at: string
          facecam_height: number | null
          facecam_width: number | null
          facecam_x: number | null
          facecam_y: number | null
          gameplay_height: number | null
          gameplay_width: number | null
          gameplay_x: number | null
          gameplay_y: number | null
          id: string
          layout_type: string
          output_height: number
          output_width: number
          platform: string
          platform_user_id: string
          source_reference_height: number | null
          source_reference_width: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          facecam_height?: number | null
          facecam_width?: number | null
          facecam_x?: number | null
          facecam_y?: number | null
          gameplay_height?: number | null
          gameplay_width?: number | null
          gameplay_x?: number | null
          gameplay_y?: number | null
          id?: string
          layout_type?: string
          output_height?: number
          output_width?: number
          platform?: string
          platform_user_id: string
          source_reference_height?: number | null
          source_reference_width?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          facecam_height?: number | null
          facecam_width?: number | null
          facecam_x?: number | null
          facecam_y?: number | null
          gameplay_height?: number | null
          gameplay_width?: number | null
          gameplay_x?: number | null
          gameplay_y?: number | null
          id?: string
          layout_type?: string
          output_height?: number
          output_width?: number
          platform?: string
          platform_user_id?: string
          source_reference_height?: number | null
          source_reference_width?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_video_sources: {
        Row: {
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          mime_type: string | null
          original_filename: string | null
          platform: string | null
          platform_video_id: string | null
          source_type: string
          source_url: string | null
          storage_bucket: string | null
          storage_path: string | null
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          original_filename?: string | null
          platform?: string | null
          platform_video_id?: string | null
          source_type: string
          source_url?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          original_filename?: string | null
          platform?: string | null
          platform_video_id?: string | null
          source_type?: string
          source_url?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          badge: string | null
          created_at: string
          credits: number
          currency: string
          description: string | null
          display_name: string
          display_order: number
          display_price_cents: number | null
          id: string
          is_active: boolean
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          badge?: string | null
          created_at?: string
          credits: number
          currency?: string
          description?: string | null
          display_name: string
          display_order?: number
          display_price_cents?: number | null
          id: string
          is_active?: boolean
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          badge?: string | null
          created_at?: string
          credits?: number
          currency?: string
          description?: string | null
          display_name?: string
          display_order?: number
          display_price_cents?: number | null
          id?: string
          is_active?: boolean
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      generated_visuals: {
        Row: {
          created_at: string
          height: number | null
          id: string
          is_favorite: boolean
          job_id: string
          mime_type: string
          prompt_used: string | null
          storage_bucket: string
          storage_path: string
          template_id: string
          user_id: string
          variant_index: number
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          is_favorite?: boolean
          job_id: string
          mime_type?: string
          prompt_used?: string | null
          storage_bucket: string
          storage_path: string
          template_id: string
          user_id: string
          variant_index?: number
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          is_favorite?: boolean
          job_id?: string
          mime_type?: string
          prompt_used?: string | null
          storage_bucket?: string
          storage_path?: string
          template_id?: string
          user_id?: string
          variant_index?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_visuals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "visual_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_visuals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "visual_templates"
            referencedColumns: ["id"]
          },
        ]
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
          welcome_email_sent_at: string | null
          zernio_profile_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
          welcome_email_sent_at?: string | null
          zernio_profile_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          welcome_email_sent_at?: string | null
          zernio_profile_id?: string | null
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
      streamscore_email_events: {
        Row: {
          email_key: string
          id: string
          sent_at: string
          snapshot_id: string
          user_id: string
        }
        Insert: {
          email_key: string
          id?: string
          sent_at?: string
          snapshot_id: string
          user_id: string
        }
        Update: {
          email_key?: string
          id?: string
          sent_at?: string
          snapshot_id?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          founder_price: boolean
          plan_name: string | null
          status: string | null
          stripe_customer_id: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          founder_price?: boolean
          plan_name?: string | null
          status?: string | null
          stripe_customer_id: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          founder_price?: boolean
          plan_name?: string | null
          status?: string | null
          stripe_customer_id?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      twitch_categories: {
        Row: {
          box_art_url: string | null
          created_at: string
          game_id: string
          game_name: string
          last_synced_at: string
          updated_at: string
        }
        Insert: {
          box_art_url?: string | null
          created_at?: string
          game_id: string
          game_name: string
          last_synced_at?: string
          updated_at?: string
        }
        Update: {
          box_art_url?: string | null
          created_at?: string
          game_id?: string
          game_name?: string
          last_synced_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      twitch_channel_daily_stats: {
        Row: {
          avg_viewers: number
          broadcaster_id: string
          broadcaster_login: string | null
          created_at: string
          date: string
          dominant_game_id: string | null
          dominant_game_name: string | null
          dominant_language: string | null
          estimated_hours_watched: number
          hours_streamed_estimated: number
          id: string
          min_viewers: number
          peak_viewers: number
          snapshots_count: number
          updated_at: string
        }
        Insert: {
          avg_viewers?: number
          broadcaster_id: string
          broadcaster_login?: string | null
          created_at?: string
          date: string
          dominant_game_id?: string | null
          dominant_game_name?: string | null
          dominant_language?: string | null
          estimated_hours_watched?: number
          hours_streamed_estimated?: number
          id?: string
          min_viewers?: number
          peak_viewers?: number
          snapshots_count?: number
          updated_at?: string
        }
        Update: {
          avg_viewers?: number
          broadcaster_id?: string
          broadcaster_login?: string | null
          created_at?: string
          date?: string
          dominant_game_id?: string | null
          dominant_game_name?: string | null
          dominant_language?: string | null
          estimated_hours_watched?: number
          hours_streamed_estimated?: number
          id?: string
          min_viewers?: number
          peak_viewers?: number
          snapshots_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      twitch_channel_index: {
        Row: {
          broadcaster_id: string
          broadcaster_login: string
          broadcaster_name: string | null
          broadcaster_type: string | null
          created_at: string
          first_seen_at: string
          last_game_id: string | null
          last_game_name: string | null
          last_language: string | null
          last_seen_at: string
          last_viewer_count: number | null
          lifetime_peak_viewers: number
          profile_image_url: string | null
          snapshot_count: number
          updated_at: string
        }
        Insert: {
          broadcaster_id: string
          broadcaster_login: string
          broadcaster_name?: string | null
          broadcaster_type?: string | null
          created_at?: string
          first_seen_at?: string
          last_game_id?: string | null
          last_game_name?: string | null
          last_language?: string | null
          last_seen_at?: string
          last_viewer_count?: number | null
          lifetime_peak_viewers?: number
          profile_image_url?: string | null
          snapshot_count?: number
          updated_at?: string
        }
        Update: {
          broadcaster_id?: string
          broadcaster_login?: string
          broadcaster_name?: string | null
          broadcaster_type?: string | null
          created_at?: string
          first_seen_at?: string
          last_game_id?: string | null
          last_game_name?: string | null
          last_language?: string | null
          last_seen_at?: string
          last_viewer_count?: number | null
          lifetime_peak_viewers?: number
          profile_image_url?: string | null
          snapshot_count?: number
          updated_at?: string
        }
        Relationships: []
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
      twitch_game_snapshots: {
        Row: {
          captured_at: string
          created_at: string
          game_id: string
          game_name: string | null
          id: string
          language: string
          median_viewers: number
          top_channel_viewers: number
          total_channels: number
          total_viewers: number
          viewer_channel_ratio: number
        }
        Insert: {
          captured_at?: string
          created_at?: string
          game_id: string
          game_name?: string | null
          id?: string
          language?: string
          median_viewers?: number
          top_channel_viewers?: number
          total_channels?: number
          total_viewers?: number
          viewer_channel_ratio?: number
        }
        Update: {
          captured_at?: string
          created_at?: string
          game_id?: string
          game_name?: string | null
          id?: string
          language?: string
          median_viewers?: number
          top_channel_viewers?: number
          total_channels?: number
          total_viewers?: number
          viewer_channel_ratio?: number
        }
        Relationships: []
      }
      twitch_market_runs: {
        Row: {
          channels_upserted: number
          created_at: string
          daily_stats_upserted: number
          error_message: string | null
          finished_at: string | null
          game_snapshots_written: number
          helix_calls: number
          id: string
          metadata: Json
          rate_limited_count: number
          run_type: string
          snapshots_written: number
          started_at: string
          status: string
        }
        Insert: {
          channels_upserted?: number
          created_at?: string
          daily_stats_upserted?: number
          error_message?: string | null
          finished_at?: string | null
          game_snapshots_written?: number
          helix_calls?: number
          id?: string
          metadata?: Json
          rate_limited_count?: number
          run_type: string
          snapshots_written?: number
          started_at?: string
          status?: string
        }
        Update: {
          channels_upserted?: number
          created_at?: string
          daily_stats_upserted?: number
          error_message?: string | null
          finished_at?: string | null
          game_snapshots_written?: number
          helix_calls?: number
          id?: string
          metadata?: Json
          rate_limited_count?: number
          run_type?: string
          snapshots_written?: number
          started_at?: string
          status?: string
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
      twitch_stream_snapshots: {
        Row: {
          broadcaster_id: string
          broadcaster_login: string
          broadcaster_name: string | null
          captured_at: string
          created_at: string
          game_id: string | null
          game_name: string | null
          id: string
          language: string | null
          profile_image_url: string | null
          started_at: string | null
          thumbnail_url: string | null
          title: string | null
          viewer_count: number
        }
        Insert: {
          broadcaster_id: string
          broadcaster_login: string
          broadcaster_name?: string | null
          captured_at?: string
          created_at?: string
          game_id?: string | null
          game_name?: string | null
          id?: string
          language?: string | null
          profile_image_url?: string | null
          started_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          viewer_count?: number
        }
        Update: {
          broadcaster_id?: string
          broadcaster_login?: string
          broadcaster_name?: string | null
          captured_at?: string
          created_at?: string
          game_id?: string | null
          game_name?: string | null
          id?: string
          language?: string | null
          profile_image_url?: string | null
          started_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          viewer_count?: number
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
      user_badge_state: {
        Row: {
          badge_key: string
          badge_type: string
          created_at: string
          id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          badge_key: string
          badge_type?: string
          created_at?: string
          id?: string
          seen_at?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          badge_type?: string
          created_at?: string
          id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_checklist_progress: {
        Row: {
          checklist_key: string
          completed_at: string
          created_at: string
          id: string
          item_key: string
          user_id: string
        }
        Insert: {
          checklist_key: string
          completed_at?: string
          created_at?: string
          id?: string
          item_key: string
          user_id: string
        }
        Update: {
          checklist_key?: string
          completed_at?: string
          created_at?: string
          id?: string
          item_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_email_events: {
        Row: {
          email_key: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          email_key: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          email_key?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_facecam_presets: {
        Row: {
          created_at: string
          crop_height: number
          crop_width: number
          crop_x: number
          crop_y: number
          geometry_version: number
          id: string
          is_enabled: boolean
          last_used_at: string | null
          source_height: number | null
          source_width: number | null
          twitch_channel_id: string | null
          twitch_channel_login: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_height: number
          crop_width: number
          crop_x: number
          crop_y: number
          geometry_version?: number
          id?: string
          is_enabled?: boolean
          last_used_at?: string | null
          source_height?: number | null
          source_width?: number | null
          twitch_channel_id?: string | null
          twitch_channel_login: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crop_height?: number
          crop_width?: number
          crop_x?: number
          crop_y?: number
          geometry_version?: number
          id?: string
          is_enabled?: boolean
          last_used_at?: string | null
          source_height?: number | null
          source_width?: number | null
          twitch_channel_id?: string | null
          twitch_channel_login?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string
          steps_visited: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          steps_visited?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          steps_visited?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          active_connected_account_id: string | null
          created_at: string
          preferred_language: string | null
          preferred_niche: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_connected_account_id?: string | null
          created_at?: string
          preferred_language?: string | null
          preferred_niche?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_connected_account_id?: string | null
          created_at?: string
          preferred_language?: string | null
          preferred_niche?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_active_connected_account_id_fkey"
            columns: ["active_connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quest_checks: {
        Row: {
          checked_at: string
          id: string
          quest_id: string
          user_id: string
          week_key: string
        }
        Insert: {
          checked_at?: string
          id?: string
          quest_id: string
          user_id: string
          week_key: string
        }
        Update: {
          checked_at?: string
          id?: string
          quest_id?: string
          user_id?: string
          week_key?: string
        }
        Relationships: []
      }
      visual_generation_jobs: {
        Row: {
          billing_source: string | null
          completed_at: string | null
          created_at: string
          credit_ledger_entry_id: string | null
          credits_spent: number
          error_code: string | null
          error_message: string | null
          id: string
          model: string | null
          params: Json
          prompt_used: string | null
          provider: string | null
          provider_response_has_image: boolean | null
          reference_asset_id: string | null
          source_ref: Json | null
          started_at: string | null
          status: string
          template_id: string
          updated_at: string
          user_id: string
          variant_count: number
        }
        Insert: {
          billing_source?: string | null
          completed_at?: string | null
          created_at?: string
          credit_ledger_entry_id?: string | null
          credits_spent?: number
          error_code?: string | null
          error_message?: string | null
          id?: string
          model?: string | null
          params?: Json
          prompt_used?: string | null
          provider?: string | null
          provider_response_has_image?: boolean | null
          reference_asset_id?: string | null
          source_ref?: Json | null
          started_at?: string | null
          status?: string
          template_id: string
          updated_at?: string
          user_id: string
          variant_count?: number
        }
        Update: {
          billing_source?: string | null
          completed_at?: string | null
          created_at?: string
          credit_ledger_entry_id?: string | null
          credits_spent?: number
          error_code?: string | null
          error_message?: string | null
          id?: string
          model?: string | null
          params?: Json
          prompt_used?: string | null
          provider?: string | null
          provider_response_has_image?: boolean | null
          reference_asset_id?: string | null
          source_ref?: Json | null
          started_at?: string | null
          status?: string
          template_id?: string
          updated_at?: string
          user_id?: string
          variant_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "visual_generation_jobs_credit_ledger_entry_id_fkey"
            columns: ["credit_ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "creator_credit_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_generation_jobs_reference_asset_id_fkey"
            columns: ["reference_asset_id"]
            isOneToOne: false
            referencedRelation: "visual_uploaded_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_generation_jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "visual_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_templates: {
        Row: {
          base_prompt: string
          category: string
          created_at: string
          description: string
          height: number
          icon: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          width: number
        }
        Insert: {
          base_prompt: string
          category: string
          created_at?: string
          description: string
          height: number
          icon?: string | null
          id: string
          is_active?: boolean
          label: string
          sort_order?: number
          width: number
        }
        Update: {
          base_prompt?: string
          category?: string
          created_at?: string
          description?: string
          height?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          width?: number
        }
        Relationships: []
      }
      visual_uploaded_assets: {
        Row: {
          created_at: string
          id: string
          kind: string
          mime_type: string | null
          original_filename: string | null
          size_bytes: number | null
          storage_bucket: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          mime_type?: string | null
          original_filename?: string | null
          size_bytes?: number | null
          storage_bucket: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          mime_type?: string | null
          original_filename?: string | null
          size_bytes?: number | null
          storage_bucket?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_clip_commands: {
        Row: {
          action_type: string
          created_at: string
          enabled: boolean
          id: string
          keyword: string
          metadata: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          enabled?: boolean
          id?: string
          keyword: string
          metadata?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          enabled?: boolean
          id?: string
          keyword?: string
          metadata?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_clip_events: {
        Row: {
          action_type: string
          clip_fetch_attempts: number
          clip_ready_at: string | null
          clip_url: string | null
          companion_sent_at: string | null
          confidence: number | null
          content_item_id: string | null
          content_queued_at: string | null
          created_at: string
          detected_at: string
          error_code: string | null
          id: string
          keyword: string
          live_session_id: string | null
          received_at: string | null
          status: string
          stream_id: string | null
          twitch_clip_id: string | null
          twitch_request_at: string | null
          twitch_response_at: string | null
          updated_at: string
          user_id: string
          voice_event_id: string
        }
        Insert: {
          action_type?: string
          clip_fetch_attempts?: number
          clip_ready_at?: string | null
          clip_url?: string | null
          companion_sent_at?: string | null
          confidence?: number | null
          content_item_id?: string | null
          content_queued_at?: string | null
          created_at?: string
          detected_at?: string
          error_code?: string | null
          id?: string
          keyword: string
          live_session_id?: string | null
          received_at?: string | null
          status?: string
          stream_id?: string | null
          twitch_clip_id?: string | null
          twitch_request_at?: string | null
          twitch_response_at?: string | null
          updated_at?: string
          user_id: string
          voice_event_id: string
        }
        Update: {
          action_type?: string
          clip_fetch_attempts?: number
          clip_ready_at?: string | null
          clip_url?: string | null
          companion_sent_at?: string | null
          confidence?: number | null
          content_item_id?: string | null
          content_queued_at?: string | null
          created_at?: string
          detected_at?: string
          error_code?: string | null
          id?: string
          keyword?: string
          live_session_id?: string | null
          received_at?: string | null
          status?: string
          stream_id?: string | null
          twitch_clip_id?: string | null
          twitch_request_at?: string | null
          twitch_response_at?: string | null
          updated_at?: string
          user_id?: string
          voice_event_id?: string
        }
        Relationships: []
      }
      voice_clip_settings: {
        Row: {
          companion_last_seen_at: string | null
          companion_listening: boolean
          companion_microphone_available: boolean
          companion_platform: string | null
          companion_token: string
          companion_version: string | null
          confidence_threshold: number
          cooldown_seconds: number
          created_at: string
          enabled: boolean
          id: string
          keyword: string
          last_test_detected_at: string | null
          last_test_keyword: string | null
          microphone_label: string | null
          notifications_enabled: boolean
          sound_feedback_enabled: boolean
          target_duration_seconds: number
          test_mode_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          companion_last_seen_at?: string | null
          companion_listening?: boolean
          companion_microphone_available?: boolean
          companion_platform?: string | null
          companion_token?: string
          companion_version?: string | null
          confidence_threshold?: number
          cooldown_seconds?: number
          created_at?: string
          enabled?: boolean
          id?: string
          keyword?: string
          last_test_detected_at?: string | null
          last_test_keyword?: string | null
          microphone_label?: string | null
          notifications_enabled?: boolean
          sound_feedback_enabled?: boolean
          target_duration_seconds?: number
          test_mode_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          companion_last_seen_at?: string | null
          companion_listening?: boolean
          companion_microphone_available?: boolean
          companion_platform?: string | null
          companion_token?: string
          companion_version?: string | null
          confidence_threshold?: number
          cooldown_seconds?: number
          created_at?: string
          enabled?: boolean
          id?: string
          keyword?: string
          last_test_detected_at?: string | null
          last_test_keyword?: string | null
          microphone_label?: string | null
          notifications_enabled?: boolean
          sound_feedback_enabled?: boolean
          target_duration_seconds?: number
          test_mode_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlist_entries: {
        Row: {
          broadcaster_type: string | null
          created_at: string
          display_name: string | null
          game_id: string | null
          game_name: string | null
          id: string
          login: string
          notes: string | null
          platform: string
          platform_user_id: string
          profile_image_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          broadcaster_type?: string | null
          created_at?: string
          display_name?: string | null
          game_id?: string | null
          game_name?: string | null
          id?: string
          login: string
          notes?: string | null
          platform?: string
          platform_user_id?: string
          profile_image_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          broadcaster_type?: string | null
          created_at?: string
          display_name?: string | null
          game_id?: string | null
          game_name?: string | null
          id?: string
          login?: string
          notes?: string | null
          platform?: string
          platform_user_id?: string
          profile_image_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      claim_next_analysis_job: {
        Args: { p_lock_timeout_minutes?: number; p_processor?: string }
        Returns: {
          id: string
          max_retries: number
          platform: string
          platform_login: string
          platform_user_id: string
          retry_count: number
          status: string
          user_id: string
        }[]
      }
      cleanup_orphaned_generation_jobs: { Args: never; Returns: Json }
      consume_generation_credit: {
        Args: { p_cost: number; p_feature: string; p_user_id: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_user: { Args: never; Returns: undefined }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      fail_analysis_job: {
        Args: { p_error: string; p_job_id: string }
        Returns: string
      }
      fail_stale_voice_clip_events: {
        Args: { p_timeout_minutes?: number }
        Returns: number
      }
      get_competitor_matches_for_job: {
        Args: { p_analysis_job_id: string }
        Returns: {
          analysis_job_id: string
          avg_viewers: number | null
          competitor_login: string
          created_at: string
          display_name: string | null
          follower_count: number | null
          id: string
          similarity_score: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "competitor_matches"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_latest_streamscore_snapshot: {
        Args: { p_platform_user_id?: string }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "stream_score_snapshots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_streamscore_history: {
        Args: { p_platform_user_id?: string; p_range_days?: number }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "stream_score_snapshots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_credit_balance: { Args: { p_user_id?: string }; Returns: Json }
      get_user_effective_plan: { Args: { uid: string }; Returns: string }
      get_user_quota_usage: { Args: { p_user_id: string }; Returns: Json }
      has_welcome_bonus: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_dimension_key: { Args: { label: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refund_failed_job_credits: {
        Args: { p_job_id: string; p_job_table: string }
        Returns: string
      }
      score_level_from_pct: { Args: { pct: number }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
