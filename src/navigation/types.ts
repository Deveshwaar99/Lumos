import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Analytics: undefined;
  Budgets: undefined;
  Accounts: undefined;
  Categories: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  AddTransaction: { type?: 'income' | 'expense'; transactionId?: string } | undefined;
  TransactionDetail: { transactionId: string };
  CategoryForm: { categoryId?: string; categoryType?: 'income' | 'expense' } | undefined;
  AccountForm: { accountId?: string } | undefined;
  BudgetForm: { budgetId?: string; month?: string } | undefined;
  BackupRestore: undefined;
  Settings: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
