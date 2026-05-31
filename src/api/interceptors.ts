import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
  AxiosResponse,
} from 'axios';
import axios from 'axios';
import { tokenManager } from './tokenManager';
import { ENV } from '../config/env';

/** Auth-error codes the backend embeds in the response body. */
const AUTH_ERROR_CODES = new Set(['UNAUTHORIZED', 'TOKEN_EXPIRED', 'Unauthorized']);

/**
 * Returns true when the body signals an auth failure, regardless of HTTP status.
 * Handles backends that return HTTP 200 with an error payload instead of 401.
 */
function bodyHasAuthError(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const body = data as Record<string, unknown>;
  const code = body.code ?? body.error_code ?? body.errorCode ?? body.error;
  return typeof code === 'string' && AUTH_ERROR_CODES.has(code);
}

/**
 * Returns true for any 401 that should trigger a silent token refresh.
 *
 * We intentionally match on HTTP status only, not on an error-code string,
 * because different backend frameworks surface expiry differently:
 *   - NestJS/Express default:  { statusCode: 401, message: "Unauthorized" }
 *   - Custom guards:           { code: "TOKEN_EXPIRED" }
 *   - Some APIs:               bare 401 with no body
 *
 * False-positive protection already exists at the call site:
 *   _retry  — prevents re-entering this path after one refresh attempt
 *   skipAuth — exempts public endpoints (login, register, etc.)
 */
function shouldAttemptTokenRefresh(error: AxiosError): boolean {
  return error.response?.status === 401;
}

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
      console.log("config.skipAjth", config.skipAuth)
      if (!config.skipAuth) {
        const token = tokenManager.getAccessToken();
        console.log("token", token)
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      if (ENV.isDev) {
        console.log(`[API →] ${config.method?.toUpperCase()} ${config.url}`);
      }
      console.log('config.headers ss',config.headers)
      return config;
    },
    (error) => Promise.reject(error),
  );

  // ── RESPONSE: success logging + 401 refresh + error logging ─────────────
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      console.log('interceptors res',response)
      if (ENV.isDev) {
        console.log(`[API ←] ${response.status} ${response.config.url}`);
      }
      // Some backends return HTTP 200 with an auth-error code in the body instead
      // of a real 401. Convert these to a rejected AxiosError so the error
      // interceptor below can trigger the same refresh + retry flow.
      if (bodyHasAuthError(response.data)) {
        const syntheticError = new axios.AxiosError(
          String((response.data as Record<string, unknown>).message ?? 'Unauthorized'),
          'ERR_BAD_RESPONSE',
          response.config,
          (response as unknown as { request: unknown }).request,
          { ...response, status: 401 },
        );
        return Promise.reject(syntheticError);
      }
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig | undefined;

      // ── 401: silently refresh then replay original request ──────────────────
      if (
        shouldAttemptTokenRefresh(error) &&
        originalRequest &&
        !originalRequest._retry &&
        !originalRequest.skipAuth
      ) {
        originalRequest._retry = true;

        try {
          const newToken = await tokenManager.refreshAccessToken();
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return await client(originalRequest);
        } catch {
          // refreshAccessToken triggers logout only when the refresh itself
          // returned 401; other failures (network, 5xx) are surfaced as-is.
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
