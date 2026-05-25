import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
  AxiosResponse,
} from 'axios';
import { tokenManager } from './tokenManager';
import { ENV } from '../config/env';

// Extend Axios config to carry our custom flags through the request lifecycle
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** True if this request already attempted a token refresh (prevents infinite loops). */
    _retry?: boolean;
    /** Set to true on public endpoints that don't need an Authorization header. */
    skipAuth?: boolean;
  }
  // Also augment the public-facing config so callers can pass skipAuth without a cast.
  interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

export function setupInterceptors(client: AxiosInstance): void {
  // ── REQUEST: inject Bearer token ─────────────────────────────────────────
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (!config.skipAuth) {
        const token = tokenManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      if (ENV.isDev) {
        console.log(`[API →] ${config.method?.toUpperCase()} ${config.url}`);
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  // ── RESPONSE: success logging + 401 refresh + error logging ─────────────
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (ENV.isDev) {
        console.log(`[API ←] ${response.status} ${response.config.url}`);
      }
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig | undefined;

      // ── 401: attempt token refresh then replay the original request ───────
      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !originalRequest.skipAuth
      ) {
        originalRequest._retry = true;

        try {
          const newToken = await tokenManager.refreshAccessToken();
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          // Replay the failed request with the fresh token
          return await client(originalRequest);
        } catch {
          // refreshAccessToken already called the logout handler
          return Promise.reject(error);
        }
      }

      if (ENV.isDev && error.response) {
        console.warn(
          `[API ✗] ${error.response.status} ${error.config?.url}`,
          error.response.data,
        );
      }

      return Promise.reject(error);
    },
  );
}
