import { Platform } from 'react-native';

declare const __DEV__: boolean;

const FALLBACK =
  __DEV__
    ? (Platform.OS === 'android'
        ? 'http://10.0.2.2:5000'
        : 'http://localhost:5000')
    : '';

/**
 * Safely reads an Expo public env var injected at build time.
 * Expo replaces process.env.EXPO_PUBLIC_* at bundle time.
 */
function readEnv(key: string): string {
  try {
    const env = (
      globalThis as Record<string, unknown>
    ).process as { env?: Record<string, string | undefined> } | undefined;
    return String(env?.env?.[key] ?? '').trim().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export const ENV = {
  /**
   * Primary API base URL.
   * Set EXPO_PUBLIC_API_BASE_URL in your .env files for each environment.
   * Falls back to EXPO_PUBLIC_AUTH_API_URL for backward compatibility.
   * In local dev, falls back to emulator-safe localhost.
   */
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_AUTH_API_URL ||
    FALLBACK,

  APP_ENV:
    process.env.EXPO_PUBLIC_APP_ENV ||
    (__DEV__ ? 'development' : 'production'),

  isDev: __DEV__,
  isProd: !__DEV__,
} as const;
