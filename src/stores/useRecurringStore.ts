import { create } from 'zustand';
import {
  RecurringTransaction,
  CreateRecurringTransactionInput,
} from '../models/types';
import { recurringTransactionService } from '../services/recurringTransactionService';

interface RecurringState {
  recurringTransactions: RecurringTransaction[];
  loading: boolean;
  loadRecurring: () => Promise<void>;
  addRecurring: (
    data: CreateRecurringTransactionInput,
  ) => Promise<RecurringTransaction>;
  updateRecurring: (
    id: string,
    data: Partial<CreateRecurringTransactionInput>,
  ) => Promise<void>;
  removeRecurring: (id: string) => Promise<void>;
  toggleRecurring: (id: string, active: boolean) => Promise<void>;
  processDue: () => Promise<number>;
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  recurringTransactions: [],
  loading: false,

  loadRecurring: async () => {
    set({ loading: true });
    try {
      const recurringTransactions =
        await recurringTransactionService.getAll();
      set({ recurringTransactions, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addRecurring: async (data) => {
    const rec = await recurringTransactionService.create(data);
    set((s) => ({
      recurringTransactions: [...s.recurringTransactions, rec],
    }));
    return rec;
  },

  updateRecurring: async (id, data) => {
    await recurringTransactionService.update(id, data);
    const updated = await recurringTransactionService.getById(id);
    if (updated) {
      set((s) => ({
        recurringTransactions: s.recurringTransactions.map((r) =>
          r.id === id ? updated : r,
        ),
      }));
    }
  },

  removeRecurring: async (id) => {
    await recurringTransactionService.delete(id);
    set((s) => ({
      recurringTransactions: s.recurringTransactions.filter(
        (r) => r.id !== id,
      ),
    }));
  },

  toggleRecurring: async (id, active) => {
    await recurringTransactionService.toggleActive(id, active);
    set((s) => ({
      recurringTransactions: s.recurringTransactions.map((r) =>
        r.id === id ? { ...r, isActive: active } : r,
      ),
    }));
  },

  processDue: async () => {
    try {
      const count =
        await recurringTransactionService.processDueTransactions();
      if (count > 0) {
        await get().loadRecurring();
      }
      return count;
    } catch {
      return 0;
    }
  },
}));
