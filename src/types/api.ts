/** Standard envelope returned by the Kovariya backend. */
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success?: boolean;
}

/** Structured error payload from the API. */
export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

/** Paginated list response. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** Axios request config extensions. */
export interface ApiRequestMeta {
  /** Skip auth token injection for public endpoints. */
  skipAuth?: boolean;
}
