import type { Order } from '@/types';
import { getOrderAddresses } from '@/lib/order-reader';

export { getOrderSummary } from '@/lib/order-reader';

/** 获取订单来源/目的地址（委托给 order-reader） */
export function getLogisticsAddresses(order: Order): { srcAddr: string; dstAddr: string } {
  const { origin, destination } = getOrderAddresses(order);
  return { srcAddr: origin, dstAddr: destination };
}
