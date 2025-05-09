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
      usage_logs: {
        Row: {
          id: string
          user_id: string
          model: string
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
          timestamp: string
        }
        Insert: {
          id?: string
          user_id: string
          model: string
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string
          model?: string
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_costs: {
        Row: {
          id: string
          user_id: string
          month: string
          cost_usd: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          cost_usd: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          cost_usd?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_costs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tool_configs: {
        Row: {
          id: string
          user_id: string
          tool_name: string
          config_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tool_name: string
          config_json: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tool_name?: string
          config_json?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_configs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_credits: {
        Row: {
          id: string
          user_id: string
          credits_balance: number
          last_updated: string
        }
        Insert: {
          id?: string
          user_id: string
          credits_balance: number
          last_updated?: string
        }
        Update: {
          id?: string
          user_id?: string
          credits_balance?: number
          last_updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      credit_ledger: {
        Row: {
          id: string
          user_id: string
          amount: number
          balance_after: number
          description: string
          transaction_type: string
          reference_id?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          balance_after: number
          description: string
          transaction_type: string
          reference_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          balance_after?: number
          description?: string
          transaction_type?: string
          reference_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stripe_products: {
        Row: {
          id: string
          stripe_product_id: string
          name: string
          description: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          stripe_product_id: string
          name: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          stripe_product_id?: string
          name?: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      stripe_prices: {
        Row: {
          id: string
          stripe_price_id: string
          stripe_product_id: string
          currency: string
          unit_amount: number
          credits_amount: number
          recurring_interval: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          stripe_price_id: string
          stripe_product_id: string
          currency: string
          unit_amount: number
          credits_amount: number
          recurring_interval?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          stripe_price_id?: string
          stripe_product_id?: string
          currency?: string
          unit_amount?: number
          credits_amount?: number
          recurring_interval?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_prices_stripe_product_id_fkey"
            columns: ["stripe_product_id"]
            referencedRelation: "stripe_products"
            referencedColumns: ["stripe_product_id"]
          }
        ]
      }
      stripe_subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string
          stripe_price_id: string
          status: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id: string
          stripe_price_id: string
          status: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string
          stripe_price_id?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stripe_payment_history: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          amount: number
          currency: string
          credits_amount: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          amount: number
          currency: string
          credits_amount: number
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          amount?: number
          currency?: string
          credits_amount?: number
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_payment_history_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      usage_metrics: {
        Row: {
          id: string
          tool_name: string
          avg_tokens: number
          total_tokens: number
          count: number
          user_id: string | null
          model: string | null
          last_updated: string
        }
        Insert: {
          id?: string
          tool_name: string
          avg_tokens: number
          total_tokens: number
          count: number
          user_id?: string | null
          model?: string | null
          last_updated?: string
        }
        Update: {
          id?: string
          tool_name?: string
          avg_tokens?: number
          total_tokens?: number
          count?: number
          user_id?: string | null
          model?: string | null
          last_updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      // Add other tables as needed
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
