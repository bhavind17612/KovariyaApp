import { useState, useCallback, useRef } from 'react';
import { getDisplayMessage } from '../utils/errorParser';

interface RequestState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

type ExecuteFn<T, Args extends unknown[]> = (...args: Args) => Promise<T | null>;

/**
 * Reusable hook that wraps any async API call with loading/error/data state.
 *
 * Useful for mutations or one-off imperative calls that aren't well-suited
 * to React Query's useQuery pattern.
 *
 * Automatically cancels stale in-flight responses if the component unmounts.
 *
 * @example
 * const { data, isLoading, error, execute } = useApiRequest(
 *   (id: string) => apiClient.get(`/missions/${id}`)
 * );
 * const handlePress = () => execute(mission.id);
 */
export function useApiRequest<T, Args extends unknown[]>(
  requestFn: (...args: Args) => Promise<T>,
): RequestState<T> & { execute: ExecuteFn<T, Args>; reset: () => void } {
  const [state, setState] = useState<RequestState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const mountedRef = useRef(true);

  const execute: ExecuteFn<T, Args> = useCallback(
    async (...args: Args) => {
      setState({ data: null, isLoading: true, error: null });

      try {
        const data = await requestFn(...args);
        if (mountedRef.current) {
          setState({ data, isLoading: false, error: null });
        }
        return data;
      } catch (err) {
        const message = getDisplayMessage(err);
        if (mountedRef.current) {
          setState({ data: null, isLoading: false, error: message });
        }
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestFn],
  );

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
