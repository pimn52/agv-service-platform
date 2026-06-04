/**
 * 订单状态变更 — 统一入口。
 *
 * 核心原则：物流配送场景下，order.status 必须从底层数据（stops/waybills）派生，
 * 绝不直接设置。非物流服务（贩卖/安防）允许直接设置。
 *
 * 使用方法：
 *   const next = applyMutation(order, { type: 'advance_stop', stopId, newStatus, waybillId });
 *   // next 是一个新 Order 对象，order 不变
 */

import type {
  Order,
  OrderStatus,
  StopStatus,
  FTLWaybill,
  WaybillStatus,
  HandoverRecord,
  LTLWaybill,
  Compartment,
} from '@/types';

import { stopStatus, getActiveStopIndex } from '@/components/shared/stop-utils';

// ── Action 类型 ──

export type OrderAction =
  | {
      type: 'advance_stop';
      stopId: string;
      newStatus: StopStatus;
      waybillId?: string;
      handover?: HandoverRecord;
    }
  | {
      type: 'update_waybill';
      waybillId: string;
      status: WaybillStatus;
      anomalyNote?: string;
    }
  | {
      type: 'set_status';
      status: OrderStatus;
    };

// ── 主入口 ──

/**
 * 对订单应用一个状态变更动作，返回新订单（不可变更新）。
 * 此函数为纯函数，不访问 store，无副作用。
 */
export function applyMutation(order: Order, action: OrderAction): Order {
  switch (action.type) {
    case 'advance_stop':
      return applyAdvanceStop(order, action);
    case 'update_waybill':
      return applyUpdateWaybill(order, action);
    case 'set_status':
      return { ...order, status: action.status, updatedAt: new Date().toISOString() };
    default:
      return order;
  }
}

// ── advance_stop 实现 ──

function applyAdvanceStop(
  order: Order,
  action: Extract<OrderAction, { type: 'advance_stop' }>,
): Order {
  const now = new Date().toISOString();
  const { stopId, newStatus, waybillId, handover } = action;

  // 路径 A：FTL 运单模式
  if (waybillId && order.ftlWaybills) {
    const updatedWbs = order.ftlWaybills.map((wb) => {
      if (wb.id !== waybillId) return wb;

      const updatedStops = wb.stops.map((s) => {
        if (s.id !== stopId) return s;
        const current = stopStatus(s);
        // 已完成/已跳过的 stop 不允许回退（除非显式设相同状态）
        if (
          (current === 'completed' || current === 'skipped') &&
          newStatus !== current
        ) {
          return s;
        }
        // 交接记录
        const autoRecord: HandoverRecord | undefined =
          handover ??
          (newStatus === 'completed'
            ? {
                id: `HR-${Date.now()}`,
                type: s.type === 'pickup' ? 'pickup' : 'delivery',
                timestamp: now,
                operatorName: s.contactName || '未知',
              }
            : undefined);
        const records = autoRecord
          ? [...(s.handoverRecords || []), autoRecord]
          : s.handoverRecords;
        return { ...s, stopStatus: newStatus, handoverRecords: records };
      });

      const allDone = updatedStops.every(
        (s) => stopStatus(s) === 'completed',
      );
      const hasEx = updatedStops.some(
        (s) => stopStatus(s) === 'exception',
      );
      const wbStatus: FTLWaybill['status'] = allDone
        ? 'completed'
        : hasEx
          ? 'exception'
          : 'in_progress';

      return {
        ...wb,
        stops: updatedStops,
        status: wbStatus,
        updatedAt: now,
        ...(wbStatus === 'completed' ? { completedAt: now } : {}),
      };
    });

    const newStatus2 = deriveOrderStatusFromWbs(updatedWbs);
    return { ...order, ftlWaybills: updatedWbs, status: newStatus2, updatedAt: now };
  }

  // 无 FTL 运单 → 保持当前状态不变
  return order;
}

// ── update_waybill 实现 ──

/**
 * LTL 运单状态转换白名单。
 *
 * 运单生命周期经历两次到达（投件点 + 取件点），'arrived' 状态出现两次：
 *   1. assigned → arrived：车辆到达投件点
 *   2. arrived → loaded：用户投件装货
 *   3. loaded → in_transit：车辆发车运输
 *   4. in_transit → arrived：车辆到达取件点
 *   5. arrived → completed：用户取件完成
 * 异常可在 loaded / in_transit / arrived 任意阶段触发。
 *
 * 上下文校验：
 *   - arrived → loaded 仅当运单无 pickup 交接记录（首次到达投件点）
 *   - arrived → completed 仅当运单已有 pickup 交接记录（已投件，到达取件点）
 */
const VALID_WAYBILL_TRANSITIONS: Record<WaybillStatus, Partial<Record<WaybillStatus, (wb: LTLWaybill) => boolean>>> = {
  created: {
    assigned: () => true,
    arrived: () => true,   // 车辆到达投件点（demo 定时器直接从创建推进）
  },
  assigned: {
    arrived: () => true,
  },
  loaded: {
    in_transit: () => true,
    exception: () => true,
  },
  in_transit: {
    arrived: () => true,
    exception: () => true,
  },
  arrived: {
    loaded: (wb) => {
      // 仅首次到达投件点（无投件记录）时允许
      const hasPickup = (wb.handoverRecords || []).some((r) => r.type === 'pickup');
      return !hasPickup;
    },
    completed: (wb) => {
      // 仅已有投件记录（到达取件点）时允许
      const hasPickup = (wb.handoverRecords || []).some((r) => r.type === 'pickup');
      return hasPickup;
    },
    exception: () => true,
  },
  completed: {},
  exception: {
    arrived: () => true,   // 人工恢复异常 → 回到当前站点重新操作
  },
};

function applyUpdateWaybill(
  order: Order,
  action: Extract<OrderAction, { type: 'update_waybill' }>,
): Order {
  const now = new Date().toISOString();
  const { waybillId, status, anomalyNote } = action;

  if (!order.ltlWaybills) return order;

  const existingWb = order.ltlWaybills.find((w) => w.id === waybillId);
  if (!existingWb) return order;

  // 状态转换白名单校验
  const currentStatus = existingWb.status || 'created';
  if (currentStatus === status) {
    // 同状态不更新，避免无效渲染
    return order;
  }
  const allowedNext = VALID_WAYBILL_TRANSITIONS[currentStatus];
  const guard = allowedNext?.[status];
  if (!guard || !guard(existingWb)) {
    console.warn(
      `[运单状态机] 非法转换拒绝: ${waybillId} ${currentStatus} → ${status}` +
      `（订单 ${order.id}）。运单当前交接记录:`,
      existingWb.handoverRecords?.map((r) => `${r.type}`),
    );
    return order;
  }

  const updatedWaybills = order.ltlWaybills.map((w) => {
    if (w.id !== waybillId) return w;

    // 交接记录：loaded(投件) / completed(取件) / exception(异常) 均生成
    const shouldRecord = status === 'loaded' || status === 'completed' || status === 'exception';
    const autoRecord: HandoverRecord | undefined = shouldRecord
      ? {
          id: `HR-${Date.now()}`,
          type: status === 'loaded' ? 'pickup' : 'delivery',
          timestamp: now,
          operatorName: status === 'loaded' ? (w.pickupContactName || '未知') : (w.deliveryContactName || w.pickupContactName || '未知'),
          anomalyNote: anomalyNote || undefined,
        }
      : undefined;
    const records = autoRecord
      ? [...(w.handoverRecords || []), autoRecord]
      : w.handoverRecords;

    return { ...w, status, handoverRecords: records, updatedAt: now };
  });

  return { ...order, ltlWaybills: updatedWaybills, updatedAt: now };
}

// ── 状态派生 ──

/** 从 FTL 运单列表推导订单状态 */
function deriveOrderStatusFromWbs(wbs: FTLWaybill[]): OrderStatus {
  const allDone = wbs.every((wb) => wb.status === 'completed');
  if (allDone) return 'completed';

  const hasException = wbs.some((wb) => wb.status === 'exception');

  const activeWb = wbs.find((wb) => wb.status === 'in_progress');
  if (activeWb) {
    const ai = getActiveStopIndex(activeWb.stops);
    const as = ai >= 0 ? activeWb.stops[ai] : null;
    if (!as) {
      const anyCompleted = activeWb.stops.some(
        (s) => stopStatus(s) === 'completed',
      );
      return anyCompleted ? 'in_transit' : 'dispatched';
    }
    const ss = stopStatus(as);
    if (ss === 'arrived') return 'arrived';
    if (ss === 'in_progress')
      return as.type === 'pickup' ? 'loading' : 'unloading';
    if (ss === 'exception') return 'arrived';
    const anyCompleted = activeWb.stops.some(
      (s) => stopStatus(s) === 'completed',
    );
    return anyCompleted ? 'in_transit' : 'dispatched';
  }

  return hasException ? 'arrived' : 'dispatched';
}

/**
 * 从 LTL 运单列表推导订单状态。多车时按车辆分组取"最紧急"状态。
 *
 * LTL 运单状态 → 订单状态映射（优先级从高到低）：
 *   completed(全部) → completed
 *   completed(部分) → picked_up（部分已取件，还有运单待取）
 *   arrived         → arrived（车辆到达停车点，等待操作：全部投件完成待发车，或到达取件点）
 *   picking_up      → picking_up（投件进行中：部分运单已投件，仍有运单待投）
 *   in_transit      → in_transit（运输中）
 *   assigned        → dispatched（已分配格口，车辆调度中）
 *
 * 核心规则：
 *   - 'completed' 仅在全部运单完成时映射到 'completed'
 *   - 部分完成时映射到 'picked_up'（取件中）
 *   - 部分投件（loaded + assigned/arrived-at-pickup 混合）→ 'picking_up'（投件中）
 *   - 全部投件完成（全部 loaded）→ 'arrived'（待发车）
 */
function deriveOrderStatusFromLtlWbs(wbs: LTLWaybill[], comps?: Compartment[]): OrderStatus {
  if (wbs.length === 0) return 'pending';

  const PRIORITY = ['completed', 'picked_up', 'arrived', 'picking_up', 'in_transit', 'dispatched'] as const;
  type PriorityStatus = (typeof PRIORITY)[number];

  /** 运单是否还在投件前阶段（尚未被投件过） */
  const isPreLoaded = (wb: LTLWaybill): boolean => {
    if (wb.status === 'assigned' || wb.status === 'created') return true;
    // arrived 状态需区分是投件点到达还是取件点到达
    if (wb.status === 'arrived') {
      const hasPickup = (wb.handoverRecords || []).some((r) => r.type === 'pickup');
      return !hasPickup; // 无投件记录 = 仍在投件点等待投件
    }
    return false;
  };

  const plates = comps?.length
    ? [...new Set(comps.map((c) => c.vehicleId))]
    : [];

  const groupStatus = (group: LTLWaybill[]): PriorityStatus => {
    if (group.length === 0) return 'dispatched';

    const allDone = group.every((wb) => wb.status === 'completed');
    if (allDone) return 'completed';

    // 部分完成 → picked_up（取件中）
    const hasCompleted = group.some((wb) => wb.status === 'completed');

    // 部分已投件但仍有权重状态的运单 → picking_up（投件进行中）
    const hasLoaded = group.some((wb) => wb.status === 'loaded');
    const hasPreLoadedWb = group.some(isPreLoaded);
    if (hasLoaded && hasPreLoadedWb) return 'picking_up';

    let worst: PriorityStatus = 'dispatched';
    for (const wb of group) {
      let s: PriorityStatus;
      switch (wb.status) {
        case 'completed': s = hasCompleted && !allDone ? 'picked_up' : 'completed'; break;
        case 'arrived': s = 'arrived'; break;
        case 'in_transit': s = 'in_transit'; break;
        case 'loaded': s = 'arrived'; break;  // 全部投件完成，待发车（hasPreLoadedWb 已在上面拦截）
        case 'exception': s = 'arrived'; break;  // 异常运单阻塞订单推进，需人工处理
        default: s = 'dispatched'; break;     // assigned / created / undefined
      }
      if (PRIORITY.indexOf(s) < PRIORITY.indexOf(worst)) worst = s;
    }
    return worst;
  };

  if (plates.length > 1 && comps) {
    // 多车：只有全部车辆完成才返回 completed，否则取未完成车辆中最紧急的状态
    let allVehiclesDone = true;
    let worstFromIncomplete: PriorityStatus = 'dispatched';
    for (const plate of plates) {
      const vcIds = new Set(comps.filter((c) => c.vehicleId === plate).map((c) => c.id));
      const vWbs = wbs.filter((wb) => wb.compartmentId && vcIds.has(wb.compartmentId));
      if (vWbs.length === 0) continue;
      const s = groupStatus(vWbs);
      if (s !== 'completed') {
        allVehiclesDone = false;
        if (PRIORITY.indexOf(s) < PRIORITY.indexOf(worstFromIncomplete)) worstFromIncomplete = s;
      }
    }
    if (allVehiclesDone) return 'completed';
    return worstFromIncomplete;
  }

  return groupStatus(wbs);
}

/** 公开的状态派生函数，供外部需要时使用 */
export function deriveOrderStatus(order: Order): OrderStatus {
  if (order.ftlWaybills?.length) {
    return deriveOrderStatusFromWbs(order.ftlWaybills);
  }
  if (order.ltlWaybills?.length) {
    return deriveOrderStatusFromLtlWbs(order.ltlWaybills, order.compartments);
  }
  // 非物流：维持当前状态不变
  return order.status;
}

/**
 * 派生 atPickup。
 * 仅当 order.status === 'arrived' 时有意义，其他状态返回 null。
 *
 * 推导策略（按优先级）：
 *   1. 运单当前为 loaded → true（正在投件点装货）
 *   2. 运单当前为 in_transit → false（已离开投件点）
 *   3. 运单均为 arrived 时通过交接记录区分：
 *      - 有投件记录 → false（第二次到达取件点）
 *      - 无投件记录 → true（首次到达投件点）
 *   4. 兜底 → true
 */
export function resolveAtPickup(order: Order): boolean | null {
  if (order.status !== 'arrived') return null;

  const wbs = order.ltlWaybills || [];
  if (wbs.length === 0) return true;

  // 运单正在装货 → 投件点
  if (wbs.some((wb) => wb.status === 'loaded')) return true;
  // 运单正在运输 → 已离开投件点
  if (wbs.some((wb) => wb.status === 'in_transit')) return false;
  // 运单均为 arrived 时：通过交接记录判断第几次到达
  const hasPickupRecord = wbs.some((wb) =>
    (wb.handoverRecords || []).some((r) => r.type === 'pickup'),
  );
  if (hasPickupRecord) return false; // 已投件过 → 取件点
  // 无投件记录 → 投件点（兜底）
  return true;
}

/** 运行时验证状态一致性（仅 dev 模式生效） */
export function assertStateConsistency(order: Order): void {
  if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'development') return;
  const derived = deriveOrderStatus(order);
  if (derived !== order.status) {
    console.warn(
      `[状态不一致] ${order.id}: 存储=${order.status} 推导=${derived}`,
      order.ltlWaybills?.map((w) => `${w.id}:${w.status}`),
    );
  }
}
