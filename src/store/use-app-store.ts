import { create } from 'zustand';
import type { City } from '@/constants/cities';
import type { ServiceType, AppNotification } from '@/types';
import { MOCK_NOTIFICATIONS } from '@/mock/data';

export type TabKey = 'home' | 'tracking' | 'order' | 'profile';

export type SubPage =
  | { key: 'delivery-order'; data?: { batchMode?: boolean } }
  | { key: 'cruise-order'; data?: { subType?: 'vending' | 'security'; batchMode?: boolean } }
  | { key: 'cost-confirm'; data?: Record<string, unknown> }
  | { key: 'payment-result'; data?: { success: boolean; orderId?: string; vehicleName?: string } }
  | { key: 'order-detail'; data: { orderId: string } }
  | { key: 'scanner' }
  | { key: 'customer-service' }
  | { key: 'cooperation' }
  | { key: 'recharge' }
  | { key: 'invoice'; data?: { orderId?: string } }
  | { key: 'address' }
  | { key: 'settings' }
  | { key: 'route-plan'; data?: { orderId?: string; serviceType?: ServiceType } };

interface AppStore {
  // Tab 导航
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;

  // 城市选择
  currentCity: City;
  setCurrentCity: (city: City) => void;

  // 子页面栈（模拟 APP push/pop）
  pageStack: SubPage[];
  pushPage: (page: SubPage) => void;
  popPage: () => void;
  clearPages: () => void;

  // 订单动态面板 Tab
  dynamicsTab: ServiceType;
  setDynamicsTab: (tab: ServiceType) => void;

  // 客服弹窗
  showServiceDialog: boolean;
  setShowServiceDialog: (show: boolean) => void;

  // 通知
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  postponeNotification: (id: string) => void;
  getUnreadCountByService: (serviceType: ServiceType) => number;
  getPostponedCountByService: (serviceType: ServiceType) => number;

  // 追踪页在途订单切换
  trackingOrderId: string | null;
  setTrackingOrderId: (id: string | null) => void;

  // 跳转首页对应订单面板
  navigateToHomeDynamics: (serviceType: ServiceType) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  currentCity: { code: '010', name: '北京', province: '北京市', available: true },
  setCurrentCity: (city) => set({ currentCity: city }),

  pageStack: [],
  pushPage: (page) => set((s) => ({ pageStack: [...s.pageStack, page] })),
  popPage: () => set((s) => ({ pageStack: s.pageStack.slice(0, -1) })),
  clearPages: () => set({ pageStack: [] }),

  dynamicsTab: 'logistics',
  setDynamicsTab: (tab) => set({ dynamicsTab: tab }),

  showServiceDialog: false,
  setShowServiceDialog: (show) => set({ showServiceDialog: show }),

  notifications: MOCK_NOTIFICATIONS,
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  dismissNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, dismissed: true } : n)),
    })),
  postponeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, postponed: true } : n)),
    })),
  getUnreadCountByService: (serviceType) =>
    get().notifications.filter((n) => n.serviceType === serviceType && !n.dismissed && !n.postponed).length,
  getPostponedCountByService: (serviceType) =>
    get().notifications.filter((n) => n.serviceType === serviceType && n.postponed && !n.dismissed).length,

  trackingOrderId: null,
  setTrackingOrderId: (id) => set({ trackingOrderId: id }),

  navigateToHomeDynamics: (serviceType) => {
    set({ activeTab: 'home', dynamicsTab: serviceType, pageStack: [] });
  },
}));
