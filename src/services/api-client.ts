/**
 * API 客户端封装
 * MVP阶段所有请求走Mock数据，后续只需替换baseURL和启用真实请求即可
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown>;
  params?: Record<string, string>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', data, params } = options;

    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    // MVP阶段：返回模拟成功响应
    // 后续替换为真实fetch请求
    console.log(`[API] ${method} ${url}`, data ?? '');

    return {
      success: true,
      data: {} as T,
      message: 'MVP mock response',
    };
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET', params });
  }

  async post<T>(path: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'POST', data });
  }

  async put<T>(path: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'PUT', data });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE);
