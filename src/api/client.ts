import axios, { type AxiosInstance } from 'axios';
import { ENV } from '../config/env';
import { API_TIMEOUT_MS } from '../config/constants';
import { setupInterceptors } from './interceptors';

/**
 * Singleton Axios instance for all authenticated API calls.
 *
 * Features (via interceptors):
 *  - Automatic Bearer token injection
 *  - 401 → token refresh → request replay
 *  - Refresh queue (single network call for concurrent 401s)
 *  - Dev-mode request/response logging
 *  - 30-second timeout on every request
 *
 * Usage:
 *   import { apiClient } from '../api/client';
 *   const { data } = await apiClient.get('/api/v1/missions');
 *
 * For typed responses use the `api` wrapper in index.ts instead.
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: ENV.API_BASE_URL,
    timeout: API_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  setupInterceptors(client);
  return client;
}

export const apiClient = createApiClient();
