import { create } from 'zustand';
import type {
  BrokerFundingSmsLog,
  BrokerFundingSummary,
  BrokerFundingSyncResult,
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
  brokerFundingLogs: BrokerFundingSmsLog[];
  brokerFundingSummary: BrokerFundingSummary;
  brokerFundingSenderIds: string[];
  brokerFundingKeywords: string[];
  brokerFundingLastSyncAt: number | null;
  lastSyncAt: number | null;
  isSyncing: boolean;
  isBrokerFundingSyncing: boolean;
  loading: boolean;
  syncError: string | null;
  brokerFundingSyncError: string | null;
  permissionStatus: SmsPermissionStatus;
  loadAll: () => Promise<void>;
  sync: () => Promise<StockSyncResult>;
  syncBrokerFunding: () => Promise<BrokerFundingSyncResult>;
  loadMovementsForCode: (stockCode: string) => Promise<void>;
  loadSmsLogs: () => Promise<void>;
  loadBrokerFundingLogs: () => Promise<void>;
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
  setBrokerFundingSenderIds: (senderIds: string[]) => Promise<void>;
  setBrokerFundingKeywords: (keywords: string[]) => Promise<void>;
  importDemoBrokerFundingSms: () => Promise<{
    inserted: number;
    matched: number;
    unmatched: number;
  }>;
  confirmBrokerFundingSms: (
    id: string,
    amountCents?: number | null,
  ) => Promise<void>;
  ignoreBrokerFundingSms: (id: string) => Promise<void>;
  reparseBrokerFundingSms: (id: string) => Promise<void>;
  reparseAllBrokerFundingSms: () => Promise<void>;
  clearTradeSmsLogs: () => Promise<void>;
  clearBrokerFundingSmsLogs: () => Promise<void>;
  clearTradeSmsAndResync: () => Promise<StockSyncResult>;
  clearBrokerFundingSmsAndResync: () => Promise<BrokerFundingSyncResult>;
}

export const useStockStore = create<StockState>((set, get) => ({
  holdings: [],
  movements: [],
  smsLogs: [],
  brokerFundingLogs: [],
  brokerFundingSummary: {
    totalInvestedCents: 0,
    matchedCount: 0,
    unmatchedCount: 0,
    ignoredCount: 0,
  },
  brokerFundingSenderIds: [],
  brokerFundingKeywords: [],
  brokerFundingLastSyncAt: null,
  lastSyncAt: null,
  isSyncing: false,
  isBrokerFundingSyncing: false,
  loading: false,
  syncError: null,
  brokerFundingSyncError: null,
  permissionStatus: 'unknown',

  loadAll: async () => {
    set({ loading: true, syncError: null, brokerFundingSyncError: null });
    try {
      const [
        holdings,
        smsLogs,
        lastSyncAtRaw,
        brokerFundingLogs,
        brokerFundingSummary,
        brokerFundingSenderIds,
        brokerFundingKeywords,
        brokerFundingLastSyncAtRaw,
      ] = await Promise.all([
        stockService.computeHoldings(),
        stockService.listSmsLogs({ limit: 50 }),
        stockService.getMeta('lastSyncAt'),
        stockService.listBrokerFundingLogs({ limit: 100 }),
        stockService.getBrokerFundingSummary(),
        stockService.getBrokerFundingSenderIds(),
        stockService.getBrokerFundingKeywords(),
        stockService.getMeta('brokerFundingLastSyncAt'),
      ]);
      set({
        holdings,
        smsLogs,
        brokerFundingLogs,
        brokerFundingSummary,
        brokerFundingSenderIds,
        brokerFundingKeywords,
        brokerFundingLastSyncAt: brokerFundingLastSyncAtRaw
          ? Number(brokerFundingLastSyncAtRaw)
          : null,
        lastSyncAt: lastSyncAtRaw ? Number(lastSyncAtRaw) : null,
        loading: false,
      });
    } catch (error: any) {
      set({
        loading: false,
        syncError: error?.message ?? 'Failed to load stocks',
      });
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

  syncBrokerFunding: async () => {
    set({ isBrokerFundingSyncing: true, brokerFundingSyncError: null });
    try {
      const result = await stockService.syncBrokerFundingSms();
      const [
        brokerFundingLogs,
        brokerFundingSummary,
        brokerFundingSenderIds,
        brokerFundingKeywords,
        brokerFundingLastSyncAtRaw,
      ] = await Promise.all([
        stockService.listBrokerFundingLogs({ limit: 200 }),
        stockService.getBrokerFundingSummary(),
        stockService.getBrokerFundingSenderIds(),
        stockService.getBrokerFundingKeywords(),
        stockService.getMeta('brokerFundingLastSyncAt'),
      ]);
      set({
        isBrokerFundingSyncing: false,
        brokerFundingLogs,
        brokerFundingSummary,
        brokerFundingSenderIds,
        brokerFundingKeywords,
        brokerFundingLastSyncAt: brokerFundingLastSyncAtRaw
          ? Number(brokerFundingLastSyncAtRaw)
          : null,
        permissionStatus: result.permissionStatus,
        brokerFundingSyncError: null,
      });
      return result;
    } catch (error: any) {
      set({
        isBrokerFundingSyncing: false,
        brokerFundingSyncError:
          error?.message ?? 'Failed to sync broker funding SMS',
      });
      return {
        status: 'unsupported' as const,
        permissionStatus: 'unknown' as SmsPermissionStatus,
        scanned: 0,
        matched: 0,
        unmatched: 0,
      };
    }
  },

  loadMovementsForCode: async (stockCode: string) => {
    const movements = await stockService.getMovementsByCode(stockCode);
    set({ movements });
  },

  loadSmsLogs: async () => {
    const smsLogs = await stockService.listSmsLogs({ limit: 200 });
    set({ smsLogs });
  },

  loadBrokerFundingLogs: async () => {
    const [brokerFundingLogs, brokerFundingSummary] = await Promise.all([
      stockService.listBrokerFundingLogs({ limit: 200 }),
      stockService.getBrokerFundingSummary(),
    ]);
    set({ brokerFundingLogs, brokerFundingSummary });
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
      refreshCode
        ? stockService.getMovementsByCode(refreshCode)
        : Promise.resolve([]),
    ]);
    set({ holdings, movements });
  },

  deleteMovement: async (id) => {
    const before = get().movements.find((m) => m.id === id);
    await stockService.deleteMovement(id);
    const [holdings, movements] = await Promise.all([
      stockService.computeHoldings(),
      before
        ? stockService.getMovementsByCode(before.stockCode)
        : Promise.resolve([]),
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

  setBrokerFundingSenderIds: async (senderIds: string[]) => {
    await stockService.setBrokerFundingSenderIds(senderIds);
    set({
      brokerFundingSenderIds: await stockService.getBrokerFundingSenderIds(),
    });
  },

  setBrokerFundingKeywords: async (keywords: string[]) => {
    await stockService.setBrokerFundingKeywords(keywords);
    set({
      brokerFundingKeywords: await stockService.getBrokerFundingKeywords(),
    });
  },

  importDemoBrokerFundingSms: async () => {
    const result = await stockService.importDemoBrokerFundingSms();
    const [
      brokerFundingLogs,
      brokerFundingSummary,
      brokerFundingSenderIds,
      brokerFundingKeywords,
    ] = await Promise.all([
      stockService.listBrokerFundingLogs({ limit: 200 }),
      stockService.getBrokerFundingSummary(),
      stockService.getBrokerFundingSenderIds(),
      stockService.getBrokerFundingKeywords(),
    ]);
    set({
      brokerFundingLogs,
      brokerFundingSummary,
      brokerFundingSenderIds,
      brokerFundingKeywords,
    });
    return result;
  },

  confirmBrokerFundingSms: async (id, amountCents) => {
    await stockService.confirmBrokerFundingSms(id, amountCents);
    const [brokerFundingLogs, brokerFundingSummary] = await Promise.all([
      stockService.listBrokerFundingLogs({ limit: 200 }),
      stockService.getBrokerFundingSummary(),
    ]);
    set({ brokerFundingLogs, brokerFundingSummary });
  },

  ignoreBrokerFundingSms: async (id) => {
    await stockService.ignoreBrokerFundingSms(id);
    const [brokerFundingLogs, brokerFundingSummary] = await Promise.all([
      stockService.listBrokerFundingLogs({ limit: 200 }),
      stockService.getBrokerFundingSummary(),
    ]);
    set({ brokerFundingLogs, brokerFundingSummary });
  },

  reparseBrokerFundingSms: async (id) => {
    await stockService.reparseBrokerFundingSms(id);
    const [brokerFundingLogs, brokerFundingSummary] = await Promise.all([
      stockService.listBrokerFundingLogs({ limit: 200 }),
      stockService.getBrokerFundingSummary(),
    ]);
    set({ brokerFundingLogs, brokerFundingSummary });
  },

  reparseAllBrokerFundingSms: async () => {
    await stockService.reparseAllBrokerFundingSms();
    const [brokerFundingLogs, brokerFundingSummary] = await Promise.all([
      stockService.listBrokerFundingLogs({ limit: 200 }),
      stockService.getBrokerFundingSummary(),
    ]);
    set({ brokerFundingLogs, brokerFundingSummary });
  },

  clearTradeSmsLogs: async () => {
    await stockService.clearTradeSmsLogs();
    const [holdings, smsLogs] = await Promise.all([
      stockService.computeHoldings(),
      stockService.listSmsLogs({ limit: 100 }),
    ]);
    set({ holdings, smsLogs, lastSyncAt: null, syncError: null });
  },

  clearBrokerFundingSmsLogs: async () => {
    await stockService.clearBrokerFundingSmsLogs();
    const [brokerFundingLogs, brokerFundingSummary] = await Promise.all([
      stockService.listBrokerFundingLogs({ limit: 200 }),
      stockService.getBrokerFundingSummary(),
    ]);
    set({
      brokerFundingLogs,
      brokerFundingSummary,
      brokerFundingLastSyncAt: null,
      brokerFundingSyncError: null,
    });
  },

  clearTradeSmsAndResync: async () => {
    set({ isSyncing: true, syncError: null });
    try {
      const result = await stockService.clearTradeSmsAndResync();
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
        syncError: error?.message ?? 'Failed to clear and resync trade SMS',
      });
      return {
        status: 'unsupported' as const,
        permissionStatus: 'unknown' as SmsPermissionStatus,
        newSms: 0,
        newMovements: 0,
        failed: 0,
      };
    }
  },

  clearBrokerFundingSmsAndResync: async () => {
    set({ isBrokerFundingSyncing: true, brokerFundingSyncError: null });
    try {
      const result = await stockService.clearBrokerFundingSmsAndResync();
      const [
        brokerFundingLogs,
        brokerFundingSummary,
        brokerFundingSenderIds,
        brokerFundingKeywords,
        brokerFundingLastSyncAtRaw,
      ] = await Promise.all([
        stockService.listBrokerFundingLogs({ limit: 200 }),
        stockService.getBrokerFundingSummary(),
        stockService.getBrokerFundingSenderIds(),
        stockService.getBrokerFundingKeywords(),
        stockService.getMeta('brokerFundingLastSyncAt'),
      ]);
      set({
        isBrokerFundingSyncing: false,
        brokerFundingLogs,
        brokerFundingSummary,
        brokerFundingSenderIds,
        brokerFundingKeywords,
        brokerFundingLastSyncAt: brokerFundingLastSyncAtRaw
          ? Number(brokerFundingLastSyncAtRaw)
          : null,
        permissionStatus: result.permissionStatus,
        brokerFundingSyncError: null,
      });
      return result;
    } catch (error: any) {
      set({
        isBrokerFundingSyncing: false,
        brokerFundingSyncError:
          error?.message ?? 'Failed to clear and resync broker funding SMS',
      });
      return {
        status: 'unsupported' as const,
        permissionStatus: 'unknown' as SmsPermissionStatus,
        scanned: 0,
        matched: 0,
        unmatched: 0,
      };
    }
  },
}));
