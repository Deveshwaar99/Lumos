import { create } from 'zustand';
import {
  TransactionWithSplits,
  TransactionFilter,
  CreateTransactionInput,
} from '../models/types';
import { transactionService } from '../services/transactionService';

const PAGE_SIZE = 20;

const DEFAULT_FILTER: TransactionFilter = {
  dateFrom: null,
  dateTo: null,
  type: null,
  accountId: null,
  categoryId: null,
};

interface TransactionState {
  transactions: TransactionWithSplits[];
  filter: TransactionFilter;
  offset: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadTransactions: (reset?: boolean) => Promise<void>;
  setFilter: (filter: Partial<TransactionFilter>) => Promise<void>;
  addTransaction: (
    data: CreateTransactionInput,
  ) => Promise<TransactionWithSplits>;
  updateTransaction: (
    id: string,
    data: Partial<CreateTransactionInput>,
  ) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  loadMore: () => Promise<void>;
  getRecent: (limit: number) => Promise<TransactionWithSplits[]>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  filter: { ...DEFAULT_FILTER },
  offset: 0,
  totalCount: 0,
  loading: false,
  error: null,
  hasMore: false,

  loadTransactions: async (reset = true) => {
    const { filter } = get();
    const offset = reset ? 0 : get().offset;
    set({ loading: true, error: null, ...(reset ? { offset: 0 } : {}) });

    try {
      const [transactions, count] = await Promise.all([
        transactionService.getAll(filter, PAGE_SIZE, offset),
        transactionService.getCount(filter),
      ]);

      const hasMore = transactions.length === PAGE_SIZE;

      set((state) => ({
        transactions: reset
          ? transactions
          : [...state.transactions, ...transactions],
        offset: offset + transactions.length,
        totalCount: count,
        hasMore,
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  setFilter: async (filterPartial) => {
    const newFilter = { ...get().filter, ...filterPartial };
    set({ filter: newFilter });
    await get().loadTransactions(true);
  },

  addTransaction: async (data) => {
    const transaction = await transactionService.create(data);
    set((state) => ({
      transactions: [transaction, ...state.transactions],
      totalCount: state.totalCount + 1,
    }));
    return transaction;
  },

  updateTransaction: async (id, data) => {
    await transactionService.update(id, data);
    await get().loadTransactions(true);
  },

  removeTransaction: async (id) => {
    await transactionService.delete(id);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
      totalCount: Math.max(0, state.totalCount - 1),
    }));
  },

  loadMore: async () => {
    await get().loadTransactions(false);
  },

  getRecent: async (limit: number) => {
    return transactionService.getRecent(limit);
  },
}));
