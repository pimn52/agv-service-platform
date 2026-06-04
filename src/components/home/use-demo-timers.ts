import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { Order, StopStatus } from '@/types';
import type { LocalNotification } from './order-dynamics.types';
import { useOrderStore } from '@/store';
import { stopStatus } from '@/components/shared/stop-utils';
import { assertStateConsistency } from '@/lib/order-mutator';

/** dispatched → arrived 演示延时（毫秒），关联 payment-result-page 提示文案 */
export const DEMO_DISPATCH_FTL_MS = 5000
export const DEMO_DISPATCH_LTL_MS = 10000

/**
 * 演示模式定时器：模拟平台智能调度。
 *
 * 自动触发规则：
 * - dispatched→arrived：整车 8s / 散件 10s（模拟车辆到达）
 *   - 整车：找到第一个 pending 经停点，advanceStopStatus→arrived
 *   - 散件：updateOrderStatus→arrived（走 waybill 状态机）
 * - 收货人不在自动跳过：卸货点 arrived 15s 警告，20s 自动跳过
 * - 路线优化通知：in_transit 后 1min
 * - 即将到达通知：in_transit 后 3min
 *
 * 其余状态转换（装货/卸货/投件/取件）必须由用户点击按钮触发。
 */
export function useDemoTimers(
  orders: Order[],
  updateOrderStatus: (id: string, status: import('@/types').OrderStatus) => void,
  getLogisticsAddresses: (order: Order) => { srcAddr: string; dstAddr: string },
  setNotifications: Dispatch<SetStateAction<LocalNotification[]>>,
) {
  useEffect(() => {
    if (orders.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // 1. dispatched → arrived
    const dispatchedOrders = orders.filter((o) => o.status === 'dispatched');
    dispatchedOrders.forEach((order) => {
      const isFTL = order.deliveryMode === 'full_load';
      timers.push(setTimeout(() => {
        if (isFTL) {
          const liveOrder = useOrderStore.getState().orders.find((o) => o.id === order.id);
          // FTL：优先读 ftlWaybills（新），fallback stops（旧兼容）
          const ftlWbs = liveOrder?.ftlWaybills;
          if (ftlWbs?.length) {
            // 遍历所有运单，各自推进第一个 pending stop（多车同时发车）
            ftlWbs.forEach((wb) => {
              if ((wb.status || 'in_progress') === 'completed') return;
              const firstPending = wb.stops.find((s) => stopStatus(s) === 'pending');
              if (firstPending) {
                useOrderStore.getState().advanceStopStatus(order.id, firstPending.id, 'arrived' as StopStatus, undefined, wb.id);
              }
            });
          } else if (liveOrder?.stops?.length) {
            const liveStops = liveOrder.stops;
            const firstPending = liveStops.find((s) => stopStatus(s) === 'pending');
            if (firstPending) {
              useOrderStore.getState().advanceStopStatus(order.id, firstPending.id, 'arrived' as StopStatus);
            }
          }
        } else if (order.deliveryMode === 'ltl' && order.ltlWaybills?.length) {
          // LTL：按运单粒度推进，确保走运单状态机 + deriveOrderStatus 自动跟单
          const liveOrder = useOrderStore.getState().orders.find((o) => o.id === order.id);
          liveOrder?.ltlWaybills?.forEach((wb) => {
            if (wb.status !== 'exception') {
              useOrderStore.getState().updateWaybillStatus(order.id, wb.id, 'arrived');
            }
          });
          const updatedDemo = useOrderStore.getState().orders.find((o) => o.id === order.id);
          if (updatedDemo) assertStateConsistency(updatedDemo);
        } else {
          // 贩卖/安防：直接推进订单状态
          updateOrderStatus(order.id, 'arrived');
          const updatedDemo = useOrderStore.getState().orders.find((o) => o.id === order.id);
          if (updatedDemo) assertStateConsistency(updatedDemo);
        }
      }, isFTL ? DEMO_DISPATCH_FTL_MS : DEMO_DISPATCH_LTL_MS));
    });

    return () => timers.forEach(clearTimeout);
  }, [orders, updateOrderStatus, getLogisticsAddresses, setNotifications]);

  // 通知类定时器：仅首次触发一次（不受 orders 变化影响）
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // 路线优化通知（1min 后，仅触发一次）
    timers.push(setTimeout(() => {
      setNotifications((prev) => [{
        id: 'demo-route-opt',
        type: 'general',
        orderId: '',
        message: '智能调度已自动优化路线，预计提前到达，全程无需人工干预',
        dismissed: false,
        postponed: false,
      }, ...prev]);
    }, 60000));

    // 即将到达通知（3min 后，仅触发一次）
    timers.push(setTimeout(() => {
      setNotifications((prev) => [{
        id: 'demo-arriving',
        type: 'general',
        orderId: '',
        message: '车辆即将到达目的地，请准备卸货签收',
        dismissed: false,
        postponed: false,
      }, ...prev]);
    }, 180000));

    return () => timers.forEach(clearTimeout);
  }, [setNotifications]);

  // ── 收货人不在 · 自动跳过 ──
  // 当车辆到达卸货点（atPickup===false），15s 内无人点击"开始卸货"→ 警告
  // 20s 仍无响应 → 自动跳过该站，生成"无人接收"异常记录，发车前往下一站
  const deliveryArrivalTimersRef = useRef<
    Map<string, { warnTimer: ReturnType<typeof setTimeout>; skipTimer: ReturnType<typeof setTimeout> }>
  >(new Map());

  useEffect(() => {
    if (orders.length === 0) return;

    const currentTimedStopIds = new Set<string>();

    orders.forEach((order) => {
      if (order.deliveryMode !== 'full_load') return;
      const liveOrder = useOrderStore.getState().orders.find((o) => o.id === order.id);

      // FTL：优先读 ftlWaybills（新），fallback stops（旧兼容）
      const ftlWbs = liveOrder?.ftlWaybills;
      const stopsToCheck: { stop: import('@/types').RouteStop; waybillId: string }[] = [];

      if (ftlWbs?.length) {
        ftlWbs.forEach((wb) => {
          if (wb.status === 'completed') return;
          const activeIdx = wb.stops.findIndex((s) => {
            const ss = stopStatus(s);
            return ss !== 'completed' && ss !== 'skipped';
          });
          if (activeIdx >= 0) {
            const s = wb.stops[activeIdx];
            if (stopStatus(s) === 'arrived' && s.type === 'delivery') {
              stopsToCheck.push({ stop: s, waybillId: wb.id });
            }
          }
        });
      } else if (liveOrder?.stops?.length) {
        const activeIdx = liveOrder.stops.findIndex((s) => {
          const ss = stopStatus(s);
          return ss !== 'completed' && ss !== 'skipped';
        });
        if (activeIdx >= 0) {
          const s = liveOrder.stops[activeIdx];
          if (stopStatus(s) === 'arrived' && s.type === 'delivery') {
            stopsToCheck.push({ stop: s, waybillId: '' });
          }
        }
      }

      if (stopsToCheck.length === 0) return;

      stopsToCheck.forEach(({ stop: activeStop, waybillId: wbId }) => {
        currentTimedStopIds.add(activeStop.id);
        if (deliveryArrivalTimersRef.current.has(activeStop.id)) return;

        const stopName = activeStop.address;

        // 30s 警告（演示节奏不要太快）
        const warnTimer = setTimeout(() => {
          const curOrder = useOrderStore.getState().orders.find((o) => o.id === order.id);
          const curStop = wbId
            ? curOrder?.ftlWaybills?.find((w) => w.id === wbId)?.stops?.find((s) => s.id === activeStop.id)
            : curOrder?.stops?.find((s) => s.id === activeStop.id);
          if (!curStop || stopStatus(curStop) !== 'arrived') return;

          setNotifications((prev) => [
            {
              id: `warn-recipient-${order.id}-${activeStop.id}`,
              type: 'special',
              orderId: order.id,
              message: `${stopName} 无人接收，20秒后将自动跳过`,
              dismissed: false,
              postponed: false,
            },
            ...prev,
          ]);
        }, 20000);

        // 40s 自动跳过（警告 20s + 等待 20s）
        const skipTimer = setTimeout(() => {
          const curOrder2 = useOrderStore.getState().orders.find((o) => o.id === order.id);
          const curStop2 = wbId
            ? curOrder2?.ftlWaybills?.find((w) => w.id === wbId)?.stops?.find((s) => s.id === activeStop.id)
            : curOrder2?.stops?.find((s) => s.id === activeStop.id);
          if (!curStop2 || stopStatus(curStop2) !== 'arrived') {
            deliveryArrivalTimersRef.current.delete(activeStop.id);
            return;
          }

          useOrderStore.getState().advanceStopStatus(order.id, activeStop.id, 'skipped' as StopStatus, {
            id: `HR-${Date.now()}`,
            type: 'delivery',
            timestamp: new Date().toISOString(),
            operatorName: activeStop.contactName || '系统',
            anomalyNote: '无人接收',
          }, wbId || undefined);

          deliveryArrivalTimersRef.current.delete(activeStop.id);

          // 3s 后到达下一站（模拟行驶）
          setTimeout(() => {
            const afterOrder = useOrderStore.getState().orders.find((o) => o.id === order.id);
            const afterStops = wbId
              ? afterOrder?.ftlWaybills?.find((w) => w.id === wbId)?.stops || []
              : afterOrder?.stops || [];
            const nextIdx = afterStops.findIndex((s) => {
              const ss = stopStatus(s);
              return ss !== 'completed' && ss !== 'skipped';
            });

            const nextStopName = nextIdx >= 0 ? afterStops[nextIdx].address : '终点';

            setNotifications((prev) => [
              {
                id: `skip-recipient-${order.id}-${activeStop.id}`,
                type: 'special',
                orderId: order.id,
                message: `${stopName} 已跳过，车辆前往${nextStopName}`,
                dismissed: false,
                postponed: false,
              },
              ...prev,
            ]);

            if (nextIdx >= 0 && afterStops[nextIdx]) {
              useOrderStore.getState().advanceStopStatus(order.id, afterStops[nextIdx].id, 'arrived', undefined, wbId || undefined);
            }
          }, 3000);
        }, 40000);

      deliveryArrivalTimersRef.current.set(activeStop.id, { warnTimer, skipTimer });
    });
    });

    // 清理已不处于 arrived 状态的 stop 的定时器
    deliveryArrivalTimersRef.current.forEach((timers, stopId) => {
      if (!currentTimedStopIds.has(stopId)) {
        clearTimeout(timers.warnTimer);
        clearTimeout(timers.skipTimer);
        deliveryArrivalTimersRef.current.delete(stopId);
      }
    });
  }, [orders, setNotifications]);

  // 卸载时清理所有到达超时定时器
  useEffect(() => {
    const ref = deliveryArrivalTimersRef.current;
    return () => {
      ref.forEach(({ warnTimer, skipTimer }) => {
        clearTimeout(warnTimer);
        clearTimeout(skipTimer);
      });
      ref.clear();
    };
  }, []);
}
