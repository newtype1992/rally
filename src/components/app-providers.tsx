import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { RallyApiError } from '@/lib/rally-api';
import { useAppStore } from '@/store/use-app-store';

onlineManager.setEventListener((setOnline) => {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    const sync = () => setOnline(window.navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    sync();
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }
  return NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
    mutations: {
      retry: 0,
      networkMode: 'always',
      onMutate: () => {
        if (!onlineManager.isOnline()) {
          throw new RallyApiError({ code: 'offline_unavailable', message: 'Reconnect to save changes.', recovery: 'retry', retryable: true });
        }
      },
    },
  },
});

function SessionBridge() {
  const setSession = useAppStore((state) => state.setSession);
  const setSessionInitialized = useAppStore((state) => state.setSessionInitialized);

  useEffect(() => {
    let mounted = true;
    let authEventReceived = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted || authEventReceived) {
        return;
      }
      setSession(data.session);
      setSessionInitialized(true);
    }).catch(() => {
      if (mounted && !authEventReceived) {
        setSession(null);
        setSessionInitialized(true);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      authEventReceived = true;
      const previous = useAppStore.getState().session?.user.id;
      if (previous && previous !== session?.user.id) {
        void queryClient.cancelQueries();
        queryClient.clear();
        useAppStore.getState().resetCreateHabitDraft();
      }
      setSession(session);
      setSessionInitialized(true);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [setSession, setSessionInitialized]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sync = (state: string) => {
      focusManager.setFocused(state === 'active');
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    sync(AppState.currentState);
    const subscription = AppState.addEventListener('change', sync);
    return () => { subscription.remove(); supabase.auth.stopAutoRefresh(); };
  }, []);

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
