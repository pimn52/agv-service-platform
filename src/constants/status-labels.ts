import type { OrderStatus } from '@/types'

export interface StatusLabel {
  label: string
  color: string
}

// 全项目唯一的状态标签源
// 颜色体系：灰=等待 蓝=进行中 琥珀=需关注 绿=成功 红=取消
export const STATUS_LABELS: Record<OrderStatus, StatusLabel> = {
  pending:         { label: '待确认',     color: '#999999' },
  pricing:         { label: '计费中',     color: '#999999' },
  paying:          { label: '待支付',     color: '#FAAD14' },
  dispatching:     { label: '调度中',     color: '#1677FF' },
  dispatched:      { label: '已调度',     color: '#1677FF' },
  picking_up:      { label: '投件中',     color: '#FAAD14' },
  loading:         { label: '装货中',     color: '#1677FF' },
  started:         { label: '已就位',     color: '#1677FF' },
  in_transit:      { label: '运输中',     color: '#1677FF' },
  arrived:         { label: '已到达',     color: '#52C41A' },
  unloading:       { label: '卸货中',     color: '#1677FF' },
  picked_up:       { label: '取件中',     color: '#FAAD14' },
  completed:       { label: '已完成',     color: '#52C41A' },
  cancelled:       { label: '已取消',     color: '#FF4D4F' },
  selling:         { label: '贩卖中',     color: '#52C41A' },
  vending_active:  { label: '贩卖中',     color: '#52C41A' },
  vending_paused:  { label: '贩卖暂停',   color: '#FAAD14' },
  patrolling:      { label: '巡检中',     color: '#1677FF' },
  patrolling_paused: { label: '巡检暂停', color: '#FAAD14' },
}

export function getStatusLabel(status: OrderStatus): StatusLabel {
  return STATUS_LABELS[status]
}
