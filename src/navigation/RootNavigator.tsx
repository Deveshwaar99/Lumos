import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import type { RootStackParamList } from './types';
import TabNavigator from './TabNavigator';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import CategoryFormScreen from '../screens/CategoryFormScreen';
import AccountFormScreen from '../screens/AccountFormScreen';
import AccountTransactionsScreen from '../screens/AccountTransactionsScreen';
import CategoryTransactionsScreen from '../screens/CategoryTransactionsScreen';
import BudgetFormScreen from '../screens/BudgetFormScreen';
import FDFormScreen from '../screens/FDFormScreen';
import FDDetailScreen from '../screens/FDDetailScreen';
import RecurringTransactionFormScreen from '../screens/RecurringTransactionFormScreen';
import StockDetailScreen from '../screens/StockDetailScreen';
import StockMovementFormScreen from '../screens/StockMovementFormScreen';
import StockSmsLogScreen from '../screens/StockSmsLogScreen';
import BackupRestoreScreen from '../screens/BackupRestoreScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        animationDuration: 250,
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{
          title: 'Add Transaction',
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          animationDuration: 300,
        }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: 'Transaction Details' }}
      />
      <Stack.Screen
        name="CategoryForm"
        component={CategoryFormScreen}
        options={{ title: 'Category' }}
      />
      <Stack.Screen
        name="AccountForm"
        component={AccountFormScreen}
        options={{ title: 'Account' }}
      />
      <Stack.Screen
        name="AccountTransactions"
        component={AccountTransactionsScreen}
        options={{ title: 'Account Transactions' }}
      />
      <Stack.Screen
        name="CategoryTransactions"
        component={CategoryTransactionsScreen}
        options={{ title: 'Category Transactions' }}
      />
      <Stack.Screen
        name="BudgetForm"
        component={BudgetFormScreen}
        options={{ title: 'Budget' }}
      />
      <Stack.Screen
        name="FDForm"
        component={FDFormScreen}
        options={{ title: 'Fixed Deposit' }}
      />
      <Stack.Screen
        name="FDDetail"
        component={FDDetailScreen}
        options={{ title: 'FD Details' }}
      />
      <Stack.Screen
        name="RecurringTransactionForm"
        component={RecurringTransactionFormScreen}
        options={{ title: 'Recurring Transaction', headerShown: false, presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 300 }}
      />
      <Stack.Screen
        name="StockDetail"
        component={StockDetailScreen}
        options={{ title: 'Stock Details' }}
      />
      <Stack.Screen
        name="StockMovementForm"
        component={StockMovementFormScreen}
        options={{ title: 'Stock Movement' }}
      />
      <Stack.Screen
        name="StockSmsLog"
        component={StockSmsLogScreen}
        options={{ title: 'SMS Import Log' }}
      />
      <Stack.Screen
        name="BackupRestore"
        component={BackupRestoreScreen}
        options={{ title: 'Backup & Restore' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}
