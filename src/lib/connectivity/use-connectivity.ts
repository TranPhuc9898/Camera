/**
 * React hook that exposes current network connectivity state.
 * Subscribes to NetInfo events and returns a snapshot on each change.
 *
 * Usage:
 *   const { isConnected, type, isInternetReachable } = useConnectivity();
 */

import { useState, useEffect } from 'react';
import NetInfo, { type NetInfoStateType } from '@react-native-community/netinfo';

export type ConnectivityState = {
  isConnected: boolean;
  type: NetInfoStateType;
  isInternetReachable: boolean | null;
};

const DEFAULT_STATE: ConnectivityState = {
  isConnected: false,
  type: 'unknown' as NetInfoStateType,
  isInternetReachable: null,
};

export function useConnectivity(): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>(DEFAULT_STATE);

  useEffect(() => {
    // Fetch current state immediately on mount
    NetInfo.fetch().then((info) => {
      setState({
        isConnected: info.isConnected ?? false,
        type: info.type,
        isInternetReachable: info.isInternetReachable,
      });
    });

    // Subscribe to subsequent changes
    const unsubscribe = NetInfo.addEventListener((info) => {
      setState({
        isConnected: info.isConnected ?? false,
        type: info.type,
        isInternetReachable: info.isInternetReachable,
      });
    });

    return unsubscribe;
  }, []);

  return state;
}
