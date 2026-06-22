import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type CreateHabitDraft = {
  name: string;
  weeklyTarget: string;
};

type AppState = {
  session: Session | null;
  sessionInitialized: boolean;
  createHabitDraft: CreateHabitDraft;
  setSession: (session: Session | null) => void;
  setSessionInitialized: (initialized: boolean) => void;
  updateCreateHabitDraft: (draft: Partial<CreateHabitDraft>) => void;
  resetCreateHabitDraft: () => void;
};

const initialCreateHabitDraft: CreateHabitDraft = {
  name: '',
  weeklyTarget: '3',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      sessionInitialized: false,
      createHabitDraft: initialCreateHabitDraft,
      setSession: (session) => set({ session }),
      setSessionInitialized: (sessionInitialized) => set({ sessionInitialized }),
      updateCreateHabitDraft: (draft) =>
        set((state) => ({ createHabitDraft: { ...state.createHabitDraft, ...draft } })),
      resetCreateHabitDraft: () => set({ createHabitDraft: initialCreateHabitDraft }),
    }),
    {
      name: 'rally.appState.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        createHabitDraft: state.createHabitDraft,
      }),
    },
  ),
);
