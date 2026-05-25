import type { AxiosRequestConfig } from 'axios';
import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

/**
 * Typed API wrapper.
 *
 * Provides generic type inference so callers don't have to cast Axios responses.
 * The Axios baseURL + interceptors are already configured on apiClient.
 *
 * @example
 * const { data } = await api.get<Mission[]>(ENDPOINTS.MISSIONS.LIST);
 * // data is Mission[], not any
 */
export const api = {
  get<T>(url: string, config?: AxiosRequestConfig) {
    return apiClient.get<ApiResponse<T>>(url, config);
  },
  post<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return apiClient.post<ApiResponse<T>>(url, body, config);
  },
  put<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return apiClient.put<ApiResponse<T>>(url, body, config);
  },
  patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return apiClient.patch<ApiResponse<T>>(url, body, config);
  },
  delete<T>(url: string, config?: AxiosRequestConfig) {
    return apiClient.delete<ApiResponse<T>>(url, config);
  },
};

export { apiClient } from './client';
export { tokenManager } from './tokenManager';
export { ENDPOINTS } from './endpoints';
