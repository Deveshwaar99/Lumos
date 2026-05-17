import type { AppSettings } from '../models/types';

export const DEFAULT_SETTINGS: AppSettings = {
  decimalPlaces: 2,
  currencyCode: 'USD',
  currencySymbol: '$',
  lastBackupAt: null,
  username: '',
  screenLockEnabled: false,
};
