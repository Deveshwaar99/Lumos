# Lumos

Lumos is a personal finance app I built to keep track of money without handing my data to anyone. It runs entirely on your phone. There's no server, no login, and nothing leaves the device. You install it, and that's it.

It's built with React Native and Expo, and it covers the things I actually wanted in one place: day-to-day spending, budgets, accounts, fixed deposits, and a bit of stock tracking, plus some charts to make sense of it all.

## What it does

**Spending and accounts.** Add transactions (including split payments, with a calculator built into the amount field), organize them by category, and move money between accounts. Balances are calculated for you. Recurring transactions get added automatically so you don't have to remember them.

**Budgets.** Set monthly budgets per category and watch the progress bars fill up. You get a nudge when you're getting close to a limit.

**Fixed deposits.** Track FDs with maturity dates and interest, and let the app handle them when they mature.

**Stocks.** Keep an eye on your holdings and their movement history. On Android, the app can read broker and CDS confirmation SMS and pull in stock activity automatically.

**Analytics.** Category breakdowns, cash flow, net worth over time, and a calendar heatmap, all sliced by whatever time period you're looking at.

**Your data stays yours.** Export to CSV, back up and restore the whole thing as JSON, and lock the app behind your phone's biometrics or PIN.

## Built with

Expo SDK 54 and React Native, written in TypeScript. It uses React Navigation for routing, React Native Paper for the UI (with Reanimated and Skia doing the heavier visual lifting), Zustand for state, and expo-sqlite for storage. Charts come from Victory Native, and forms are handled with react-hook-form and Zod.

## A note on SMS import

The stock SMS import needs the `READ_SMS` permission and a native module, so it won't work in Expo Go. You'll need an Android development build for that (`npx expo run:android`). iOS doesn't allow reading the SMS inbox at all, so the auto-import is Android-only.

## Contributing

If you'd like to help out, fork the repo, make your changes on a branch, run `npm run format`, and open a pull request describing what you changed.
