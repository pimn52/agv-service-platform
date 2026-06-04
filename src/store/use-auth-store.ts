import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// 演示模式的模拟用户（不走 Supabase 认证）
const DEMO_USER = {
  id: 'demo_user',
  email: 'demo@agv-platform.demo',
  user_metadata: { name: '演示用户' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  demoMode: boolean

  initialize: () => Promise<void>
  setDemoMode: () => void
  exitDemoMode: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => {
  return {
    user: null,
    loading: true,
    initialized: false,
    demoMode: false,

    initialize: async () => {
      // 检查是否存在演示模式 cookie/session
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        set({ user: session.user, loading: false, initialized: true })
      } else {
        // 没有登录 session——等用户决定（登录 or 演示模式）
        set({ user: null, loading: false, initialized: true })
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null })
      })
    },

    // 进入演示模式——跳过认证，使用模拟用户
    setDemoMode: () => {
      set({
        user: DEMO_USER,
        demoMode: true,
        loading: false,
        initialized: true,
      })
    },

    // 退出演示模式——恢复真实 Supabase 会话（不清除登录态）
    exitDemoMode: async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({ user: session.user, demoMode: false, loading: false, initialized: true })
      } else {
        set({ user: null, demoMode: false, loading: false, initialized: true })
      }
    },

    signIn: async (email, password) => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      return {}
    },

    signUp: async (email, password, name) => {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) return { error: error.message }
      return {}
    },

    signOut: async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      set({ user: null, demoMode: false })
    },
  }
})
