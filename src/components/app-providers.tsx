import NetInfo from '@react-native-community/netinfo';
import { onlineManager, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { recordCheckin } from '@/lib/rally-api';
import { queryKeys, useTodayContext } from '@/hooks/use-rally-data';
import { useAppStore } from '@/store/use-app-store';

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  }),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

function SessionBridge() {
  const setSession = useAppStore((state) => state.setSession);
  const setSessionInitialized = useAppStore((state) => state.setSessionInitialized);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }
      setSession(data.session);
      setSessionInitialized(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionInitialized(true);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [setSession, setSessionInitialized]);

  return null;
}

function PendingCheckinSync() {
  const pendingCheckins = useAppStore((state) => state.pendingCheckins);
  const removePendingCheckin = useAppStore((state) => state.removePendingCheckin);
  const session = useAppStore((state) => state.session);
  const queryClientRef = useQueryClient();
  const syncing = useRef(false);
  const today = useTodayContext();

  useEffect(() => {
    if (!session || pendingCheckins.length === 0 || syncing.current) {
      return undefined;
    }
    return NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (!online || syncing.current) {
        return;
      }
      syncing.current = true;
      Promise.allSettled(
        pendingCheckins.map((pending) =>
          recordCheckin({ ...pending, queued_at_client: pending.queued_at_client }),
        ),
      )
        .then((results) => {
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              removePendingCheckin(pendingCheckins[index].client_request_id);
            }
          });
          queryClientRef.invalidateQueries({
            queryKey: queryKeys.daily(today.localDate, today.timezone),
          });
        })
        .finally(() => {
          syncing.current = false;
        });
    });
  }, [
    pendingCheckins,
    queryClientRef,
    removePendingCheckin,
    session,
    today.localDate,
    today.timezone,
  ]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionBridge />
        <PendingCheckinSync />
        {children}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
