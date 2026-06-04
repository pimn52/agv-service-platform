/**
 * 用户接口服务
 * MVP阶段使用Mock数据，后续替换为真实API调用
 */

import { apiClient } from './api-client';
import type { User, InvoiceInfo } from '@/types';

const ENDPOINTS = {
  PROFILE: '/api/user/profile',
  RECHARGE: '/api/user/recharge',
  INVOICES: '/api/user/invoices',
  LOGIN: '/api/user/login',
  LOGOUT: '/api/user/logout',
} as const;

export const userService = {
  /** 获取用户信息 */
  async getProfile(): Promise<User | null> {
    // TODO: 替换为真实API
    // const res = await apiClient.get<User>(ENDPOINTS.PROFILE);
    // return res.data;
    return null;
  },

  /** 更新用户信息 */
  async updateProfile(data: Partial<User>): Promise<boolean> {
    // TODO: 替换为真实API
    // const res = await apiClient.put(ENDPOINTS.PROFILE, data);
    // return res.success;
    return true;
  },

  /** 充值 */
  async recharge(amount: number): Promise<{ balance: number }> {
    // TODO: 替换为真实API
    // const res = await apiClient.post(ENDPOINTS.RECHARGE, { amount });
    // return res.data;
    return { balance: 0 };
  },

  /** 获取发票列表 */
  async getInvoices(): Promise<InvoiceInfo[]> {
    // TODO: 替换为真实API
    // const res = await apiClient.get<InvoiceInfo[]>(ENDPOINTS.INVOICES);
    // return res.data;
    return [];
  },

  /** 登录 */
  async login(phone: string, code: string): Promise<User> {
    // TODO: 替换为真实API
    // const res = await apiClient.post<User>(ENDPOINTS.LOGIN, { phone, code });
    // return res.data;
    return {} as User;
  },

  /** 登出 */
  async logout(): Promise<boolean> {
    // TODO: 替换为真实API
    // const res = await apiClient.post(ENDPOINTS.LOGOUT);
    // return res.success;
    return true;
  },
};
