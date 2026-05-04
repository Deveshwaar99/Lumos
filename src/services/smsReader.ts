import { PermissionsAndroid, Platform } from 'react-native';
import Constants from 'expo-constants';
import { STOCK_SMS_READ_TIMEOUT_MS } from '../constants/stockSync';
import type { SmsPermissionStatus } from '../models/types';

interface RawSmsBridgeRow {
  _id?: string | number;
  address?: string;
  body?: string;
  date?: string | number;
}

export interface RawSms {
  providerSmsId: string | null;
  sender: string;
  body: string;
  receivedAt: number;
}

const SmsAndroid = Platform.OS === 'android' ? require('react-native-get-sms-android') : null;

export async function requestSmsPermission(): Promise<SmsPermissionStatus> {
  if (Platform.OS !== 'android') return 'unsupported';

  const existing = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
  );
  if (existing) return 'granted';

  const status = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    {
      title: 'SMS access required',
      message:
        'MyMoney needs SMS access to import stock transactions from CDS-Alerts messages.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
      buttonNeutral: 'Ask Later',
    },
  );

  if (status === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'never_ask_again';
  return 'denied';
}

export async function readCdsAlerts(opts: {
  senderId: string;
  minDateMs: number;
}): Promise<RawSms[]> {
  if (Platform.OS !== 'android') return [];
  if (Constants.executionEnvironment === 'storeClient') {
    throw new Error(
      'SMS is not available in Expo Go. Use a development build (expo run:android).',
    );
  }
  if (!SmsAndroid?.list) {
    throw new Error('SMS reader module is not available in this build.');
  }

  const filter = JSON.stringify({
    box: 'inbox',
    address: opts.senderId,
    minDate: opts.minDateMs,
  });

  let listTimeoutId: ReturnType<typeof setTimeout> | undefined;
  const listPromise = new Promise<RawSmsBridgeRow[]>((resolve, reject) => {
    SmsAndroid.list(
      filter,
      (fail: string) => reject(new Error(fail || 'Unable to read SMS')),
      (_count: number, smsList: string) => {
        try {
          const parsed = JSON.parse(smsList) as RawSmsBridgeRow[];
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      },
    );
  });
  const timeoutPromise = new Promise<never>((_, reject) => {
    listTimeoutId = setTimeout(
      () =>
        reject(
          new Error(
            'Reading SMS timed out. Try Sync again, or check SMS permission and app build.',
          ),
        ),
      STOCK_SMS_READ_TIMEOUT_MS,
    );
  });
  let rows: RawSmsBridgeRow[];
  try {
    rows = await Promise.race([listPromise, timeoutPromise]);
  } finally {
    if (listTimeoutId !== undefined) {
      clearTimeout(listTimeoutId);
    }
  }

  return rows
    .filter((row) => typeof row.body === 'string' && row.body.trim().length > 0)
    .map((row) => ({
      providerSmsId:
        row._id === undefined || row._id === null ? null : String(row._id),
      sender: row.address ?? opts.senderId,
      body: row.body?.trim() ?? '',
      receivedAt: Number(row.date ?? Date.now()),
    }))
    .sort((a, b) => a.receivedAt - b.receivedAt);
}

