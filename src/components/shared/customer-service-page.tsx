'use client';

import type { SubPage } from '@/store';

export function CustomerServicePage({ page }: { page: SubPage }) {
  return (
    <div className="flex flex-col h-full">
      {/* 聊天区域 */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
        <div className="flex justify-start">
          <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[80%] shadow-sm">
            <p className="text-[13px] text-[#1A1A1A]">您好！我是城市无人车服务的AI客服，请问有什么可以帮您？</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[80%] shadow-sm">
            <p className="text-[13px] text-[#1A1A1A]">您可以选择以下问题，或直接输入：</p>
            <div className="mt-2 space-y-1.5">
              {['如何下单配送？', '如何查看订单状态？', '自助取件怎么操作？', '如何申请开票？'].map((q) => (
                <button key={q} className="block w-full text-left text-[12px] text-[#1677FF] py-1 active:opacity-60">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-[var(--border)]">
        <input
          type="text"
          placeholder="输入您的问题..."
          className="flex-1 h-9 bg-[#F5F6FA] rounded-full px-4 text-[13px] outline-none"
        />
        <button className="px-4 h-9 bg-[#1677FF] text-white text-[13px] rounded-full active:bg-[#0958D9] transition-colors">
          发送
        </button>
      </div>
    </div>
  );
}
