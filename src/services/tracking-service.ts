/**
 * 追踪接口服务
 * MVP阶段使用Mock数据，后续替换为真实API调用（含WebSocket推送）
 */

import { apiClient } from './api-client';
import type { TrackingInfo } from '@/types';

const ENDPOINTS = {
  TRACKING: '/api/tracking',
  VEHICLE_LOCATION: '/api/tracking/vehicle-location',
} as const;

export const trackingService = {
  /** 获取追踪信息 */
  async getTrackingInfo(orderId: string): Promise<TrackingInfo | null> {
    // TODO: 替换为真实API
    // const res = await apiClient.get<TrackingInfo>(`${ENDPOINTS.TRACKING}/${orderId}`);
    // return res.data;
    return null;
  },

  /** 获取车辆实时位置（后续可替换为WebSocket） */
  async getVehicleLocation(orderId: string): Promise<{ lat: number; lng: number } | null> {
    // TODO: 替换为WebSocket实时推送
    // const res = await apiClient.get(`${ENDPOINTS.VEHICLE_LOCATION}/${orderId}`);
    // return res.data;
    return null;
  },
};
