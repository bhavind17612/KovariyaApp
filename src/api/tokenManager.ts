import { storage } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/storageKeys';
import { isTokenExpired, isTokenExpiringSoon } from '../utils/tokenUtils';
import { ENV } from '../config/env';
import { ENDPOINTS } from './endpoints';
import type { AuthTokens } from '../types/auth';

type RefreshCallback = (newToken: string | null) => void;

/** Thrown only when the refresh endpoint itself responds with HTTP 401. */
class RefreshUnauthorizedError extends Error {
  constructor() {
    super('Refresh token rejected with 401');
    this.name = 'RefreshUnauthorizedError';
  }
}

/**
 * Token Manager — singleton that owns all in-memory token state.
 *
 * Responsibilities:
 *  1. Keep access/refresh tokens in memory after initialize().
 *  2. Persist tokens to (encrypted) storage on every write.
 *  3. Serialise concurrent 401 → refresh flows into a single network call
 *     (all inflight requests queue up and replay with the new token).
 *  4. Trigger the global logout handler when refresh fails.
 *
 * Axios interceptors and the Zustand auth store both depend on this class,
 * but this class depends on neither — avoiding circular imports.
 */
class TokenManager {
  private static _instance: TokenManager;

  // ── In-memory token state ──────────────────────────────────────────────────
  private _accessToken: string | null = null;
  private _refreshToken: string | null = null;
  private _expiresAt = 0;

  // ── Refresh-queue state ────────────────────────────────────────────────────
  private _isRefreshing = false;
  private _refreshQueue: RefreshCallback[] = [];

  // ── Injected logout handler (set by AuthProvider on mount) ─────────────────
  private _logoutHandler: (() => void) | null = null;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager._instance) {
      TokenManager._instance = new TokenManager();
    }
    return TokenManager._instance;
  }

  // ── Public setters ─────────────────────────────────────────────────────────

  /**
   * Register a callback that fires when token refresh fails.
   * AuthProvider calls this on mount so the manager can trigger global logout.
   */
  setLogoutHandler(handler: () => void): void {
    this._logoutHandler = handler;
  }

  // ── Initialisation (cold start) ────────────────────────────────────────────

  /**
   * Restore token state from persistent storage.
   * Must be awaited before making any authenticated API call.
   */
  async initialize(): Promise<void> {
    const [accessToken, refreshToken, expiresAt] = await Promise.all([
      storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN),
      storage.get<string>(STORAGE_KEYS.REFRESH_TOKEN),
      storage.get<number>(STORAGE_KEYS.TOKEN_EXPIRES_AT),
    ]);
    this._accessToken = accessToken;
    this._refreshToken = refreshToken;
    this._expiresAt = expiresAt ?? 0;
  }

  // ── Read accessors ─────────────────────────────────────────────────────────

  getAccessToken(): string | null {
    return this._accessToken;
  }

  getRefreshToken(): string | null {
    return this._refreshToken;
  }

  getExpiresAt(): number {
    return this._expiresAt;
  }

  isAuthenticated(): boolean {
    return !!this._accessToken && !isTokenExpired(this._expiresAt);
  }

  isExpiringSoon(): boolean {
    return !!this._accessToken && isTokenExpiringSoon(this._expiresAt);
  }

  // ── Write operations ───────────────────────────────────────────────────────

  /**
   * Loads an onboarding access token into memory so the Axios interceptor
   * injects it automatically into subsequent requests.
   *
   * Intentionally does NOT write to persistent storage — the onboarding token
   * is ephemeral and must not be mistaken for a real auth session on app
   * restart. `completeOnboardingAuthentication` will overwrite this with the
   * real tokens once onboarding is complete.
   *
   * `isAuthenticated()` still returns false (expiresAt stays 0), so the
   * AuthContext never treats an in-progress onboarding as "logged in".
   */
  setOnboardingToken(accessToken: string): void {
    this._accessToken = accessToken;
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    this._accessToken = tokens.accessToken;
    this._refreshToken = tokens.refreshToken;
    this._expiresAt = tokens.expiresAt;

    await Promise.all([
      storage.set(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
      storage.set(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
      storage.set(STORAGE_KEYS.TOKEN_EXPIRES_AT, tokens.expiresAt),
    ]);
  }

  async clearTokens(): Promise<void> {
    this._accessToken = null;
    this._refreshToken = null;
    this._expiresAt = 0;

    await storage.multiDelete([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.TOKEN_EXPIRES_AT,
    ]);
  }

  // ── Refresh queue ──────────────────────────────────────────────────────────

  /**
   * Refreshes the access token.
   *
   * If a refresh is already in flight, this call queues up and resolves
   * once the in-flight refresh completes — ensuring only ONE refresh request
   * ever hits the network at a time, regardless of how many 401s arrive
   * simultaneously from concurrent API calls.
   *
   * On failure: clears tokens, triggers global logout, and rethrows.
   */
  async refreshAccessToken(): Promise<string> {
    // Already refreshing → queue this caller
    if (this._isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        this._refreshQueue.push((newToken) => {
          if (newToken) resolve(newToken);
          else reject(new Error('Token refresh failed'));
        });
      });
    }

    this._isRefreshing = true;

    try {
      const refreshToken = this._refreshToken;
      if (!refreshToken) throw new Error('No refresh token available');

      const newTokens = await this._doRefresh(refreshToken);
      await this.setTokens(newTokens);

      this._notifyQueue(newTokens.accessToken);
      return newTokens.accessToken;
    } catch (error) {
      this._notifyQueue(null);
      await this.clearTokens();
      // Only force a global logout when the refresh endpoint explicitly rejects
      // the token (401). Network failures, 5xx errors, and missing tokens are
      // transient — callers handle them without destroying the session.
      if (error instanceof RefreshUnauthorizedError) {
        this._logoutHandler?.();
      }
      throw error;
    } finally {
      this._isRefreshing = false;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async _doRefresh(refreshToken: string): Promise<AuthTokens> {
    // Always call the real endpoint — never mock here.
    // The old isLocalDev branch intercepted real JWTs on Android emulators
    // (which route through 10.0.2.2) and threw RefreshUnauthorizedError for any
    // token that didn't start with "mock-refresh", silently logging users out.
    const response = await fetch(
      `${ENV.API_BASE_URL}${ENDPOINTS.AUTH.REFRESH_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshToken }),
      },
    );

    if (response.status === 401) throw new RefreshUnauthorizedError();
    if (!response.ok) throw new Error(`Refresh failed: ${response.status}`);

    const data = await response.json();
    const accessToken =
      data.data?.access_token ??
      data.data?.accessToken ??
      data.access_token ??
      data.accessToken ??
      data.tokens?.accessToken;

    if (!accessToken) throw new Error('Refresh response missing access_token');

    return {
      accessToken,
      refreshToken:
        data.data?.refresh_token ??
        data.data?.refreshToken ??
        data.refresh_token ??
        data.refreshToken ??
        data.tokens?.refreshToken ??
        refreshToken,
      expiresAt:
        data.data?.expires_at ??
        data.data?.expiresAt ??
        data.expires_at ??
        data.expiresAt ??
        data.tokens?.expiresAt ??
        Date.now() + 3_600_000,
    };
  }

  private _notifyQueue(newToken: string | null): void {
    this._refreshQueue.forEach((cb) => cb(newToken));
    this._refreshQueue = [];
  }
}

export const tokenManager = TokenManager.getInstance();
