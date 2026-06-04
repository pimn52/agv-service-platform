'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/use-auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { AgvIcon } from '@/components/shared/agv-icon'

/** 手机号 → 伪邮箱（Supabase 不支持手机号+密码，映射为 phone_ 伪邮箱） */
function toAuthEmail(input: string): string {
  const trimmed = input.trim()
  if (trimmed.includes('@')) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 10) return `phone_${digits}@agv.user`
  return trimmed
}

export function AuthPage({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const setDemoMode = useAuthStore((s) => s.setDemoMode)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const authEmail = toAuthEmail(email)
    const displayName = name || (email.includes('@') ? email.split('@')[0] : email)

    const result =
      mode === 'login'
        ? await signIn(authEmail, password)
        : await signUp(authEmail, password, displayName)

    setLoading(false)
    if (result.error) {
      setError(result.error)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 bg-gradient-to-b from-blue-50 to-white relative">
      {onBack && (
        <button onClick={onBack} className="absolute top-4 left-4 text-[13px] text-gray-400 hover:text-gray-600 transition-colors">
          ← 返回
        </button>
      )}
      <div className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center">
          <AgvIcon size={64} />
        </div>
        <h1 className="text-xl font-bold text-gray-900">城市无人车服务</h1>
        <p className="text-sm text-gray-500 mt-1">
          {mode === 'login' ? '登录你的账号' : '创建新账号'}
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            {mode === 'login' ? '登录' : '注册'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name">姓名</Label>
                <Input
                  id="name"
                  placeholder="你的姓名或公司名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">邮箱 / 手机号</Label>
              <Input
                id="email"
                type="text"
                placeholder="you@example.com 或 13800000000"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' ? '登录' : '注册'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <button
              type="button"
              className="ml-1 text-blue-600 hover:underline"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError('')
              }}
            >
              {mode === 'login' ? '立即注册' : '去登录'}
            </button>
          </div>

          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setDemoMode()}
              className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              先看看，进入演示体验
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
