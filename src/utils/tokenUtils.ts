import { TOKEN_REFRESH_BUFFER_MS } from '../config/constants';

/** True when the token's expiry timestamp is in the past. */
export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

/**
 * True when the token expires within `bufferMs` from now.
 * Defaults to TOKEN_REFRESH_BUFFER_MS (5 minutes) so we can proactively refresh.
 */
export function isTokenExpiringSoon(
  expiresAt: number,
  bufferMs = TOKEN_REFRESH_BUFFER_MS,
): boolean {
  return Date.now() >= expiresAt - bufferMs;
}

/** Returns an absolute expiry timestamp `durationMs` from now. */
export function getExpiryFromNow(durationMs: number): number {
  return Date.now() + durationMs;
}

/** Parses a JWT payload without verifying the signature (client-side only). */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
