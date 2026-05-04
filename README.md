# Lumos

Offline-first personal finance app built with React Native and Expo. Track transactions, budgets, accounts, fixed deposits, and analytics -- all data stays on your device.

## Setup

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go or press `a` / `i` for Android emulator / iOS simulator.

## Android SMS Stocks Import

The Stocks SMS importer uses `READ_SMS` and native modules. This means:

- Use an Android development build (`npx expo run:android` or `eas build --profile development`)
- Expo Go does not support SMS inbox access APIs
- iOS cannot read inbox SMS, so auto-import is Android-only

## Tech Stack

Expo SDK 54 | React Native | TypeScript | React Navigation 7 | React Native Paper 5 | Zustand | expo-sqlite | Victory Native | react-hook-form + Zod

## Features

- Transactions with split payments and calculator keypad
- Accounts with computed balances and transfers
- Monthly budgets with progress tracking and alerts
- Fixed deposits with maturity processing
- Analytics: category breakdown, cash flow, calendar heatmap, net worth
- JSON backup/restore and CSV export
- Fully offline, no server, no account required
