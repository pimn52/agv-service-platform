import type { RouteStop, StopStatus } from '@/types';

/** 安全读取经停点状态，未设置时默认 pending */
export function stopStatus(s: RouteStop): StopStatus {
  return s.stopStatus || 'pending';
}

/** 找到第一个未完成的经停点索引（跳过 completed/skipped），全部完成返回 -1 */
export function getActiveStopIndex(stops: RouteStop[]): number {
  return stops.findIndex((s) => {
    const ss = stopStatus(s);
    return ss !== 'completed' && ss !== 'skipped';
  });
}

/** 经停点是否已完成 */
export function isStopCompleted(s: RouteStop): boolean {
  return stopStatus(s) === 'completed';
}

/** 统计指定状态的经停点数量 */
export function countStopsByStatus(stops: RouteStop[], status: StopStatus): number {
  return stops.filter((s) => stopStatus(s) === status).length;
}

/** 当前卸货站序号（已完成/已跳过 delivery 数 + 1） */
export function getCurrentDeliveryNumber(stops: RouteStop[]): number {
  return stops.filter((s) => {
    if (s.type !== 'delivery') return false;
    const ss = stopStatus(s);
    return ss === 'completed' || ss === 'skipped';
  }).length + 1;
}

/** 所有经停点是否全部完成 */
export function areAllStopsCompleted(stops: RouteStop[]): boolean {
  return stops.every((s) => isStopCompleted(s));
}
