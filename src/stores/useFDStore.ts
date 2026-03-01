import { create } from 'zustand';
import { FixedDeposit, CreateFDInput } from '../models/types';
import { fdService } from '../services/fdService';

interface FDState {
  deposits: FixedDeposit[];
  fdAccountIds: Set<string>;
  loading: boolean;
  error: string | null;
  loadDeposits: () => Promise<void>;
  addDeposit: (data: CreateFDInput) => Promise<FixedDeposit>;
  removeDeposit: (id: string) => Promise<void>;
  closeDeposit: (id: string) => Promise<boolean>;
  processMaturedDeposits: () => Promise<number>;
}

export const useFDStore = create<FDState>((set) => ({
  deposits: [],
  fdAccountIds: new Set(),
  loading: false,
  error: null,

  loadDeposits: async () => {
    set({ loading: true, error: null });
    try {
      const deposits = await fdService.getAll();
      const fdAccountIds = await fdService.getFdAccountIds();
      set({ deposits, fdAccountIds, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  addDeposit: async (data) => {
    const deposit = await fdService.create(data);
    set((state) => ({
      deposits: [...state.deposits, deposit],
      fdAccountIds: new Set([...state.fdAccountIds, deposit.fdAccountId]),
    }));
    return deposit;
  },

  removeDeposit: async (id) => {
    const fd = await fdService.getById(id);
    await fdService.delete(id);
    set((state) => {
      const newIds = new Set(state.fdAccountIds);
      if (fd) newIds.delete(fd.fdAccountId);
      return {
        deposits: state.deposits.filter((d) => d.id !== id),
        fdAccountIds: newIds,
      };
    });
  },

  closeDeposit: async (id) => {
    const success = await fdService.closeFD(id);
    if (success) {
      set((state) => ({
        deposits: state.deposits.map((d) =>
          d.id === id ? { ...d, status: 'closed' as const } : d
        ),
      }));
    }
    return success;
  },

  processMaturedDeposits: async () => {
    try {
      const count = await fdService.processMaturedDeposits();
      if (count > 0) {
        const deposits = await fdService.getAll();
        set({ deposits });
      }
      return count;
    } catch (e: any) {
      set({ error: e.message });
      return 0;
    }
  },
}));
