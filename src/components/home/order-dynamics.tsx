'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAppStore, useOrderStore } from '@/store';
import type { Order, ServiceType, OrderStatus } from '@/types';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  PackageCheck,
  PackageOpen,
  Package,
  HandCoins,
  PlayCircle,
  StopCircle,
  PauseCircle,
  ShoppingCart,
  Wrench,
  Route,
  Crosshair,
  BatteryMedium,
  ArrowRight,
} from 'lucide-react';

/* ────────────────────────── 常量 & 工具 ────────────────────────── */

const SERVICE_TABS: { key: ServiceType; label: string }[] = [
  { key: 'logistics', label: '物流配送' },
  { key: 'vending', label: '巡游贩卖' },
  { key: 'security', label: '安防巡检' },
];

/** 车辆照片映射 */
const VEHICLE_IMAGES: Record<ServiceType, string> = {
  logistics: '/vehicle-delivery.jfif',
  vending: '/vehicle-vending.png',
  security: '/vehicle-security.png',
};

/** 获取订单摘要行（根据服务类型显示不同内容） */
function getOrderSummary(order: Order): string {
  if (order.serviceType === 'logistics') {
    const from = typeof order.senderAddress === 'object' ? order.senderAddress?.address : order.senderAddress;
    const to = typeof order.receiverAddress === 'object' ? order.receiverAddress?.address : order.receiverAddress;
    return `${from ?? '--'} → ${to ?? '--'}`;
  }
  if (order.serviceType === 'vending' || order.serviceType === 'security') {
    return order.pickupLocation ?? '--';
  }
  return '--';
}

/** 获取车辆显示名称：车型名 · 车牌号 */
function getVehicleDisplay(order: Order): string {
  if (order.vehicleModel && order.vehiclePlate) {
    return `${order.vehicleModel} · ${order.vehiclePlate}`;
  }
  return order.vehicleName ?? '--';
}

/** 状态标签配色 */
function getStatusStyle(status: OrderStatus): { text: string; bg: string } {
  const map: Record<OrderStatus, { text: string; bg: string }> = {
    pending: { text: 'text-[#999999]', bg: 'bg-[#F0F0F0]' },
    pricing: { text: 'text-[#1677FF]', bg: 'bg-[#E6F0FF]' },
    paying: { text: 'text-[#FAAD14]', bg: 'bg-[#FFFBE6]' },
    dispatching: { text: 'text-[#1677FF]', bg: 'bg-[#E6F0FF]' },
    dispatched: { text: 'text-[#1677FF]', bg: 'bg-[#E6F0FF]' },
    picking_up: { text: 'text-[#52C41A]', bg: 'bg-[#F6FFED]' },
    picked_up: { text: 'text-[#1677FF]', bg: 'bg-[#E6F0FF]' },
    loading: { text: 'text-[#1677FF]', bg: 'bg-[#E6F0FF]' },
    started: { text: 'text-[#1677FF]', bg: 'bg-[#E6F0FF]' },
    in_transit: { text: 'text-[#1677FF]', bg: 'bg-[#E6F0FF]' },
    selling: { text: 'text-[#52C41A]', bg: 'bg-[#F6FFED]' },
    vending_active: { text: 'text-[#52C41A]', bg: 'bg-[#F6FFED]' },
    vending_paused: { text: 'text-[#FAAD14]', bg: 'bg-[#FFFBE6]' },
    patrolling: { text: 'text-[#1677FF]', bg: 'bg-[#E6F0FF]' },
    arrived: { text: 'text-[#52C41A]', bg: 'bg-[#F6FFED]' },
    unloading: { text: 'text-[#52C41A]', bg: 'bg-[#F6FFED]' },
    paused: { text: 'text-[#FAAD14]', bg: 'bg-[#FFFBE6]' },
    completed: { text: 'text-[#999999]', bg: 'bg-[#F0F0F0]' },
    cancelled: { text: 'text-[#FF4D4F]', bg: 'bg-[#FFF2F0]' },
  };
  return map[status] ?? { text: 'text-[#999999]', bg: 'bg-[#F0F0F0]' };
}

/** 状态文案映射 */
function getStatusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending: '待调度',
    pricing: '计费中',
    paying: '待支付',
    dispatching: '调度中',
    dispatched: '已调度',
    picking_up: '取件中',
    picked_up: '已出发',
    loading: '装货中',
    started: '进行中',
    in_transit: '配送中',
    selling: '贩卖中',
    vending_active: '贩卖中',
    vending_paused: '贩卖暂停',
    patrolling: '巡检中',
    arrived: '已到达',
    unloading: '卸货中',
    paused: '已暂停',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[status] ?? '未知';
}

/* ────────────────────────── 操作按钮配置 ────────────────────────── */

interface ActionButton {
  key: string;
  label: string;
  icon: typeof Package;
  variant: 'primary' | 'default' | 'disabled';
  /** 点击行为 */
  action?: () => void;
}

/** 根据服务类型和订单状态，返回该订单当前可用的操作按钮 */
function getActionsForOrder(
  order: Order,
  onNavigateTracking: (orderId: string) => void,
  onToggleTrip: (orderId: string) => void,
  onToggleVending: (orderId: string) => void,
  onRoutePlanning: (orderId: string, serviceType: ServiceType) => void,
): ActionButton[] {
  const actions: ActionButton[] = [];

  if (order.serviceType === 'logistics') {
    switch (order.status) {
      case 'pending':
        // 待调度 → 无操作
        break;
      case 'dispatched':
        // 已调度待装货 → 装货高亮
        actions.push({ key: 'load', label: '装货', icon: PackageOpen, variant: 'primary' });
        break;
      case 'loading':
        // 装货进行中 → 装货灰色
        actions.push({ key: 'load', label: '装货', icon: PackageOpen, variant: 'disabled' });
        break;
      case 'picking_up':
        // 取货中 → 取货灰色
        actions.push({ key: 'pickup', label: '取货中', icon: PackageOpen, variant: 'disabled' });
        break;
      case 'in_transit':
        // 配送中 → 无操作（运输途中用户无法直接操作）
        break;
      case 'arrived':
        // 已到达待卸货 → 卸货高亮 + 自助取件
        actions.push({ key: 'unload', label: '卸货', icon: PackageCheck, variant: 'primary' });
        actions.push({ key: 'pickup', label: '自助取件', icon: HandCoins, variant: 'default' });
        break;
      case 'unloading':
        // 卸货进行中 → 卸货灰色 + 自助取件
        actions.push({ key: 'unload', label: '卸货', icon: PackageCheck, variant: 'disabled' });
        actions.push({ key: 'pickup', label: '自助取件', icon: HandCoins, variant: 'default' });
        break;
      case 'picked_up':
        // 已取件待收货 → 自助取件+自助收件高亮
        actions.push({ key: 'pickup', label: '自助取件', icon: HandCoins, variant: 'default' });
        actions.push({ key: 'receive', label: '自助收件', icon: PackageCheck, variant: 'primary' });
        break;
      default:
        break;
    }
  }

  if (order.serviceType === 'vending') {
    const routeAction = () => onRoutePlanning(order.id, 'vending');
    switch (order.status) {
      case 'dispatched':
      case 'started':
        // 待出发 → 开始行程高亮 + 路线规划
        actions.push({ key: 'startTrip', label: '开始行程', icon: PlayCircle, variant: 'primary', action: () => onToggleTrip(order.id) });
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: 'default', action: routeAction });
        break;
      case 'selling':
      case 'vending_active':
        // 贩卖中 → 结束行程 + 暂停贩卖高亮 + 货物操作 + 路线规划
        actions.push({ key: 'endTrip', label: '结束行程', icon: StopCircle, variant: 'default', action: () => onToggleTrip(order.id) });
        actions.push({ key: 'pauseVending', label: '暂停贩卖', icon: PauseCircle, variant: 'primary', action: () => onToggleVending(order.id) });
        actions.push({ key: 'cargo', label: '货物操作', icon: ShoppingCart, variant: 'default' });
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: 'default', action: routeAction });
        break;
      case 'vending_paused':
        // 贩卖暂停 → 结束行程 + 开始贩卖高亮 + 货物操作 + 路线规划
        actions.push({ key: 'endTrip', label: '结束行程', icon: StopCircle, variant: 'default', action: () => onToggleTrip(order.id) });
        actions.push({ key: 'startVending', label: '开始贩卖', icon: PlayCircle, variant: 'primary', action: () => onToggleVending(order.id) });
        actions.push({ key: 'cargo', label: '货物操作', icon: ShoppingCart, variant: 'default' });
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: 'default', action: routeAction });
        break;
      default:
        break;
    }
  }

  if (order.serviceType === 'security') {
    const routeAction = () => onRoutePlanning(order.id, 'security');
    switch (order.status) {
      case 'dispatched':
      case 'started':
        // 待出发 → 开始行程高亮 + 路线规划
        actions.push({ key: 'startTrip', label: '开始行程', icon: PlayCircle, variant: 'primary', action: () => onToggleTrip(order.id) });
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: 'default', action: routeAction });
        break;
      case 'patrolling':
        // 巡检中 → 结束行程 + 物资操作 + 设备测试高亮 + 路线规划
        actions.push({ key: 'endTrip', label: '结束行程', icon: StopCircle, variant: 'default', action: () => onToggleTrip(order.id) });
        actions.push({ key: 'supply', label: '物资操作', icon: Package, variant: 'default' });
        actions.push({ key: 'deviceTest', label: '设备测试', icon: Wrench, variant: 'primary' });
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: 'default', action: routeAction });
        break;
      default:
        break;
    }
  }

  return actions;
}

/* ────────────────────────── 通知红点逻辑 ────────────────────────── */

interface LocalNotification {
  id: string;
  orderId: string;
  message: string;
  type: 'general' | 'special';
  dismissed: boolean;
  /** special 类型被"稍后处理"后变灰 */
  postponed: boolean;
}

/** 根据订单实际状态生成匹配的通知消息 */
function generateNotificationsForOrder(order: Order): LocalNotification[] {
  const notifs: LocalNotification[] = [];

  if (order.serviceType === 'logistics') {
    switch (order.status) {
      case 'dispatched':
        notifs.push({ id: `ntf-${order.id}-dispatched`, orderId: order.id, message: `无人车已调度，请前往装货`, type: 'general', dismissed: false, postponed: false });
        break;
      case 'loading':
        notifs.push({ id: `ntf-${order.id}-loading`, orderId: order.id, message: `正在装货中，请耐心等待`, type: 'general', dismissed: false, postponed: false });
        break;
      case 'in_transit':
        notifs.push({ id: `ntf-${order.id}-transit`, orderId: order.id, message: `车辆配送中，预计${order.estimatedTime ?? 30}分钟到达`, type: 'general', dismissed: false, postponed: false });
        break;
      case 'arrived':
        notifs.push({ id: `ntf-${order.id}-arrived`, orderId: order.id, message: `车辆已到达，请及时卸货`, type: 'special', dismissed: false, postponed: false });
        break;
      case 'unloading':
        notifs.push({ id: `ntf-${order.id}-unloading`, orderId: order.id, message: `正在卸货中`, type: 'general', dismissed: false, postponed: false });
        break;
      case 'picked_up':
        notifs.push({ id: `ntf-${order.id}-pickedup`, orderId: order.id, message: `货物已取件，请确认收货`, type: 'special', dismissed: false, postponed: false });
        break;
      default:
        break;
    }
  }

  if (order.serviceType === 'vending') {
    switch (order.status) {
      case 'dispatched':
      case 'started':
        notifs.push({ id: `ntf-${order.id}-ready`, orderId: order.id, message: `贩卖车已就位，请开始行程`, type: 'general', dismissed: false, postponed: false });
        break;
      case 'selling':
      case 'vending_active':
        notifs.push({ id: `ntf-${order.id}-selling`, orderId: order.id, message: `贩卖进行中，水果库存不足请及时补货`, type: 'special', dismissed: false, postponed: false });
        break;
      case 'vending_paused':
        notifs.push({ id: `ntf-${order.id}-paused`, orderId: order.id, message: `贩卖已暂停，可随时恢复`, type: 'general', dismissed: false, postponed: false });
        break;
      default:
        break;
    }
  }

  if (order.serviceType === 'security') {
    switch (order.status) {
      case 'dispatched':
      case 'started':
        notifs.push({ id: `ntf-${order.id}-ready`, orderId: order.id, message: `巡检车已就位，请开始行程`, type: 'general', dismissed: false, postponed: false });
        break;
      case 'patrolling':
        notifs.push({ id: `ntf-${order.id}-patrol`, orderId: order.id, message: `巡检进行中：B2栋走廊检测到异常人员`, type: 'special', dismissed: false, postponed: false });
        break;
      default:
        break;
    }
  }

  return notifs;
}

/* ────────────────────────── 主组件 ────────────────────────── */

export function OrderDynamics() {
  const { orders, getActiveOrdersByType, setActiveOrderId } = useOrderStore();
  const { setActiveTab: setGlobalTab, dynamicsTab, setDynamicsTab, pushPage } = useAppStore();
  const activeTab = dynamicsTab;
  const setActiveTab = setDynamicsTab;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);

  // 通知列表状态 — 根据订单实际状态动态生成
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);

  // 当订单列表变化时，根据订单实际状态重新生成通知
  useEffect(() => {
    const allNotifs: LocalNotification[] = [];
    for (const order of orders) {
      // 只为在途订单生成通知
      if (!['completed', 'cancelled'].includes(order.status)) {
        allNotifs.push(...generateNotificationsForOrder(order));
      }
    }
    // 保留用户已消除/推迟的状态
    setNotifications((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]));
      return allNotifs.map((n) => {
        const existing = prevMap.get(n.id);
        if (existing) {
          // 保留用户的已读/推迟状态
          return { ...n, dismissed: existing.dismissed, postponed: existing.postponed };
        }
        return n;
      });
    });
  }, [orders]);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // 当前Tab的在途订单
  const activeOrders = useMemo(() => getActiveOrdersByType(activeTab), [activeTab, orders, getActiveOrdersByType]);

  // 检测各Tab的通知状态：红点(新通知) / 灰点(已推迟) / 无
  const tabsNotificationState = useMemo(() => {
    const result: Partial<Record<ServiceType, 'red' | 'gray' | 'none'>> = {};
    for (const tab of SERVICE_TABS) {
      const tabOrders = getActiveOrdersByType(tab.key);
      const tabNotifs = notifications.filter(
        (n) => !n.dismissed && tabOrders.some((o) => o.id === n.orderId),
      );
      const hasNew = tabNotifs.some((n) => !n.postponed);
      const hasPostponed = tabNotifs.some((n) => n.postponed);
      result[tab.key] = hasNew ? 'red' : hasPostponed ? 'gray' : 'none';
    }
    return result;
  }, [orders, notifications, getActiveOrdersByType]);

  // 各Tab的在途订单数量
  const tabsWithOrders = useMemo(() => {
    const result: Partial<Record<ServiceType, number>> = {};
    for (const tab of SERVICE_TABS) {
      result[tab.key] = getActiveOrdersByType(tab.key).length;
    }
    return result;
  }, [orders, getActiveOrdersByType]);

  // 自动切换到有在途订单的Tab
  useEffect(() => {
    if (activeOrders.length === 0) {
      const nextTab = SERVICE_TABS.find((t) => (tabsWithOrders[t.key] ?? 0) > 0);
      if (nextTab) setActiveTab(nextTab.key);
    }
  }, [activeOrders.length, tabsWithOrders]);

  // 当前订单
  const currentOrder: Order | undefined = activeOrders[currentIndex];

  // 当前Tab对应的未消除通知
  const activeNotifications = useMemo(
    () => notifications.filter((n) => !n.dismissed && activeOrders.some((o) => o.id === n.orderId)),
    [notifications, activeOrders],
  );

  /* ── 操作回调 ── */

  const handleNavigateTracking = useCallback(
    (orderId: string) => {
      setGlobalTab('tracking');
      if (setActiveOrderId) setActiveOrderId(orderId);
    },
    [setGlobalTab, setActiveOrderId],
  );

  const handleToggleTrip = useCallback((orderId: string) => {
    // MVP: 模拟切换行程状态
    console.log('Toggle trip for order:', orderId);
  }, []);

  const handleToggleVending = useCallback((orderId: string) => {
    // MVP: 模拟切换贩卖状态
    console.log('Toggle vending for order:', orderId);
  }, []);

  const handleRoutePlanning = useCallback(
    (orderId: string, serviceType: ServiceType) => {
      pushPage({ key: 'route-plan', data: { orderId, serviceType } });
    },
    [pushPage],
  );

  const handleDismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n)));
  }, []);

  const handlePostponeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, postponed: true } : n)));
  }, []);

  /* ── 触摸滑动 ── */

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < activeOrders.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
      }
    }
  };

  const handlePrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setCurrentIndex((i) => Math.min(activeOrders.length - 1, i + 1));

  // 切换Tab时重置索引
  const handleTabChange = (key: ServiceType) => {
    setActiveTab(key);
    setCurrentIndex(0);
  };

  /* ────────────────────────── 渲染 ────────────────────────── */

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Tab 栏 + 红点 */}
      <div className="flex border-b border-[#EEEEEE]">
        {SERVICE_TABS.map((tab) => {
          const notificationState = tabsNotificationState[tab.key] ?? 'none';
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 relative py-2.5 text-[13px] transition-colors ${
                activeTab === tab.key ? 'text-[#1677FF] font-medium' : 'text-[#999999]'
              }`}
            >
              {tab.label}
              {notificationState === 'red' && (
                <span className="absolute top-1.5 right-2 w-[6px] h-[6px] bg-[#FF4D4F] rounded-full" />
              )}
              {notificationState === 'gray' && (
                <span className="absolute top-1.5 right-2 w-[6px] h-[6px] bg-[#C0C0C0] rounded-full" />
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-[#1677FF] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {activeOrders.length === 0 ? (
        /* 空状态 */
        <div className="py-10 text-center">
          <p className="text-[13px] text-[#999999]">暂无在途订单</p>
          <p className="text-[11px] text-[#CCCCCC] mt-1">下单后这里将展示订单动态</p>
        </div>
      ) : (
        <>
          {/* ── 消息栏 ── */}
          {activeNotifications.length > 0 && (
            <div className="border-b border-[#EEEEEE]">
              <button
                onClick={() => setNotificationsExpanded(!notificationsExpanded)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#FAFAFA] transition-colors"
              >
                <span className="shrink-0">
                  {activeNotifications.some((n) => n.type === 'special' && !n.postponed) ? (
                    <span className="w-2 h-2 rounded-full bg-[#FF4D4F] inline-block" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#FAAD14] inline-block" />
                  )}
                </span>
                <span className="flex-1 text-[12px] text-[#1A1A1A] text-left truncate">
                  {activeNotifications[0].message}
                  {activeNotifications.length > 1 && !notificationsExpanded && (
                    <span className="text-[#999999] ml-1">({activeNotifications.length}条)</span>
                  )}
                </span>
                <ChevronDown
                  size="14"
                  className={`text-[#999999] shrink-0 transition-transform ${notificationsExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {/* 展开通知列表 */}
              {notificationsExpanded && (
                <div className="px-4 pb-2 space-y-1.5">
                  {activeNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-2 p-2 rounded-lg text-left ${
                        n.postponed ? 'bg-[#F5F5F5] opacity-60' : 'bg-[#FFFBE6]'
                      }`}
                    >
                      <span className="shrink-0 mt-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full inline-block ${
                            n.type === 'special' ? 'bg-[#FF4D4F]' : 'bg-[#FAAD14]'
                          }`}
                        />
                      </span>
                      <span className="flex-1 text-[11px] text-[#1A1A1A] leading-relaxed">{n.message}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {n.type === 'general' && (
                          <button
                            onClick={() => handleDismissNotification(n.id)}
                            className="text-[10px] text-[#1677FF] hover:underline"
                          >
                            已读
                          </button>
                        )}
                        {n.type === 'special' && !n.postponed && (
                          <>
                            <button
                              onClick={() => handleDismissNotification(n.id)}
                              className="text-[10px] text-[#52C41A] hover:underline"
                            >
                              去处理
                            </button>
                            <button
                              onClick={() => handlePostponeNotification(n.id)}
                              className="text-[10px] text-[#999999] hover:underline"
                            >
                              稍后
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 车辆照片轮播 ── */}
          {currentOrder && (
            <div className="border-b border-[#EEEEEE]">
              <div
                ref={carouselRef}
                className="relative px-4 py-3"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* 翻页按钮 */}
                {activeOrders.length > 1 && currentIndex > 0 && (
                  <button
                    onClick={handlePrev}
                    className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-white/80 shadow hover:bg-white transition-colors"
                  >
                    <ChevronLeft size="14" className="text-[#666666]" />
                  </button>
                )}
                {activeOrders.length > 1 && currentIndex < activeOrders.length - 1 && (
                  <button
                    onClick={handleNext}
                    className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-white/80 shadow hover:bg-white transition-colors"
                  >
                    <ChevronRight size="14" className="text-[#666666]" />
                  </button>
                )}

                {/* 车辆照片 */}
                <div className="flex flex-col items-center">
                  <img
                    src={currentOrder.vehicleImage || VEHICLE_IMAGES[currentOrder.serviceType]}
                    alt={getVehicleDisplay(currentOrder)}
                    className="w-full h-[140px] object-contain rounded-lg"
                  />
                  <div className="mt-2 text-center">
                    <p className="text-[13px] text-[#1A1A1A] font-medium">{getVehicleDisplay(currentOrder)}</p>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <span className={`text-[11px] px-1.5 py-0.5 rounded ${getStatusStyle(currentOrder.status).bg} ${getStatusStyle(currentOrder.status).text}`}>
                        {getStatusLabel(currentOrder.status)}
                      </span>
                      <span className="text-[11px] text-[#999999] flex items-center gap-0.5">
                        <BatteryMedium className="w-3 h-3" />
                        {currentOrder.vehicleBattery ?? 78}%
                      </span>
                    </div>
                    <p className="text-[11px] text-[#999999] mt-0.5">
                      {getOrderSummary(currentOrder)}
                    </p>
                  </div>
                </div>

                {/* 分页指示器 */}
                {activeOrders.length > 1 && (
                  <div className="flex justify-center gap-1 mt-2">
                    {activeOrders.map((_, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          idx === currentIndex ? 'bg-[#1677FF]' : 'bg-[#DDDDDD]'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 动态操作按钮 ── */}
          {currentOrder && (
            <div className="p-3">
              {(() => {
                const actions = getActionsForOrder(
                  currentOrder,
                  handleNavigateTracking,
                  handleToggleTrip,
                  handleToggleVending,
                  handleRoutePlanning,
                );
                // 分两行：第一行最多4个操作按钮，第二行放剩余按钮
                const firstRow = actions.slice(0, 4);
                const secondRow = actions.slice(4);

                const renderButton = (btn: ActionButton) => {
                  const isPrimary = btn.variant === 'primary';
                  const isDisabled = btn.variant === 'disabled';
                  const Icon = btn.icon;

                  return (
                    <button
                      key={btn.key}
                      onClick={btn.action}
                      disabled={isDisabled}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] transition-all duration-200 ${
                        isPrimary
                          ? 'bg-[#1677FF] text-white hover:bg-[#4096FF] active:bg-[#0958D9]'
                          : isDisabled
                            ? 'bg-[#F0F0F0] text-[#CCCCCC] cursor-not-allowed'
                            : 'bg-[#F5F6FA] text-[#1A1A1A] hover:bg-[#E8ECF0] active:bg-[#DDDDDD]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {btn.label}
                    </button>
                  );
                };

                if (actions.length === 0) {
                  return (
                    <p className="text-[11px] text-[#999999] text-center py-1">当前状态暂无操作</p>
                  );
                }

                return (
                  <>
                    <div className="flex flex-wrap gap-2">{firstRow.map(renderButton)}</div>
                    {secondRow.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">{secondRow.map(renderButton)}</div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* 查看更多 */}
      <div className="border-t border-[#EEEEEE]">
        <button
          onClick={() => {
            const store = useAppStore.getState();
            store.setActiveTab('tracking');
            store.setDynamicsTab(dynamicsTab);
            if (currentOrder) {
              setActiveOrderId(currentOrder.id);
            }
          }}
          className="w-full py-2.5 flex items-center justify-center gap-1 text-[12px] text-[#1677FF] hover:bg-[#F5F6FA] active:bg-[#EEEEEE] transition-colors"
        >
          查看更多
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
