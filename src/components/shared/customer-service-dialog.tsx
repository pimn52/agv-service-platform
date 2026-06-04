'use client';

import { useAppStore } from '@/store';
import { X, Send } from 'lucide-react';
import { useState } from 'react';

export function CustomerServiceDialog() {
  const { setShowServiceDialog } = useAppStore();
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="absolute inset-0 z-[200] flex flex-col bg-[var(--background)]">
      {/* 头部 */}
      <div className="flex items-center justify-between h-[44px] px-3 bg-white border-b border-[var(--border)] flex-shrink-0">
        <h1 className="text-[15px] font-medium text-[#1A1A1A]">在线客服</h1>
        <button onClick={() => setShowServiceDialog(false)} className="p-1 active:opacity-60">
          <X size="20" className="text-[#666]" />
        </button>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto hide-scrollbar">
        <div className="flex justify-start">
          <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[80%] shadow-sm">
            <p className="text-[13px] text-[#1A1A1A]">您好！我是城市无人车服务的AI客服，请问有什么可以帮您？</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[80%] shadow-sm">
            <p className="text-[13px] text-[#1A1A1A]">常见问题：</p>
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
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="输入您的问题..."
          className="flex-1 h-9 bg-[#F5F6FA] rounded-full px-4 text-[13px] outline-none"
        />
        <button className="w-9 h-9 bg-[#1677FF] rounded-full flex items-center justify-center active:bg-[#0958D9] transition-colors">
          <Send size="16" className="text-white" />
        </button>
      </div>
    </div>
  );
}
