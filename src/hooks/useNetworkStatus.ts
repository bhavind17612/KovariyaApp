import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

/**
 * Monitors internet connectivity and syncs into the global AppStore.
 *
 * Current implementation: lightweight periodic HEAD probe to dns.google.
 *
 * Production upgrade path (recommended):
 *   npx expo install @react-native-community/netinfo
 *   Then replace the body of the useEffect with:
 *     import NetInfo from '@react-native-community/netinfo';
 *     const unsub = NetInfo.addEventListener(state => {
 *       setOnline(state.isConnected ?? true);
 *     });
 *     return unsub;
 *   (Remove the setInterval — NetInfo fires on every change.)
 */

async function probeConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3_000);

    const res = await fetch('https://dns.google', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

const POLL_INTERVAL_MS = 30_000;

export function useNetworkStatus(): boolean {
  const isOnline = useAppStore(selectIsOnline);
  const setOnline = useAppStore((s) => s.setOnline);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const connected = await probeConnectivity();
      if (mounted) setOnline(connected);
    };

    check();
    const id = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [setOnline]);

  return isOnline;
}

function selectIsOnline(s: { isOnline: boolean }) {
  return s.isOnline;
}
