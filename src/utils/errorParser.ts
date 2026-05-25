import type { AxiosError } from 'axios';

export interface ParsedError {
  message: string;
  statusCode?: number;
  isNetworkError: boolean;
  isAuthError: boolean;
  isServerError: boolean;
  raw?: unknown;
}

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your details.',
  401: 'Session expired. Please sign in again.',
  403: "You don't have permission to do this.",
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. Please try again.',
  422: 'Please check the information you provided.',
  429: 'Too many requests. Please wait and try again.',
  500: 'Server error. Please try again shortly.',
  502: 'Service temporarily unavailable.',
  503: 'Service unavailable. Please try again later.',
};

function extractMessageFromData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  if (typeof d.message === 'string' && d.message.trim()) return d.message.trim();
  if (typeof d.error === 'string' && d.error.trim()) return d.error.trim();

  // Nested payload: { data: { message: '...' } }
  const nested = d.data as Record<string, unknown> | undefined;
  if (nested && typeof nested.message === 'string' && nested.message.trim()) {
    return nested.message.trim();
  }

  return null;
}

/**
 * Converts any thrown value (Axios error, fetch error, plain Error)
 * into a consistent, user-friendly ParsedError.
 *
 * NEVER surfaces raw stack traces or internal server messages in production.
 */
export function parseApiError(error: unknown): ParsedError {
  const axiosError = error as AxiosError<unknown>;
  console.log('axiosError ',axiosError);
  // Connection timeout
  if (axiosError.code === 'ECONNABORTED') {
    return {
      message: 'Request timed out. Please check your connection.',
      isNetworkError: true,
      isAuthError: false,
      isServerError: false,
    };
  }

  // No network (Axios sets message = 'Network Error' and has no response)
  if (axiosError.message === 'Network Error' || (!axiosError.response && axiosError.isAxiosError)) {
    return {
      message: 'No internet connection. Please check your network.',
      isNetworkError: true,
      isAuthError: false,
      isServerError: false,
    };
  }

  // HTTP error with response
  if (axiosError.response) {
    const status = axiosError.response.status;
    const responseData = axiosError.response.data;
    const extractedMessage = extractMessageFromData(responseData);
    const message =
      extractedMessage ||
      HTTP_STATUS_MESSAGES[status] ||
      'Something went wrong. Please try again.';

    return {
      message,
      statusCode: status,
      isNetworkError: false,
      isAuthError: status === 401 || status === 403,
      isServerError: status >= 500,
      raw: __DEV__ ? responseData : undefined,
    };
  }

  // Plain JS Error (e.g. thrown manually with new Error('...')
  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred.',
      isNetworkError: false,
      isAuthError: false,
      isServerError: false,
    };
  }

  return {
    message: 'An unexpected error occurred.',
    isNetworkError: false,
    isAuthError: false,
    isServerError: false,
    raw: __DEV__ ? error : undefined,
  };
}

/** Convenience: returns just the user-facing message string. */
export function getDisplayMessage(error: unknown): string {
  return parseApiError(error).message;
}

/**
 * Extracts an error message from a raw JSON body (used in fetch-based screens).
 * Handles { message }, { error }, { data.message } shapes.
 */
export function extractApiError(data: unknown, fallback: string): string {
  return extractMessageFromData(data) ?? fallback;
}
