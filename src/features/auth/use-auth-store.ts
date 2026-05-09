import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, StorageKeys } from '@/lib/storage/mmkv';
import type { User } from './types';

const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.remove(name),
};

type AuthState = {
  user: User | null;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setHydrated: (v: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isHydrated: false,
      setUser: (user) => set({ user }),
      setHydrated: (isHydrated) => set({ isHydrated }),
      reset: () => set({ user: null }),
    }),
    {
      name: StorageKeys.AUTH_USER,
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
