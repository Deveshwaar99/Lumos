import { create } from 'zustand';
import type { Category } from '../models/types';
import { categoryService } from '../services/categoryService';

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  loadCategories: () => Promise<void>;
  addCategory: (data: Omit<Category, 'id'>) => Promise<Category>;
  updateCategory: (
    id: string,
    data: Partial<Omit<Category, 'id'>>,
  ) => Promise<void>;
  removeCategory: (
    id: string,
  ) => Promise<{ success: boolean; message?: string }>;
  getCategoriesByType: (type: 'income' | 'expense') => Category[];
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  loadCategories: async () => {
    set({ loading: true, error: null });
    try {
      const categories = await categoryService.getAll();
      set({ categories, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  addCategory: async (data) => {
    const category = await categoryService.create(data);
    set((state) => ({ categories: [...state.categories, category] }));
    return category;
  },

  updateCategory: async (id, data) => {
    await categoryService.update(id, data);
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...data } : c,
      ),
    }));
  },

  removeCategory: async (id) => {
    const result = await categoryService.delete(id);
    if (result.success) {
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
      }));
    }
    return result;
  },

  getCategoriesByType: (type) => {
    return get().categories.filter((c) => c.type === type);
  },
}));
