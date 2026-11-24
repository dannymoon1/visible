// Generated from the Supabase schema (development project rlxvzrxfxtltuoowijra), then kept by hand.
// Regenerate after schema changes: pnpm supabase gen types typescript --db-url "<pooler connection string>" --schema public

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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      campaign_participants: {
        Row: {
          id: string
          joined_at: string
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          status: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      link_events: {
        Row: {
          created_at: string
          device: string | null
          event: string
          hits: number
          id: number
          link_id: string
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          event: string
          hits?: number
          id?: never
          link_id: string
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          device?: string | null
          event?: string
          hits?: number
          id?: never
          link_id?: string
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "tracking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_links: {
        Row: {
          archived_at: string | null
          audience: string
          channel: string
          created_at: string
          created_by: string | null
          id: string
          label: string
          message: string
          slug: string
        }
        Insert: {
          archived_at?: string | null
          audience: string
          channel: string
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          message?: string
          slug: string
        }
        Update: {
          archived_at?: string | null
          audience?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          message?: string
          slug?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          emailed_at: string | null
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          emailed_at?: string | null
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          emailed_at?: string | null
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          balance: number | null
          created_at: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          is_verified_creator: boolean
          signup_link_id: string | null
          username: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          is_verified_creator?: boolean
          signup_link_id?: string | null
          username?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          is_verified_creator?: boolean
          signup_link_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          comment_text: string | null
          created_at: string
          engagement_status: string | null
          id: string
          paid_at: string | null
          payout_amount: number | null
          post_platform: string | null
          post_url: string | null
          quality_score: number | null
          social_handle: string | null
          status: string | null
          task_id: string | null
          user_id: string | null
          verification_flags: Json | null
          verification_summary: string | null
          verification_verdict: string | null
          verified_at: string | null
          verified_views: number | null
        }
        Insert: {
          comment_text?: string | null
          created_at?: string
          engagement_status?: string | null
          id?: string
          paid_at?: string | null
          payout_amount?: number | null
          post_platform?: string | null
          post_url?: string | null
          quality_score?: number | null
          social_handle?: string | null
          status?: string | null
          task_id?: string | null
          user_id?: string | null
          verification_flags?: Json | null
          verification_summary?: string | null
          verification_verdict?: string | null
          verified_at?: string | null
          verified_views?: number | null
        }
        Update: {
          comment_text?: string | null
          created_at?: string
          engagement_status?: string | null
          id?: string
          paid_at?: string | null
          payout_amount?: number | null
          post_platform?: string | null
          post_url?: string | null
          quality_score?: number | null
          social_handle?: string | null
          status?: string | null
          task_id?: string | null
          user_id?: string | null
          verification_flags?: Json | null
          verification_summary?: string | null
          verification_verdict?: string | null
          verified_at?: string | null
          verified_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions_backup_before_unique_constraint: {
        Row: {
          created_at: string | null
          id: string | null
          paid_at: string | null
          status: string | null
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          paid_at?: string | null
          status?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          paid_at?: string | null
          status?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          budget: number | null
          end_date: string | null
          fee_amount: number | null
          fee_rate: number | null
          max_view_payout: number | null
          post_pool: number | null
          post_rate: number | null
          view_floor: number | null
          view_pool: number | null
          view_rate: number | null
          pricing_version: number
          amount_paid: number | null
          approved_count: number
          banner_url: string | null
          budget_spent: number
          campaign_type: string
          content_details: string | null
          content_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          languages: string[]
          link: string | null
          max_participants: number | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          notified_at: string | null
          pay_model: string
          payment_reference: string | null
          platform: string | null
          platforms: string[]
          reference_links: string[]
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward: number | null
          start_date: string | null
          status: string
          target_country: string | null
          target_state: string | null
          target_zone: string | null
          title: string
        }
        Insert: {
          budget?: number | null
          end_date?: string | null
          fee_amount?: number | null
          fee_rate?: number | null
          max_view_payout?: number | null
          post_pool?: number | null
          post_rate?: number | null
          view_floor?: number | null
          view_pool?: number | null
          view_rate?: number | null
          pricing_version?: number
          amount_paid?: number | null
          approved_count?: number
          banner_url?: string | null
          budget_spent?: number
          campaign_type?: string
          content_details?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          languages?: string[]
          link?: string | null
          max_participants?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          notified_at?: string | null
          pay_model?: string
          payment_reference?: string | null
          platform?: string | null
          platforms?: string[]
          reference_links?: string[]
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward?: number | null
          start_date?: string | null
          status?: string
          target_country?: string | null
          target_state?: string | null
          target_zone?: string | null
          title: string
        }
        Update: {
          budget?: number | null
          end_date?: string | null
          fee_amount?: number | null
          fee_rate?: number | null
          max_view_payout?: number | null
          post_pool?: number | null
          post_rate?: number | null
          view_floor?: number | null
          view_pool?: number | null
          view_rate?: number | null
          pricing_version?: number
          amount_paid?: number | null
          approved_count?: number
          banner_url?: string | null
          budget_spent?: number
          campaign_type?: string
          content_details?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          languages?: string[]
          link?: string | null
          max_participants?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          notified_at?: string | null
          pay_model?: string
          payment_reference?: string | null
          platform?: string | null
          platforms?: string[]
          reference_links?: string[]
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward?: number | null
          start_date?: string | null
          status?: string
          target_country?: string | null
          target_state?: string | null
          target_zone?: string | null
          title?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          bank_details: string
          created_at: string | null
          fee: number
          id: string
          method: string
          net_amount: number | null
          rejection_reason: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          bank_details: string
          created_at?: string | null
          fee?: number
          id?: string
          method: string
          net_amount?: number | null
          rejection_reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          bank_details?: string
          created_at?: string | null
          fee?: number
          id?: string
          method?: string
          net_amount?: number | null
          rejection_reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_withdrawals_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_campaign: {
        Args: {
          p_banner_url: string
          p_description: string
          p_languages: string[]
          p_platforms: string[]
          p_reference_links: string[]
          p_start_date: string
          p_target_country: string
          p_target_state: string
          p_target_zone: string
          p_task_id: string
          p_title: string
        }
        Returns: undefined
      }
      approve_submission: {
        Args: { p_admin_id: string; p_submission_id: string; p_views?: number }
        Returns: Json
      }
      campaign_spots: {
        Args: { p_task_ids: string[] }
        Returns: {
          joined: number
          standby: number
          task_id: string
        }[]
      }
      cancel_withdrawal: {
        Args: { user_id_input: string; withdrawal_id: string }
        Returns: undefined
      }
      decrement_balance: {
        Args: { amount_to_subtract: number; target_user_id: string }
        Returns: undefined
      }
      get_campaign_participants: {
        Args: { p_task_id: string }
        Returns: {
          is_verified_creator: boolean
          joined_at: string
          post_url: string
          status: string
          submission_status: string
          user_id: string
          username: string
        }[]
      }
      get_leaderboard: {
        Args: { p_limit?: number; p_period?: string }
        Returns: {
          approval_rate: number
          approved_posts: number
          campaigns: number
          display_name: string
          is_me: boolean
          last_approved_at: string
          platforms: string[]
          rank: number
          total_earnings: number
          username: string
        }[]
      }
      increment_balance: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      join_campaign: { Args: { p_task_id: string }; Returns: Json }
      lagos_today: { Args: never; Returns: string }
      leave_campaign: { Args: { p_task_id: string }; Returns: Json }
      link_signups: {
        Args: { p_link_id: string }
        Returns: {
          approved_posts: number
          campaigns_joined: number
          campaigns_paid: number
          created_at: string
          email: string | null
          posts: number
          user_id: string
          username: string | null
        }[]
      }
      link_stats: {
        Args: { p_since?: string | null }
        Returns: {
          approved: number
          builder_views: number
          cta_clicks: number
          joined_campaign: number
          link_id: string
          opened: number
          opens_total: number
          paid_campaign: number
          posted: number
          signed_up: number
          signup_views: number
          stayed: number
        }[]
      }
      notify_verified_campaign: { Args: { p_task_id: string }; Returns: number }
      owns_campaign: { Args: { p_task_id: string }; Returns: boolean }
      process_payout: {
        Args: {
          amount_to_subtract: number
          user_id: string
          withdrawal_id: string
        }
        Returns: undefined
      }
      promote_next_standby: { Args: { p_task_id: string }; Returns: string }
      record_link_event: {
        Args: { p_device?: string | null; p_event: string; p_slug: string; p_visitor: string }
        Returns: string | null
      }
      reject_payout: {
        Args: {
          amount_to_refund: number
          reason: string
          user_id: string
          withdrawal_id: string
        }
        Returns: undefined
      }
      reject_withdrawal: {
        Args: { rejection_reason: string; withdrawal_id: string }
        Returns: undefined
      }
      remove_participant: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: Json
      }
      request_withdrawal: {
        Args: { amount_input: number; bank_info: string; user_id_input: string }
        Returns: undefined
      }
      review_campaign: {
        Args: { p_action: string; p_note?: string; p_task_id: string }
        Returns: Json
      }
      set_campaign_status: {
        Args: { p_action: string; p_reason?: string; p_task_id: string }
        Returns: Json
      }
      set_creator_verified: {
        Args: { p_user_id: string; p_verified: boolean }
        Returns: undefined
      }
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
