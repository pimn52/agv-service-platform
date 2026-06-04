import type { User } from '@/types'
import { MOCK_USER } from '@/mock/data'
import { createClient } from '@/lib/supabase/client'

function isDemoUser(userId: string): boolean {
  return userId === 'demo_user'
}

/** 查询用户档案 */
export async function getProfile(userId: string): Promise<User | null> {
  if (isDemoUser(userId)) {
    return MOCK_USER
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return {
    id: data.id as string,
    name: data.name as string,
    phone: (data.phone as string) ?? '',
    balance: (data.balance as number) ?? 0,
    organization: data.org_name
      ? {
          id: '',
          name: data.org_name as string,
          type: (data.org_type as 'logistics' | 'merchant' | 'property') ?? 'logistics',
          contactName: data.name as string,
          contactPhone: (data.phone as string) ?? '',
        }
      : undefined,
    createdAt: data.created_at as string,
  }
}
