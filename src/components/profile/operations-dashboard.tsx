'use client';

import { useState, useMemo } from 'react';
import { useOrderStore } from '@/store';
import type { ServiceType } from '@/types';
import { TrendingUp, TrendingDown, Truck, ShoppingBag, Shield, ChevronRight } from 'lucide-react';

/* ────────────────────────── 类型 & 常量 ────────────────────────── */

interface MetricCard {
  label: string;
  value: string;
  unit: string;
  color: string;       // 数值颜色
  bg: string;           // 卡片背景色
  trendIcon: 'up' | 'down' | null;
  trendValue: string;
}

const SERVICE_TABS: { key: ServiceType; label: string; icon: typeof Truck }[] = [
  { key: 'logistics', label: '物流配送', icon: Truck },
  { key: 'vending', label: '巡游贩卖', icon: ShoppingBag },
  { key: 'security', label: '安防巡检', icon: Shield },
];

const SERVICE_INTRO: Record<ServiceType, { title: string; desc: string }> = {
  logistics: {
    title: '物流配送',
    desc: '整车包车运输或散件按格口直送，无人车仓到店高频短驳，准时率 96.8%。',
  },
  vending: {
    title: '巡游贩卖',
    desc: '无人车即停即走或定点驻停，支持多品类零售，单车日均销售额 ¥1,200+。',
  },
  security: {
    title: '安防巡检',
    desc: '7×24 无人车自主巡逻，红外+摄像头+对讲，设备在线率 99.2%。',
  },
};

/* ────────────────────────── 指标计算 ────────────────────────── */

function useMetrics(orders: import('@/types').Order[]): Record<ServiceType, MetricCard[]> {
  return useMemo(() => {
    const activeByType = (t: ServiceType) => orders.filter(
      (o) => o.serviceType === t && !['completed', 'cancelled'].includes(o.status),
    );

    // ── 物流配送 ──
    const logisticsCompleted = orders.filter((o) => o.serviceType === 'logistics' && o.status === 'completed');
    const logisticsRevenue = logisticsCompleted.reduce((sum, o) => sum + (o.amount || 0), 0);
    const logisticsActive = activeByType('logistics');
    const logisticsVehicles = new Set(logisticsActive.map((o) => o.vehicleId)).size;

    const logisticsMetrics: MetricCard[] = [
      { label: '本月运费', value: String(logisticsRevenue), unit: '元', color: '#722ED1', bg: '#F4F0FF', trendIcon: 'down', trendValue: '3.2%' },
      { label: '准时送达率', value: '96.8', unit: '%', color: '#52C41A', bg: '#F0FFF0', trendIcon: 'up', trendValue: '1.5%' },
      { label: '异常率', value: '2.1', unit: '%', color: '#FAAD14', bg: '#FFFBE6', trendIcon: 'down', trendValue: '0.8%' },
      { label: '在途运单', value: String(logisticsActive.length), unit: '单', color: '#1677FF', bg: '#E6F0FF', trendIcon: null, trendValue: `${logisticsVehicles}车执行中` },
    ];

    // ── 巡游贩卖 ──
    const vendingCompleted = orders.filter((o) => o.serviceType === 'vending' && o.status === 'completed');
    const vendingRevenue = vendingCompleted.reduce((sum, o) => sum + (o.amount || 0), 0);
    const vendingActive = activeByType('vending');
    const vendingDays = 30;
    const vendingVehicles = Math.max(vendingCompleted.length, 1);
    const dailyAvg = vendingRevenue / vendingDays / vendingVehicles;

    const vendingMetrics: MetricCard[] = [
      { label: '本月销售额', value: String(vendingRevenue), unit: '元', color: '#722ED1', bg: '#F4F0FF', trendIcon: 'up', trendValue: '12.3%' },
      { label: '单车日均销', value: String(Math.round(dailyAvg)), unit: '元', color: '#52C41A', bg: '#F0FFF0', trendIcon: 'up', trendValue: '5.7%' },
      { label: '库存周转', value: '2.8', unit: '天', color: '#FAAD14', bg: '#FFFBE6', trendIcon: null, trendValue: '健康' },
      { label: '在售车辆', value: String(vendingActive.length), unit: '辆', color: '#1677FF', bg: '#E6F0FF', trendIcon: null, trendValue: '营业中' },
    ];

    // ── 安防巡检 ──
    const securityActive = activeByType('security');

    const securityMetrics: MetricCard[] = [
      { label: '巡检覆盖率', value: '87.5', unit: '%', color: '#722ED1', bg: '#F4F0FF', trendIcon: 'up', trendValue: '3.2%' },
      { label: '设备在线率', value: '99.2', unit: '%', color: '#52C41A', bg: '#F0FFF0', trendIcon: null, trendValue: '4/4 在线' },
      { label: '异常告警', value: '1', unit: '条', color: '#FAAD14', bg: '#FFFBE6', trendIcon: null, trendValue: '待处理' },
      { label: '在巡车辆', value: String(securityActive.length), unit: '辆', color: '#1677FF', bg: '#E6F0FF', trendIcon: null, trendValue: '巡检中' },
    ];

    return { logistics: logisticsMetrics, vending: vendingMetrics, security: securityMetrics };
  }, [orders]);
}

/* ────────────────────────── 组件 ────────────────────────── */

export function OperationsDashboard() {
  const orders = useOrderStore((s) => s.orders);
  const metrics = useMetrics(orders);
  const [activeTab, setActiveTab] = useState<ServiceType>(() => {
    const counts: Record<ServiceType, number> = { logistics: 0, vending: 0, security: 0 };
    for (const o of orders) counts[o.serviceType]++;
    const sorted = (Object.entries(counts) as [ServiceType, number][]).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? 'logistics';
  });
  const [expanded, setExpanded] = useState(false);

  const orderCounts = useMemo(() => {
    const counts: Record<ServiceType, number> = { logistics: 0, vending: 0, security: 0 };
    for (const o of orders) counts[o.serviceType]++;
    return counts;
  }, [orders]);

  const totalOrders = orderCounts.logistics + orderCounts.vending + orderCounts.security;
  const tabsWithoutOrders = SERVICE_TABS.filter((t) => orderCounts[t.key] === 0);
  const visibleTabs = expanded || totalOrders === 0 ? SERVICE_TABS : SERVICE_TABS.filter((t) => orderCounts[t.key] > 0);

  return (
    <div className="bg-white mt-2 px-4 pt-4 pb-3">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-transparent" />
        <span className="text-[15px] font-semibold text-[#1A1A1A]">运营概览</span>
        {!expanded && tabsWithoutOrders.length > 0 && totalOrders > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-0.5 text-[10px] text-[#999999] ml-auto hover:text-[#1677FF] transition-colors"
          >
            探索更多服务
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Tab 栏 — 胶囊式 */}
      <div className="flex gap-1 p-0.5 bg-[#F5F6FA] rounded-lg mb-4">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-[12px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-[#1677FF] shadow-sm'
                  : 'text-[#999] hover:text-[#666]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 指标卡片 */}
      {orderCounts[activeTab] > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {metrics[activeTab].map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-3 transition-all duration-200"
              style={{ backgroundColor: card.bg }}
            >
              <div className="text-[11px] text-[#666] mb-2">{card.label}</div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[22px] font-bold leading-none" style={{ color: card.color }}>
                  {card.value}
                </span>
                <span className="text-[11px] text-[#999] ml-0.5">{card.unit}</span>
              </div>
              <div className="flex items-center gap-0.5 mt-1.5">
                {card.trendIcon === 'up' && <TrendingUp className="w-3 h-3 text-[#52C41A]" />}
                {card.trendIcon === 'down' && <TrendingDown className="w-3 h-3 text-[#FF4D4F]" />}
                <span className={`text-[10px] ${
                  card.trendIcon === 'up' ? 'text-[#52C41A]'
                  : card.trendIcon === 'down' ? 'text-[#FF4D4F]'
                  : 'text-[#999]'
                }`}>{card.trendValue}</span>
                {card.trendIcon && <span className="text-[10px] text-[#CCC]">环比</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ServiceIntroCard tab={activeTab} />
      )}
    </div>
  );
}

/* ────────────────────────── 子组件 ────────────────────────── */

function ServiceIntroCard({ tab }: { tab: ServiceType }) {
  const intro = SERVICE_INTRO[tab];
  return (
    <div className="bg-[#F5F6FA] rounded-lg p-3 text-center">
      <p className="text-[13px] font-medium text-[#1A1A1A]">{intro.title}</p>
      <p className="text-[11px] text-[#999999] mt-1 leading-relaxed">{intro.desc}</p>
      <button className="mt-2 text-[11px] text-[#1677FF] font-medium hover:underline">
        了解详情
      </button>
    </div>
  );
}
