'use client';

import type { SubPage } from '@/store';
import { ChevronRight, Bell, Shield, Info, LogOut } from 'lucide-react';

export function SettingsPage({ page }: { page: SubPage }) {
  return (
    <div className="px-4 py-4 space-y-2">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        {[
          { icon: Bell, label: '消息通知', value: '已开启' },
          { icon: Shield, label: '隐私设置', value: '' },
          { icon: Info, label: '关于', value: 'v1.0.0' },
        ].map((item, index) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-4 py-3.5 active:bg-[#F5F6FA] transition-colors ${
              index < 2 ? 'border-b border-[var(--border)]' : ''
            }`}
          >
            <item.icon size="18" className="text-[#999]" />
            <span className="flex-1 text-[14px] text-[#1A1A1A] text-left">{item.label}</span>
            <span className="text-[12px] text-[#999]">{item.value}</span>
            <ChevronRight size="16" className="text-[#CCC]" />
          </button>
        ))}
      </div>

      <button className="w-full py-3 mt-6 bg-white text-[#FF4D4F] text-[14px] font-medium rounded-xl active:bg-[#FFF1F0] transition-colors">
        退出登录
      </button>
    </div>
  );
}
