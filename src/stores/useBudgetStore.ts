import { create } from 'zustand';
import { Budget, BudgetWithSpent } from '../models/types';
import { budgetService } from '../services/budgetService';
import { getCurrentMonth } from '../utils/dates';

interface BudgetState {
  budgets: BudgetWithSpent[];
  month: string;
  alerts: BudgetWithSpent[];
  loading: boolean;
  error: string | null;
  loadBudgets: (month?: string) => Promise<void>;
  addBudget: (data: Omit<Budget, 'id'>) => Promise<{ success: boolean; message?: string }>;
  updateBudget: (id: string, data: Partial<Omit<Budget, 'id'>>) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  setMonth: (month: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  month: getCurrentMonth(),
  alerts: [],
  loading: false,
  error: null,

  loadBudgets: async (month?: string) => {
    const targetMonth = month ?? get().month;
    set({ loading: true, error: null });

    try {
      const [budgets, alerts] = await Promise.all([
        budgetService.getByMonth(targetMonth),
        budgetService.getAlerts(targetMonth),
      ]);
      set({
        budgets,
        alerts,
        ...(month !== undefined ? { month: targetMonth } : {}),
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  addBudget: async (data) => {
    try {
      await budgetService.create(data);
      const budgets = await budgetService.getByMonth(data.month);
      set((state) => ({
        budgets: state.month === data.month ? budgets : state.budgets,
      }));
      await get().refreshAlerts();
      return { success: true };
    } catch (e: any) {
      set({ error: e.message });
      return { success: false, message: e.message };
    }
  },

  updateBudget: async (id, data) => {
    await budgetService.update(id, data);
    const { month } = get();
    const budgets = await budgetService.getByMonth(month);
    set({ budgets });
    await get().refreshAlerts();
  },

  removeBudget: async (id) => {
    const { month } = get();
    await budgetService.delete(id);
    const budgets = await budgetService.getByMonth(month);
    set({ budgets });
    await get().refreshAlerts();
  },

  setMonth: async (month: string) => {
    set({ month });
    await get().loadBudgets(month);
  },

  refreshAlerts: async () => {
    const { month } = get();
    try {
      const alerts = await budgetService.getAlerts(month);
      set({ alerts });
    } catch (e: any) {
      set({ error: e.message });
    }
  },
}));
