'use client';

import { MessageCircle, Building2 } from 'lucide-react';
import { useAppStore } from '@/store';

export function ServiceLinks() {
  const { pushPage, setShowServiceDialog } = useAppStore();

  return (
    <div className="flex gap-3">
      <button
        onClick={() => setShowServiceDialog(true)}
        className="flex-1 flex items-center justify-center gap-2 bg-white rounded-lg py-2.5 shadow-sm active:bg-[#F5F6FA] transition-colors"
      >
        <MessageCircle size="16" className="text-[#1677FF]" />
        <span className="text-[13px] text-[#1A1A1A]">在线客服</span>
      </button>
      <button
        onClick={() => pushPage({ key: 'cooperation' })}
        className="flex-1 flex items-center justify-center gap-2 bg-white rounded-lg py-2.5 shadow-sm active:bg-[#F5F6FA] transition-colors"
      >
        <Building2 size="16" className="text-[#1677FF]" />
        <span className="text-[13px] text-[#1A1A1A]">企业合作</span>
      </button>
    </div>
  );
}
