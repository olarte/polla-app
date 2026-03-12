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
          is_minipay_user: boolean
          minipay_address: string | null
          wallet_celo: string | null
          wallet_base: string | null
          wallet_polygon: string | null
          wallet_tron: string | null
          wallet_ethereum: string | null
          deposit_chain: string | null
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
          is_minipay_user?: boolean
          minipay_address?: string | null
          wallet_celo?: string | null
          wallet_base?: string | null
          wallet_polygon?: string | null
          wallet_tron?: string | null
          wallet_ethereum?: string | null
          deposit_chain?: string | null
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
          is_minipay_user?: boolean
          minipay_address?: string | null
          wallet_celo?: string | null
          wallet_base?: string | null
          wallet_polygon?: string | null
          wallet_tron?: string | null
          wallet_ethereum?: string | null
          deposit_chain?: string | null
          onboarding_completed?: boolean
        }
        Relationships: []
      }
      balances: {
        Row: {
          id: string
          user_id: string
          available: number
          locked: number
          total_deposited: number
          total_withdrawn: number
          total_won: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          available?: number
          locked?: number
          total_deposited?: number
          total_withdrawn?: number
          total_won?: number
        }
        Update: {
          user_id?: string
          available?: number
          locked?: number
          total_deposited?: number
          total_withdrawn?: number
          total_won?: number
        }
        Relationships: [
          {
            foreignKeyName: 'balances_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      otp_codes: {
        Row: {
          phone: string
          code: string
          expires_at: string
          created_at: string
        }
        Insert: {
          phone: string
          code: string
          expires_at: string
        }
        Update: {
          phone?: string
          code?: string
          expires_at?: string
        }
        Relationships: []
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
