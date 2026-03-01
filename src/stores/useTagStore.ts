import { create } from 'zustand';
import { Tag } from '../models/types';
import { tagService } from '../services/tagService';

interface TagState {
  tags: Tag[];
  loading: boolean;
  loadTags: () => Promise<void>;
  addTag: (name: string, color?: string) => Promise<Tag>;
  removeTag: (id: string) => Promise<void>;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loading: false,

  loadTags: async () => {
    set({ loading: true });
    const tags = await tagService.getAll();
    set({ tags, loading: false });
  },

  addTag: async (name: string, color?: string) => {
    const tag = await tagService.create(name, color);
    set((state) => ({ tags: [...state.tags, tag].sort((a, b) => a.name.localeCompare(b.name)) }));
    return tag;
  },

  removeTag: async (id: string) => {
    await tagService.delete(id);
    set((state) => ({ tags: state.tags.filter((t) => t.id !== id) }));
  },
}));
