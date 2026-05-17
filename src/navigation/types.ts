import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { TransactionType } from '../models/types';

export type TabParamList = {
  Home: undefined;
  Analytics: undefined;
  Budgets: undefined;
  Accounts: undefined;
  Categories: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  AddTransaction:
    | {
        type?: TransactionType;
        transactionId?: string;
        accountId?: string;
        categoryId?: string;
      }
    | undefined;
  TransactionDetail: { transactionId: string };
  CategoryForm:
    | { categoryId?: string; categoryType?: 'income' | 'expense' }
    | undefined;
  AccountForm: { accountId?: string } | undefined;
  AccountTransactions: { accountId: string };
  CategoryTransactions: { categoryId: string };
  BudgetForm:
    | { budgetId?: string; month?: string; categoryId?: string }
    | undefined;
  FDForm: { fdId?: string } | undefined;
  FDDetail: { fdId: string };
  RecurringTransactionForm: { recurringId?: string } | undefined;
  StockDetail: { stockCode: string };
  StockMovementForm: { movementId?: string; stockCode?: string } | undefined;
  StockSmsLog: undefined;
  BackupRestore: undefined;
  Settings: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
