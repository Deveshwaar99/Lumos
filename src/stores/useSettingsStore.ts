import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '../constants/defaults';
import { getDatabase } from '../db/database';
import type { AppSettings } from '../models/types';

interface SettingsRow {
  key: string;
  value: string;
}

function parseValue(
  key: keyof AppSettings,
  value: string,
): string | number | boolean | null {
  if (value === 'null') return null;
  if (key === 'decimalPlaces') return parseInt(value, 10) || 0;
  if (key === 'screenLockEnabled') return value === 'true';
  return value;
}

function buildSettingsFromRows(rows: SettingsRow[]): AppSettings {
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    const key = row.key as keyof AppSettings;
    if (key in DEFAULT_SETTINGS) {
      (settings as Record<string, unknown>)[key] = parseValue(key, row.value);
    }
  }
  return settings;
}

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loading: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<SettingsRow>('SELECT * FROM settings');
      const settings = buildSettingsFromRows(rows);
      set({ settings, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  updateSetting: async (key, value) => {
    const db = await getDatabase();
    const strValue =
      value === null
        ? 'null'
        : typeof value === 'boolean'
          ? String(value)
          : String(value);
    await db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, strValue],
    );
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));
  },
}));
