import { create } from 'zustand';
import type { Account } from '../models/types';
import { accountService } from '../services/accountService';

interface AccountState {
  accounts: Account[];
  balances: Record<string, number>;
  loading: boolean;
  error: string | null;
  loadAccounts: () => Promise<void>;
  addAccount: (data: Omit<Account, 'id'>) => Promise<Account>;
  updateAccount: (
    id: string,
    data: Partial<Omit<Account, 'id'>>,
  ) => Promise<void>;
  removeAccount: (
    id: string,
  ) => Promise<{ success: boolean; message?: string }>;
  refreshBalances: () => Promise<void>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  balances: {},
  loading: false,
  error: null,

  loadAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const accountsWithBalances = await accountService.getAllWithBalances();
      const accounts = accountsWithBalances.map(({ balance, ...acc }) => acc);
      const balances: Record<string, number> = {};
      for (const a of accountsWithBalances) {
        balances[a.id] = a.balance;
      }
      set({ accounts, balances, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  addAccount: async (data) => {
    const account = await accountService.create(data);
    set((state) => ({ accounts: [...state.accounts, account] }));
    const balance = await accountService.getBalance(account.id);
    set((state) => ({
      balances: { ...state.balances, [account.id]: balance },
    }));
    return account;
  },

  updateAccount: async (id, data) => {
    await accountService.update(id, data);
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === id ? { ...a, ...data } : a,
      ),
    }));
  },

  removeAccount: async (id) => {
    const result = await accountService.delete(id);
    if (result.success) {
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
        balances: Object.fromEntries(
          Object.entries(state.balances).filter(([k]) => k !== id),
        ),
      }));
    }
    return result;
  },

  refreshBalances: async () => {
    try {
      const accountsWithBalances = await accountService.getAllWithBalances();
      const balances: Record<string, number> = {};
      for (const a of accountsWithBalances) {
        balances[a.id] = a.balance;
      }
      set({ balances });
    } catch (e: any) {
      set({ error: e.message });
    }
  },
}));
