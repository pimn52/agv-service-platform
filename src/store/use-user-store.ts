import { create } from 'zustand';
import type { User } from '@/types';
import { MOCK_USER } from '@/mock/data';

interface UserStore {
  user: User | null;
  isLoggedIn: boolean;

  login: (phone: string, code: string) => Promise<void>;
  logout: () => void;
  updateBalance: (amount: number) => void;
  recharge: (amount: number) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: MOCK_USER,
  isLoggedIn: true,

  login: async (_phone: string, _code: string) => {
    // MVP: 模拟登录
    set({ user: MOCK_USER, isLoggedIn: true });
  },

  logout: () => {
    set({ user: null, isLoggedIn: false });
  },

  updateBalance: (amount) =>
    set((s) => ({
      user: s.user ? { ...s.user, balance: s.user.balance + amount } : null,
    })),

  recharge: (amount) =>
    set((s) => ({
      user: s.user ? { ...s.user, balance: s.user.balance + amount } : null,
    })),
}));
