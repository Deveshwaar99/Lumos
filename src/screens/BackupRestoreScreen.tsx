import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Button,
  Card,
  Snackbar,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { backupService } from '../services/backupService';
import { exportService } from '../services/exportService';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useCategoryStore } from '../stores/useCategoryStore';
import { useAccountStore } from '../stores/useAccountStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useFDStore } from '../stores/useFDStore';
import { useRecurringStore } from '../stores/useRecurringStore';
import { colors, spacing, radius } from '../theme';
import type { RootStackScreenProps } from '../navigation/types';
import type { BackupData } from '../models/types';

export default function BackupRestoreScreen({
  navigation,
}: RootStackScreenProps<'BackupRestore'>) {
  const { settings, loadSettings } = useSettingsStore();
  const { loadTransactions } = useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { loadAccounts } = useAccountStore();
  const { loadBudgets } = useBudgetStore();
  const { loadDeposits } = useFDStore();
  const { loadRecurring } = useRecurringStore();
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const filePath = await backupService.createBackup();
      await backupService.shareBackup(filePath);
      setSnackbar('Backup created successfully!');
    } catch (e: any) {
      setSnackbar(e.message || 'Backup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      const result = await backupService.pickAndRestore();
      if (!result.success) {
        if (result.message !== 'Cancelled') setSnackbar(result.message);
        return;
      }

      const backupData = (result as any).data as BackupData;

      Alert.alert(
        'Restore Backup',
        `This will replace ALL current data with the backup from ${backupData.exportedAt}. This cannot be undone. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              try {
                await backupService.restoreFromData(backupData);
                await Promise.all([
                  loadSettings(),
                  loadCategories(),
                  loadAccounts(),
                  loadTransactions(true),
                  loadBudgets(),
                  loadDeposits(),
                  loadRecurring(),
                ]);
                navigation.navigate('Tabs' as any);
              } catch (e: any) {
                setSnackbar(e.message || 'Restore failed');
              } finally {
                setLoading(false);
              }
            },
          },
        ],
      );
    } catch (e: any) {
      setSnackbar(e.message || 'Failed to read backup file');
    }
  };

  const handleExportCSV = async () => {
    setLoading(true);
    try {
      await exportService.exportTransactionsCSV();
      setSnackbar('CSV exported successfully!');
    } catch (e: any) {
      setSnackbar(e.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading && (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loader}
          />
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Backup
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              Create a full backup of your data (categories, accounts,
              transactions, splits, budgets, fixed deposits, recurring rules, and
              settings) as a JSON file.
            </Text>
            {settings.lastBackupAt && (
              <Text variant="bodySmall" style={styles.lastBackup}>
                Last backup: {settings.lastBackupAt}
              </Text>
            )}
            <Button
              mode="contained"
              onPress={handleCreateBackup}
              style={styles.button}
              icon="cloud-upload"
              disabled={loading}
            >
              Create & Share Backup
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Restore
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              Restore data from a previously created backup file. Warning: this
              will replace all current data.
            </Text>
            <Button
              mode="outlined"
              onPress={handleRestore}
              style={styles.button}
              icon="cloud-download"
              disabled={loading}
            >
              Restore from File
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Export CSV
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              Export all transactions as a CSV spreadsheet for printing or
              analysis.
            </Text>
            <Button
              mode="outlined"
              onPress={handleExportCSV}
              style={styles.button}
              icon="file-delimited"
              disabled={loading}
            >
              Export Transactions CSV
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  loader: { marginBottom: 16 },
  card: {
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  cardTitle: { marginBottom: 8, color: colors.text },
  description: { color: colors.textSecondary, marginBottom: 12 },
  lastBackup: {
    color: colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  button: { marginTop: 4, borderRadius: radius.capsule },
});
