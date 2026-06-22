import NetInfo from '@react-native-community/netinfo';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
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

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionBridge />
        {children}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
