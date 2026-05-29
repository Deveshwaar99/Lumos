import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { FAB, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import type { RootStackScreenProps } from '../navigation/types';
import { useStockStore } from '../stores/useStockStore';
import { colors, elevation, radius, spacing } from '../theme';

export default function StockHoldingsScreen({
  navigation,
}: RootStackScreenProps<'StockHoldings'>) {
  const insets = useSafeAreaInsets();
  const holdings = useStockStore((state) => state.holdings);
  const loadAll = useStockStore((state) => state.loadAll);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: (typeof holdings)[number] }) => (
    <TouchableOpacity
      style={styles.stockCard}
      onPress={() =>
        navigation.navigate('StockDetail', { stockCode: item.stockCode })
      }
      activeOpacity={0.75}
    >
      <View style={styles.stockCodeWrap}>
        <Text style={styles.stockCodeText}>{item.stockCode}</Text>
        <Text style={styles.stockMetaText}>
          Last trade: {item.lastTradeDate}
        </Text>
        <Text style={styles.stockFlowText}>
          Buy {item.totalBuy.toLocaleString()} • Sell{' '}
          {item.totalSell.toLocaleString()}
        </Text>
      </View>
      <View style={styles.stockRight}>
        <Text style={styles.stockQtyText}>
          {item.netQuantity.toLocaleString()}
        </Text>
        <Text style={styles.stockMetaText}>{item.movementCount} movements</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={holdings}
        keyExtractor={(item) => item.stockCode}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="chart-line"
            title="No Holdings Yet"
            subtitle="Sync trades to start building your holdings list."
          />
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
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        color={colors.onPrimary}
        onPress={() => navigation.navigate('StockMovementForm')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
  },
  stockCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...elevation.sm,
  },
  stockCodeWrap: { flex: 1, minWidth: 0 },
  stockRight: { alignItems: 'flex-end', marginLeft: spacing.md },
  stockCodeText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  stockQtyText: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  stockMetaText: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },
  stockFlowText: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    backgroundColor: colors.primary,
    ...elevation.lg,
  },
});
