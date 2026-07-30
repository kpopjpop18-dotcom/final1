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
      binders: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      card_rarities: {
        Row: {
          card_id: string
          rarity: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          card_id: string
          rarity: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          card_id?: string
          rarity?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      daily_logins: {
        Row: {
          day: string
          id: string
          user_id: string
        }
        Insert: {
          day?: string
          id?: string
          user_id: string
        }
        Update: {
          day?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: []
      }
      library_cards: {
        Row: {
          created_at: string
          id: string
          image: string
          rarity: string
        }
        Insert: {
          created_at?: string
          id: string
          image: string
          rarity?: string
        }
        Update: {
          created_at?: string
          id?: string
          image?: string
          rarity?: string
        }
        Relationships: []
      }
      owned_cards: {
        Row: {
          binder_id: string | null
          card_id: string
          for_adoption: boolean
          for_trade: boolean
          id: string
          is_dupe: boolean
          is_new: boolean
          owned_at: string
          user_id: string
        }
        Insert: {
          binder_id?: string | null
          card_id: string
          for_adoption?: boolean
          for_trade?: boolean
          id?: string
          is_dupe?: boolean
          is_new?: boolean
          owned_at?: string
          user_id: string
        }
        Update: {
          binder_id?: string | null
          card_id?: string
          for_adoption?: boolean
          for_trade?: boolean
          id?: string
          is_dupe?: boolean
          is_new?: boolean
          owned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owned_cards_binder_id_fkey"
            columns: ["binder_id"]
            isOneToOne: false
            referencedRelation: "binders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          banned: boolean
          check_in_streak: number
          chickens: number
          created_at: string
          emoji: string | null
          fav_group: string | null
          fav_member: string | null
          id: string
          last_check_in: string | null
          last_spin: string
          recovery_code: string
          spotify: string | null
          username: string
          wall: Json
        }
        Insert: {
          avatar?: string | null
          banned?: boolean
          check_in_streak?: number
          chickens?: number
          created_at?: string
          emoji?: string | null
          fav_group?: string | null
          fav_member?: string | null
          id: string
          last_check_in?: string | null
          last_spin?: string
          recovery_code: string
          spotify?: string | null
          username: string
          wall?: Json
        }
        Update: {
          avatar?: string | null
          banned?: boolean
          check_in_streak?: number
          chickens?: number
          created_at?: string
          emoji?: string | null
          fav_group?: string | null
          fav_member?: string | null
          id?: string
          last_check_in?: string | null
          last_spin?: string
          recovery_code?: string
          spotify?: string | null
          username?: string
          wall?: Json
        }
        Relationships: []
      }
      trades: {
        Row: {
          created_at: string
          from_card: string
          from_user: string
          id: string
          status: string
          to_card: string
          to_user: string
        }
        Insert: {
          created_at?: string
          from_card: string
          from_user: string
          id?: string
          status?: string
          to_card: string
          to_user: string
        }
        Update: {
          created_at?: string
          from_card?: string
          from_user?: string
          id?: string
          status?: string
          to_card?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_from_card_fkey"
            columns: ["from_card"]
            isOneToOne: false
            referencedRelation: "owned_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_to_card_fkey"
            columns: ["to_card"]
            isOneToOne: false
            referencedRelation: "owned_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_stats: { Args: never; Returns: Json }
      adopt_card: { Args: { _card: string }; Returns: string }
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      claim_admin: { Args: { _code: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recover_account: {
        Args: { _code: string; _new_password: string }
        Returns: string
      }
      respond_trade: {
        Args: { _accept: boolean; _trade: string }
        Returns: boolean
      }
      username_for_recovery: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
