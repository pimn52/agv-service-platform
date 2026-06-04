import type { TrackingInfo } from '@/types'
import { MOCK_TRACKING } from '@/mock/data'

/** 同步查找追踪数据（后续接入 Supabase tracking 表时改为异步） */
export function findTrackingByOrderId(orderId: string): TrackingInfo | undefined {
  return MOCK_TRACKING[orderId]
}
