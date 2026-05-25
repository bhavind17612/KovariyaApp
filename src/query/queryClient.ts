import { QueryClient } from '@tanstack/react-query';
import { DEFAULT_STALE_TIME_MS, MAX_RETRY_ATTEMPTS, RETRY_BASE_DELAY_MS } from '../config/constants';

/**
 * Determines whether React Query should retry a failed request.
 *
 * Rules:
 *  - Never retry auth errors (401, 403) — user must re-login.
 *  - Never retry client errors (4xx) — invalid request won't succeed on retry.
 *  - Retry server errors (5xx) and network failures up to MAX_RETRY_ATTEMPTS.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRY_ATTEMPTS) return false;

  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status !== undefined) {
    // Auth and client errors: never retry
    if (status === 401 || status === 403) return false;
    if (status >= 400 && status < 500) return false;
  }

  return true;
}

/**
 * Exponential backoff with jitter: 1s → 2s → 4s, capped at 30s.
 */
function retryDelay(attemptIndex: number): number {
  const base = RETRY_BASE_DELAY_MS * 2 ** attemptIndex;
  const jitter = Math.random() * 500;
  return Math.min(base + jitter, 30_000);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** Data stays fresh for 1 minute before being re-fetched in the background. */
      staleTime: DEFAULT_STALE_TIME_MS,
      /** Keep unused query data in cache for 5 minutes after components unmount. */
      gcTime: 5 * 60_000,
      retry: shouldRetry,
      retryDelay,
      /** Don't re-fetch when the app window regains focus (mobile UX). */
      refetchOnWindowFocus: false,
      /** Re-fetch when connectivity is restored after being offline. */
      refetchOnReconnect: true,
    },
    mutations: {
      /** Mutations are not retried — let the user retry explicitly. */
      retry: 0,
    },
  },
});
