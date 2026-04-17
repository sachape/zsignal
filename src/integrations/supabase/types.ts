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
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_name: string
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_name?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
