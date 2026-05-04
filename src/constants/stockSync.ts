/** History window for the first inbox scan when there is no lastSyncAt yet (e.g. fresh install or after reset). */
export const STOCK_FIRST_SYNC_WINDOW_DAYS = 365;

/**
 * Minimum gap between automatic SMS syncs when you open the Stocks tab.
 * (~1 CDS alert per day — avoids polling every 30 minutes.) Manual Sync / pull-to-refresh always runs.
 */
export const STOCK_MIN_AUTO_SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000;

/** Abort SMS inbox read if the native module never invokes its callback (avoids stuck Sync spinner). */
export const STOCK_SMS_READ_TIMEOUT_MS = 3 * 60 * 1000;
