import { create } from 'zustand';
import type { User } from '@/types';
import { getProfile } from '@/data/profiles';

interface UserStore {
  user: User | null;
  loading: boolean;

  fetchProfile: (userId: string) => Promise<void>;
  clear: () => void;
  updateBalance: (amount: number) => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  loading: false,

  fetchProfile: async (userId: string) => {
    set({ loading: true })
    const user = await getProfile(userId)
    set({ user, loading: false })
  },

  clear: () => set({ user: null }),

  updateBalance: (amount) =>
    set((s) => ({
      user: s.user ? { ...s.user, balance: s.user.balance + amount } : null,
    })),

}));
