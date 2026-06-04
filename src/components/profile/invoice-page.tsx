'use client';

import type { SubPage } from '@/store';
import { useAuthStore, useOrderStore } from '@/store';

import { toast } from '@/components/ui/toast'

const MOCK_INVOICES = [
  { id: 'INV001', orderId: 'DEMO-002', type: 'normal' as const, title: '北京智慧物流有限公司', amount: 620, status: 'issued' as const, issuedAt: '2025-05-19' },
  { id: 'INV002', orderId: 'DEMO-004', type: 'special' as const, title: '北京智慧物流有限公司', amount: 260, status: 'issued' as const, issuedAt: '2025-05-18' },
  { id: 'INV003', orderId: 'DEMO-006', type: 'special' as const, title: '北京智慧物流有限公司', amount: 1800, status: 'pending' as const },
]

export function InvoicePage({ page }: { page: SubPage }) {
  const orderId = (page as { data?: { orderId?: string } }).data?.orderId
  const demoMode = useAuthStore((s) => s.demoMode)
  // 真实用户不显示演示发票
  const invoices = demoMode
    ? (orderId ? MOCK_INVOICES.filter((inv) => inv.orderId === orderId) : MOCK_INVOICES)
    : []

  const completedCount = useOrderStore((s) => s.orders.filter((o) => o.status === 'completed').length)

  const handleApply = () => {
    if (completedCount === 0) {
      toast('暂无已完成的订单可申请发票')
    } else {
      toast('发票申请已提交')
    }
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {invoices.length === 0 && (
        <div className="text-center py-12 text-[13px] text-[#999]">暂无发票记录</div>
      )}
      {invoices.map((invoice) => (
        <div key={invoice.id} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[#999]">{invoice.id} · 订单 {invoice.orderId}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              invoice.status === 'issued' ? 'text-[#52C41A] bg-[#F0FFF0]' : 'text-[#FAAD14] bg-[#FFFBE6]'
            }`}>
              {invoice.status === 'issued' ? '已开具' : '处理中'}
            </span>
          </div>
          <div className="text-[13px] text-[#1A1A1A]">{invoice.title}</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
            <span className="text-[12px] text-[#999]">
              {invoice.type === 'normal' ? '增值税普票' : '增值税专票'} · ¥{invoice.amount / 100}
            </span>
            {invoice.status === 'issued' && (
              <button className="text-[12px] text-[#1677FF] active:opacity-60">下载</button>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={handleApply}
        className="w-full py-3 bg-white text-[#1677FF] text-[14px] font-medium rounded-xl border border-[#1677FF] active:bg-[#E6F0FF] transition-colors mt-4"
      >
        申请新发票
      </button>
    </div>
  )
}
