import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Calls `fetcher` straight away, then every `intervalMs`.
 * `fetcher` must be memoised (useCallback) — when it changes, polling restarts.
 *
 * Out-of-order responses are ignored: if filters change while a request is in
 * flight, only the newest request is allowed to update state.
 */
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      const result = await fetcher();
      if (requestId !== latestRequest.current) return; // a newer request superseded this one
      setData(result);
      setError(null);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => {
      clearInterval(timer);
      latestRequest.current++; // ignore anything still in flight after unmount
    };
  }, [refresh, intervalMs]);

  return { data, error, loading, refresh };
}
