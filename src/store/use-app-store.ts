import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  CreateHabitWithMembershipResponse,
  CreateInviteResponse,
  NotificationPermissionStatus,
  PendingCheckin,
  Weekday,
} from '@/types/rally';

export type OnboardingDraft = {
  habitName: string;
  plannedWeekdays: Weekday[];
  remindersEnabled: boolean;
  scheduledReminderTime: string | null;
  notificationPermissionStatus: NotificationPermissionStatus;
};

type InviteContext = {
  inviteTokenOrCode: string | null;
};

type AppState = {
  session: Session | null;
  sessionInitialized: boolean;
  onboardingDraft: OnboardingDraft;
  lastCreatedHabit: CreateHabitWithMembershipResponse | null;
  lastInvite: CreateInviteResponse | null;
  inviteContext: InviteContext;
  pendingCheckins: PendingCheckin[];
  setSession: (session: Session | null) => void;
  setSessionInitialized: (initialized: boolean) => void;
  updateOnboardingDraft: (draft: Partial<OnboardingDraft>) => void;
  resetOnboardingDraft: () => void;
  setLastCreatedHabit: (habit: CreateHabitWithMembershipResponse | null) => void;
  setLastInvite: (invite: CreateInviteResponse | null) => void;
  setInviteTokenOrCode: (inviteTokenOrCode: string | null) => void;
  addPendingCheckin: (checkin: PendingCheckin) => void;
  removePendingCheckin: (clientRequestId: string) => void;
  clearPendingCheckins: () => void;
};

const initialOnboardingDraft: OnboardingDraft = {
  habitName: '',
  plannedWeekdays: [1, 3, 5],
  remindersEnabled: false,
  scheduledReminderTime: null,
  notificationPermissionStatus: 'not_requested',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      sessionInitialized: false,
      onboardingDraft: initialOnboardingDraft,
      lastCreatedHabit: null,
      lastInvite: null,
      inviteContext: {
        inviteTokenOrCode: null,
      },
      pendingCheckins: [],
      setSession: (session) => set({ session }),
      setSessionInitialized: (sessionInitialized) => set({ sessionInitialized }),
      updateOnboardingDraft: (draft) =>
        set((state) => ({ onboardingDraft: { ...state.onboardingDraft, ...draft } })),
      resetOnboardingDraft: () => set({ onboardingDraft: initialOnboardingDraft }),
      setLastCreatedHabit: (lastCreatedHabit) => set({ lastCreatedHabit }),
      setLastInvite: (lastInvite) => set({ lastInvite }),
      setInviteTokenOrCode: (inviteTokenOrCode) =>
        set({ inviteContext: { inviteTokenOrCode } }),
      addPendingCheckin: (checkin) =>
        set((state) => {
          const exists = state.pendingCheckins.some(
            (item) => item.client_request_id === checkin.client_request_id,
          );
          return {
            pendingCheckins: exists
              ? state.pendingCheckins
              : [...state.pendingCheckins, checkin],
          };
        }),
      removePendingCheckin: (clientRequestId) =>
        set((state) => ({
          pendingCheckins: state.pendingCheckins.filter(
            (item) => item.client_request_id !== clientRequestId,
          ),
        })),
      clearPendingCheckins: () => set({ pendingCheckins: [] }),
    }),
    {
      name: 'rally.appState',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        onboardingDraft: state.onboardingDraft,
        lastCreatedHabit: state.lastCreatedHabit,
        lastInvite: state.lastInvite,
        inviteContext: state.inviteContext,
        pendingCheckins: state.pendingCheckins,
      }),
    },
  ),
);
