'use client';

import { useAppStore, type TabKey } from '@/store';
import { BottomNav } from './bottom-nav';
import { StatusBar } from './status-bar';
import { HomePage } from '@/components/home/home-page';
import { TrackingPage } from '@/components/tracking/tracking-page';
import { OrderPage } from '@/components/order/order-page';
import { ProfilePage } from '@/components/profile/profile-page';
import { SubPageRenderer } from './sub-page-renderer';
import { CustomerServiceDialog } from '@/components/shared/customer-service-dialog';

const TAB_PAGES: Record<TabKey, React.ComponentType> = {
  home: HomePage,
  tracking: TrackingPage,
  order: OrderPage,
  profile: ProfilePage,
};

export function AppShell() {
  const { activeTab, pageStack, showServiceDialog } = useAppStore();
  const CurrentPage = TAB_PAGES[activeTab];

  return (
    <div className="phone-shell flex flex-col">
      {/* 状态栏区域：
          - 桌面端(sm+)：显示模拟状态栏（真实时间+图标），与刘海屏齐平
          - 移动端：显示空白占位，使用 env(safe-area-inset-top) 适配手机真实状态栏 */}
      <div className="shrink-0">
        {/* 桌面端模拟状态栏 */}
        <div className="hidden sm:block">
          <StatusBar />
        </div>
        {/* 移动端状态栏占位（适配 iPhone 刘海屏等） */}
        <div className="block sm:hidden h-[env(safe-area-inset-top,0px)]" />
      </div>

      {/* 页面内容区 */}
      <div className="flex-1 overflow-hidden relative">
        {/* 主Tab页 */}
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            <CurrentPage />
          </div>
          <BottomNav />
        </div>

        {/* 子页面覆盖层 */}
        {pageStack.length > 0 && (
          <div className="absolute inset-0 z-50 animate-slide-in">
            <SubPageRenderer />
          </div>
        )}
      </div>

      {/* 客服弹窗 */}
      {showServiceDialog && <CustomerServiceDialog />}
    </div>
  );
}
