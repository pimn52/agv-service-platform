'use client';

import { useUserStore, useAppStore, useAuthStore } from '@/store';
import { CONTACT } from '@/constants/services';
import { User, ChevronRight, Wallet, FileText, MapPin, HelpCircle, Info, Settings, Building2, Phone, Eye } from 'lucide-react';
import { OperationsDashboard } from './operations-dashboard';

export function ProfilePage() {
  const { user } = useUserStore();
  const { pushPage } = useAppStore();
  const demoMode = useAuthStore((s) => s.demoMode);
  const setDemoMode = useAuthStore((s) => s.setDemoMode);
  const exitDemoMode = useAuthStore((s) => s.exitDemoMode);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-full bg-[var(--background)]">
        <p className="text-[13px] text-[#999]">请先登录</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)]">
      {/* 用户信息区 */}
      <div className="bg-white px-4 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#E6F0FF] flex items-center justify-center">
            <User size="28" className="text-[#1677FF]" />
          </div>
          <div className="flex-1">
            <div className="text-[16px] font-semibold text-[#1A1A1A]">{user.name}</div>
            <div className="text-[13px] text-[#999] mt-0.5">{user.phone}</div>
            {user.organization && (
              <div className="flex items-center gap-1 mt-1">
                <Building2 size="12" className="text-[#1677FF]" />
                <span className="text-[11px] text-[#1677FF]">{user.organization.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* 余额 */}
        <div className="mt-4 flex items-center justify-between p-3 bg-[#F5F6FA] rounded-xl">
          <div>
            <div className="text-[11px] text-[#999]">账户余额</div>
            <div className="text-[20px] font-semibold text-[#1A1A1A] mt-0.5">¥{user.balance / 100}</div>
          </div>
          <button
            onClick={() => pushPage({ key: 'recharge' })}
            className="px-4 py-1.5 bg-[#1677FF] text-white text-[13px] rounded-lg active:bg-[#0958D9] transition-colors"
          >
            充值
          </button>
        </div>
      </div>

      {/* 运营看板 */}
      <OperationsDashboard />

      {/* 功能菜单 */}
      <div className="mt-2 bg-white">
        <MenuGroup
          items={[
            { icon: FileText, label: '我的订单', onClick: () => useAppStore.getState().setActiveTab('order') },
            { icon: MapPin, label: '我的地址', onClick: () => pushPage({ key: 'address' }) },
            { icon: Wallet, label: '发票管理', onClick: () => pushPage({ key: 'invoice' }) },
          ]}
        />
      </div>

      <div className="mt-2 bg-white">
        <MenuGroup
          items={[
            { icon: Info, label: '关于平台', onClick: () => pushPage({ key: 'platform-architecture' }) },
            { icon: HelpCircle, label: '帮助中心', onClick: () => {} },
            { icon: Settings, label: '设置', onClick: () => pushPage({ key: 'settings' }) },
          ]}
        />
      </div>

      {/* 演示切换 */}
      <div className="mt-4 mx-4">
        {demoMode ? (
          <button
            onClick={() => exitDemoMode()}
            className="w-full py-2.5 border border-[#1677FF] text-[#1677FF] text-[13px] font-medium rounded-xl active:bg-[#E6F0FF] transition-colors"
          >
            退出演示，回到我的账号
          </button>
        ) : (
          <button
            onClick={() => setDemoMode()}
            className="w-full py-2.5 border border-dashed border-[#1677FF] text-[#1677FF] text-[13px] font-medium rounded-xl active:bg-[#E6F0FF] transition-colors flex items-center justify-center gap-1.5"
          >
            <Eye size="14" />
            进入演示体验
          </button>
        )}
      </div>

      {/* 客服电话 */}
      <div className="mt-4 mb-6 flex items-center justify-center gap-1.5 text-[12px] text-[#999]">
        <Phone size="12" />
        客服热线: {CONTACT.serviceHotline}
      </div>
    </div>
  );
}

function MenuGroup({ items }: { items: { icon: typeof User; label: string; onClick: () => void }[] }) {
  return (
    <div>
      {items.map((item, index) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={`w-full flex items-center gap-3 px-4 py-3.5 active:bg-[#F5F6FA] transition-colors ${
            index < items.length - 1 ? 'border-b border-[var(--border)]' : ''
          }`}
        >
          <item.icon size="18" className="text-[#999]" />
          <span className="flex-1 text-[14px] text-[#1A1A1A] text-left">{item.label}</span>
          <ChevronRight size="16" className="text-[#CCC]" />
        </button>
      ))}
    </div>
  );
}
