'use client';

import { useAppStore, type TabKey } from '@/store';
import { Home, Target, ClipboardList, User } from 'lucide-react';
import { SERVICES } from '@/constants/services';

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'tracking', label: '服务跟踪', icon: Target },
  { key: 'order', label: '订单', icon: ClipboardList },
  { key: 'profile', label: '我的', icon: User },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="flex items-center justify-around border-t border-[var(--border)] bg-white h-[50px] flex-shrink-0 safe-area-bottom">
      {TABS.map(({ key, label, icon: Icon }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors duration-200 ${
              isActive ? 'text-[#1677FF]' : 'text-[#999999]'
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />
            <span className={`text-[10px] ${isActive ? 'font-medium' : ''}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
