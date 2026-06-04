// Database types for Supabase - 物流配送 V1
// These will be replaced with generated types once we run `supabase gen types`

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
      profiles: {
        Row: {
          id: string
          name: string
          phone: string | null
          avatar: string | null
          org_name: string | null
          org_type: string | null
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          phone?: string | null
          avatar?: string | null
          org_name?: string | null
          org_type?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          avatar?: string | null
          org_name?: string | null
          org_type?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          service_type: 'logistics' | 'vending' | 'security'
          status: string
          amount: number
          payment_method: string | null
          estimated_time: number | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          service_type: 'logistics' | 'vending' | 'security'
          status?: string
          amount?: number
          payment_method?: string | null
          estimated_time?: number | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          service_type?: 'logistics' | 'vending' | 'security'
          status?: string
          amount?: number
          payment_method?: string | null
          estimated_time?: number | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      order_logistics: {
        Row: {
          id: string
          order_id: string
          delivery_mode: 'full_load' | 'ltl'
          vehicle_id: string | null
          vehicle_name: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          sender_name: string | null
          sender_phone: string | null
          sender_address: Json | null
          receiver_name: string | null
          receiver_phone: string | null
          receiver_address: Json | null
          cargo_info: string | null
          cargo_type: string | null
          cargo_weight: number | null
          special_requirements: string[] | null
          origin: Json | null
          destination: Json | null
          estimated_cost: number | null
          actual_cost: number | null
          distance: number | null
          remaining_distance: number | null
          remaining_time: number | null
          delivery_time: string | null
        }
        Insert: {
          id?: string
          order_id: string
          delivery_mode?: 'full_load' | 'ltl'
          vehicle_id?: string | null
          vehicle_name?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          sender_address?: Json | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_address?: Json | null
          cargo_info?: string | null
          cargo_type?: string | null
          cargo_weight?: number | null
          special_requirements?: string[] | null
          origin?: Json | null
          destination?: Json | null
          estimated_cost?: number | null
          actual_cost?: number | null
          distance?: number | null
          remaining_distance?: number | null
          remaining_time?: number | null
          delivery_time?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          delivery_mode?: 'full_load' | 'ltl'
          vehicle_id?: string | null
          vehicle_name?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          sender_address?: Json | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_address?: Json | null
          cargo_info?: string | null
          cargo_type?: string | null
          cargo_weight?: number | null
          special_requirements?: string[] | null
          origin?: Json | null
          destination?: Json | null
          estimated_cost?: number | null
          actual_cost?: number | null
          distance?: number | null
          remaining_distance?: number | null
          remaining_time?: number | null
          delivery_time?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          order_id: string | null
          type: string
          service_type: string | null
          title: string
          message: string
          read: boolean
          dismissed: boolean
          postponed: boolean
          action_label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_id?: string | null
          type?: string
          service_type?: string | null
          title: string
          message: string
          read?: boolean
          dismissed?: boolean
          postponed?: boolean
          action_label?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_id?: string | null
          type?: string
          service_type?: string | null
          title?: string
          message?: string
          read?: boolean
          dismissed?: boolean
          postponed?: boolean
          action_label?: string | null
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
