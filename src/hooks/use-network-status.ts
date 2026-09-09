import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const getSnapshot = () => onlineManager.isOnline();
const getServerSnapshot = () => true;

export function useNetworkStatus() {
  // Share the query layer's single native/browser network subscription.
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
