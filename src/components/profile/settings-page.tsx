'use client';

import { useAuthStore } from '@/store';
import { APP_VERSION } from '@/constants/services';
import { ChevronRight, Bell, Shield, Info, LogOut } from 'lucide-react';

export function SettingsPage() {
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <div className="px-4 py-4 space-y-2">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        {[
          { icon: Bell, label: '消息通知', value: '已开启' },
          { icon: Shield, label: '隐私设置', value: '' },
          { icon: Info, label: '关于', value: APP_VERSION },
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

      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <button
          onClick={() => {
            localStorage.removeItem('agv_tour_seen')
            window.location.reload()
          }}
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[#F5F6FA] transition-colors"
        >
          <Info size="18" className="text-[#1677FF]" />
          <span className="text-[14px] text-[#1677FF] text-left">重新观看功能引导</span>
          <ChevronRight size="16" className="text-[#CCC]" />
        </button>
      </div>

      <button
        onClick={() => signOut()}
        className="w-full py-3 mt-6 bg-white text-[#FF4D4F] text-[14px] font-medium rounded-xl active:bg-[#FFF1F0] transition-colors flex items-center justify-center gap-2"
      >
        <LogOut size="16" />
        退出登录
      </button>
    </div>
  );
}
