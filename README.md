# MyMoney - Personal Finance Manager

An offline-first personal money manager and budget app built with React Native + Expo, featuring a dark Splitwise-inspired Material You theme and split payment support.

## Getting Started

```bash
cd MyMoney
npm install
npx expo start
```

Scan the QR code with Expo Go (Android/iOS) or press `a` for Android emulator / `i` for iOS simulator.

**Note:** Some features (Quick Actions) require a development build rather than Expo Go.

## Architecture

```
src/
  db/           SQLite database setup, migrations, seed data
  models/       TypeScript interfaces and Zod validation schemas
  stores/       Zustand state management (5 stores)
  services/     Business logic layer (8 services)
  screens/      React Native screens (12 screens)
  components/   Reusable UI components + chart components
  navigation/   React Navigation setup (tabs + stack)
  theme/        Material You dark theme (colors, spacing, radius, typography, elevation)
  utils/        Money formatting, date helpers, CSV, UUID
  constants/    Default settings
```

### Data Flow

Screens -> Zustand Stores -> Services -> SQLite Database

- **Screens** use Zustand stores for state and call store actions
- **Stores** orchestrate service calls and manage UI state
- **Services** contain all database queries and business logic
- **SQLite** stores all data locally with WAL mode and foreign keys

### Key Design Decisions

- **Amounts stored as integer cents** to avoid floating-point issues
- **Account balances are computed** (opening + income - expense), not stored
- **Split payments** allow a single transaction to be paid from two accounts
- **Transfers** modeled as two linked transactions
- **Settings** stored as key-value pairs in SQLite
- **Pagination** via SQL LIMIT/OFFSET for 10k+ transaction performance
- **All features available to all users** -- no gating or paywalls
- **Dark theme** with Splitwise-inspired Material You color palette

## Feature Checklist

### A) Transactions
- [x] Add/Edit/Delete transactions with calculator keypad
- [x] Split payment across two accounts
- [x] Quick add via in-app FAB
- [x] Quick Actions for home screen shortcuts
- [x] Transactions grouped by date on home screen
- [x] Month navigation with summary bar (expense/income/balance)
- [x] Transaction detail view with split breakdown
- [x] Paginated list for performance (PAGE_SIZE=20)

### B) Categories
- [x] CRUD categories with icon + color picker
- [x] Separate income/expense tabs
- [x] Prevent deleting categories in use
- [x] Accessible as a bottom tab

### C) Accounts
- [x] CRUD accounts
- [x] Computed balances from transaction splits
- [x] Transfer between accounts
- [x] Accessible as a bottom tab

### D) Budget Planner
- [x] Monthly budget per expense category (unlimited)
- [x] Budget progress indicator
- [x] Threshold alerts (80% default)
- [x] Over-budget warnings
- [x] Budget dashboard with spent/remaining

### E) Analytics
- [x] Income vs Expense pie chart
- [x] Daily cash flow line chart
- [x] Account contribution bar chart
- [x] Monthly summary (income/expense/net)
- [x] Top 5 expense categories
- [x] Export analytics

### F) Offline + Data Safety
- [x] All data in local SQLite
- [x] JSON backup/restore with schema version validation
- [x] CSV export with sharing

### G) Reminders
- [x] Daily notification reminder
- [x] Enable/disable + time picker in Settings
- [x] Reschedule on app start

### H) Privacy
- [x] No network required (fully offline)
- [x] All data stays on device
- [x] Privacy section in Settings

### Navigation
- Bottom tabs: Records, Analysis, Budgets, Accounts, Categories
- Settings accessible from home screen menu icon

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54, React Native |
| Language | TypeScript |
| Navigation | React Navigation 7 (tabs + stack) |
| UI | React Native Paper 5 (MD3 Dark Theme) |
| State | Zustand 5 |
| Database | expo-sqlite (SQLite) |
| Forms | react-hook-form + Zod |
| Charts | react-native-svg |
| Notifications | expo-notifications |
| Quick Actions | expo-quick-actions |
| File I/O | expo-file-system + expo-sharing |
| Dates | date-fns |
