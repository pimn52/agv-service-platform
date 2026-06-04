'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppStore, useOrderStore } from '@/store';
import type { Order, OrderStatus, Vehicle, TrackingInfo } from '@/types';
import { findVehicleById } from '@/data/vehicles';
import { findTrackingByOrderId } from '@/data/tracking';
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  CheckCircle2,
  Circle,
  Truck,
  Package,
  ShoppingCart,
  Shield,
  BatteryMedium,
  Route,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Eye,
  Clock,
  MapPin,
  Video,
  Wrench,
  Send,
  X,
  RotateCcw,
} from 'lucide-react';

/* ────────────────────────── 工具函数 ────────────────────────── */

import { toast } from '@/components/ui/toast';
import { STATUS_LABELS } from '@/constants/status-labels'
import { stopStatus, getActiveStopIndex, countStopsByStatus } from '@/components/shared/stop-utils'
import { getLTLWaybillCountForVehicle } from '@/lib/ltl-car-groups'
import { resolveAtPickup } from '@/lib/order-mutator'

function getStatusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status]?.label ?? status
}

function findVehicleForOrder(order: Order): Vehicle | undefined {
  return findVehicleById(order.vehicleId)
}

function findTracking(orderId: string): TrackingInfo | undefined {
  return findTrackingByOrderId(orderId)
}

/* ────────────────────────── 进度时间线 ────────────────────────── */

interface TimelineStep {
  status: OrderStatus;
  label: string;
  time?: string;
  completed: boolean;
  current: boolean;
}

/**
 * 从订单实时状态动态生成时间线。
 * - 整车：按经停点展开（装货→运输→逐站卸货），用 currentStopIndex 定位当前站
 * - 散件：按运单状态展开（投件→运输→逐单取件），用 waybill loaded/completed 计数
 * - 巡游/安防：fallback 到 MOCK_TRACKING 静态数据
 * cur 变量是关键——负值表示未开始，999 表示已完成（所有步骤都标记 completed）
 */
function getOrderTimeline(order: Order, filterWbId?: string | null): TimelineStep[] {
  const isFTL = order.deliveryMode === 'full_load';
  const isLTL = order.deliveryMode === 'ltl';
  const status = order.status;
  const ltlWaybills = order.ltlWaybills || [];
  const loadedWbs = ltlWaybills.filter((w) => w.status === 'loaded' || w.status === 'in_transit' || w.status === 'arrived' || w.status === 'completed').length;
  const completedWbs = ltlWaybills.filter((w) => w.status === 'completed').length;
  const totalWbs = ltlWaybills.length;

  // 展开为无重复状态序列，用 stepIdx 精确定位当前位置
  const stepIdx = -1;
  const found = false;

  // 整车：按经停点和 stopStatus 展开（优先读 ftlWaybills）
  const ftlWbs = filterWbId
    ? order.ftlWaybills?.filter((wb) => wb.id === filterWbId)
    : order.ftlWaybills;
  if (isFTL && ftlWbs?.length) {
    const steps: TimelineStep[] = [];
    // 已调度
    const allWbsDone = ftlWbs.every((wb) => wb.status === 'completed');
    steps.push({ status: 'dispatched', label: '已调度', time: undefined, completed: allWbsDone, current: status === 'dispatched' });

    ftlWbs.forEach((wb, wi) => {
      const wbStops = wb.stops;
      const wbActiveIdx = getActiveStopIndex(wbStops);
      const wbAllDone = wbActiveIdx === -1;
      const wbLabel = ftlWbs.length > 1 ? ` [运单${wi + 1}]` : '';

      // 装货点
      const pickup = wbStops.find((s) => s.type === 'pickup');
      if (pickup) {
        const pStatus = stopStatus(pickup);
        steps.push({ status: 'arrived', label: `到达装货点${wbLabel}: ${pickup.address.slice(0, 8)}...`, time: undefined, completed: pStatus === 'completed' || wbAllDone, current: pStatus === 'arrived' });
        steps.push({ status: 'loading', label: `装货中${wbLabel}`, time: undefined, completed: pStatus === 'completed' || wbAllDone, current: pStatus === 'in_progress' });
      }

      // 运输中
      const pickupDone = pickup ? stopStatus(pickup) === 'completed' : false;
      steps.push({ status: 'in_transit', label: `运输中${wbLabel}`, time: undefined, completed: wbAllDone || pickupDone, current: status === 'in_transit' && pickupDone });

      // 逐站卸货
      const deliveries = wbStops.filter((s) => s.type === 'delivery');
      deliveries.forEach((d, i) => {
        const dStatus = stopStatus(d);
        const isActive = !wbAllDone && wbStops.indexOf(d) === wbActiveIdx;
        const isPast = wbAllDone || wbStops.indexOf(d) < wbActiveIdx;
        const isDone = dStatus === 'completed' || dStatus === 'skipped';
        steps.push({
          status: 'arrived',
          label: `到达卸货点 ${i + 1}/${deliveries.length}${wbLabel}: ${d.address.slice(0, 8)}...`,
          time: undefined,
          completed: isDone || isPast,
          current: isActive && dStatus === 'arrived',
        });
        steps.push({
          status: 'unloading',
          label: `卸货中（${i + 1}/${deliveries.length}）${wbLabel}`,
          time: undefined,
          completed: isDone || (wbAllDone && i < deliveries.length - 1),
          current: isActive && dStatus === 'in_progress',
        });
      });
    });

    steps.push({ status: 'completed', label: '已签收', time: undefined, completed: status === 'completed', current: false });
    return steps;
  }

  // 散件：按选中车辆的运单展开（支持多车 Tab 切换）
  if (isLTL && totalWbs > 0) {
    const comps = order.compartments || [];

    // 确定当前查看的车辆：filterWbId（L2 Tab 选中的车辆 ID）→ 兜底第一辆车
    let targetVehicleId = filterWbId || null;
    if (!targetVehicleId && comps.length > 0) {
      targetVehicleId = comps[0].vehicleId;
    }

    if (targetVehicleId) {
      // 按车筛选运单
      const carCompIds = comps.filter((c) => c.vehicleId === targetVehicleId).map((c) => c.id);
      const carWbs = ltlWaybills.filter((wb) => carCompIds.includes(wb.compartmentId || ''));
      const carTotal = carWbs.length;

      if (carTotal > 0) {
        const carLoaded = carWbs.filter((w) => w.status === 'loaded' || w.status === 'in_transit' || w.status === 'arrived' || w.status === 'completed').length;
        const carCompleted = carWbs.filter((w) => w.status === 'completed').length;
        const allLoaded = carLoaded === carTotal;
        const allDone = carCompleted === carTotal;
        const atPickup = resolveAtPickup(order) !== false;

        // 投件点地址（同车同地址，取第一个运单）
        const puAddr = carWbs[0]?.pickupAddress || '--';

        // 取件点按地址去重分组
        const deliveryGroups: { address: string; count: number; completed: number }[] = [];
        carWbs.forEach((wb) => {
          const addr = wb.deliveryAddress || '--';
          const existing = deliveryGroups.find((dg) => dg.address === addr);
          if (existing) {
            existing.count++;
            if (wb.status === 'completed') existing.completed++;
          } else {
            deliveryGroups.push({ address: addr, count: 1, completed: wb.status === 'completed' ? 1 : 0 });
          }
        });

        // 当前步骤定位
        let cur = -1;
        if (status === 'dispatched') cur = 0;
        else if (status === 'arrived' && atPickup) cur = 1;
        else if (status === 'picking_up' || (status === 'arrived' && atPickup && carLoaded > 0)) cur = 2;
        else if (status === 'in_transit') cur = 3;
        else if (allDone || status === 'completed') cur = 999;

        const steps: TimelineStep[] = [];
        let s = 0;

        // 已调度
        steps.push({ status: 'dispatched', label: '已调度', time: undefined, completed: cur > s, current: cur === s }); s++;

        // 到达投件点
        const firstLoaded = carWbs.some((w) => w.status === 'loaded' || w.status === 'in_transit' || w.status === 'arrived' || w.status === 'completed');
        steps.push({ status: 'arrived', label: `到达投件点: ${puAddr.slice(0, 8)}...`, time: undefined, completed: firstLoaded, current: cur === s && carLoaded === 0 }); s++;

        // 投件中
        steps.push({ status: 'picking_up', label: `投件中（${carLoaded}/${carTotal} 运单）`, time: undefined, completed: allLoaded, current: cur === s || (cur === 1 && carLoaded > 0) }); s++;

        // 运输中
        steps.push({ status: 'in_transit', label: '运输中', time: undefined, completed: cur > s, current: cur === s }); s++;

        // 每个不同的取件地址
        let beforeAllCurrent = true;
        deliveryGroups.forEach((dg, i) => {
          const addrLabel = dg.address.slice(0, 8);
          const dgAllDone = dg.completed === dg.count;
          const isCurrentDelivery = !allDone && (status === 'arrived' && !atPickup) && beforeAllCurrent && !dgAllDone;
          if (isCurrentDelivery) beforeAllCurrent = false;
          steps.push({
            status: 'arrived',
            label: `到达取件点${deliveryGroups.length > 1 ? ` ${i + 1}/${deliveryGroups.length}` : ''}: ${addrLabel}...`,
            time: undefined,
            completed: dgAllDone,
            current: isCurrentDelivery,
          });
          s++;
        });

        // 全部取件完成
        steps.push({ status: 'completed', label: '全部取件完成', time: undefined, completed: allDone || status === 'completed', current: false });

        return steps;
      }
    }

    // 兜底：无车辆数据时用全局简化时间线
    const atPickup = resolveAtPickup(order) !== false;
    const allLoaded = loadedWbs === totalWbs;
    const allDone = completedWbs === totalWbs;

    let cur = -1;
    if (status === 'dispatched') cur = 0;
    else if (status === 'arrived' && atPickup) cur = 1;
    else if (status === 'picking_up' || (status === 'arrived' && atPickup && loadedWbs > 0)) cur = 2;
    else if (status === 'in_transit') cur = 3;
    else if ((status === 'arrived' && !atPickup) || (status === 'picked_up' && !allDone)) cur = 4;
    else if (allDone || status === 'completed') cur = 999;

    const steps: TimelineStep[] = [];
    let s = 0;
    steps.push({ status: 'dispatched', label: '已调度', time: undefined, completed: cur > s, current: cur === s }); s++;
    steps.push({ status: 'arrived', label: '到达投件点', time: undefined, completed: loadedWbs > 0, current: cur === s && loadedWbs === 0 }); s++;
    steps.push({ status: 'picking_up', label: `投件中（${loadedWbs}/${totalWbs} 运单）`, time: undefined, completed: allLoaded, current: cur === s || (cur === 1 && loadedWbs > 0) }); s++;
    steps.push({ status: 'in_transit', label: '运输中', time: undefined, completed: cur > s, current: cur === s }); s++;
    steps.push({ status: 'arrived', label: `到达取件点（${completedWbs}/${totalWbs} 已取）`, time: undefined, completed: allDone, current: cur === s }); s++;
    steps.push({ status: 'completed', label: allDone ? '全部取件完成' : '已完成', time: undefined, completed: status === 'completed', current: false });
    return steps;
  }

  // 巡游/安防 fallback：从 MOCK_TRACKING 读取，根据实时状态标记 completed/current
  const tracking = findTracking(order.id);
  if (tracking?.timeline?.length) {
    const statusSeq = order.serviceType === 'vending'
      ? ['dispatched', 'started', 'selling', 'vending_active', 'arrived', 'completed']
      : ['dispatched', 'started', 'patrolling', 'patrolling_paused', 'arrived', 'completed'];
    const curIdx = statusSeq.indexOf(order.status);
    return tracking.timeline.map((t) => {
      const stepIdx = statusSeq.indexOf(t.status);
      return {
        status: t.status, label: t.label, time: t.time,
        completed: curIdx > stepIdx,
        current: order.status === t.status,
      };
    });
  }
  return [{ status: order.status, label: STATUS_LABELS[order.status]?.label ?? order.status, completed: false, current: true }];
}

/* ────────────────────────── 可视化组件 ────────────────────────── */

/** 环形进度图（纯CSS） */
function RingProgress({ value, size = 56, stroke = 5, color = '#1677FF', label, unit }: {
  value: number; size?: number; stroke?: number; color?: string; label: string; unit?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8ECF0" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[14px] font-medium text-[#1A1A1A]">{value}</span>
          {unit && <span className="text-[8px] text-[#999999] ml-0.5">{unit}</span>}
        </div>
      </div>
      <span className="text-[10px] text-[#999999] mt-1">{label}</span>
    </div>
  );
}

/** 横向条形图 */
function BarItem({ label, value, max, color = '#1677FF', showValue }: {
  label: string; value: number; max: number; color?: string; showValue?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="mb-1.5 last:mb-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-[#666666]">{label}</span>
        <span className="text-[10px] text-[#999999]">{showValue ?? value}</span>
      </div>
      <div className="h-2 bg-[#E8ECF0] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/** 设备状态灯 */
function DeviceStatusLight({ name, online }: { name: string; online: boolean }) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-[#52C41A] shadow-[0_0_4px_rgba(82,196,26,0.5)]' : 'bg-[#FF4D4F] shadow-[0_0_4px_rgba(255,77,79,0.5)]'}`} />
      <span className="text-[11px] text-[#1A1A1A]">{name}</span>
      <span className={`text-[9px] ${online ? 'text-[#52C41A]' : 'text-[#FF4D4F]'}`}>{online ? '在线' : '离线'}</span>
    </div>
  );
}

/* ────────────────────────── 数据看板子组件 ────────────────────────── */

function DataCard({ label, value, unit, icon: Icon, color = '#1677FF' }: {
  label: string; value: string | number; unit?: string; icon: typeof Truck; color?: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-[#F5F6FA] rounded-lg">
      <div className="w-7 h-7 flex items-center justify-center rounded-md shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-[#999999]">{label}</p>
        <p className="text-[14px] font-medium text-[#1A1A1A] leading-tight">
          {value}{unit && <span className="text-[10px] text-[#999999] ml-0.5">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

/** 物流配送数据看板 */
function LogisticsDashboard({ order, vehicle }: { order: Order; vehicle?: Vehicle }) {
  const remainingDist = order.remainingDistance
  const remainingTime = order.remainingTime
  const battery = order.vehicleBattery ?? 0

  // 配送进度 = 基于已完成步骤数 / 总步骤数
  const isLTL = order.deliveryMode === 'ltl';
  const ltlWaybills = order.ltlWaybills || [];
  const loadedWbs = ltlWaybills.filter((w) => w.status === 'loaded' || w.status === 'completed').length;
  const completedWbs = ltlWaybills.filter((w) => w.status === 'completed').length;
  const totalWbs = ltlWaybills.length;

  const allFtlStops = order.ftlWaybills?.flatMap((wb) => wb.stops) ?? [];
  const totalSteps = isLTL
    ? 5  // dispatched + arrived(pickup) + picking_up + in_transit + arrived(delivery)
    : allFtlStops.length > 0
      ? 2 + allFtlStops.length * 2
      : 6;
  const completedSteps = (() => {
    if (order.status === 'completed' || order.status === 'cancelled') return totalSteps;

    if (isLTL) {
      // 散件：基于运单状态
      if (order.status === 'dispatched') return 0;
      if (order.status === 'arrived' && resolveAtPickup(order) !== false) return 1;
      if (order.status === 'picking_up' || (order.status === 'arrived' && resolveAtPickup(order) !== false && loadedWbs > 0)) {
        // 投件中：根据已投运单数推进
        return 1 + Math.min(loadedWbs, totalWbs);
      }
      if (order.status === 'in_transit') return 3; // 投完+运输
      if (order.status === 'arrived' && resolveAtPickup(order) === false) return 4;
      if (order.status === 'picked_up') return 4; // 取件中，同一阶段
      return 0;
    }

    // 整车：基于经停点 stopStatus（汇总 ftlWaybills）
    const totalStopSteps = 3 + allFtlStops.filter((s) => s.type === 'delivery').length * 2;
    const completed = countStopsByStatus(allFtlStops, 'completed') + countStopsByStatus(allFtlStops, 'skipped');
    const inProgress = countStopsByStatus(allFtlStops, 'in_progress');
    const pickupComplete = allFtlStops.some((s) => s.type === 'pickup' && stopStatus(s) === 'completed') ? 1 : 0;
    const totalStopStepsMax = Math.max(totalStopSteps, 1);
    return Math.min(totalStopStepsMax, completed * 2 + inProgress + (completed > 0 ? pickupComplete : 0));
  })();
  const progress = Math.round((completedSteps / Math.max(totalSteps, 1)) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <RingProgress value={progress} label="配送进度" unit="%" color="#1677FF" />
        <div className="flex-1 space-y-1.5">
          <DataCard label="剩余距离" value={remainingDist != null ? String(remainingDist) : '--'} unit="km" icon={MapPin} color="#1677FF" />
          <DataCard label="预计到达" value={remainingTime != null ? String(remainingTime) : '--'} unit="分钟" icon={Truck} color="#52C41A" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#999999] flex items-center gap-1">
            <BatteryMedium className="w-3 h-3" />车辆电量
          </span>
          <span className={`text-[10px] font-medium ${battery > 30 ? 'text-[#52C41A]' : 'text-[#FF4D4F]'}`}>{battery}%</span>
        </div>
        <div className="h-2 bg-[#E8ECF0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${battery}%`, backgroundColor: battery > 30 ? '#52C41A' : '#FF4D4F' }}
          />
        </div>
      </div>
    </div>
  );
}

/** 巡游贩卖数据看板 */
function VendingDashboard({ order, vehicle }: { order: Order; vehicle?: Vehicle }) {
  const vi = vehicle?.vendingInfo
  const battery = order.vehicleBattery ?? 0
  const dailySalesYuan = vi?.dailySales ? `¥${(vi.dailySales / 100).toFixed(0)}` : '--'
  const modeLabel = vi?.operatingMode === 'moving' ? '即停即走' : vi?.operatingMode === 'stationed' ? '定点驻停' : '待出发'
  const shelfStatus = vi?.shelfStatus ?? []
  const topProducts = vi?.topProducts ?? []
  const salesTrend = vi?.salesTrend ?? []
  const maxAmount = salesTrend.length ? Math.max(...salesTrend.map((s) => s.amount / 100)) : 100

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center justify-center bg-[#E6F0FF] rounded-lg w-14 h-14 shrink-0">
          <Eye className="w-4 h-4 text-[#1677FF] mb-0.5" />
          <span className="text-[9px] text-[#1677FF] font-medium text-center leading-tight">{modeLabel}</span>
        </div>
        <div className="flex-1 space-y-1.5">
          <DataCard label="今日销售" value={dailySalesYuan} icon={TrendingUp} color="#52C41A" />
          <DataCard label="车辆电量" value={battery} unit="%" icon={BatteryMedium} color="#52C41A" />
        </div>
      </div>
      {shelfStatus.length > 0 && (
        <div className="p-2 bg-[#F5F6FA] rounded-lg">
          <p className="text-[10px] text-[#999999] mb-1.5">库存状况</p>
          {shelfStatus.map((s) => (
            <BarItem key={s.name} label={s.name} value={s.stock} max={s.capacity} color="#1677FF" showValue={`${s.stock}/${s.capacity}`} />
          ))}
        </div>
      )}
      {topProducts.length > 0 && (
        <div className="p-2 bg-[#F5F6FA] rounded-lg">
          <p className="text-[10px] text-[#999999] mb-1.5">热销商品 TOP{topProducts.length}</p>
          {topProducts.slice(0, 4).map((item, idx) => (
            <div key={item.name} className="flex items-center gap-1.5 mb-1 last:mb-0">
              <span className={`w-4 h-4 flex items-center justify-center rounded text-[8px] font-medium ${
                idx === 0 ? 'bg-[#FF4D4F] text-white' : idx === 1 ? 'bg-[#FAAD14] text-white' : 'bg-[#E8ECF0] text-[#999999]'
              }`}>
                {idx + 1}
              </span>
              <span className="text-[10px] text-[#666666] flex-1 truncate">{item.name}</span>
              <span className="text-[10px] text-[#1A1A1A] font-medium">{item.sold}件</span>
            </div>
          ))}
        </div>
      )}
      {salesTrend.length > 0 && (
        <div className="p-2 bg-[#F5F6FA] rounded-lg">
          <p className="text-[10px] text-[#999999] mb-1.5">今日销售趋势</p>
          <div className="flex items-end gap-1 h-[50px]">
            {salesTrend.map((item) => {
              const amountYuan = item.amount / 100
              const heightPct = (amountYuan / maxAmount) * 100
              const hour = item.hour.replace(':00', '')
              return (
                <div key={item.hour} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full bg-[#1677FF] rounded-t transition-all duration-700 min-h-[2px]" style={{ height: `${heightPct}%` }} />
                  <span className="text-[7px] text-[#999999]">{hour}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** 安防巡检数据看板 */
function SecurityDashboard({ order, vehicle }: { order: Order; vehicle?: Vehicle }) {
  const si = vehicle?.securityInfo
  const battery = order.vehicleBattery ?? 0
  const progress = si?.patrolProgress ?? 0
  const alertCount = si?.alertCount ?? 0
  const recentAlerts = si?.recentAlerts ?? []
  const devices = (si?.deviceStatus ?? []).map((d) => ({
    name: d.name,
    online: d.status === 'online',
  }))
  const onlineCount = devices.filter((d) => d.online).length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <RingProgress value={progress} label="巡检进度" unit="%" color="#1677FF" />
        <div className="flex-1 space-y-1.5">
          <DataCard label="异常事件" value={String(alertCount)} unit="件" icon={AlertTriangle} color="#FF4D4F" />
          <DataCard label="巡检时长" value={order.duration ? String(order.duration) : '--'} unit="h" icon={Clock} color="#1677FF" />
        </div>
      </div>
      {devices.length > 0 && (
        <div className="p-2 bg-[#F5F6FA] rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-[#999999]">设备状态</span>
            <span className="text-[10px] text-[#52C41A]">{onlineCount}/{devices.length} 在线</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2">
            {devices.map((d) => (
              <DeviceStatusLight key={d.name} name={d.name} online={d.online} />
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#999999] flex items-center gap-1">
            <BatteryMedium className="w-3 h-3" />车辆电量
          </span>
          <span className="text-[10px] font-medium" style={{ color: battery > 30 ? '#52C41A' : '#FF4D4F' }}>{battery}%</span>
        </div>
        <div className="h-2 bg-[#E8ECF0] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${battery}%`, backgroundColor: battery > 30 ? '#52C41A' : '#FF4D4F' }} />
        </div>
      </div>
      {recentAlerts.length > 0 && (
        <div className="p-2 bg-[#FFF2F0] rounded-lg border border-[#FFCCC7]">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3 text-[#FF4D4F]" />
            <span className="text-[10px] text-[#FF4D4F] font-medium">异常事件</span>
          </div>
          {recentAlerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-1.5 mb-1 last:mb-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4F] mt-1 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] text-[#1A1A1A]">{alert.message}</p>
                <p className="text-[9px] text-[#999999]">{
                  new Date(alert.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                } · {alert.resolved ? '已处理' : '未处理'}</p>
              </div>
              <button className="text-[9px] text-[#1677FF] hover:underline shrink-0">查看</button>
            </div>
          ))}
        </div>
      )}
      <div className="p-2 bg-[#F5F6FA] rounded-lg">
        <p className="text-[10px] text-[#999999] mb-1.5">实时巡检画面</p>
        <div className="relative w-full aspect-video bg-[#1A1A1A] rounded-md overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
          <div className="relative z-10 flex flex-col items-center gap-1">
            <Video className="w-8 h-8 text-white/60" />
            <span className="text-[10px] text-white/50">实时巡检视频</span>
            <span className="text-[9px] text-white/30">(实时监控画面)</span>
          </div>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px bg-green-400/30 animate-pulse" />
          </div>
          <div className="absolute bottom-1 right-1.5 text-[8px] text-red-400 font-mono animate-pulse">● REC</div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── L1/L2 辅助 ────────────────────────── */

const TRACKING_ICON: Record<string, typeof Truck> = {
  logistics: Truck,
  vending: ShoppingCart,
  security: Shield,
};

const SERVICE_TYPE_LABEL: Record<string, string> = {
  logistics_ftl: '整车配送',
  logistics_ltl: '散件直送',
  vending: '巡游贩卖',
  security: '安防巡检',
};

const VENDING_STATUS: Record<string, string> = {
  selling: '售卖中', vending_active: '售卖中', vending_paused: '已暂停',
  arrived: '待交还', dispatched: '待出发', started: '已就位',
};
const SECURITY_STATUS: Record<string, string> = {
  patrolling: '巡检中', patrolling_paused: '已暂停',
  arrived: '待交还', dispatched: '待出发', started: '已就位',
};

/** 去掉"XX市XX区"或"XX区"前缀，兼容用户手动输入 */
function stripDistrict(addr: string): string {
  return addr
    .replace(/^[一-龥]{2,4}市[一-龥]{2,4}区/, '')
    .replace(/^[一-龥]{2,4}区/, '');
}

/** 业务类型标签 */
function serviceLabel(order: Order): string {
  if (order.serviceType === 'logistics') {
    return order.deliveryMode === 'ltl' ? SERVICE_TYPE_LABEL.logistics_ltl : SERVICE_TYPE_LABEL.logistics_ftl;
  }
  return SERVICE_TYPE_LABEL[order.serviceType] || '';
}

/** L1 标题：极简 — 业务类型 + 地址，跟随 L2 选中运单（仅数据，不改变标题格式） */
function getTrackingHeadline(order: Order, selectedWaybillId?: string | null): string {
  const st = order.serviceType;
  const typeLabel = serviceLabel(order);
  const isFTL = order.deliveryMode === 'full_load';
  const isLTL = order.deliveryMode === 'ltl';

  if (st === 'logistics') {
    if (isFTL) {
      const wbs = order.ftlWaybills || [];
      const selWb = selectedWaybillId ? wbs.find((w) => w.id === selectedWaybillId) : undefined;
      const wb = selWb || wbs[0];
      if (!wb) return typeLabel;
      const puAddr = stripDistrict(wb.stops.find((s) => s.type === 'pickup')?.address || '--').slice(0, 6);
      const deAddr = stripDistrict(wb.stops.filter((s) => s.type === 'delivery').pop()?.address || '--').slice(0, 6);
      return `${typeLabel} · ${puAddr}→${deAddr}`;
    }
    if (isLTL) {
      const wbs = order.ltlWaybills || [];
      const puAddr = stripDistrict(wbs[0]?.pickupAddress || '--').slice(0, 6);
      const deAddr = stripDistrict(wbs[0]?.deliveryAddress || '--').slice(0, 6);
      return `${typeLabel} · ${puAddr}→${deAddr}`;
    }
  }

  if (st === 'vending') {
    const loc = stripDistrict(order.pickupLocation || '--').slice(0, 8);
    return `${typeLabel} · ${loc}`;
  }

  if (st === 'security') {
    const loc = stripDistrict(order.pickupLocation || '--').slice(0, 8);
    return `${typeLabel} · ${loc}`;
  }

  return typeLabel;
}

/** 下拉框详情：带车数/运单数/状态 + 完整地址，跟随 L2 选中运单 */
function getTrackingDetail(order: Order, selectedWaybillId?: string | null): string {
  const st = order.serviceType;
  const typeLabel = serviceLabel(order);
  const isFTL = order.deliveryMode === 'full_load';
  const isLTL = order.deliveryMode === 'ltl';

  if (st === 'logistics') {
    if (isFTL) {
      const wbs = order.ftlWaybills || [];
      const carN = wbs.length;
      const selWb = selectedWaybillId ? wbs.find((w) => w.id === selectedWaybillId) : undefined;
      const wb = selWb || wbs[0];
      if (!wb) return typeLabel;
      const puAddr = stripDistrict(wb.stops.find((s) => s.type === 'pickup')?.address || '--');
      const deAddr = stripDistrict(wb.stops.filter((s) => s.type === 'delivery').pop()?.address || '--');
      const count = carN > 1 ? ` · ${carN}车` : '';
      return `${typeLabel}${count} · ${puAddr}→${deAddr}`;
    }
    if (isLTL) {
      const wbs = order.ltlWaybills || [];
      const n = wbs.length;
      const puAddr = stripDistrict(wbs[0]?.pickupAddress || '--');
      const deAddr = stripDistrict(wbs[0]?.deliveryAddress || '--');
      const count = n > 1 ? ` · ${n}单` : '';
      return `${typeLabel}${count} · ${puAddr}→${deAddr}`;
    }
  }

  if (st === 'vending') {
    const n = order.vehicleCount || 1;
    const loc = stripDistrict(order.pickupLocation || '--');
    const statusLabel = VENDING_STATUS[order.status] || order.status;
    const count = n > 1 ? ` · ${n}车` : '';
    return `${typeLabel}${count} · ${loc} · ${statusLabel}`;
  }

  if (st === 'security') {
    const n = order.vehicleCount || 1;
    const loc = stripDistrict(order.pickupLocation || '--');
    const statusLabel = SECURITY_STATUS[order.status] || order.status;
    const count = n > 1 ? ` · ${n}车` : '';
    return `${typeLabel}${count} · ${loc} · ${statusLabel}`;
  }

  return typeLabel;
}

/* ────────────────────────── 主组件 ────────────────────────── */

export function TrackingPage() {
  const { orders, activeOrderId } = useOrderStore();
  const { setActiveTab, pushPage } = useAppStore();
  const [progressExpanded, setProgressExpanded] = useState(true); // 有在途订单时默认展开
  const [orderSwitcherOpen, setOrderSwitcherOpen] = useState(false);
  const [faultOpen, setFaultOpen] = useState(false);
  const [faultType, setFaultType] = useState('');
  const [faultDesc, setFaultDesc] = useState('');
  // 交接记录 · 运单卡片折叠
  const [collapsedWbs, setCollapsedWbs] = useState<Set<string>>(new Set());
  // FTL 多车切换 — 默认选中活跃车辆
  const [selectedWaybillId, setSelectedWaybillId] = useState<string | null>(null);

  // 获取在途订单列表
  const activeOrders = useMemo(
    () => orders.filter((o) => !['completed', 'cancelled'].includes(o.status)),
    [orders],
  );

  const [selectedOrderIdx, setSelectedOrderIdx] = useState(0);

  // 当 activeOrderId 变化时（如从首页"查看更多"跳转），切换到对应订单
  useEffect(() => {
    if (activeOrderId) {
      const idx = activeOrders.findIndex((o) => o.id === activeOrderId);
      if (idx >= 0) {
        setSelectedOrderIdx(idx);
      }
    }
  }, [activeOrderId, activeOrders]);

  const currentOrder = activeOrders[selectedOrderIdx] ?? null;

  // FTL 多车 / LTL 多车：自动选中活跃车辆（有 arrived/in_progress 操作的优先）
  useEffect(() => {
    // FTL 自动选中
    if (currentOrder?.ftlWaybills?.length) {
      const wbs = currentOrder.ftlWaybills;
      const active = wbs.find((wb) => {
        if (wb.status === 'completed' || wb.status === 'exception') return false;
        const si = getActiveStopIndex(wb.stops);
        if (si < 0) return false;
        const ss = stopStatus(wb.stops[si]);
        return ss === 'arrived' || ss === 'in_progress';
      });
      setSelectedWaybillId(active?.id || wbs[0].id);
      return;
    }
    // LTL 自动选中第一辆车
    if (currentOrder?.deliveryMode === 'ltl' && currentOrder?.compartments?.length) {
      if (!selectedWaybillId) {
        const plates = [...new Set(currentOrder.compartments.map((c) => c.vehicleId))];
        if (plates.length > 0) {
          setSelectedWaybillId(plates[0]);
        }
      }
    }
  }, [currentOrder?.id]);

  // 车辆位置模拟
  const [simulatedPosition, setSimulatedPosition] = useState<{ lat: number; lng: number; address: string } | null>(null)

  useEffect(() => {
    if (!currentOrder) return
    const tracking = findTracking(currentOrder.id)
    if (!tracking?.route || tracking.route.length < 2) return

    let step = 0
    const route = tracking.route
    setSimulatedPosition({ ...route[0] })

    const timer = setInterval(() => {
      step = (step + 1) % route.length
      setSimulatedPosition({ ...route[step] })
    }, 8000) // 每 8 秒移动一次

    return () => clearInterval(timer)
  }, [currentOrder?.id])

  // 如果没有在途订单
  if (activeOrders.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#F5F6FA]">
        <div className="bg-white px-4 py-3 border-b border-[#EEEEEE]">
          <h1 className="text-[16px] font-medium text-[#1A1A1A] text-center">服务跟踪</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Crosshair className="w-10 h-10 mx-auto text-[#DDDDDD] mb-2" />
            <p className="text-[13px] text-[#999999]">暂无在途订单</p>
            <p className="text-[11px] text-[#CCCCCC] mt-1">下单后可以在这里实时跟踪</p>
          </div>
        </div>
      </div>
    );
  }

  const timeline = currentOrder ? getOrderTimeline(currentOrder, selectedWaybillId) : [];

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      {/* ── L1: 订单上下文 ── */}
      <div className="bg-white relative">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          {/* 返回首页操作 */}
          <button
            onClick={() => {
              if (currentOrder) {
                useOrderStore.getState().setActiveOrderId(currentOrder.id);
              }
              setActiveTab('home');
            }}
            className="flex items-center gap-0.5 text-[12px] text-[#1677FF] shrink-0 hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-[11px]">操作</span>
          </button>

          {/* 订单摘要 — 业务类型 + 地址，居中 */}
          {currentOrder && (
            <span className="flex-1 text-center text-[14px] text-[#1A1A1A] font-medium truncate">
              {getTrackingHeadline(currentOrder, selectedWaybillId)}
            </span>
          )}

          {/* 订单切换（仅 ≥2 个在途订单时出现） */}
          {activeOrders.length > 1 && (
            <button
              onClick={() => setOrderSwitcherOpen(!orderSwitcherOpen)}
              className="flex items-center gap-0.5 text-[11px] text-[#1677FF] shrink-0 hover:opacity-70 transition-opacity"
            >
              <span>切换</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${orderSwitcherOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* 订单切换下拉（带图标 + 详情） */}
        {orderSwitcherOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOrderSwitcherOpen(false)} />
            <div className="absolute top-full left-0 right-0 bg-white border-b border-[#EEEEEE] shadow-lg z-50 max-h-[200px] overflow-y-auto hide-scrollbar">
              {activeOrders.map((order, idx) => {
                const Icon = TRACKING_ICON[order.serviceType] || Truck;
                // selectedWaybillId 仅对当前选中订单有意义
                const wbIdForOrder = order.id === currentOrder?.id ? selectedWaybillId : null;
                const t = getTrackingDetail(order, wbIdForOrder);
                return (
                  <button
                    key={order.id}
                    onClick={() => {
                      setSelectedOrderIdx(idx);
                      setOrderSwitcherOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-[11px] hover:bg-[#F5F6FA] transition-colors ${
                      idx === selectedOrderIdx ? 'bg-[#E6F0FF]' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#1677FF] shrink-0" />
                    <span className="text-[#1A1A1A] flex-1 truncate text-left">{t}</span>
                    <span className="text-[10px] text-[#999999] shrink-0">{order.id.slice(-8)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── L2: 车辆标识（统一胶囊，对标首页运单切换）── */}
      {currentOrder && (
        <div className="bg-white px-4 pt-0.5 pb-2">
          {(() => {
            const isFTL = currentOrder.deliveryMode === 'full_load' && currentOrder.ftlWaybills?.length;
            const isLTL = currentOrder.deliveryMode === 'ltl';
            // LTL：从 compartments 按 vehicleId 分组得到车辆列表
            const ltlCars = isLTL ? (() => {
              const comps = currentOrder.compartments || [];
              const ltlWbs = currentOrder.ltlWaybills || [];
              const totalWbs = ltlWbs.length;
              const vehicleIds = [...new Set(comps.map((c) => c.vehicleId))];
              return vehicleIds.map((vid) => {
                const wbCount = getLTLWaybillCountForVehicle(ltlWbs, comps, vid);
                return {
                  id: vid,
                  label: totalWbs > 1 ? `${vid} · ${wbCount}张运单` : vid,
                };
              });
            })() : [];
            // 构建车辆列表：FTL 多车 → 每运单一项；LTL 有车 → 按车分组；否则 → 订单级一项
            const vehicles = isFTL
              ? currentOrder.ftlWaybills!.map((wb, i) => ({
                  id: wb.id,
                  label: `运单${i + 1} · ${wb.vehiclePlate || '--'}`,
                }))
              : isLTL && ltlCars.length > 0
                ? ltlCars
                : [{
                    id: currentOrder.id,
                    label: `${currentOrder.vehicleModel || '--'}${currentOrder.vehiclePlate ? ` · ${currentOrder.vehiclePlate}` : ''}`,
                  }];
            return (
              <div className="flex gap-1 p-0.5 bg-[#F5F6FA] rounded-lg">
                {vehicles.map((v) => {
                  const isSelected = vehicles.length === 1 || selectedWaybillId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => vehicles.length > 1 && setSelectedWaybillId(v.id)}
                      disabled={vehicles.length === 1}
                      className={`flex-1 flex items-center justify-center py-1 rounded-md text-[12px] font-medium transition-all duration-200 ${
                        isSelected
                          ? 'bg-white text-[#1677FF] shadow-sm'
                          : 'text-[#999] hover:text-[#666]'
                      }`}
                    >
                      <span className="truncate">{v.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* 内容区：可滚动 */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">

        {/* 进度栏（默认折叠，位于数据看板上方） */}
        {currentOrder && (
          <div className="px-4 pt-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setProgressExpanded(!progressExpanded)}
                className="w-full flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${timeline.find((s) => s.current) ? 'bg-[#1677FF] animate-pulse' : 'bg-[#52C41A]'}`} />
                  <span className="text-[12px] font-medium text-[#1A1A1A]">
                    {getStatusLabel(currentOrder.status)}
                    {currentOrder.estimatedTime ? ` · 预计${currentOrder.estimatedTime}分钟到达` : ''}
                  </span>
                </div>
                {progressExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#999999]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#999999]" />
                )}
              </button>

              {progressExpanded && (
                <div className="px-4 pb-3 border-t border-[#EEEEEE]">
                  <div className="mt-2 space-y-0">
                    {timeline.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="flex flex-col items-center w-4 shrink-0">
                          {step.completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#52C41A]" />
                          ) : step.current ? (
                            <Circle className="w-3.5 h-3.5 text-[#1677FF] fill-[#1677FF]/20" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-[#DDDDDD]" />
                          )}
                          {idx < timeline.length - 1 && (
                            <div className={`w-0.5 h-4 ${step.completed ? 'bg-[#52C41A]' : 'bg-[#DDDDDD]'}`} />
                          )}
                        </div>
                        <div className="flex items-center justify-between flex-1 pb-1">
                          <span className={`text-[12px] ${step.completed || step.current ? 'text-[#1A1A1A]' : 'text-[#999999]'}`}>
                            {step.label}
                          </span>
                          {step.time && <span className="text-[10px] text-[#999999]">{step.time}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 交接记录（整车 / 散件统一展现） */}
        {(() => {
          const isFTL = currentOrder?.deliveryMode === 'full_load';
          const isLTL = currentOrder?.deliveryMode === 'ltl';

          // FTL：按运单 → 交接记录
          if (isFTL && currentOrder?.ftlWaybills?.length) {
            // 按 L2 选中车辆过滤：只显示当前运单的交接记录
            const allWbs = currentOrder.ftlWaybills ?? [];
            const filteredWbs = selectedWaybillId ? allWbs.filter((wb) => wb.id === selectedWaybillId) : allWbs;
            const wbCards = filteredWbs.length
              ? filteredWbs.map((wb, wi) => ({
                  id: wb.id,
                  title: allWbs.length > 1
                    ? `交接记录 · 运单${allWbs.indexOf(wb) + 1}`
                    : '交接记录',
                  stops: wb.stops.map((s) => ({ ...s, _wbCargo: wb.cargoDescription || s.cargoDescription || '', _wbWeight: wb.cargoWeight ?? s.cargoWeight })),
                }))
              : [];
            const cardsWithRecords = wbCards.filter((c) => c.stops.some((s) => s.handoverRecords?.length));
            if (cardsWithRecords.length === 0) return null;
            return (
              <div className="px-4 pt-1 pb-2 space-y-2">
                {cardsWithRecords.map((card) => (
                  <div key={card.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {/* 卡片标题 — 对标进度栏折叠 */}
                    <button
                      onClick={() => setCollapsedWbs((prev) => {
                        const next = new Set(prev);
                        if (next.has(card.id)) next.delete(card.id); else next.add(card.id);
                        return next;
                      })}
                      className="w-full flex items-center justify-between px-4 py-2.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#1677FF]" />
                        <span className="text-[12px] font-medium text-[#1A1A1A]">{card.title}</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-[#999999] transition-transform ${collapsedWbs.has(card.id) ? '' : 'rotate-180'}`} />
                    </button>
                    {!collapsedWbs.has(card.id) && (
                      <div className="border-t border-[#EEEEEE]">
                        {card.stops.filter((s) => s.handoverRecords?.length).map((s, si) => {
                          const stopLabel = s.type === 'pickup' ? '装货' : '卸货';
                          const cargo = ((s as unknown) as Record<string, unknown>)._wbCargo as string || '';
                          const weight = ((s as unknown) as Record<string, unknown>)._wbWeight as number | undefined;
                          return (
                            <div key={s.id} className={`px-4 py-2 ${si > 0 ? 'border-t border-[#F5F6FA]' : ''}`}>
                              <p className="text-[11px] text-[#999999] mb-1">
                                {s.address.slice(0, 12)}... · {stopLabel}
                                {cargo ? ` · ${cargo}` : ''}{weight ? ` ${weight}kg` : ''}
                              </p>
                              {(s.handoverRecords || []).map((r) => {
                                const isAnomaly = !!r.anomalyNote;
                                const typeLabel = r.type === 'pickup' ? '装货' : '签收';
                                return (
                                  <div key={r.id} className="flex items-center gap-2 py-0.5">
                                    <CheckCircle2 className={`w-3 h-3 shrink-0 ${isAnomaly ? 'text-[#FAAD14]' : 'text-[#52C41A]'}`} />
                                    <span className="text-[11px] text-[#1A1A1A]">{new Date(r.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="text-[11px] text-[#666666]">{r.operatorName}</span>
                                    <span className={`text-[10px] ${isAnomaly ? 'text-[#FAAD14]' : 'text-[#52C41A]'}`}>{isAnomaly ? `异常${typeLabel}` : `正常${typeLabel}`}</span>
                                    {isAnomaly && <span className="text-[10px] text-[#999999] truncate max-w-[120px]">{r.anomalyNote}</span>}
                                    {isAnomaly && (() => { const store2 = useOrderStore.getState(); const curOrd = store2.orders.find((o: Order) => o.id === currentOrder.id); const ftlWb = curOrd?.ftlWaybills?.find((w: typeof curOrd.ftlWaybills[0]) => w.id === card.id); const st = ftlWb?.stops?.find((x: typeof ftlWb.stops[0]) => x.id === s.id); const hasEx = (st?.stopStatus || "pending") === "exception"; if (!hasEx) return null; return (<button onClick={() => { useOrderStore.getState().advanceStopStatus(currentOrder.id, s.id, "arrived", undefined, card.id); }} className="flex items-center gap-0.5 text-[10px] text-[#1677FF] hover:underline ml-1"><RotateCcw size={10} />恢复</button>); })()}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          }

          // LTL：按车分组 → 交接记录（可折叠，对标整车）
          if (isLTL && currentOrder?.ltlWaybills?.length) {
            const comps = currentOrder.compartments || [];
            const ltlWbs = currentOrder.ltlWaybills;

            // 按 vehicleId 分组运单
            const carsMap = new Map<string, { compIds: string[]; waybills: typeof ltlWbs }>();
            comps.forEach((c) => {
              if (!carsMap.has(c.vehicleId)) {
                carsMap.set(c.vehicleId, { compIds: [], waybills: [] });
              }
              carsMap.get(c.vehicleId)!.compIds.push(c.id);
            });
            ltlWbs.forEach((wb) => {
              const compId = wb.compartmentId || '';
              let matched = false;
              for (const [, car] of carsMap) {
                if (car.compIds.includes(compId)) {
                  car.waybills.push(wb);
                  matched = true;
                  break;
                }
              }
              // 兜底：compartmentId 未匹配到任何 compartment（如 compartments 为空或 ID 不一致）→ 归入第一辆车
              if (!matched && carsMap.size > 0) {
                const firstCar = carsMap.values().next().value;
                if (firstCar) firstCar.waybills.push(wb);
              }
            });
            // 兜底：无 compartments 但有运单带交接记录 → 构造伪车分组确保记录可见
            if (carsMap.size === 0) {
              const orphanWbs = ltlWbs.filter((wb) => (wb.handoverRecords || []).length > 0);
              if (orphanWbs.length > 0) {
                carsMap.set('__fallback__', { compIds: [], waybills: orphanWbs });
              }
            }

            // 确定要展示的车辆（跟随 L2 Tab 选中，无选中时默认第一辆车）
            let carsToShow = [...carsMap.values()];
            if (selectedWaybillId) {
              carsToShow = carsToShow.filter((c) => carsMap.get(selectedWaybillId) === c);
            } else if (carsToShow.length > 1) {
              carsToShow = [carsToShow[0]];
            }

            // 过滤有交接记录的车
            const carsWithRecords = carsToShow.filter((car) =>
              car.waybills.some((wb) => (wb.handoverRecords || []).length > 0),
            );

            if (carsWithRecords.length === 0) return null;

            return (
              <div className="px-4 pt-1 pb-2 space-y-2">
                {carsWithRecords.map((car) => {
                  // 找到该车在 carsMap 中的 key（vehicleId）
                  let carVehicleId = '';
                  for (const [vid, c] of carsMap) {
                    if (c === car) { carVehicleId = vid; break; }
                  }
                  return (
                    <div key={carVehicleId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <button
                        onClick={() =>
                          setCollapsedWbs((prev) => {
                            const next = new Set(prev);
                            if (next.has(carVehicleId)) next.delete(carVehicleId);
                            else next.add(carVehicleId);
                            return next;
                          })
                        }
                        className="w-full flex items-center justify-between px-4 py-2.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#1677FF]" />
                          <span className="text-[12px] font-medium text-[#1A1A1A]">交接记录 · {car.waybills.length}张运单</span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-[#999999] transition-transform ${
                            collapsedWbs.has(carVehicleId) ? '' : 'rotate-180'
                          }`}
                        />
                      </button>
                      {!collapsedWbs.has(carVehicleId) && (
                        <div className="border-t border-[#EEEEEE]">
                          {car.waybills.map((wb) => {
                            const comp = comps.find((c) => c.id === wb.compartmentId);
                            const wbStatus = wb.status || 'created';
                            const statusText: Record<string, string> = { created: '待分配', assigned: '待投件', loaded: '已投件', in_transit: '运输中', arrived: '待取件', completed: '已取件', exception: '异常' };
                            const statusColor: Record<string, string> = { created: '#999999', assigned: '#FAAD14', loaded: '#1677FF', in_transit: '#1677FF', arrived: '#52C41A', completed: '#52C41A', exception: '#FF4D4F' };
                            const records = wb.handoverRecords || [];
                            return (
                              <div key={wb.id} className="border-b border-[#F5F6FA] last:border-b-0">
                                <div className="flex items-center gap-2 px-4 py-2">
                                  {comp && <span className="text-[10px] bg-[#E6F0FF] text-[#1677FF] px-1 py-0.5 rounded font-medium shrink-0">{comp.label}</span>}
                                  <span className="text-[11px] text-[#1A1A1A] flex-1 min-w-0 truncate">{wb.pickupAddress} → {wb.deliveryAddress}</span>
                                  <span className="text-[10px] font-medium shrink-0" style={{ color: statusColor[wbStatus] }}>{statusText[wbStatus]}</span>
                                </div>
                                {records.length > 0 && (
                                  <div className="px-4 pb-1.5 space-y-0.5">
                                    {records.map((r) => {
                                      const isAnomaly = !!r.anomalyNote;
                                      const typeLabel = r.type === 'pickup' ? '投件' : '取件';
                                      return (
                                        <div key={r.id} className="flex items-center gap-1.5 text-[10px] text-[#999999]">
                                          <CheckCircle2 className={`w-2.5 h-2.5 shrink-0 ${isAnomaly ? 'text-[#FAAD14]' : 'text-[#52C41A]'}`} />
                                          <span className="text-[#666666]">{new Date(r.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                                          <span>{r.operatorName}</span>
                                          <span className={isAnomaly ? 'text-[#FAAD14]' : 'text-[#52C41A]'}>{isAnomaly ? `异常${typeLabel}` : `正常${typeLabel}`}</span>
                                          {isAnomaly && <span className="truncate max-w-[100px]">{r.anomalyNote}</span>}
                                              {isAnomaly && wbStatus === "exception" && (<button onClick={() => { useOrderStore.getState().updateWaybillStatus(currentOrder.id, wb.id, "arrived"); }} className="flex items-center gap-0.5 text-[10px] text-[#1677FF] hover:underline ml-1"><RotateCcw size={10} />恢复</button>)}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          return null;
        })()}

        {/* 数据看板（进度栏下方） */}
        <div className="px-4 py-2">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-[#1677FF]" />
              <span className="text-[12px] font-medium text-[#1A1A1A]">数据看板</span>
            </div>
            {currentOrder?.serviceType === 'logistics' && currentOrder && <LogisticsDashboard order={currentOrder} vehicle={findVehicleForOrder(currentOrder)} />}
            {currentOrder?.serviceType === 'vending' && currentOrder && <VendingDashboard order={currentOrder} vehicle={findVehicleForOrder(currentOrder)} />}
            {currentOrder?.serviceType === 'security' && currentOrder && <SecurityDashboard order={currentOrder} vehicle={findVehicleForOrder(currentOrder)} />}
          </div>
        </div>

        {/* 地图区域 */}
        <div className="px-4 pb-2">
          <div className="bg-[#E8ECF0] rounded-xl h-[180px] flex items-center justify-center relative overflow-hidden">
            <div className="text-center">
              <MapPin className="w-8 h-8 mx-auto text-[#999999] mb-1" />
              <p className="text-[12px] text-[#999999]">车辆实时位置</p>
              <p className="text-[10px] text-[#CCC] mt-0.5">位置数据来自车辆 IoT 上报（演示模式为模拟轨迹）</p>
            </div>
            {/* 路线规划悬浮按钮（仅巡游/安防） */}
            {currentOrder && currentOrder.serviceType !== 'logistics' && (
              <button
                onClick={() => {
                  if (currentOrder) {
                    pushPage({ key: 'route-plan', data: { orderId: currentOrder.id, serviceType: currentOrder.serviceType } });
                  }
                }}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full shadow hover:bg-white transition-colors"
              >
                <Route className="w-4 h-4 text-[#1677FF]" />
              </button>
            )}
            {/* 报障按钮 */}
            {currentOrder && (
              <button
                onClick={() => setFaultOpen(!faultOpen)}
                className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full shadow hover:bg-white transition-colors"
              >
                <Wrench className="w-4 h-4 text-[#FAAD14]" />
              </button>
            )}
            {/* 报障弹窗 — 放在地图外部避免 overflow-hidden 裁剪 */}
            {faultOpen && (
              <div className="fixed inset-0 z-50 flex items-end justify-center pb-4 bg-black/20" onClick={() => setFaultOpen(false)}>
                <div className="bg-white rounded-xl shadow-lg border border-[#EEEEEE] w-full max-w-[343px] p-3 mx-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-medium text-[#1A1A1A]">上报故障</span>
                    <button onClick={() => setFaultOpen(false)}><X className="w-3.5 h-3.5 text-[#999999]" /></button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(currentOrder.serviceType === 'logistics'
                      ? currentOrder.deliveryMode === 'full_load'
                        ? ['装货超时', '车厢门故障', '货物固定异常', '定位偏移', '电量异常', '其他']
                        : ['投件超时', '多格口故障', '货物混淆', '定位偏移', '电量异常', '其他']
                      : currentOrder.serviceType === 'vending'
                        ? ['货架卡住', '温控异常', 'LED屏故障', '库存系统错误', '电量异常', '其他']
                        : ['摄像头离线', '红外异常', '对讲故障', '路线偏离', '电量异常', '其他']
                    ).map((type) => (
                      <button
                        key={type}
                        onClick={() => setFaultType(type)}
                        className={`px-2 py-1 rounded text-[10px] transition-colors ${faultType === type ? 'bg-[#1677FF] text-white' : 'bg-[#F5F6FA] text-[#666666] hover:bg-[#E6F0FF]'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="补充描述（选填）"
                    value={faultDesc}
                    onChange={(e) => setFaultDesc(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#F5F6FA] rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-[#1677FF] resize-none h-12 mb-2"
                  />
                  <button
                    onClick={() => {
                      toast('故障已上报，技术人员将尽快处理');
                      setFaultOpen(false);
                      setFaultType('');
                      setFaultDesc('');
                    }}
                    disabled={!faultType}
                    className="w-full py-1.5 bg-[#1677FF] text-white rounded-lg text-[12px] font-medium disabled:bg-[#CCCCCC] disabled:cursor-not-allowed"
                  >
                    提交报障
                </button>
              </div>
              </div>
            )}
            {/* 模拟车辆位置 */}
            {simulatedPosition && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-1 bg-white/90 rounded-full px-2 py-1 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-[#1677FF] animate-pulse" />
                  <Truck className="w-3 h-3 text-[#1677FF]" />
                  <span className="text-[10px] text-[#1A1A1A]">{simulatedPosition.address}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
