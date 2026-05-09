/**
 * Zustand store for network connectivity state.
 * Populated by a singleton NetInfo subscriber initialized at app boot.
 *
 * Boot wiring (call once in app/_layout.tsx):
 *   import { subscribeNetInfo } from '@/lib/connectivity';
 *   subscribeNetInfo();
 *
 * Usage anywhere in the app:
 *   const isConnected = useConnectivityStore((s) => s.isConnected);
 */

import { create } from 'zustand';
import NetInfo, { type NetInfoStateType } from '@react-native-community/netinfo';

// ── State ────────────────────────────────────────────────────────────────────

type ConnectivityStoreState = {
  isConnected: boolean;
  type: NetInfoStateType;
  isInternetReachable: boolean | null;
  _set: (partial: Partial<Omit<ConnectivityStoreState, '_set'>>) => void;
};

export const useConnectivityStore = create<ConnectivityStoreState>((set) => ({
  isConnected: false,
  type: 'unknown' as NetInfoStateType,
  isInternetReachable: null,
  _set: (partial) => set(partial),
}));

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectIsConnected = (s: ConnectivityStoreState) => s.isConnected;
export const selectNetworkType = (s: ConnectivityStoreState) => s.type;
export const selectIsInternetReachable = (s: ConnectivityStoreState) => s.isInternetReachable;

// ── Singleton subscriber ─────────────────────────────────────────────────────

let _unsubscribe: (() => void) | null = null;

/**
 * Initializes a singleton NetInfo listener that keeps the store in sync.
 * Safe to call multiple times — subsequent calls are no-ops.
 * Returns the unsubscribe function for cleanup if needed.
 */
export function subscribeNetInfo(): () => void {
  if (_unsubscribe) return _unsubscribe;

  const apply = (info: {
    isConnected: boolean | null;
    type: NetInfoStateType;
    isInternetReachable: boolean | null;
  }) => {
    useConnectivityStore.getState()._set({
      isConnected: info.isConnected ?? false,
      type: info.type,
      isInternetReachable: info.isInternetReachable,
    });
  };

  // Fetch initial state
  NetInfo.fetch().then(apply);

  // Subscribe to changes
  _unsubscribe = NetInfo.addEventListener(apply);
  return _unsubscribe;
}
