'use client';

import { useEffect, useState } from 'react';
import { useAppStore, useAuthStore, useUserStore, useOrderStore, type TabKey } from '@/store';
import { BottomNav } from './bottom-nav';
import { StatusBar } from './status-bar';
import { HomePage } from '@/components/home/home-page';
import { TrackingPage } from '@/components/tracking/tracking-page';
import { OrderPage } from '@/components/order/order-page';
import { ProfilePage } from '@/components/profile/profile-page';
import { SubPageRenderer } from './sub-page-renderer';
import { CustomerServiceDialog } from '@/components/shared/customer-service-dialog';
import { AuthPage } from '@/components/auth/auth-page';
import { LandingPage } from '@/components/landing/landing-page';
import { TourOverlay } from '@/components/tour/tour-overlay';
import { ToastContainer } from '@/components/ui/toast';
import { Loader2 } from 'lucide-react';

const TAB_PAGES: Record<TabKey, React.ComponentType> = {
  home: HomePage,
  tracking: TrackingPage,
  order: OrderPage,
  profile: ProfilePage,
};

export function AppShell() {
  const { activeTab, pageStack, showServiceDialog } = useAppStore();
  const { user, loading, initialized, initialize } = useAuthStore();
  const fetchProfile = useUserStore((s) => s.fetchProfile);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const [showLogin, setShowLogin] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const CurrentPage = TAB_PAGES[activeTab];

  // 演示模式首次进入 → 显示 Tour
  useEffect(() => {
    if (!initialized) return
    const seen = localStorage.getItem('agv_tour_seen')
    if (!seen && user) {
      // 延迟确保 DOM 渲染完成
      const timer = setTimeout(() => setShowTour(true), 600)
      return () => clearTimeout(timer)
    }
  }, [initialized, user])

  const handleTourClose = () => {
    setShowTour(false)
    localStorage.setItem('agv_tour_seen', '1')
  }

  useEffect(() => {
    initialize();
  }, [initialize]);

  // 用户登录后加载数据
  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
      fetchOrders(user.id);
    }
  }, [user?.id, fetchProfile, fetchOrders]);

  // 加载中
  if (!initialized || loading) {
    return (
      <div className="phone-shell flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // 已登录（真实或演示）→ 主 App
  if (user) {
    return (
      <div className="phone-shell flex flex-col">
        <div className="shrink-0 hidden sm:block">
          <StatusBar />
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto hide-scrollbar">
              <CurrentPage />
            </div>
            <BottomNav />
          </div>

          {pageStack.length > 0 && (
            <div className="absolute inset-0 z-50 animate-slide-in">
              <SubPageRenderer />
            </div>
          )}
        </div>

        {showServiceDialog && <CustomerServiceDialog />}
        {showTour && <TourOverlay onClose={handleTourClose} />}
        <ToastContainer />
      </div>
    );
  }

  // 未登录 + 点击了登录 → 显示登录页
  if (showLogin) {
    return (
      <div className="phone-shell flex flex-col">
        <div className="shrink-0 hidden sm:block">
          <StatusBar />
        </div>
        <div className="flex-1 overflow-y-auto">
          <AuthPage onBack={() => setShowLogin(false)} />
        </div>
      </div>
    );
  }

  // 未登录 → 着陆页（演示体验 + 登录入口并排）
  return (
    <div className="phone-shell flex flex-col">
      <div className="flex-1 overflow-hidden">
        <LandingPage />
      </div>
      {/* 底部：登录 / 注册入口 */}
      <div className="absolute bottom-8 left-0 right-0 z-10 px-8 space-y-2.5">
        <button
          onClick={() => setShowLogin(true)}
          className="w-full py-2.5 border border-white/30 text-white text-[14px] font-medium rounded-xl
                     hover:bg-white/10 active:bg-white/15 transition-all"
        >
          登录 / 注册
        </button>
      </div>
    </div>
  );
}
