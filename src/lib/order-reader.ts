/**
 * 订单数据读取器 — 权威读取入口。
 *
 * 所有组件需要从 Order 中取数据时，应通过此模块的函数读取，
 * 不再各自实现 fallback 链。
 *
 * 规则：
 * - FTL 优先读取 ftlWaybills，无则 fallback stops，再 fallback ltlWaybills
 * - LTL 优先读取 ltlWaybills
 * - 每个函数内部处理所有兼容逻辑，调用方只需传入 order
 */

import type { Order, RouteStop, FTLWaybill, LTLWaybill } from '@/types';
import { stopStatus, getActiveStopIndex } from '@/components/shared/stop-utils';

// ── 经停点 ──

/** 获取订单的有效经停点列表 */
export function getOrderStops(order: Order): RouteStop[] {
  // FTL：优先 ftlWaybills，汇总所有运单的 stops
  if (order.ftlWaybills?.length) {
    return order.ftlWaybills.flatMap((wb) => wb.stops);
  }
  // LTL：ltlWaybills 没有经停点概念，返回空
  return [];
}

/** 获取某个 FTL 运单的经停点 */
export function getFTLWaybillStops(
  order: Order,
  waybillId: string,
): RouteStop[] {
  const wb = order.ftlWaybills?.find((w) => w.id === waybillId);
  return wb?.stops ?? [];
}

// ── 运单 ──

/** 获取 FTL 运单列表 */
export function getFTLWaybills(order: Order): FTLWaybill[] {
  return order.ftlWaybills ?? [];
}

/** 获取 LTL 运单列表 */
export function getLTLWaybills(order: Order): LTLWaybill[] {
  return order.ltlWaybills ?? [];
}

/** 获取活跃的 FTL 运单（未完成的） */
export function getActiveFTLWaybills(order: Order): FTLWaybill[] {
  return (order.ftlWaybills ?? []).filter(
    (wb) => wb.status !== 'completed' && wb.status !== 'exception',
  );
}

// ── 地址 ──

/** 获取订单起止地址 */
export function getOrderAddresses(order: Order): {
  origin: string;
  destination: string;
} {
  // FTL
  if (order.ftlWaybills?.length) {
    const firstWb = order.ftlWaybills[0];
    const pu = firstWb.stops.find((s) => s.type === 'pickup');
    const de = firstWb.stops
      .filter((s) => s.type === 'delivery')
      .pop();
    return {
      origin: pu?.address || '发货地',
      destination: de?.address || '收货地',
    };
  }
  // LTL
  if (order.ltlWaybills?.length) {
    return {
      origin: order.ltlWaybills[0]?.pickupAddress || '投件点',
      destination:
        order.ltlWaybills[order.ltlWaybills.length - 1]?.deliveryAddress || '取件点',
    };
  }
  // 旧字段
  return {
    origin:
      typeof order.senderAddress === 'string'
        ? order.senderAddress
        : order.senderAddress?.address || '发货地',
    destination:
      typeof order.receiverAddress === 'string'
        ? order.receiverAddress
        : order.receiverAddress?.address || '收货地',
  };
}

// ── 摘要 ──

/** 获取订单摘要文本（首页/追踪页标题用） */
export function getOrderSummary(order: Order): string {
  if (order.serviceType === 'logistics') {
    // LTL
    if (order.deliveryMode === 'ltl' && order.ltlWaybills?.length) {
      const carCount = order.compartments?.length
        ? new Set(order.compartments.map((c) => c.vehicleId)).size
        : 1;
      return `${order.ltlWaybills.length}张运单 · ${carCount}车`;
    }
    // FTL
    if (order.ftlWaybills?.length) {
      const n = order.ftlWaybills.length;
      const firstWb = order.ftlWaybills[0];
      const pu = firstWb.stops.find((s) => s.type === 'pickup');
      const de = firstWb.stops.find((s) => s.type === 'delivery');
      const prefix = n > 1 ? `${n}车 · ` : '';
      return `${prefix}${pu?.address?.slice(0, 8) ?? '--'} → ${de?.address?.slice(0, 8) ?? '--'}`;
    }
    // 旧字段
    const from =
      typeof order.senderAddress === 'object'
        ? order.senderAddress?.address
        : order.senderAddress;
    const to =
      typeof order.receiverAddress === 'object'
        ? order.receiverAddress?.address
        : order.receiverAddress;
    return `${from ?? '--'} → ${to ?? '--'}`;
  }

  if (
    order.serviceType === 'vending' ||
    order.serviceType === 'security'
  ) {
    return order.pickupLocation ?? '--';
  }
  return '--';
}

// ── 状态查询 ──

/** 订单是否有活跃操作（有待处理的 stop 或 waybill） */
export function hasActiveAction(order: Order): boolean {
  // FTL
  if (order.ftlWaybills?.length) {
    return order.ftlWaybills.some((wb) => {
      if (wb.status === 'completed' || wb.status === 'exception') return false;
      const ai = getActiveStopIndex(wb.stops);
      if (ai < 0) return false;
      const ss = stopStatus(wb.stops[ai]);
      return ss === 'arrived' || ss === 'in_progress';
    });
  }
  // LTL
  if (order.ltlWaybills?.length) {
    return order.ltlWaybills.some(
      (w) => w.status !== 'completed' && w.status !== 'exception',
    );
  }
  return false;
}
