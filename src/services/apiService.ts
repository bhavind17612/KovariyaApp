import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Base URL ──────────────────────────────────────────────────────────────────
/**
 * Returns the API base URL based on the running platform.
 * Android emulators map `localhost` → `10.0.2.2`; physical devices need your LAN IP.
 * We keep a single place to update the address.
 */
export function getApiBase(): string {
  return Platform.OS === 'android' ? 'http://192.168.1.6:5000' : 'http://localhost:5000';
}

// ─── Storage Keys ──────────────────────────────────────────────────────────────
const ONBOARDING_ACCESS_TOKEN_KEY = '@kovariya_onboarding_access_token';
const ONBOARDING_REFRESH_TOKEN_KEY = '@kovariya_onboarding_refresh_token';

// ─── Token Persistence ─────────────────────────────────────────────────────────

/** Persists the tokens received from the verify-otp endpoint. */
export async function storeOnboardingTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(ONBOARDING_ACCESS_TOKEN_KEY, accessToken),
    AsyncStorage.setItem(ONBOARDING_REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

/** Retrieves the stored onboarding access token (null if not found). */
export async function getOnboardingAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ONBOARDING_ACCESS_TOKEN_KEY);
}

/** Retrieves the stored onboarding refresh token (null if not found). */
export async function getOnboardingRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(ONBOARDING_REFRESH_TOKEN_KEY);
}

/** Clears the temporary onboarding tokens once the flow is complete. */
export async function clearOnboardingTokens(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(ONBOARDING_ACCESS_TOKEN_KEY),
    AsyncStorage.removeItem(ONBOARDING_REFRESH_TOKEN_KEY),
  ]);
}

// ─── Auth Header Builder ───────────────────────────────────────────────────────

/**
 * Returns an Authorization header object using the provided token.
 * Falls back to reading AsyncStorage if no token is passed.
 *
 * Usage:
 *   const headers = await buildAuthHeaders(accessToken);
 */
export async function buildAuthHeaders(accessToken?: string | null): Promise<Record<string, string>> {
  const token = accessToken ?? (await getOnboardingAccessToken());
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ─── Error Extractor ──────────────────────────────────────────────────────────

/**
 * Extracts a human-readable error message from a JSON API response body.
 * Handles multiple common payload shapes: { message }, { error }, { data.message }.
 */
export function extractApiError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.message === 'string' && d.message.trim()) return d.message.trim();
    if (typeof d.error === 'string' && d.error.trim()) return d.error.trim();
    const nested = d.data as Record<string, unknown> | undefined;
    if (nested && typeof nested.message === 'string' && nested.message.trim()) {
      return nested.message.trim();
    }
  }
  return fallback;
}
