/**
 * 订单接口服务
 * MVP阶段使用Mock数据，后续替换为真实API调用
 */

import { apiClient } from './api-client';
import type { Order, CostBreakdown } from '@/types';

// 预留API端点
const ENDPOINTS = {
  LIST: '/api/orders',
  DETAIL: '/api/orders',
  CREATE: '/api/orders',
  CANCEL: '/api/orders',
  CALCULATE_COST: '/api/orders/calculate-cost',
} as const;

export const orderService = {
  /** 获取订单列表 */
  async getOrders(params?: { status?: string; serviceType?: string }): Promise<Order[]> {
    // TODO: 替换为真实API
    // const res = await apiClient.get<Order[]>(ENDPOINTS.LIST, params);
    // return res.data;
    return [];
  },

  /** 获取订单详情 */
  async getOrderById(id: string): Promise<Order | null> {
    // TODO: 替换为真实API
    // const res = await apiClient.get<Order>(`${ENDPOINTS.DETAIL}/${id}`);
    // return res.data;
    return null;
  },

  /** 创建订单 */
  async createOrder(data: Partial<Order>): Promise<Order> {
    // TODO: 替换为真实API
    // const res = await apiClient.post<Order>(ENDPOINTS.CREATE, data);
    // return res.data;
    return {} as Order;
  },

  /** 取消订单 */
  async cancelOrder(id: string): Promise<boolean> {
    // TODO: 替换为真实API
    // const res = await apiClient.put(`${ENDPOINTS.CANCEL}/${id}/cancel`);
    // return res.success;
    return true;
  },

  /** 计算运费 */
  async calculateCost(data: Record<string, unknown>): Promise<CostBreakdown> {
    // TODO: 替换为真实API
    // const res = await apiClient.post<CostBreakdown>(ENDPOINTS.CALCULATE_COST, data);
    // return res.data;
    return { baseFee: 0, distanceFee: 0, insuranceFee: 0, totalAmount: 0, total: 0 };
  },
};
