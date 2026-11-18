// Generated from the live Supabase schema (project knlmduggizctaipynpkc).
// Regenerate after schema changes: npx supabase gen types typescript --project-id knlmduggizctaipynpkc > src/lib/database.types.ts

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
          username: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          is_verified_creator?: boolean
          username?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          is_verified_creator?: boolean
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
          reward: number | null
          start_date: string | null
          status: string
          target_country: string | null
          target_state: string | null
          target_zone: string | null
          title: string
        }
        Insert: {
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
          reward?: number | null
          start_date?: string | null
          status?: string
          target_country?: string | null
          target_state?: string | null
          target_zone?: string | null
          title: string
        }
        Update: {
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
