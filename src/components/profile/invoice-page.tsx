'use client';

import type { SubPage } from '@/store';

const MOCK_INVOICES = [
  { id: 'INV001', orderId: 'ORD20250114001', type: 'normal' as const, title: '北京智慧物流有限公司', amount: 620, status: 'issued' as const, issuedAt: '2025-01-15' },
  { id: 'INV002', orderId: 'ORD20250113001', type: 'special' as const, title: '北京智慧物流有限公司', amount: 1800, status: 'issued' as const, issuedAt: '2025-01-14' },
  { id: 'INV003', orderId: 'ORD20250112001', type: 'special' as const, title: '北京智慧物流有限公司', amount: 7200, status: 'pending' as const },
];

export function InvoicePage({ page }: { page: SubPage }) {
  return (
    <div className="px-4 py-4 space-y-3">
      {MOCK_INVOICES.map((invoice) => (
        <div key={invoice.id} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[#999]">{invoice.id}</span>
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

      <button className="w-full py-3 bg-white text-[#1677FF] text-[14px] font-medium rounded-xl border border-[#1677FF] active:bg-[#E6F0FF] transition-colors mt-4">
        申请新发票
      </button>
    </div>
  );
}
