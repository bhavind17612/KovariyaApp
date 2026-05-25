/** Axios request timeout (30 seconds). */
export const API_TIMEOUT_MS = 30_000;

/** Proactively refresh the access token this many ms before it expires. */
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60_000;

/** Max React Query / Axios retry attempts for transient server errors. */
export const MAX_RETRY_ATTEMPTS = 3;

/** Base delay for exponential retry backoff. */
export const RETRY_BASE_DELAY_MS = 1_000;

/** Default React Query stale time — data is fresh for 1 minute. */
export const DEFAULT_STALE_TIME_MS = 60_000;

/** Longer stale time for rarely-changing resources (5 minutes). */
export const LONG_STALE_TIME_MS = 5 * 60_000;

/** App-lock triggers after this many ms in the background. */
export const APP_LOCK_TIMEOUT_MS = 10 * 60_000;
