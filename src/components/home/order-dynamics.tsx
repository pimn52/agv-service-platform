'use client';

/**
 * 订单动态面板 — 核心状态机入口。
 *
 * 架构：
 * - FTL 走经停点级状态机：advanceStopStatus 推进单个 stop → store 自动联动 order status
 * - LTL 走运单级状态机：updateWaybillStatus 推进单个 waybill → 逐单完成
 * - 交接凭证（POD）：完成操作时自动生成 HandoverRecord，签收弹窗支持异常分流
 * - 兜底按钮：全部投件/取件完成但弹窗被取消时，显示"全部完成，确认发车/完结"按钮
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAppStore, useOrderStore } from '@/store';
import type { Order, ServiceType, OrderStatus } from '@/types';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  BatteryMedium,
  ArrowRight,
  Truck,
} from 'lucide-react';

/* ────────────────────────── 常量 & 工具 ────────────────────────── */

const SERVICE_TABS: { key: ServiceType; label: string }[] = [
  { key: 'logistics', label: '物流配送' },
  { key: 'vending', label: '巡游贩卖' },
  { key: 'security', label: '安防巡检' },
];

/** 车辆照片映射 */
const VEHICLE_IMAGES: Record<ServiceType, string> = {
  logistics: '/vehicle-delivery.png',
  vending: '/vehicle-vending.png',
  security: '/vehicle-security.png',
};

import { getOrderSummary, getLogisticsAddresses } from './order-dynamics-helpers'
import { stopStatus, getActiveStopIndex, countStopsByStatus, getCurrentDeliveryNumber, areAllStopsCompleted } from '@/components/shared/stop-utils'
import { assertStateConsistency } from '@/lib/order-mutator'
import { ensureLTLCompartments } from '@/lib/ltl-car-groups'

/** 获取车辆显示名称：车型名 · 车牌号 */
function getVehicleDisplay(order: Order): string {
  if (order.vehicleModel && order.vehiclePlate) {
    return `${order.vehicleModel} · ${order.vehiclePlate}`;
  }
  return order.vehicleName ?? '--';
}

import { STATUS_LABELS } from '@/constants/status-labels'
import { ConfirmDialog } from './confirm-dialog'
import { useDemoTimers } from './use-demo-timers'
import type { LocalNotification } from './order-dynamics.types'

const CONFIRM_MESSAGES: Record<string, { title: string; message: string }> = {
  'loading,in_transit': { title: '确认发车', message: '装货已完成，确认发车开始运输？' },
  'unloading,completed': { title: '确认签收', message: '卸货已完成，确认签收完成订单？' },
  'picking_up,in_transit': { title: '确认发车', message: '投件已完成，确认发车开始运输？' },
  'arrived,in_transit': { title: '确认发车', message: '全部运单投件已完成，确认发车开始运输？' },
  'picked_up,completed': { title: '确认取件', message: '确认货物无误，完成取件？' },
  'arrived,completed': { title: '确认交还', message: '确认交还车辆并完成订单？' },
  'selling,arrived': { title: '确认结束', message: '确认结束行程？车辆将返回出发点' },
  'vending_active,arrived': { title: '确认结束', message: '确认结束行程？车辆将返回出发点' },
  'vending_paused,arrived': { title: '确认结束', message: '确认结束行程？车辆将返回出发点' },
  'patrolling,arrived': { title: '确认结束', message: '确认结束巡检？车辆将返回出发点' },
}

/** 状态标签配色（基于统一 STATUS_LABELS 的颜色） */
function getStatusStyle(status: OrderStatus): { text: string; bg: string } {
  const color = STATUS_LABELS[status]?.color ?? '#999999'
  const colorToTailwind: Record<string, { text: string; bg: string }> = {
    '#999999': { text: 'text-[#999999]', bg: 'bg-[#F0F0F0]' },
    '#1677FF': { text: 'text-[#1677FF]', bg: 'bg-[#E6F0FF]' },
    '#FAAD14': { text: 'text-[#FAAD14]', bg: 'bg-[#FFFBE6]' },
    '#52C41A': { text: 'text-[#52C41A]', bg: 'bg-[#F6FFED]' },
    '#FF4D4F': { text: 'text-[#FF4D4F]', bg: 'bg-[#FFF2F0]' },
  }
  return colorToTailwind[color] ?? colorToTailwind['#999999']
}

function getStatusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status]?.label ?? status
}

/* ────────────────────────── 操作按钮配置 ────────────────────────── */

interface ActionButton {
  key: string;
  label: string;
  icon: typeof Package;
  variant: 'primary' | 'default' | 'disabled';
  /** 是否需要呼吸闪烁（车辆已到/客户必须现在操作） */
  urgent?: boolean;
  action?: () => void;
  /** LTL 多车：点击按钮后自动切换到对应车辆的车牌 */
  plateForAction?: string;
}

/** 根据服务类型和订单状态，返回操作按钮 */
function getActionsForOrder(
  order: Order,
  onStatusChange: (orderId: string, newStatus: string) => void,
  onRoutePlanning: (orderId: string, serviceType: ServiceType) => void,
  onPrepStep: (orderId: string) => void,
  prepDone: boolean,
  hasRoute: boolean,
  hasAlert: boolean,
  selectedLtlPlate?: string | null,
): ActionButton[] {
  const actions: ActionButton[] = [];
  const isFTL = order.deliveryMode === 'full_load'
  const isLTL = order.deliveryMode === 'ltl'
  const routeVariant: 'primary' | 'default' = hasRoute ? 'default' : 'primary'

  // ── 物流 ──
  if (order.serviceType === 'logistics') {
    if (isFTL) {
      // 整车：读 ftlWaybills
      const ftlWbs = order.ftlWaybills || [];

      if (ftlWbs.length > 0) {
        // ── FTL 运单模式 ──
        // 为每个未完成的运单生成操作按钮，多车时带"·第N车"后缀
        const pendingWbs = ftlWbs.filter((wb) => wb.status !== 'completed' && wb.status !== 'exception');
        const exceptionWbs = ftlWbs.filter((wb) => wb.status === 'exception');

        pendingWbs.forEach((activeWb) => {
          const wbIdx = ftlWbs.indexOf(activeWb);
          const wbLabel = ftlWbs.length > 1 ? ` · 运单${wbIdx + 1}` : '';
          const stops = activeWb.stops;
          const activeIdx2 = getActiveStopIndex(stops);
          const activeStop2 = activeIdx2 >= 0 ? stops[activeIdx2] : null;
          if (!activeStop2) return;
          const ss = stopStatus(activeStop2);
          const isPickupSt = activeStop2.type === 'pickup';
          const delivs = stops.filter((s) => s.type === 'delivery');
          const delivDone = delivs.filter((s) => stopStatus(s) === 'completed' || stopStatus(s) === 'skipped').length;
          const delivTotal = delivs.length;

          if (ss === 'arrived' && isPickupSt) {
            actions.push({ key: `ftl-load-${activeWb.id}`, label: `开始装货${wbLabel}`, icon: PackageOpen, variant: 'primary', urgent: true, action: () => onStatusChange(order.id, `loading:${activeWb.id}`) });
          } else if (ss === 'in_progress' && isPickupSt) {
            actions.push({ key: `ftl-loaddone-${activeWb.id}`, label: `装货完成${wbLabel}`, icon: PackageCheck, variant: 'primary', urgent: true, action: () => onStatusChange(order.id, `in_transit:${activeWb.id}`) });
          } else if (ss === 'arrived' && !isPickupSt) {
            const l = delivTotal > 1 ? `开始卸货（${delivDone + 1}/${delivTotal}）` : '开始卸货';
            actions.push({ key: `ftl-unload-${activeWb.id}`, label: `${l}${wbLabel}`, icon: PackageOpen, variant: 'primary', urgent: true, action: () => onStatusChange(order.id, `unloading:${activeWb.id}`) });
          } else if (ss === 'in_progress' && !isPickupSt) {
            actions.push({ key: `ftl-unloaddone-${activeWb.id}`, label: `卸货完成${wbLabel}`, icon: PackageCheck, variant: 'primary', urgent: true, action: () => onStatusChange(order.id, `completed:${activeWb.id}`) });
          }
        });

        exceptionWbs.forEach((exWb) => {
          const wbIdx = ftlWbs.indexOf(exWb);
          const wbLabel = ftlWbs.length > 1 ? ` · 运单${wbIdx + 1}` : '';
          actions.push({ key: `ftl-ex-${exWb.id}`, label: `异常待处理${wbLabel}`, icon: AlertTriangle, variant: 'disabled' });
        });

        // ── 跳站警告按钮（收货人不在 · 系统自动跳过经停点）──
        ftlWbs.forEach((wb) => {
          if (wb.status === 'completed') return;
          const delivStops = wb.stops.filter((s) => s.type === 'delivery');
          wb.stops.forEach((s) => {
            if (stopStatus(s) !== 'skipped') return;
            const delivIdx = delivStops.findIndex((ds) => ds.id === s.id);
            const addrTrunc = (s.address || `第${delivIdx + 1}站`).slice(0, 6);
            const labelSuffix = ftlWbs.length > 1 ? ` · 运单${ftlWbs.indexOf(wb) + 1}` : '';
            actions.push({
              key: `ftl-skip-${wb.id}-${s.id}`,
              label: `无人签收 ⚠ · ${addrTrunc}${labelSuffix}`,
              icon: AlertTriangle,
              variant: 'disabled',
            });
          });
        });
      }
    } else if (isLTL) {
      // 散件多运单：对标 FTL，展示全部运单按钮（不按选中车辆过滤）。
      // 每运单按自身 status 独立判断操作按钮，非当前车辆的按钮点击后自动切换 Tab。
      const ltlWaybills = order.ltlWaybills || [];
      const comps = ensureLTLCompartments(order);
      const plates = [...new Set(comps.map((c) => c.vehicleId))];
      const selPlate = selectedLtlPlate || plates[0] || null;
      const totalWbs = ltlWaybills.length;
      const showWbIndex = totalWbs > 1;

      // 选中车辆的运单（用于"全部投件完成/取件完成"等按车判断）
      const selVehicleWbs = (() => {
        if (!selPlate || comps.length === 0) return ltlWaybills;
        const vehicleCompIds = new Set(comps.filter((c) => c.vehicleId === selPlate).map((c) => c.id));
        const filtered = ltlWaybills.filter((wb) => wb.compartmentId && vehicleCompIds.has(wb.compartmentId));
        return filtered.length > 0 ? filtered : ltlWaybills;
      })();

      // 全部未完成运单（对标 FTL 的 pendingWbs）
      const activeWbs = ltlWaybills.filter((w) => w.status !== 'completed' && w.status !== 'exception');

      // 获取运单所在车辆的车牌（点击后自动切换 Tab）
      const getWbPlate = (wbId: string): string | undefined => {
        const wb = ltlWaybills.find((w) => w.id === wbId);
        if (!wb?.compartmentId) return undefined;
        const comp = comps.find((c) => c.id === wb.compartmentId);
        return comp?.vehicleId;
      };

      // ── 逐运单按钮（对标 FTL per-waybill 模式）──
      activeWbs.forEach((wb) => {
        const wbi = ltlWaybills.indexOf(wb) + 1;
        const comp = comps.find((c) => c.id === wb.compartmentId);
        const plate = getWbPlate(wb.id);
        const wbWasLoaded = (wb.handoverRecords || []).some((r) => r.type === 'pickup');

        switch (wb.status) {
          case 'assigned':
          case 'created':
            // 投件阶段：车辆已到达投件点（order.status === 'arrived'），显示投件按钮
            if (order.status === 'arrived') {
              actions.push({
                key: `load-wb-${wb.id}`, label: `投件${showWbIndex ? ` 运单${wbi}` : ''}${comp ? ` ${comp.label}` : ''}`,
                icon: PackageOpen, variant: 'primary', urgent: true, plateForAction: plate,
                action: () => onStatusChange(order.id, `loadDone:${wb.id}`),
              });
            }
            break;
          case 'in_transit':
            // "运输中"是状态不是操作，不生成按钮
            break;
          case 'arrived':
            if (!wbWasLoaded) {
              // 第一次到达：投件点，等待投件
              actions.push({
                key: `load-wb-${wb.id}`, label: `投件${showWbIndex ? ` 运单${wbi}` : ''}${comp ? ` ${comp.label}` : ''}`,
                icon: PackageOpen, variant: 'primary', urgent: true, plateForAction: plate,
                action: () => onStatusChange(order.id, `loadDone:${wb.id}`),
              });
            } else {
              // 第二次到达：取件点，等待取件
              actions.push({
                key: `pickup-wb-${wb.id}`, label: `取件${showWbIndex ? ` 运单${wbi}` : ''}${comp ? ` ${comp.label}` : ''}`,
                icon: HandCoins, variant: 'primary', urgent: true, plateForAction: plate,
                action: () => onStatusChange(order.id, `completeWb:${wb.id}`),
              });
            }
            break;
          case 'completed':
            actions.push({
              key: `completed-wb-${wb.id}`, label: `${showWbIndex ? `运单${wbi} ` : ''}已取件 ✓`,
              icon: PackageCheck, variant: 'disabled', plateForAction: plate,
            });
            break;
        }
      });

      // 异常运单
      const exceptionWbs = ltlWaybills.filter((wb) => wb.status === 'exception');
      exceptionWbs.forEach((exWb) => {
        actions.push({ key: `ltl-ex-${exWb.id}`, label: '异常待处理', icon: AlertTriangle, variant: 'disabled' });
      });

      // ── 按车独立：选中车辆全部运单投件完成 → 确认发车 ──
      // 选中车辆的全部运单至少已投件（loaded 或更后）
      const selAllMinLoaded = selVehicleWbs.length > 0 && selVehicleWbs.every(
        (w) => w.status === 'loaded' || w.status === 'in_transit' || w.status === 'arrived' || w.status === 'completed'
      );
      // 选中车辆尚未发车（没有任何运单进入 in_transit 或之后）
      const selNotYetDeparted = !selVehicleWbs.some(
        (w) => w.status === 'in_transit' || w.status === 'arrived' || w.status === 'completed'
      );
      if (selAllMinLoaded && selNotYetDeparted) {
        actions.push({
          key: 'allLoaded-confirm', label: '全部投件完成，确认发车',
          icon: PackageCheck, variant: 'primary', urgent: true,
          action: () => onStatusChange(order.id, 'in_transit'),
        });
      }

      // ── 按车独立：选中车辆全部取件完成 → 该车完结（多车仅当全订单运单完成才确认完结）──
      const selAllCompleted = selVehicleWbs.length > 0 && selVehicleWbs.every((w) => w.status === 'completed');
      if (selAllCompleted) {
        // 多车时：仅当全订单运单都完成才显示"确认完结"按钮
        const allOrderWbsCompleted = ltlWaybills.length > 0 && ltlWaybills.every((w) => w.status === 'completed');
        if (allOrderWbsCompleted || plates.length <= 1) {
          actions.push({
            key: 'allPicked-confirm', label: '全部取件完成，确认完结',
            icon: PackageCheck, variant: 'primary', urgent: true,
            action: () => onStatusChange(order.id, 'completed'),
          });
        }
      }
    }
  }

  // ── 巡游贩卖 ──
  if (order.serviceType === 'vending') {
    const routeAction = () => onRoutePlanning(order.id, 'vending')
    switch (order.status) {
      case 'pending':
      case 'pricing':
      case 'paying':
      case 'dispatching':
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: routeVariant, action: routeAction })
        break
      case 'dispatched':
      case 'started':
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: routeVariant, action: routeAction })
        if (hasRoute) {
          actions.push({ key: 'startTrip', label: '开始行程', icon: PlayCircle, variant: 'primary', action: () => onStatusChange(order.id, 'selling') })
        }
        break
      case 'selling':
      case 'vending_active':
        actions.push({ key: 'pauseVending', label: '暂停贩卖', icon: PauseCircle, variant: hasAlert ? 'primary' : 'default', action: () => onStatusChange(order.id, 'vending_paused') })
        if (prepDone) {
          actions.push({ key: 'endTrip', label: '结束行程', icon: StopCircle, variant: 'default', action: () => onStatusChange(order.id, 'arrived') })
        } else {
          actions.push({ key: 'cargo', label: '货物操作', icon: ShoppingCart, variant: 'default', action: () => onPrepStep(order.id) })
        }
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: routeVariant, action: routeAction })
        break
      case 'vending_paused':
        actions.push({ key: 'resumeVending', label: '继续贩卖', icon: PlayCircle, variant: prepDone ? 'primary' : 'default', action: () => onStatusChange(order.id, 'selling') })
        if (prepDone) {
          actions.push({ key: 'endTrip', label: '结束行程', icon: StopCircle, variant: 'default', action: () => onStatusChange(order.id, 'arrived') })
        } else {
          actions.push({ key: 'cargo', label: '货物操作', icon: ShoppingCart, variant: 'primary', action: () => onPrepStep(order.id) })
        }
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: routeVariant, action: routeAction })
        break
      case 'arrived':
        actions.push({ key: 'handback', label: '交还车辆', icon: PackageCheck, variant: 'primary', urgent: true, action: () => onStatusChange(order.id, 'completed') })
        break
    }
  }

  // ── 安防巡检 ──
  if (order.serviceType === 'security') {
    const routeAction = () => onRoutePlanning(order.id, 'security')
    switch (order.status) {
      case 'pending':
      case 'pricing':
      case 'paying':
      case 'dispatching':
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: routeVariant, action: routeAction })
        break
      case 'dispatched':
      case 'started':
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: routeVariant, action: routeAction })
        if (hasRoute) {
          actions.push({ key: 'startPatrol', label: '开始巡检', icon: PlayCircle, variant: 'primary', action: () => onStatusChange(order.id, 'patrolling') })
        }
        break
      case 'patrolling':
        actions.push({ key: 'pausePatrol', label: '暂停巡检', icon: PauseCircle, variant: 'default', action: () => onStatusChange(order.id, 'patrolling_paused') })
        actions.push({ key: 'deviceTest', label: '设备测试', icon: Wrench, variant: 'default' })
        if (prepDone) {
          actions.push({ key: 'endPatrol', label: '结束巡检', icon: StopCircle, variant: 'default', action: () => onStatusChange(order.id, 'arrived') })
        } else {
          actions.push({ key: 'supply', label: '物资操作', icon: Package, variant: 'default', action: () => onPrepStep(order.id) })
        }
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: routeVariant, action: routeAction })
        break
      case 'patrolling_paused':
        actions.push({ key: 'resumePatrol', label: '继续巡检', icon: PlayCircle, variant: 'primary', action: () => onStatusChange(order.id, 'patrolling') })
        actions.push({ key: 'deviceTest', label: '设备测试', icon: Wrench, variant: 'default' })
        if (prepDone) {
          actions.push({ key: 'endPatrol', label: '结束巡检', icon: StopCircle, variant: 'default', action: () => onStatusChange(order.id, 'arrived') })
        } else {
          actions.push({ key: 'supply', label: '物资操作', icon: Package, variant: 'default', action: () => onPrepStep(order.id) })
        }
        actions.push({ key: 'route', label: '路线规划', icon: Route, variant: routeVariant, action: routeAction })
        break
      case 'arrived':
        actions.push({ key: 'handback', label: '交还车辆', icon: PackageCheck, variant: 'primary', urgent: true, action: () => onStatusChange(order.id, 'completed') })
        break
    }
  }

  return actions;
}

/** 根据订单状态生成通知。消息随状态变化自动产生和消失。 */
function generateNotificationsForOrder(order: Order, selectedLtlPlate?: string): LocalNotification[] {
  const notifs: LocalNotification[] = [];
  const isFTL = order.deliveryMode === 'full_load'
  const plate = order.vehiclePlate ? ' ' + order.vehiclePlate : ''

  if (order.serviceType === 'logistics') {
    const { srcAddr, dstAddr } = getLogisticsAddresses(order);

    if (isFTL) {
      // 整车：读 ftlWaybills
      const ftlWbs = order.ftlWaybills;
      const activeWb = ftlWbs?.find((wb) => wb.status !== 'completed' && wb.status !== 'exception') ?? null;
      const stops = activeWb?.stops ?? [];
      const activeIdx = getActiveStopIndex(stops);
      const activeStop = activeIdx >= 0 ? stops[activeIdx] : null;
      const allDeliveries = stops.filter((s) => s.type === 'delivery');
      const completedDeliveries = allDeliveries.filter((s) => {
        const ss2 = stopStatus(s);
        return ss2 === 'completed' || ss2 === 'skipped';
      }).length;
      const stopAddr = activeStop?.address || srcAddr;
      const wbPlate = (ftlWbs?.length && activeWb ? activeWb.vehiclePlate || '' : plate.trim()).trim();
      const platePrefix = wbPlate ? ` ${wbPlate}` : plate;

      switch (order.status) {
        case 'dispatched': {
          const firstAddr = stops[0]?.address || srcAddr;
          notifs.push({ id: `ntf-${order.id}-to-pickup`, orderId: order.id, message: platePrefix + ` 已调度，正前往${firstAddr}`, type: 'general', dismissed: false, postponed: false })
          break
        }
        case 'loading':
          break
        case 'arrived':
          if (activeStop) {
            if (activeStop.type === 'pickup') {
              notifs.push({ id: `ntf-${order.id}-arrived-src`, orderId: order.id, message: platePrefix + ` 已到达${stopAddr}，请开始装货`, type: 'special', dismissed: false, postponed: false })
            } else {
              const dn = completedDeliveries + 1;
              const dt = allDeliveries.length;
              const progress = dt > 1 ? `（第${dn}/${dt}站）` : '';
              notifs.push({ id: `ntf-${order.id}-unload`, orderId: order.id, message: platePrefix + ` 已到达${stopAddr}，请卸货${progress}`, type: 'special', dismissed: false, postponed: false })
            }
          }
          break
      }

      // FTL 跳站检测：任何经停点被跳过时生成持久通知（不被 auto-dismiss）
      if (ftlWbs?.length) {
        for (const wb of ftlWbs) {
          if (wb.status === 'completed') continue;
          for (const s of wb.stops) {
            if (stopStatus(s) === 'skipped') {
              const stopAddr = s.address ? s.address.slice(0, 8) : '未知站点';
              notifs.push({
                id: `ntf-${order.id}-skip-${s.id}`,
                orderId: order.id,
                message: platePrefix + ` ${stopAddr} 无人签收，已自动跳过`,
                type: 'special',
                dismissed: false,
                postponed: false,
              });
            }
          }
        }
      }
    } else {
      // 散件
      // 获取地址：有 L2 选中车辆时取该车第一个运单地址，否则取第一个运单
      const getLtlAddr = (type: 'pickup' | 'delivery'): string => {
        const waybills = order.ltlWaybills || [];
        if (waybills.length === 0) return type === 'pickup' ? '取件点' : '投件点';
        let targetWbs = waybills;
        const notifComps = ensureLTLCompartments(order);
        if (selectedLtlPlate && notifComps.length) {
          const filteredComps = notifComps.filter((c) => c.vehicleId === selectedLtlPlate);
          targetWbs = waybills.filter((wb) => filteredComps.some((c) => c.id === wb.compartmentId));
          if (targetWbs.length === 0) targetWbs = waybills;
        }
        const addr = type === 'pickup' ? targetWbs[0]?.pickupAddress : targetWbs[0]?.deliveryAddress;
        return addr || (type === 'pickup' ? '投件点' : '取件点');
      };
      const ltlPlate = selectedLtlPlate || order.vehiclePlate || '';
      const ltlPlatePrefix = ltlPlate ? ' ' + ltlPlate : '';

      switch (order.status) {
        case 'dispatched':
          notifs.push({ id: `ntf-${order.id}-to-pickup`, orderId: order.id, message: ltlPlatePrefix + ` 已调度，正前往${getLtlAddr('pickup')}`, type: 'general', dismissed: false, postponed: false })
          break
        case 'picking_up':
          break
        case 'arrived': {
          // 多车时按当前选中车辆判断投件/取件：关键看运单是否曾被投件过
          const notifWbs = (() => {
            if (selectedLtlPlate) {
              const comps4 = ensureLTLCompartments(order);
              const vcIds = new Set(comps4.filter((c) => c.vehicleId === selectedLtlPlate).map((c) => c.id));
              const filtered = (order.ltlWaybills || []).filter((wb) => wb.compartmentId && vcIds.has(wb.compartmentId));
              if (filtered.length > 0) return filtered;
            }
            return order.ltlWaybills || [];
          })();
          const notifNeedsLoading = notifWbs.some((w) => w.status === 'assigned' || w.status === 'created' || w.status === 'loaded');
          const notifWasLoaded = notifWbs.some((w) => (w.handoverRecords || []).some((r) => r.type === 'pickup'));
          if (notifNeedsLoading || !notifWasLoaded) {
            notifs.push({ id: `ntf-${order.id}-arrived-src`, orderId: order.id, message: ltlPlatePrefix + ` 已到达${getLtlAddr('pickup')}，请开始投件`, type: 'special', dismissed: false, postponed: false })
          } else {
            notifs.push({ id: `ntf-${order.id}-pickup`, orderId: order.id, message: ltlPlatePrefix + ` 已到达${getLtlAddr('delivery')}，请自助取件`, type: 'special', dismissed: false, postponed: false })
          }
          break
        }
        case 'picked_up':
          notifs.push({ id: `ntf-${order.id}-confirm`, orderId: order.id, message: ltlPlatePrefix + ` 请确认取件`, type: 'general', dismissed: false, postponed: false })
          break
      }
    }
  }

  if (order.serviceType === 'vending') {
    switch (order.status) {
      case 'dispatched':
      case 'started':
        notifs.push({ id: `ntf-${order.id}-ready`, orderId: order.id, message: plate + ` 已就位，请规划路线后开始行程`, type: 'general', dismissed: false, postponed: false })
        break
      case 'selling':
      case 'vending_active':
        notifs.push({ id: `ntf-${order.id}-restock`, orderId: order.id, message: plate + ` 库存不足，请及时补货`, type: 'special', dismissed: false, postponed: false })
        break
      case 'arrived':
        notifs.push({ id: `ntf-${order.id}-return`, orderId: order.id, message: plate + ` 已返回出发点，请取回商品和设备`, type: 'special', dismissed: false, postponed: false })
        break
    }
  }

  if (order.serviceType === 'security') {
    switch (order.status) {
      case 'dispatched':
      case 'started':
        notifs.push({ id: `ntf-${order.id}-ready`, orderId: order.id, message: plate + ` 已就位，请规划路线后开始巡检`, type: 'general', dismissed: false, postponed: false })
        break
      case 'patrolling':
        notifs.push({ id: `ntf-${order.id}-patrol`, orderId: order.id, message: plate + ` 检测到异常事件，请查看详情`, type: 'special', dismissed: false, postponed: false })
        break
      case 'patrolling_paused':
        notifs.push({ id: `ntf-${order.id}-patrol-paused`, orderId: order.id, message: plate + ` 巡检已暂停，可继续或结束任务`, type: 'general', dismissed: false, postponed: false })
        break
      case 'arrived':
        notifs.push({ id: `ntf-${order.id}-return`, orderId: order.id, message: plate + ` 已返回出发点，请交接物资装备`, type: 'special', dismissed: false, postponed: false })
        break
      default:
        break
    }
  }

  return notifs;
}

/* ────────────────────────── 主组件 ────────────────────────── */

export function OrderDynamics() {
  const { orders, getActiveOrdersByType, setActiveOrderId, activeOrderId } = useOrderStore();
  const { dynamicsTab, setDynamicsTab, pushPage } = useAppStore();
  const activeTab = dynamicsTab;
  const setActiveTab = setDynamicsTab;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);

  // 通知列表状态 — 根据订单实际状态动态生成
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [prepDone, setPrepDone] = useState(false);
  const [confirming, setConfirming] = useState<{ orderId: string; newStatus: string; waybillId?: string } | null>(null);
  // FTL 多车 / LTL 多车：当前选中展示的运单 ID 或车牌号（仅影响照片区信息，不影响操作按钮）
  const [selectedFtlWbId, setSelectedFtlWbId] = useState<string | null>(null);

  // 通知：每次订单状态变化时完全重新生成
  // 状态过去 → 对应消息自动消失。仅保留"已推迟"标记。
  // 使用 ref 追踪当前订单 ID，避免在 currentOrder 声明前引用导致 TS TDZ 错误。
  const currentOrderIdRef = useRef<string | null>(null);
  useEffect(() => {
    const allNotifs: LocalNotification[] = [];
    for (const order of orders) {
      if (!['completed', 'cancelled'].includes(order.status)) {
        const selPlate = order.deliveryMode === 'ltl' && order.id === currentOrderIdRef.current
          ? (selectedFtlWbId || undefined)
          : undefined;
        allNotifs.push(...generateNotificationsForOrder(order, selPlate));
      }
    }
    setNotifications((prev) => {
      const postponedIds = new Set(prev.filter((n) => n.postponed).map((n) => n.id));
      const dismissedIds = new Set(prev.filter((n) => n.dismissed).map((n) => n.id));
      return allNotifs.map((n) => ({
        ...n,
        postponed: postponedIds.has(n.id),
        dismissed: dismissedIds.has(n.id) || n.dismissed,
      }));
    });
  }, [orders, selectedFtlWbId]);

  // general 类型消息 8 秒后自动消失
  useEffect(() => {
    const generalNotifs = notifications.filter((n) => n.type === 'general' && !n.dismissed)
    if (generalNotifs.length === 0) return
    const timers = generalNotifs.map((n) =>
      setTimeout(() => {
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, dismissed: true } : x)))
      }, 8000)
    )
    return () => timers.forEach(clearTimeout)
  }, [notifications])

  // 首次加载时：自动定位到有 actionable 消息的 Tab（仅首次，防止 remount 时覆盖用户选择）
  useEffect(() => {
    if (sessionStorage.getItem('agv_auto_tab_done')) return
    sessionStorage.setItem('agv_auto_tab_done', '1')
    const tabs: ServiceType[] = ['logistics', 'vending', 'security']
    for (const tab of tabs) {
      const activeOrders = getActiveOrdersByType(tab)
      const notifs = activeOrders.flatMap((o) => generateNotificationsForOrder(o))
      if (notifs.some((n) => n.type === 'special')) {
        setActiveTab(tab)
        return
      }
    }
    // 无特殊消息时定位到第一个有在途订单的 Tab
    for (const tab of tabs) {
      if (getActiveOrdersByType(tab).length > 0) {
        setActiveTab(tab)
        return
      }
    }
  }, [])

  const updateStatus = useOrderStore((s) => s.updateOrderStatus);
  // 演示模式定时通知
  useDemoTimers(orders, updateStatus, getLogisticsAddresses, setNotifications);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // 当前Tab的在途订单
  const activeOrders = useMemo(() => getActiveOrdersByType(activeTab), [activeTab, orders, getActiveOrdersByType]);

  // 检测各Tab的通知状态：红点(新通知) / 灰点(已推迟) / 无
  const tabsNotificationState = useMemo(() => {
    const result: Partial<Record<ServiceType, 'red' | 'gray' | 'none' | 'exception'>> = {};
    for (const tab of SERVICE_TABS) {
      const tabOrders = getActiveOrdersByType(tab.key);
      const tabNotifs = notifications.filter(
        (n) => !n.dismissed && tabOrders.some((o) => o.id === n.orderId),
      );
      // 优先检测异常：FTL stop exception/skipped / LTL waybill exception
      const hasException = tabOrders.some((o) => {
        if (o.deliveryMode === 'full_load') {
          if (o.ftlWaybills?.length) {
            return o.ftlWaybills.some((wb) => wb.stops.some((s) => {
              const ss = s.stopStatus || 'pending';
              return ss === 'exception' || ss === 'skipped';
            }));
          }
        }
        if (o.deliveryMode === 'ltl' && o.ltlWaybills) {
          return o.ltlWaybills.some((w) => w.status === 'exception');
        }
        return false;
      });
      if (hasException) {
        result[tab.key] = 'exception';
        continue;
      }
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

  // 从追踪页"返回首页操作"跳转时，定位到指定订单
  // 仅当外部主动设置 activeOrderId 时跳转（如通知"去处理"、追踪页返回），
  // 不随 activeOrders 变化重复触发（防止车辆操作时轮播跳动）
  useEffect(() => {
    if (activeOrderId && activeOrders.length > 0) {
      const idx = activeOrders.findIndex((o) => o.id === activeOrderId);
      if (idx >= 0) {
        setCurrentIndex(idx);
        useOrderStore.getState().setActiveOrderId(null); // 一次性消费
      }
    }
  }, [activeOrderId]);

  // 当前订单
  const currentOrder: Order | undefined = activeOrders[currentIndex];

  // 同步当前订单 ID 到 ref（供上方 effect 使用，避免 TDZ）
  useEffect(() => {
    currentOrderIdRef.current = currentOrder?.id ?? null;
  }, [currentOrder?.id]);

  // currentIndex 越界时回退到最后一个有效订单
  useEffect(() => {
    if (activeOrders.length > 0 && currentIndex >= activeOrders.length) {
      setCurrentIndex(activeOrders.length - 1);
    }
  }, [activeOrders.length, currentIndex]);

  // 切换订单时重置 prepDone + 初始化选中运单/车辆（仅切换订单时触发，不随 currentOrder 引用变化）
  const prevOrderIdRef = useRef<string | null>(null);
  useEffect(() => {
    const oid = currentOrder?.id ?? null;
    if (oid === prevOrderIdRef.current) return; // 同一个订单，不重置
    prevOrderIdRef.current = oid;
    setPrepDone(false);
    if (currentOrder?.ftlWaybills?.length && oid) {
      const firstActive = currentOrder.ftlWaybills.find((wb) => wb.status !== 'completed');
      setSelectedFtlWbId(firstActive?.id || currentOrder.ftlWaybills[0].id);
    } else if (currentOrder?.deliveryMode === 'ltl' && oid) {
      // LTL：初始化选中第一辆有待办运单的车，否则第一辆车
      const comps = currentOrder ? ensureLTLCompartments(currentOrder) : [];
      if (!comps.length) { setSelectedFtlWbId(null); return; }
      const ltlWbs = currentOrder.ltlWaybills || [];
      const plates = [...new Set(comps.map((c) => c.vehicleId))];
      const actionablePlate = plates.find((plate) => {
        const vehicleComps = comps.filter((c) => c.vehicleId === plate);
        const vehicleWbs = ltlWbs.filter((wb) => vehicleComps.some((c) => c.id === wb.compartmentId));
        return vehicleWbs.some((wb) => wb.status !== 'completed' && wb.status !== 'exception');
      });
      setSelectedFtlWbId(actionablePlate || plates[0] || null);
    } else {
      setSelectedFtlWbId(null);
    }
  }, [currentOrder?.id]);

  // 自动切换（FTL）：仅一辆车有待办时自动切；当前车无待办时切到有待办的车
  useEffect(() => {
    if (!currentOrder?.ftlWaybills?.length) return;
    const wbs = currentOrder.ftlWaybills;
    const actionable = wbs.filter((wb) => {
      if (wb.status === 'completed' || wb.status === 'exception') return false;
      const si = getActiveStopIndex(wb.stops);
      if (si < 0) return false;
      const ss = stopStatus(wb.stops[si]);
      return ss === 'arrived' || ss === 'in_progress';
    });
    const currentWbId = selectedFtlWbId;
    if (actionable.length === 1) {
      if (currentWbId !== actionable[0].id) setSelectedFtlWbId(actionable[0].id);
    } else if (currentWbId && !actionable.some((a) => a.id === currentWbId) && actionable.length > 0) {
      // 当前运单无待办但其他运单有 → 自动切
      setSelectedFtlWbId(actionable[0].id);
    }
  }, [currentOrder?.ftlWaybills, selectedFtlWbId]);

  // 自动切换（LTL）：当前车辆无待办时切到有待办的车辆；仅一车有待办时自动切
  // 用 ref 追踪当前选中车辆，避免用户手动切 Tab 时被弹走
  const selectedLtlPlateRef = useRef(selectedFtlWbId);
  selectedLtlPlateRef.current = selectedFtlWbId;

  useEffect(() => {
    if (currentOrder?.deliveryMode !== 'ltl') return;
    const comps = currentOrder ? ensureLTLCompartments(currentOrder) : [];
    const ltlWbs = currentOrder?.ltlWaybills;
    if (!comps.length || !ltlWbs?.length) return;
    const plates = [...new Set(comps.map((c) => c.vehicleId))];
    if (plates.length <= 1) return;

    const isPlateActionable = (plate: string): boolean => {
      const vehicleComps = comps.filter((c) => c.vehicleId === plate);
      const vehicleWbs = ltlWbs.filter((wb) => vehicleComps.some((c) => c.id === wb.compartmentId));
      return vehicleWbs.some((wb) => {
        if (wb.status === 'completed' || wb.status === 'exception') return false;
        return ['arrived', 'picking_up', 'picked_up'].includes(currentOrder.status);
      });
    };

    const actionablePlates = plates.filter(isPlateActionable);
    const currentPlate = selectedLtlPlateRef.current;

    if (actionablePlates.length === 1) {
      // 仅一辆车有待办 → 自动切到该车
      if (currentPlate !== actionablePlates[0]) {
        setSelectedFtlWbId(actionablePlates[0]);
      }
    } else if (currentPlate && !isPlateActionable(currentPlate) && actionablePlates.length > 0) {
      // 当前车辆无待办但其他车有 → 自动跳到第一辆有待办的车
      setSelectedFtlWbId(actionablePlates[0]);
    }
  }, [currentOrder?.compartments, currentOrder?.ltlWaybills, currentOrder?.status]);

  // 当前Tab对应的未消除通知（合并本地生成 + app-store 推送）
  const appStoreNotifs = useAppStore((s) => s.notifications);
  const activeNotifications = useMemo(() => {
    const local = notifications.filter((n) => !n.dismissed && activeOrders.some((o) => o.id === n.orderId));
    const store = appStoreNotifs
      .filter((n) => !n.dismissed && activeOrders.some((o) => o.id === n.orderId))
      .map((n) => ({ id: n.id, orderId: n.orderId, message: n.message, type: n.type as 'general' | 'special', title: n.title, dismissed: n.dismissed, postponed: n.postponed }));
    // 合并去重（按 id）
    const ids = new Set(local.map((n) => n.id));
    return [...local, ...store.filter((n) => !ids.has(n.id))];
  }, [notifications, activeOrders, appStoreNotifs]);

  /* ── 操作回调 ── */

  const handleStatusChange = useCallback((orderId: string, newStatus: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return

    // 多运单操作：投件完成某单 / 确认取件某单
    if (newStatus.startsWith('loadDone:') || newStatus.startsWith('completeWb:')) {
      const waybillId = newStatus.split(':')[1];
      if (newStatus.startsWith('loadDone:')) {
        useOrderStore.getState().updateWaybillStatus(orderId, waybillId, 'loaded');
        const _upd1 = useOrderStore.getState().orders.find((o) => o.id === orderId);
        if (_upd1) assertStateConsistency(_upd1);
        const updated = useOrderStore.getState().orders.find((o) => o.id === orderId);
        // 只检查选中车辆的运单（多车独立发车）
        const allWbs = updated?.ltlWaybills || [];
        const allComps = updated ? ensureLTLCompartments(updated) : [];
        const selPlate2 = (() => {
          if (!allComps.length) return null;
          const p = [...new Set(allComps.map((c) => c.vehicleId))];
          return selectedFtlWbId || p[0] || null;
        })();
        let checkWbs = allWbs;
        if (selPlate2 && allComps.length > 0) {
          const vcIds = new Set(allComps.filter((c) => c.vehicleId === selPlate2).map((c) => c.id));
          checkWbs = allWbs.filter((w) => w.compartmentId && vcIds.has(w.compartmentId));
          if (checkWbs.length === 0) checkWbs = allWbs;
        }
        const allDone = checkWbs.every((w) => w.status === 'loaded');
        if (allDone) {
          setConfirming({ orderId, newStatus: 'in_transit' });
        }
      } else {
        // 检查是否最后一个运单（除当前外全已完成）→ 弹窗确认后再完成
        const curWbs = order.ltlWaybills || [];
        // 只检查选中车辆的运单（多车独立完结）
        const allComps2 = ensureLTLCompartments(order);
        const selPlate3 = (() => {
          if (!allComps2.length) return null;
          const p = [...new Set(allComps2.map((c) => c.vehicleId))];
          return selectedFtlWbId || p[0] || null;
        })();
        let checkWbs2 = curWbs;
        if (selPlate3 && allComps2.length > 0) {
          const vcIds2 = new Set(allComps2.filter((c) => c.vehicleId === selPlate3).map((c) => c.id));
          checkWbs2 = curWbs.filter((w) => w.compartmentId && vcIds2.has(w.compartmentId));
          if (checkWbs2.length === 0) checkWbs2 = curWbs;
        }
        const othersDone = checkWbs2.filter((w) => w.id !== waybillId).every((w) => w.status === 'completed');
        if (othersDone) {
          setConfirming({ orderId, newStatus: 'completed', waybillId });
        } else {
          useOrderStore.getState().updateWaybillStatus(orderId, waybillId, 'completed');
          const _upd1b = useOrderStore.getState().orders.find((o) => o.id === orderId);
          if (_upd1b) assertStateConsistency(_upd1b);
          // demo 定时器：30s 后模拟到达取件点（仅单车订单，多车各自独立发车）
          setTimeout(() => {
            const cur = useOrderStore.getState().orders.find((o) => o.id === orderId);
            const hasPending = (cur?.ltlWaybills || []).some((w) => w.status !== 'completed');
            const compsT = cur ? ensureLTLCompartments(cur) : [];
            const platesT = compsT.length ? [...new Set(compsT.map((c) => c.vehicleId))] : [];
            if (hasPending && platesT.length <= 1) {
              // 按运单粒度推进：只将在途运单推进到取件点，不覆写已完成/异常运单
              cur?.ltlWaybills?.forEach((wb) => {
                if (wb.status === 'in_transit') {
                  useOrderStore.getState().updateWaybillStatus(orderId, wb.id, 'arrived');
                }
              });
              const _updT1 = useOrderStore.getState().orders.find((o) => o.id === orderId);
              if (_updT1) assertStateConsistency(_updT1);
            }
          }, 30000);
        }
      }
      return;
    }

    // ── 整车 FTL：经停点级状态推进（支持 waybillId 多车操作）──
    if (order.deliveryMode === 'full_load') {
      // 解析 status:waybillId 格式（新），fallback 纯 status（旧兼容）
      const parts = newStatus.split(':');
      const action = parts[0];
      const waybillId = parts[1] || undefined;

      if (waybillId && order.ftlWaybills) {
        // ── FTL 运单路径 ──
        const wb = order.ftlWaybills.find((w) => w.id === waybillId);
        if (!wb) return;
        const curIdx = getActiveStopIndex(wb.stops);
        const curStop = curIdx >= 0 ? wb.stops[curIdx] : null;
        if (!curStop) return;

        if (action === 'loading' || action === 'unloading') {
          useOrderStore.getState().advanceStopStatus(orderId, curStop.id, 'in_progress', undefined, waybillId);
          const _upd2 = useOrderStore.getState().orders.find((o) => o.id === orderId);
          if (_upd2) assertStateConsistency(_upd2);
          return;
        }
        if (action === 'in_transit') {
          useOrderStore.getState().advanceStopStatus(orderId, curStop.id, 'completed', undefined, waybillId);
          const _upd3 = useOrderStore.getState().orders.find((o) => o.id === orderId);
          if (_upd3) assertStateConsistency(_upd3);
          setTimeout(() => {
            const cur2 = useOrderStore.getState().orders.find((o) => o.id === orderId);
            const wb2 = cur2?.ftlWaybills?.find((w) => w.id === waybillId);
            if (!wb2) return;
            const nextIdx2 = getActiveStopIndex(wb2.stops);
            if (nextIdx2 >= 0) {
              useOrderStore.getState().advanceStopStatus(orderId, wb2.stops[nextIdx2].id, 'arrived', undefined, waybillId);
              const _upd4 = useOrderStore.getState().orders.find((o) => o.id === orderId);
              if (_upd4) assertStateConsistency(_upd4);
            }
          }, 30000);
          return;
        }
        if (action === 'completed') {
          const isLastDelivery = !wb.stops.some((s) => s.type === 'delivery' && (s.stopStatus || 'pending') !== 'completed' && s.id !== curStop.id);
          // 检查是否该运单的最后一站 AND 是否是最后一个运单
          // 物流惯例：每个运单卸货完成时独立签收确认。最后运单签收后订单自动完结
          if (isLastDelivery && curStop) {
            setConfirming({ orderId, newStatus: action, waybillId });
            return;
          }
          if (curStop) {
            useOrderStore.getState().advanceStopStatus(orderId, curStop.id, 'completed', undefined, waybillId);
            const _upd5 = useOrderStore.getState().orders.find((o) => o.id === orderId);
            if (_upd5) assertStateConsistency(_upd5);
          }
          if (!isLastDelivery) {
            setTimeout(() => {
              const cur3 = useOrderStore.getState().orders.find((o) => o.id === orderId);
              const wb3 = cur3?.ftlWaybills?.find((w) => w.id === waybillId);
              if (!wb3) return;
              const nextIdx3 = getActiveStopIndex(wb3.stops);
              if (nextIdx3 >= 0) {
                useOrderStore.getState().advanceStopStatus(orderId, wb3.stops[nextIdx3].id, 'arrived', undefined, waybillId);
                const _upd6 = useOrderStore.getState().orders.find((o) => o.id === orderId);
                if (_upd6) assertStateConsistency(_upd6);
              }
            }, 30000);
          }
          return;
        }
        return;
      }
    }

    // 状态推进时同步更新剩余距离/时间
    const distRemaining = Math.max(0, (order.remainingDistance ?? 10) - 3);
    const timeRemaining = Math.max(1, (order.remainingTime ?? 20) - 5);
    useOrderStore.getState().updateOrderField(orderId, { remainingDistance: distRemaining, remainingTime: timeRemaining });

    const key = `${order.status},${newStatus}`
    if (CONFIRM_MESSAGES[key]) {
      setConfirming({ orderId, newStatus })
    } else {
      updateStatus(orderId, newStatus as OrderStatus)
      const _upd7 = useOrderStore.getState().orders.find((o) => o.id === orderId);
      if (_upd7) assertStateConsistency(_upd7);
    }
  }, [orders, updateStatus, selectedFtlWbId])

  const handlePrepStep = useCallback((_orderId: string) => {
    setPrepDone(true)
  }, [])

  const handleRoutePlanning = useCallback(
    (orderId: string, serviceType: ServiceType) => {
      pushPage({ key: 'route-plan', data: { orderId, serviceType } });
    },
    [pushPage],
  );

  const handleDismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n)));
    // 同时消除 app store 中的通知（如拼车返利等全局通知）
    useAppStore.getState().dismissNotification(id);
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
              {notificationState === 'exception' && (
                <span className="absolute top-1.5 right-2">
                  <svg viewBox="0 0 16 16" fill="#FAAD14" className="w-3.5 h-3.5">
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0l-.35-3.507A.905.905 0 0 1 8 5zm.1 7.5a.5.5 0 0 1-.5.5H8a.5.5 0 0 1-.5-.5l.1-1a.5.5 0 0 1 .5-.5h.4a.5.5 0 0 1 .5.5l.1 1z" />
                  </svg>
                </span>
              )}
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
                className="w-full flex items-center gap-2 px-4 py-1.5 hover:bg-[#FAFAFA] transition-colors"
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
                      className={`flex items-center gap-2 px-2 py-1 rounded-lg text-left ${
                        n.postponed ? 'bg-[#F5F5F5] opacity-60'
                        : n.title === '拼车返利' ? 'bg-[#F6FFED]'
                        : 'bg-[#FFFBE6]'
                      }`}
                    >
                      <span className="shrink-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full inline-block ${
                            n.title === '拼车返利' ? 'bg-[#52C41A]'
                            : n.type === 'special' ? 'bg-[#FF4D4F]'
                            : 'bg-[#FAAD14]'
                          }`}
                        />
                      </span>
                      <span className={`flex-1 text-[11px] leading-snug ${n.title === '拼车返利' ? 'text-[#52C41A]' : 'text-[#1A1A1A]'}`}>{n.message}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {(n.type === 'general' || n.title === '拼车返利') && (
                          <button
                            onClick={() => handleDismissNotification(n.id)}
                            className="text-[10px] text-[#1677FF] hover:underline"
                          >
                            已读
                          </button>
                        )}
                        {n.type === 'special' && n.title !== '拼车返利' && !n.postponed && (
                          <>
                            <button
                              onClick={() => {
                                handleDismissNotification(n.id);
                                const targetOrder = orders.find((o) => o.id === n.orderId);
                                if (targetOrder) {
                                  setActiveTab(targetOrder.serviceType);
                                  setActiveOrderId(n.orderId);
                                }
                              }}
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

              {/* ── FTL 多车 Tab 选择器（车辆照片上方）── */}
              {currentOrder.deliveryMode === 'full_load' && currentOrder.ftlWaybills && currentOrder.ftlWaybills.length > 1 && (
                <div className="flex gap-1 p-0.5 bg-[#F5F6FA] rounded-lg mb-2">
                  {currentOrder.ftlWaybills.map((wb, wi) => {
                    const wbStatus = wb.status || 'in_progress';
                    const isSelected = selectedFtlWbId === wb.id;
                    const hasPendingAction = wbStatus !== 'completed' && wbStatus !== 'exception'
                      && wb.stops.some((s) => stopStatus(s) === 'arrived' || stopStatus(s) === 'in_progress');
                    return (
                      <button
                        key={wb.id}
                        onClick={() => setSelectedFtlWbId(wb.id)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-white text-[#1677FF] shadow-sm'
                            : hasPendingAction
                              ? 'text-[#1677FF] animate-pulse'
                              : 'text-[#999] hover:text-[#666]'
                        }`}
                      >
                        <Truck className="w-3 h-3" />
                        运单{wi + 1}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── LTL 多车 Tab 选择器（车辆照片上方）── */}
              {currentOrder.deliveryMode === 'ltl' && (() => {
                const comps = ensureLTLCompartments(currentOrder);
                const ltlWbs = currentOrder.ltlWaybills || [];
                const totalWbs = ltlWbs.length;
                const plates = [...new Set(comps.map((c) => c.vehicleId))];
                if (plates.length <= 1) return null;

                return (
                  <div className="flex gap-1 p-0.5 bg-[#F5F6FA] rounded-lg mb-2">
                    {plates.map((plate) => {
                      const isSelected = selectedFtlWbId === plate;
                      const vehicleComps = comps.filter((c) => c.vehicleId === plate);
                      const vehicleWbs = ltlWbs.filter((wb) => vehicleComps.some((c) => c.id === wb.compartmentId));
                      const wbCount = vehicleWbs.length;
                      const hasPendingAction = vehicleWbs.some((wb) => {
                        if (wb.status === 'completed' || wb.status === 'exception') return false;
                        return ['arrived', 'picking_up', 'picked_up'].includes(currentOrder.status);
                      });
                      return (
                        <button
                          key={plate}
                          onClick={() => setSelectedFtlWbId(plate)}
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 ${
                            isSelected
                              ? 'bg-white text-[#1677FF] shadow-sm'
                              : hasPendingAction
                                ? 'text-[#1677FF] animate-pulse'
                                : 'text-[#999] hover:text-[#666]'
                          }`}
                        >
                          <Truck className="w-3 h-3" />
                          {totalWbs > 1 ? `${plate} · ${wbCount}张运单` : plate}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

                {/* 车辆照片 */}
                <div className="flex flex-col items-center">
                  <img
                    src={(() => {
                      const selWb = currentOrder.ftlWaybills?.find((w) => w.id === selectedFtlWbId);
                      return currentOrder.vehicleImage || VEHICLE_IMAGES[currentOrder.serviceType];
                    })()}
                    alt={getVehicleDisplay(currentOrder)}
                    className="w-full h-[140px] object-contain rounded-lg"
                  />
                  <div className="mt-2 text-center">
                    <p className="text-[13px] text-[#1A1A1A] font-medium">
                      {(() => {
                        const selWb = currentOrder.ftlWaybills?.find((w) => w.id === selectedFtlWbId);
                        if (selWb) return `${selWb.vehicleModelName || selWb.vehicleModelId} · ${selWb.vehiclePlate || ''}`;
                        // LTL: 有 L2 选中车辆时显示对应车牌
                        if (currentOrder.deliveryMode === 'ltl' && selectedFtlWbId && ensureLTLCompartments(currentOrder).length) {
                          return `${currentOrder.vehicleModel || ''} · ${selectedFtlWbId}`;
                        }
                        return getVehicleDisplay(currentOrder);
                      })()}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      {(() => {
                        const selWb = currentOrder.ftlWaybills?.find((w) => w.id === selectedFtlWbId);
                        if (!selWb) {
                          // ── LTL 状态标签：用 STATUS_LABELS 统一源，arrived 时按车辆判断 ──
                          if (currentOrder.deliveryMode === 'ltl') {
                            const status = currentOrder.status;
                            const comps = ensureLTLCompartments(currentOrder);
                            const ltlWbs = currentOrder.ltlWaybills || [];
                            const plates = [...new Set(comps.map((c) => c.vehicleId))];
                            const selPlate = selectedFtlWbId || plates[0];
                            const vehicleComps = comps.filter((c) => c.vehicleId === selPlate);
                            const vehicleWbs = ltlWbs.filter((wb) => vehicleComps.some((c) => c.id === wb.compartmentId));
                            const hasException = vehicleWbs.some((wb) => wb.status === 'exception');

                            // 多车时按当前车辆运单状态 + 投件记录决定"待投件"/"待取件"
                            const vehicleAtPickup = (() => {
                              if (vehicleWbs.length === 0) return true;
                              const anyA = vehicleWbs.some((w: typeof vehicleWbs[0]) => w.status === 'assigned' || w.status === 'created');
                              const anyL = vehicleWbs.some((w: typeof vehicleWbs[0]) => w.status === 'loaded');
                              const anyAV = vehicleWbs.some((w: typeof vehicleWbs[0]) => w.status === 'arrived');
                              const anyWasLoaded = vehicleWbs.some((w: typeof vehicleWbs[0]) =>
                                (w.handoverRecords || []).some((r) => r.type === 'pickup'));
                              if (anyA || anyL) return true;                    // 投件阶段
                              if (anyAV && anyWasLoaded) return false;           // 取件阶段（曾投件过）
                              if (anyAV && !anyWasLoaded) return true;           // 投件阶段（首次到达，未投件）
                              return true;
                            })();
                            const arrivedLabel = vehicleAtPickup === false ? '待取件' : '待投件';

                            let label: string;
                            let color: string;
                            // 直接用 STATUS_LABELS，arrived 状态用 per-vehicle 标签
                            if (hasException && status !== 'completed') { label = '异常'; color = '#FF4D4F'; }
                            else if (status === 'arrived') { label = arrivedLabel; color = '#1677FF'; }
                            else {
                              const m = STATUS_LABELS[status];
                              label = m?.label || status;
                              color = m?.color || '#999999';
                            }
                            return (
                              <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ color, backgroundColor: color + '15' }}>
                                {label}
                              </span>
                            );
                          }
                          return (
                            <span className={`text-[11px] px-1.5 py-0.5 rounded ${getStatusStyle(currentOrder.status).bg} ${getStatusStyle(currentOrder.status).text}`}>
                              {getStatusLabel(currentOrder.status)}
                            </span>
                          );
                        }
                        // 从选中运单的活跃 stop 推导展示状态，不再复用订单级 status
                        const ai = getActiveStopIndex(selWb.stops);
                        const as = ai >= 0 ? selWb.stops[ai] : null;
                        const ss = as ? stopStatus(as) : 'pending';
                        const isP = as?.type === 'pickup';
                        let label: string;
                        let color: string;
                        if (selWb.status === 'completed') { label = '已完成'; color = '#52C41A'; }
                        else if (selWb.status === 'exception') { label = '异常'; color = '#FF4D4F'; }
                        else if (ss === 'pending') { label = ai === 0 ? '已调度' : '运输中'; color = ai === 0 ? '#1677FF' : '#999999'; }
                        else if (ss === 'arrived' && isP) { label = '待装货'; color = '#1677FF'; }
                        else if (ss === 'in_progress' && isP) { label = '装货中'; color = '#FAAD14'; }
                        else if (ss === 'arrived' && !isP) { label = '待卸货'; color = '#1677FF'; }
                        else if (ss === 'in_progress' && !isP) { label = '卸货中'; color = '#FAAD14'; }
                        else { label = '运输中'; color = '#999999'; }
                        return (
                          <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ color, backgroundColor: color + '15' }}>
                            {label}
                          </span>
                        );
                      })()}
                      <span className="text-[11px] text-[#999999] flex items-center gap-0.5">
                        <BatteryMedium className="w-3 h-3" />
                        {(() => {
                          const selWb = currentOrder.ftlWaybills?.find((w) => w.id === selectedFtlWbId);
                          return selWb?.vehicleBattery ?? currentOrder.vehicleBattery ?? 0;
                        })()}%
                      </span>
                    </div>
                    <p className="text-[11px] text-[#999999] mt-0.5">
                      {(() => {
                        const wbs = currentOrder.ftlWaybills;
                        if (wbs?.length) {
                          const wi = wbs.findIndex((w) => w.id === selectedFtlWbId);
                          const selWb = wi >= 0 ? wbs[wi] : wbs[0];
                          const pu = selWb.stops.find((s) => s.type === 'pickup');
                          const de = selWb.stops.find((s) => s.type === 'delivery');
                          return `${wi + 1}/${wbs.length}车 · ${pu?.address?.slice(0, 8) || '--'} → ${de?.address?.slice(0, 8) || '--'}`;
                        }
                        // LTL: 有 L2 选中车辆时显示该车运单路径
                        const renderComps = ensureLTLCompartments(currentOrder);
                        if (currentOrder.deliveryMode === 'ltl' && renderComps.length && currentOrder.ltlWaybills?.length) {
                          const comps = renderComps;
                          const ltlWbs = currentOrder.ltlWaybills;
                          const plates = [...new Set(comps.map((c) => c.vehicleId))];
                          const selPlate = selectedFtlWbId || plates[0];
                          const vehicleComps = comps.filter((c) => c.vehicleId === selPlate);
                          const vehicleWbs = ltlWbs.filter((wb) => vehicleComps.some((c) => c.id === wb.compartmentId));
                          const pu = vehicleWbs[0]?.pickupAddress?.slice(0, 8) || '--';
                          const de = vehicleWbs[0]?.deliveryAddress?.slice(0, 8) || '--';
                          const carIdx = plates.indexOf(selPlate) + 1;
                          return plates.length > 1 ? `${carIdx}/${plates.length}车 · ${pu} → ${de}` : `${pu} → ${de}`;
                        }
                        return getOrderSummary(currentOrder);
                      })()}
                    </p>
                    {currentOrder.status === 'arrived' && (
                      <p className="text-[10px] text-[#CCC] mt-0.5">演示模式自动模拟车辆行驶。生产环境中由车辆 GPS 实时触发</p>
                    )}
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
                const hasRoute = !!currentOrder.routePlanId
                const hasAlert = notifications.some(
                  (n) => n.orderId === currentOrder.id && n.type === 'special' && !n.dismissed
                )
                const actions = getActionsForOrder(
                  currentOrder,
                  handleStatusChange,
                  handleRoutePlanning,
                  handlePrepStep,
                  prepDone,
                  hasRoute,
                  hasAlert,
                  currentOrder.deliveryMode === 'ltl' ? selectedFtlWbId : undefined,
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
                      onClick={() => {
                        if (btn.plateForAction) setSelectedFtlWbId(btn.plateForAction);
                        btn.action?.();
                      }}
                      disabled={isDisabled}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] transition-all duration-200 ${
                        isPrimary
                          ? `bg-[#1677FF] text-white hover:bg-[#4096FF] active:bg-[#0958D9] ${btn.urgent ? 'animate-pulse' : ''}`
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
                    {actions.some((a) => a.key === 'exception' || a.key.startsWith('ftl-skip-')) && (
                      <p className="text-[10px] text-[#CCCCCC] mt-2 text-center">请联系客服或调度人员处理</p>
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

      {confirming && (() => {
        const order = orders.find((o) => o.id === confirming.orderId);
        const isLTL = order?.deliveryMode === 'ltl';
        const isFTL = order?.deliveryMode === 'full_load';
        const ltlWaybills = order?.ltlWaybills || [];
        let title = '确认操作';
        let message = '确认执行此操作？';
        // 签收/收货场景需要异常选项
        const isHandover = (isFTL && confirming.newStatus === 'completed') ||
                          (isLTL && confirming.newStatus === 'completed');
        if (isLTL && confirming.newStatus === 'in_transit') {
          title = '确认发车';
          // 显示选中车辆的运单数（多车时非全部运单）
          const selComps = order ? ensureLTLCompartments(order) : [];
          const allWbs = order?.ltlWaybills || [];
          let confirmWbCount = allWbs.length;
          if (selComps.length > 0 && selectedFtlWbId) {
            const vcIds = new Set(selComps.filter((c) => c.vehicleId === selectedFtlWbId).map((c) => c.id));
            const vehicleWbs = allWbs.filter((w) => w.compartmentId && vcIds.has(w.compartmentId));
            if (vehicleWbs.length > 0) confirmWbCount = vehicleWbs.length;
          }
          message = `${confirmWbCount}张运单全部投件完成，确认发车开始运输？`;
        } else if (isLTL && confirming.newStatus === 'completed') {
          title = '确认取件';
          // 显示选中车辆的运单数（多车时非全部运单）
          const selComps2 = order ? ensureLTLCompartments(order) : [];
          const allWbs2 = order?.ltlWaybills || [];
          let confirmWbCount2 = allWbs2.length;
          if (selComps2.length > 0 && selectedFtlWbId) {
            const vcIds = new Set(selComps2.filter((c) => c.vehicleId === selectedFtlWbId).map((c) => c.id));
            const vehicleWbs = allWbs2.filter((w) => w.compartmentId && vcIds.has(w.compartmentId));
            if (vehicleWbs.length > 0) confirmWbCount2 = vehicleWbs.length;
          }
          message = `${confirmWbCount2}张运单全部取件完成，确认完结订单？`;
        } else if (isFTL && confirming.newStatus === 'completed') {
          // FTL 按运单签收：最后一个运单签收后订单自动完结
          const wb = order?.ftlWaybills?.find((w) => w.id === confirming.waybillId);
          const wbIdx = wb ? order?.ftlWaybills?.indexOf(wb) : -1;
          const vehicleLabel = wbIdx != null && wbIdx >= 0 ? ` · 运单${wbIdx + 1}` : '';
          const allOthersDone = order?.ftlWaybills?.filter((w) => w.id !== confirming.waybillId).every((w) => w.status === 'completed');
          title = `确认签收${vehicleLabel}`;
          message = allOthersDone ? '全部车辆签收完成，确认完结订单？' : '确认该运单卸货完成？';
        } else {
          const key = `${order?.status},${confirming.newStatus}`;
          title = CONFIRM_MESSAGES[key]?.title ?? '确认操作';
          message = CONFIRM_MESSAGES[key]?.message ?? '确认执行此操作？';
        }

        const doComplete = () => {
          if (isFTL && confirming.newStatus === 'completed' && confirming.waybillId) {
            // FTL：读 ftlWaybills，传 waybillId
            const wb = order?.ftlWaybills?.find((w) => w.id === confirming.waybillId);
            if (wb) {
              const idx = getActiveStopIndex(wb.stops);
              if (idx >= 0) {
                useOrderStore.getState().advanceStopStatus(confirming.orderId, wb.stops[idx].id, 'completed', undefined, confirming.waybillId);
                const _updD1 = useOrderStore.getState().orders.find((o) => o.id === confirming.orderId);
                if (_updD1) assertStateConsistency(_updD1);
              }
            }
          } else if (isLTL && confirming.waybillId) {
            // 多车 LTL：只完成当前运单，不要让 updateOrderStatus 把全订单运单都推进
            useOrderStore.getState().updateWaybillStatus(confirming.orderId, confirming.waybillId, 'completed');
            const _updD2a = useOrderStore.getState().orders.find((o) => o.id === confirming.orderId);
            if (_updD2a) assertStateConsistency(_updD2a);
            // 多车场景：让 deriveOrderStatus 派生订单状态，而非直接设 completed
            const compsD2 = _updD2a ? ensureLTLCompartments(_updD2a) : [];
            const platesD2 = compsD2.length ? [...new Set(compsD2.map((c) => c.vehicleId))] : [];
            if (platesD2.length <= 1) {
              // 单车订单：推进到 completed
              updateStatus(confirming.orderId, confirming.newStatus as OrderStatus);
              const _updD2 = useOrderStore.getState().orders.find((o) => o.id === confirming.orderId);
              if (_updD2) assertStateConsistency(_updD2);
            }
            // 多车订单：不调 updateOrderStatus，由 deriveOrderStatus 自动派生（通过上面的 updateWaybillStatus 已触发派生）
          } else if (isLTL && confirming.newStatus === 'in_transit') {
            // LTL 多车：只将选中车辆的运单推进到 in_transit，其他车辆运单保持原状
            const store = useOrderStore.getState();
            const curOrder = store.orders.find((o) => o.id === confirming.orderId);
            const comps3 = curOrder ? ensureLTLCompartments(curOrder) : [];
            const wbs3 = curOrder?.ltlWaybills || [];
            const selPlate4 = (() => {
              if (!comps3.length) return null;
              const p = [...new Set(comps3.map((c) => c.vehicleId))];
              return selectedFtlWbId || p[0] || null;
            })();
            let targetWbIds: string[] = [];
            if (selPlate4 && comps3.length > 0) {
              const vcIds = new Set(comps3.filter((c) => c.vehicleId === selPlate4).map((c) => c.id));
              targetWbIds = wbs3.filter((wb) => wb.compartmentId && vcIds.has(wb.compartmentId)).map((wb) => wb.id);
            }
            if (targetWbIds.length === 0) targetWbIds = wbs3.map((wb) => wb.id);
            store.updateWaybillStatusBatch(confirming.orderId, targetWbIds.map((wbId) => ({ waybillId: wbId, status: 'in_transit' as const })));
            const updated2 = store.orders.find((o) => o.id === confirming.orderId);
            if (updated2) assertStateConsistency(updated2);
            // 演示：30s 后模拟到达取件点（只推进选中车辆）
            setTimeout(() => {
              const store2 = useOrderStore.getState();
              const cur2 = store2.orders.find((o) => o.id === confirming.orderId);
              const comps4 = cur2 ? ensureLTLCompartments(cur2) : [];
              const wbs4 = cur2?.ltlWaybills || [];
              let arriveWbIds: string[] = targetWbIds;
              if (selPlate4 && comps4.length > 0) {
                const vcIds2 = new Set(comps4.filter((c) => c.vehicleId === selPlate4).map((c) => c.id));
                arriveWbIds = wbs4.filter((wb) => wb.compartmentId && vcIds2.has(wb.compartmentId)).map((wb) => wb.id);
              }
              if (arriveWbIds.length === 0) arriveWbIds = wbs4.map((wb) => wb.id);
              store2.updateWaybillStatusBatch(confirming.orderId, arriveWbIds.map((wbId) => ({ waybillId: wbId, status: 'arrived' as const })));
              const updated3 = store2.orders.find((o) => o.id === confirming.orderId);
              if (updated3) {
                const _updD4 = store2.orders.find((o) => o.id === confirming.orderId);
                if (_updD4) assertStateConsistency(_updD4);
              }
            }, 30000);
          } else {
            updateStatus(confirming.orderId, confirming.newStatus as OrderStatus);
            const _updD5 = useOrderStore.getState().orders.find((o) => o.id === confirming.orderId);
            if (_updD5) assertStateConsistency(_updD5);
          }
          if (confirming.newStatus === 'in_transit' && !isLTL) {
            setTimeout(() => {
              useOrderStore.getState().updateOrderStatus(confirming.orderId, 'arrived');
              const _updD6 = useOrderStore.getState().orders.find((o) => o.id === confirming.orderId);
              if (_updD6) assertStateConsistency(_updD6);
            }, 30000);
          }
          setConfirming(null);
        };

        return (
          <ConfirmDialog
            title={title}
            message={message}
            onConfirm={doComplete}
            onCancel={() => setConfirming(null)}
            deliveryMode={isLTL ? 'ltl' : 'full_load'}
            anomaly={isHandover ? {
              onContinue: (note) => {
                const anomalyText = note || (isLTL ? '货物存在异常，继续取件' : '货物存在异常，继续签收');
                if (isFTL && confirming.waybillId) {
                  const wb = order?.ftlWaybills?.find((w) => w.id === confirming.waybillId);
                  if (wb) {
                    const idx = getActiveStopIndex(wb.stops);
                    if (idx >= 0) {
                      const stop = wb.stops[idx];
                      useOrderStore.getState().advanceStopStatus(confirming.orderId, stop.id, 'completed', {
                        id: `HR-${Date.now()}`,
                        type: 'delivery',
                        timestamp: new Date().toISOString(),
                        operatorName: stop.contactName || '未知',
                        anomalyNote: anomalyText,
                      }, confirming.waybillId);
                    }
                  }
                }
                if (isLTL && confirming.waybillId) {
                  useOrderStore.getState().updateWaybillStatus(confirming.orderId, confirming.waybillId, 'completed', anomalyText);
                  updateStatus(confirming.orderId, 'completed' as OrderStatus);
                }
                setConfirming(null);
              },
              onReject: (note) => {
                const anomalyText = note || (isLTL ? '收货方拒绝取件' : '收货方拒绝签收');
                if (isFTL && confirming.waybillId) {
                  const wb = order?.ftlWaybills?.find((w) => w.id === confirming.waybillId);
                  if (wb) {
                    const idx = getActiveStopIndex(wb.stops);
                    if (idx >= 0) {
                      const stop = wb.stops[idx];
                      useOrderStore.getState().advanceStopStatus(confirming.orderId, stop.id, 'exception', {
                        id: `HR-${Date.now()}`,
                        type: 'delivery',
                      timestamp: new Date().toISOString(),
                      operatorName: stop.contactName || '未知',
                      anomalyNote: anomalyText,
                    }, confirming.waybillId);
                  }
                }
              }
                if (isLTL && confirming.waybillId) {
                  useOrderStore.getState().updateWaybillStatus(confirming.orderId, confirming.waybillId, 'exception', anomalyText);
                }
                setConfirming(null);
              },
            } : undefined}
          />
        );
      })()}
    </div>
  );
}
