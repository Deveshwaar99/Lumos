import { create } from 'zustand';
import type {
  SmsPermissionStatus,
  StockHolding,
  StockMovement,
  StockMovementInput,
  StockSmsLog,
} from '../models/types';
import { stockService } from '../services/stockService';

type StockSyncResult = {
  status: 'ok' | 'permission_denied' | 'unsupported';
  permissionStatus: SmsPermissionStatus;
  newSms: number;
  newMovements: number;
  failed: number;
  unsupportedReason?: 'expo_go';
};

/** Coalesce overlapping sync() calls so `isSyncing` always clears when the active run finishes. */
let stockSyncInFlight: Promise<StockSyncResult> | null = null;

interface StockState {
  holdings: StockHolding[];
  movements: StockMovement[];
  smsLogs: StockSmsLog[];
  lastSyncAt: number | null;
  isSyncing: boolean;
  loading: boolean;
  syncError: string | null;
  permissionStatus: SmsPermissionStatus;
  loadAll: () => Promise<void>;
  sync: () => Promise<StockSyncResult>;
  loadMovementsForCode: (stockCode: string) => Promise<void>;
  loadSmsLogs: () => Promise<void>;
  addManualMovement: (input: StockMovementInput) => Promise<void>;
  updateMovement: (
    id: string,
    patch: Partial<StockMovementInput>,
  ) => Promise<void>;
  deleteMovement: (id: string) => Promise<void>;
  ignoreSms: (id: string) => Promise<void>;
  reparseSms: (id: string) => Promise<void>;
  reparseAll: () => Promise<void>;
  setSenderId: (senderId: string) => Promise<void>;
}

export const useStockStore = create<StockState>((set, get) => ({
  holdings: [],
  movements: [],
  smsLogs: [],
  lastSyncAt: null,
  isSyncing: false,
  loading: false,
  syncError: null,
  permissionStatus: 'unknown',

  loadAll: async () => {
    set({ loading: true, syncError: null });
    try {
      const [holdings, smsLogs, lastSyncAtRaw] = await Promise.all([
        stockService.computeHoldings(),
        stockService.listSmsLogs({ limit: 50 }),
        stockService.getMeta('lastSyncAt'),
      ]);
      set({
        holdings,
        smsLogs,
        lastSyncAt: lastSyncAtRaw ? Number(lastSyncAtRaw) : null,
        loading: false,
      });
    } catch (error: any) {
      set({ loading: false, syncError: error?.message ?? 'Failed to load stocks' });
    }
  },

  sync: async () => {
    if (stockSyncInFlight) {
      return stockSyncInFlight;
    }
    set({ isSyncing: true, syncError: null });
    stockSyncInFlight = (async (): Promise<StockSyncResult> => {
      try {
        const result = await stockService.ingestSms();
        const [holdings, smsLogs, lastSyncAtRaw] = await Promise.all([
          stockService.computeHoldings(),
          stockService.listSmsLogs({ limit: 100 }),
          stockService.getMeta('lastSyncAt'),
        ]);
        set({
          isSyncing: false,
          holdings,
          smsLogs,
          lastSyncAt: lastSyncAtRaw ? Number(lastSyncAtRaw) : null,
          permissionStatus: result.permissionStatus,
          syncError: null,
        });
        return result;
      } catch (error: any) {
        set({
          isSyncing: false,
          syncError: error?.message ?? 'Failed to sync SMS',
        });
        return {
          status: 'unsupported' as const,
          permissionStatus: 'unknown' as SmsPermissionStatus,
          newSms: 0,
          newMovements: 0,
          failed: 0,
        };
      } finally {
        stockSyncInFlight = null;
      }
    })();
    return stockSyncInFlight;
  },

  loadMovementsForCode: async (stockCode: string) => {
    const movements = await stockService.getMovementsByCode(stockCode);
    set({ movements });
  },

  loadSmsLogs: async () => {
    const smsLogs = await stockService.listSmsLogs({ limit: 200 });
    set({ smsLogs });
  },

  addManualMovement: async (input: StockMovementInput) => {
    await stockService.addMovement(input);
    const [holdings, movements] = await Promise.all([
      stockService.computeHoldings(),
      stockService.getMovementsByCode(input.stockCode),
    ]);
    set({ holdings, movements });
  },

  updateMovement: async (id, patch) => {
    const before = get().movements.find((m) => m.id === id);
    await stockService.updateMovement(id, patch);
    const refreshCode = patch.stockCode ?? before?.stockCode;
    const [holdings, movements] = await Promise.all([
      stockService.computeHoldings(),
      refreshCode ? stockService.getMovementsByCode(refreshCode) : Promise.resolve([]),
    ]);
    set({ holdings, movements });
  },

  deleteMovement: async (id) => {
    const before = get().movements.find((m) => m.id === id);
    await stockService.deleteMovement(id);
    const [holdings, movements] = await Promise.all([
      stockService.computeHoldings(),
      before ? stockService.getMovementsByCode(before.stockCode) : Promise.resolve([]),
    ]);
    set({ holdings, movements });
  },

  ignoreSms: async (id) => {
    await stockService.ignoreSms(id);
    const [holdings, smsLogs] = await Promise.all([
      stockService.computeHoldings(),
      stockService.listSmsLogs({ limit: 200 }),
    ]);
    set({ holdings, smsLogs });
  },

  reparseSms: async (id) => {
    await stockService.reparseSms(id);
    const [holdings, smsLogs] = await Promise.all([
      stockService.computeHoldings(),
      stockService.listSmsLogs({ limit: 200 }),
    ]);
    set({ holdings, smsLogs });
  },

  reparseAll: async () => {
    await stockService.reparseAll();
    const [holdings, smsLogs] = await Promise.all([
      stockService.computeHoldings(),
      stockService.listSmsLogs({ limit: 200 }),
    ]);
    set({ holdings, smsLogs });
  },

  setSenderId: async (senderId: string) => {
    await stockService.setMeta('senderId', senderId.trim() || 'CDS-Alerts');
  },
}));

