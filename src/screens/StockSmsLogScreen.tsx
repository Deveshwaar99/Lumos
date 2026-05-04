import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, Button, Icon, Snackbar } from 'react-native-paper';
import { format } from 'date-fns';
import { useStockStore } from '../stores/useStockStore';
import { colors, spacing, radius } from '../theme';
import type { RootStackScreenProps } from '../navigation/types';
import type { StockSmsLog } from '../models/types';

const STATUS_COLOR: Record<StockSmsLog['parseStatus'], string> = {
  success: colors.income,
  failed: colors.error,
  ignored: colors.textSecondary,
};

export default function StockSmsLogScreen({
  navigation,
}: RootStackScreenProps<'StockSmsLog'>) {
  const { smsLogs, loadSmsLogs, reparseSms, ignoreSms, reparseAll } = useStockStore();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');

  const loadData = useCallback(async () => {
    await loadSmsLogs();
  }, [loadSmsLogs]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        title: 'SMS Import Log',
      });
      loadData();
    }, [navigation, loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const onReparse = async (id: string) => {
    await reparseSms(id);
    await loadData();
    setSnackbar('SMS reparsed');
  };

  const onIgnore = async (id: string) => {
    await ignoreSms(id);
    await loadData();
    setSnackbar('SMS ignored');
  };

  const onReparseAll = async () => {
    await reparseAll();
    await loadData();
    setSnackbar('Reparsed all messages');
  };

  const renderItem = ({ item }: { item: StockSmsLog }) => {
    const expanded = expandedId === item.id;
    const statusColor = STATUS_COLOR[item.parseStatus];
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.sender}
            </Text>
            <Text style={styles.cardSub}>
              {format(new Date(item.receivedAt), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.parseStatus.toUpperCase()}
            </Text>
          </View>
          <Icon
            source={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {expanded ? (
          <View style={styles.expandWrap}>
            <Text style={styles.smsBody}>{item.body}</Text>
            <Text style={styles.meta}>
              Movements: {item.movementCount}
              {item.parseError ? ` • ${item.parseError}` : ''}
            </Text>
            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                onPress={() => onReparse(item.id)}
                compact
                icon="refresh"
              >
                Re-parse
              </Button>
              <Button
                mode="outlined"
                onPress={() => onIgnore(item.id)}
                compact
                icon="eye-off"
                textColor={colors.warning}
              >
                Ignore
              </Button>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={smsLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Button
            mode="contained-tonal"
            style={styles.reparseAll}
            icon="refresh-circle"
            onPress={onReparseAll}
          >
            Re-parse All
          </Button>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon source="message-alert-outline" size={44} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No SMS logs available yet.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={2500}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 24 },
  reparseAll: { marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  cardSub: { color: colors.textTertiary, fontSize: 12, marginTop: 1 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.capsule,
  },
  statusText: { fontWeight: '700', fontSize: 10 },
  expandWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  smsBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  meta: { color: colors.textTertiary, fontSize: 12, marginTop: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  empty: { alignItems: 'center', paddingTop: 64 },
  emptyText: { color: colors.textSecondary, marginTop: spacing.md },
});

