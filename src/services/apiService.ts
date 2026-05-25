/**
 * apiService.ts — Public API utilities used by onboarding screens.
 *
 * All exports are identical to the original file so that every existing screen
 * (OnboardingScreen1–4, LoginScreen) continues to compile and run unchanged.
 *
 * Internal implementation now uses the centralised ENV config and STORAGE_KEYS
 * instead of hardcoded strings and platform checks.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';
import { STORAGE_KEYS } from '../storage/storageKeys';

// ─── Base URL ───────────────────────────────────────────────────────────────

/**
 * Returns the API base URL.
 * Previously contained a Platform.OS branch — that logic now lives in ENV.
 */
export function getApiBase(): string {
  return ENV.API_BASE_URL;
}

// ─── Onboarding Token Persistence ──────────────────────────────────────────
// These tokens are temporary — received from verify-otp, discarded after PIN setup.

/** Persists the temporary onboarding tokens received after OTP verification. */
export async function storeOnboardingTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_ACCESS_TOKEN, accessToken),
    AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_REFRESH_TOKEN, refreshToken),
  ]);
}

/** Returns the stored onboarding access token, or null if not found. */
export async function getOnboardingAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_ACCESS_TOKEN);
}

/** Returns the stored onboarding refresh token, or null if not found. */
export async function getOnboardingRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_REFRESH_TOKEN);
}

/** Clears temporary onboarding tokens once the onboarding flow is complete. */
export async function clearOnboardingTokens(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_ACCESS_TOKEN),
    AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_REFRESH_TOKEN),
  ]);
}

// ─── Auth Header Builder ────────────────────────────────────────────────────

/**
 * Builds Authorization + Content-Type headers.
 * Falls back to the stored onboarding access token if none is provided.
 */
export async function buildAuthHeaders(
  accessToken?: string | null,
): Promise<Record<string, string>> {
  const token = accessToken ?? (await getOnboardingAccessToken());
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// ─── Error Extractor ────────────────────────────────────────────────────────

/**
 * Extracts a human-readable error message from a JSON API response body.
 * Handles { message }, { error }, { data.message } payload shapes.
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
