import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, Icon, FAB, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useStockStore } from '../stores/useStockStore';
import { colors, spacing, radius, elevation } from '../theme';
import type { RootStackScreenProps } from '../navigation/types';
import type { StockMovement } from '../models/types';

export default function StockDetailScreen({
  navigation,
  route,
}: RootStackScreenProps<'StockDetail'>) {
  const { stockCode } = route.params;
  const insets = useSafeAreaInsets();
  const {
    holdings,
    movements,
    loadMovementsForCode,
    loadAll,
    deleteMovement,
    loading,
  } = useStockStore();
  const [snackbar, setSnackbar] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const holding = useMemo(
    () => holdings.find((h) => h.stockCode === stockCode),
    [holdings, stockCode],
  );

  const totalBuy = holding?.totalBuy ?? 0;
  const totalSell = holding?.totalSell ?? 0;
  const currentHold = holding?.netQuantity ?? 0;

  const loadData = useCallback(async () => {
    await Promise.all([loadAll(), loadMovementsForCode(stockCode)]);
  }, [loadAll, loadMovementsForCode, stockCode]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const onDelete = (movement: StockMovement) => {
    Alert.alert('Delete transaction', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMovement(movement.id);
          setSnackbar('Transaction deleted');
        },
      },
    ]);
  };

  const renderMovement = ({ item }: { item: StockMovement }) => {
    const isBuy = item.direction === 'buy';
    const directionColor = isBuy ? colors.income : colors.expense;
    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.rowTap}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('StockMovementForm', { movementId: item.id })
          }
        >
          <View style={[styles.rowAccent, { backgroundColor: directionColor }]} />
          <View style={styles.rowBody}>
            <View style={styles.rowLine}>
              <Text style={styles.rowDate} numberOfLines={1}>
                {format(new Date(`${item.tradeDate}T00:00:00`), 'MMM d, yyyy')}
              </Text>
              <Text style={[styles.rowDir, { color: directionColor }]}>
                {isBuy ? 'Buy' : 'Sell'}
              </Text>
              <Text style={styles.rowQty}>{item.quantity.toLocaleString()}</Text>
              <Icon
                source={item.source === 'sms' ? 'message-text' : 'pencil'}
                size={12}
                color={colors.textTertiary}
              />
            </View>
            {item.note ? (
              <Text style={styles.rowNote} numberOfLines={1}>
                {item.note}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Delete transaction"
        >
          <Icon source="delete-outline" size={18} color={colors.expense} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={styles.summaryCard}>
        <Text style={styles.code}>{stockCode}</Text>
        <View style={styles.holdRow}>
          <Text style={styles.holdLabel}>Current hold</Text>
          <Text style={styles.holdValue}>{currentHold.toLocaleString()}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Buy</Text>
            <Text style={[styles.statValue, { color: colors.income }]}>
              {totalBuy.toLocaleString()}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Sell</Text>
            <Text style={[styles.statValue, { color: colors.expense }]}>
              {totalSell.toLocaleString()}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Transactions</Text>
            <Text style={styles.statValue}>{holding?.movementCount ?? 0}</Text>
          </View>
        </View>
      </View>

      {movements.length > 0 ? (
        <Text style={styles.listHeading}>Transactions</Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={movements}
        keyExtractor={(item) => item.id}
        renderItem={renderMovement}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Icon source="chart-line" size={36} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No transactions yet.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        color={colors.onPrimary}
        onPress={() => navigation.navigate('StockMovementForm', { stockCode })}
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
  content: { padding: spacing.lg },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...elevation.sm,
  },
  code: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  holdRow: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  holdLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  holdValue: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },
  statCell: { flex: 1 },
  statLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },

  listHeading: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginLeft: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  rowTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingRight: spacing.xs,
    minHeight: 44,
  },
  rowAccent: {
    width: 3,
    alignSelf: 'stretch',
    marginRight: spacing.sm,
  },
  rowBody: { flex: 1, minWidth: 0, justifyContent: 'center' },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: spacing.sm,
  },
  rowDate: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
    minWidth: 72,
  },
  rowDir: { fontSize: 12, fontWeight: '700', flexShrink: 0 },
  rowQty: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 0,
  },
  rowNote: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.outlineVariant,
  },

  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { color: colors.textSecondary, marginTop: spacing.sm, fontSize: 14 },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    backgroundColor: colors.primary,
    ...elevation.lg,
  },
});
