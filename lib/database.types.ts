export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string | null
          display_name: string
          avatar_emoji: string
          country_code: string
          total_xp: number
          packs_earned: number
          cards_collected: number
          streak_days: number
          wallet_address: string | null
          wallet_connected: boolean
          auth_method: string
          last_login_date: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phone?: string | null
          display_name?: string
          avatar_emoji?: string
          country_code?: string
          total_xp?: number
          packs_earned?: number
          cards_collected?: number
          streak_days?: number
          wallet_address?: string | null
          wallet_connected?: boolean
          auth_method?: string
          last_login_date?: string | null
          onboarding_completed?: boolean
        }
        Update: {
          id?: string
          phone?: string | null
          display_name?: string
          avatar_emoji?: string
          country_code?: string
          total_xp?: number
          packs_earned?: number
          cards_collected?: number
          streak_days?: number
          wallet_address?: string | null
          wallet_connected?: boolean
          auth_method?: string
          last_login_date?: string | null
          onboarding_completed?: boolean
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          match_number: number
          stage: string
          group_letter: string | null
          team_a_name: string
          team_a_code: string
          team_a_flag: string
          team_b_name: string
          team_b_code: string
          team_b_flag: string
          kickoff: string
          venue: string
          city: string
          multiplier: number
          score_a: number | null
          score_b: number | null
          penalty_winner: 'a' | 'b' | null
          status: string
          created_at: string
        }
        Insert: {
          match_number: number
          stage: string
          group_letter?: string | null
          team_a_name: string
          team_a_code: string
          team_a_flag: string
          team_b_name: string
          team_b_code: string
          team_b_flag: string
          kickoff: string
          venue: string
          city: string
          multiplier?: number
          score_a?: number | null
          score_b?: number | null
          penalty_winner?: 'a' | 'b' | null
          status?: string
        }
        Update: {
          match_number?: number
          stage?: string
          group_letter?: string | null
          team_a_name?: string
          team_a_code?: string
          team_a_flag?: string
          team_b_name?: string
          team_b_code?: string
          team_b_flag?: string
          kickoff?: string
          venue?: string
          city?: string
          multiplier?: number
          score_a?: number | null
          score_b?: number | null
          penalty_winner?: 'a' | 'b' | null
          status?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          id: string
          user_id: string
          match_id: string
          score_a: number
          score_b: number
          penalty_winner: 'a' | 'b' | null
          points: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          match_id: string
          score_a: number
          score_b: number
          penalty_winner?: 'a' | 'b' | null
          points?: number | null
        }
        Update: {
          user_id?: string
          match_id?: string
          score_a?: number
          score_b?: number
          penalty_winner?: 'a' | 'b' | null
          points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'predictions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          }
        ]
      }
      bonus_predictions: {
        Row: {
          id: string
          user_id: string
          prediction_type: string
          value: string
          points: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          prediction_type: string
          value: string
          points?: number | null
        }
        Update: {
          user_id?: string
          prediction_type?: string
          value?: string
          points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'bonus_predictions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      groups: {
        Row: {
          id: string
          name: string
          emoji: string
          created_by: string
          is_paid: boolean
          entry_fee: number
          payout_model: string
          global_allocation: number
          invite_code: string
          member_count: number
          pool_amount: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          emoji?: string
          created_by: string
          is_paid?: boolean
          entry_fee?: number
          payout_model?: string
          global_allocation?: number
          invite_code: string
          member_count?: number
          pool_amount?: number
          status?: string
        }
        Update: {
          name?: string
          emoji?: string
          is_paid?: boolean
          entry_fee?: number
          payout_model?: string
          global_allocation?: number
          pool_amount?: number
          member_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'groups_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: string
          total_points: number
          rank: number | null
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role?: string
          total_points?: number
          rank?: number | null
        }
        Update: {
          group_id?: string
          user_id?: string
          role?: string
          total_points?: number
          rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'group_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      global_leaderboard: {
        Row: {
          user_id: string
          total_points: number
          matches_predicted: number
          exact_scores: number
          bonus_points: number
          rank: number | null
          tier: string
          updated_at: string
        }
        Insert: {
          user_id: string
          total_points?: number
          matches_predicted?: number
          exact_scores?: number
          bonus_points?: number
          rank?: number | null
          tier?: string
        }
        Update: {
          total_points?: number
          matches_predicted?: number
          exact_scores?: number
          bonus_points?: number
          rank?: number | null
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: 'global_leaderboard_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      xp_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          xp_amount: number
          reference_id: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          event_type: string
          xp_amount: number
          reference_id?: string | null
        }
        Update: {
          user_id?: string
          event_type?: string
          xp_amount?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'xp_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      cards: {
        Row: {
          id: string
          card_number: number
          name: string
          description: string | null
          rarity: string
          image_url: string | null
          category: string
          country_code: string | null
          created_at: string
        }
        Insert: {
          card_number: number
          name: string
          description?: string | null
          rarity: string
          image_url?: string | null
          category: string
          country_code?: string | null
        }
        Update: {
          card_number?: number
          name?: string
          description?: string | null
          rarity?: string
          image_url?: string | null
          category?: string
          country_code?: string | null
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          id: string
          user_id: string
          card_id: string
          pack_id: string | null
          obtained_at: string
        }
        Insert: {
          user_id: string
          card_id: string
          pack_id?: string | null
        }
        Update: {
          user_id?: string
          card_id?: string
          pack_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_cards_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_cards_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          }
        ]
      }
      booster_packs: {
        Row: {
          id: string
          user_id: string
          pack_number: number
          milestone_xp: number | null
          source: string
          min_rarity: string | null
          opened: boolean
          cards_awarded: string[] | null
          created_at: string
          opened_at: string | null
        }
        Insert: {
          user_id: string
          pack_number: number
          milestone_xp?: number | null
          source?: string
          min_rarity?: string | null
          opened?: boolean
          cards_awarded?: string[] | null
        }
        Update: {
          user_id?: string
          pack_number?: number
          milestone_xp?: number | null
          source?: string
          min_rarity?: string | null
          opened?: boolean
          cards_awarded?: string[] | null
          opened_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'booster_packs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      mini_predictions: {
        Row: {
          id: string
          user_id: string
          match_id: string
          first_to_score: string | null
          total_goals: string | null
          both_score: string | null
          early_goal: string | null
          motm: string | null
          correct_count: number | null
          xp_earned: number | null
          created_at: string
          scored_at: string | null
        }
        Insert: {
          user_id: string
          match_id: string
          first_to_score?: string | null
          total_goals?: string | null
          both_score?: string | null
          early_goal?: string | null
          motm?: string | null
        }
        Update: {
          first_to_score?: string | null
          total_goals?: string | null
          both_score?: string | null
          early_goal?: string | null
          motm?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'mini_predictions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mini_predictions_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          }
        ]
      }
      bet_markets: {
        Row: {
          id: string
          match_id: string
          market_type: string
          contract_market_id: string
          status: string
          winning_outcome: number | null
          tx_hash_create: string | null
          tx_hash_resolve: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          match_id: string
          market_type: string
          contract_market_id: string
          status?: string
          winning_outcome?: number | null
          tx_hash_create?: string | null
          tx_hash_resolve?: string | null
        }
        Update: {
          match_id?: string
          market_type?: string
          contract_market_id?: string
          status?: string
          winning_outcome?: number | null
          tx_hash_create?: string | null
          tx_hash_resolve?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'bet_markets_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          }
        ]
      }
      bets: {
        Row: {
          id: string
          user_id: string
          match_id: string
          market_type: string
          market_id: string
          outcome: number
          amount: number
          tx_hash: string | null
          status: string
          payout: number | null
          claimed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          match_id: string
          market_type: string
          market_id: string
          outcome: number
          amount: number
          tx_hash?: string | null
          status?: string
          payout?: number | null
          claimed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          match_id?: string
          market_type?: string
          market_id?: string
          outcome?: number
          amount?: number
          tx_hash?: string | null
          status?: string
          payout?: number | null
          claimed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bets_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bets_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invite_code: {
        Args: Record<string, never>
        Returns: string
      }
      score_match_predictions: {
        Args: {
          p_match_id: string
        }
        Returns: Json
      }
      refresh_group_leaderboard: {
        Args: {
          p_group_id: string
        }
        Returns: undefined
      }
      refresh_global_leaderboard: {
        Args: Record<string, never>
        Returns: Json
      }
      score_bonus_predictions: {
        Args: {
          p_results: Json
        }
        Returns: Json
      }
      score_mini_predictions: {
        Args: {
          p_match_id: string
        }
        Returns: Json
      }
      record_daily_login: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      check_xp_milestones: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      open_booster_pack: {
        Args: {
          p_user_id: string
          p_pack_id: string
        }
        Returns: Json
      }
      increment_xp: {
        Args: {
          p_user_id: string
          p_amount: number
        }
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
