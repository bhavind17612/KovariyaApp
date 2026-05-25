type SuccessResult<T> = { data: T; error: null };
type FailureResult = { data: null; error: Error };
type SafeResult<T> = SuccessResult<T> | FailureResult;

/**
 * Wraps an async function in a try/catch and returns a discriminated union
 * instead of throwing. Prevents unhandled promise rejections in fire-and-forget calls.
 *
 * @example
 * const { data, error } = await safeAsync(() => authService.login(creds));
 * if (error) showToast(error.message);
 */
export async function safeAsync<T>(fn: () => Promise<T>): Promise<SafeResult<T>> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { data: null, error };
  }
}

/**
 * Executes `fn` and returns `fallback` on any error.
 * Useful for optional data where absence is acceptable.
 */
export function safeAsyncWithFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch(() => fallback);
}

/**
 * Debounces a function by `delayMs`.
 * The returned function clears any previous pending call.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Throttles a function — the first call fires immediately,
 * subsequent calls within `intervalMs` are ignored.
 */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  intervalMs: number,
): (...args: Args) => void {
  let lastCalled = 0;
  return (...args: Args) => {
    const now = Date.now();
    if (now - lastCalled >= intervalMs) {
      lastCalled = now;
      fn(...args);
    }
  };
}
