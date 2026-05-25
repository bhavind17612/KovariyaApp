/**
 * Centralised, typed storage key registry.
 * Keys are kept identical to what was previously hardcoded across the app
 * so no existing data migration is required.
 *
 * MMKV upgrade path:
 *   import { MMKV } from 'react-native-mmkv';
 *   const mmkv = new MMKV({ id: 'kovariya', encryptionKey: 'YOUR_KEY' });
 *   Then replace the StorageService body in storage.ts.
 */
export const STORAGE_KEYS = {
  // ── Auth session ─────────────────────────────────────────────────────────
  ACCESS_TOKEN: '@kovariya_access_token',
  REFRESH_TOKEN: '@kovariya_refresh_token',
  TOKEN_EXPIRES_AT: '@kovariya_token_expires_at',
  USER_DATA: '@kovariya_user_data',

  // ── Temporary onboarding tokens (cleared after PIN setup) ───────────────
  ONBOARDING_ACCESS_TOKEN: '@kovariya_onboarding_access_token',
  ONBOARDING_REFRESH_TOKEN: '@kovariya_onboarding_refresh_token',

  // ── Parent identity (kept across logout for PIN re-login) ───────────────
  REMEMBERED_PARENT_ID: '@kovariya_remembered_parent_id',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
