import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Icon, Snackbar, Text } from 'react-native-paper';
import EmptyState from '../components/EmptyState';
import type { BrokerFundingSmsLog } from '../models/types';
import type { RootStackScreenProps } from '../navigation/types';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useStockStore } from '../stores/useStockStore';
import { colors, radius, spacing } from '../theme';
import { clampMoneyDecimalPlaces, formatMoney } from '../utils/money';

const STATUS_COLORS: Record<BrokerFundingSmsLog['parseStatus'], string> = {
  matched: colors.income,
  unmatched: colors.warning,
  ignored: colors.textSecondary,
};

export default function BrokerFundingReviewScreen({
  navigation,
}: RootStackScreenProps<'BrokerFundingReview'>) {
  const brokerFundingLogs = useStockStore((state) => state.brokerFundingLogs);
  const loadBrokerFundingLogs = useStockStore(
    (state) => state.loadBrokerFundingLogs,
  );
  const confirmBrokerFundingSms = useStockStore(
    (state) => state.confirmBrokerFundingSms,
  );
  const ignoreBrokerFundingSms = useStockStore(
    (state) => state.ignoreBrokerFundingSms,
  );
  const reparseBrokerFundingSms = useStockStore(
    (state) => state.reparseBrokerFundingSms,
  );
  const reparseAllBrokerFundingSms = useStockStore(
    (state) => state.reparseAllBrokerFundingSms,
  );
  const settings = useSettingsStore((state) => state.settings);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const moneyDecimals = clampMoneyDecimalPlaces(settings.decimalPlaces);

  const loadData = useCallback(async () => {
    await loadBrokerFundingLogs();
  }, [loadBrokerFundingLogs]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: 'Broker Funding Review' });
      void loadData();
    }, [loadData, navigation]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const reviewCount = useMemo(
    () => brokerFundingLogs.filter((log) => log.parseStatus === 'unmatched').length,
    [brokerFundingLogs],
  );

  const onConfirm = async (item: BrokerFundingSmsLog) => {
    if (item.amountCents == null || item.amountCents <= 0) {
      setSnackbar('No amount detected for this SMS yet');
      return;
    }
    await confirmBrokerFundingSms(item.id, item.amountCents);
    setSnackbar('Broker funding added');
  };

  const onIgnore = async (id: string) => {
    await ignoreBrokerFundingSms(id);
    setSnackbar('SMS ignored');
  };

  const onReparse = async (id: string) => {
    await reparseBrokerFundingSms(id);
    setSnackbar('SMS rechecked');
  };

  const onReparseAll = async () => {
    await reparseAllBrokerFundingSms();
    setSnackbar('Rechecked all broker funding SMS');
  };

  const renderItem = ({ item }: { item: BrokerFundingSmsLog }) => {
    const expanded = expandedId === item.id;
    const statusColor = STATUS_COLORS[item.parseStatus];
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <View style={styles.headerText}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.sender}
            </Text>
            <Text style={styles.cardSub}>
              {format(new Date(item.receivedAt), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {item.amountCents != null ? (
              <Text style={styles.amountText}>
                {formatMoney(
                  item.amountCents,
                  settings.currencySymbol,
                  moneyDecimals,
                )}
              </Text>
            ) : null}
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
          </View>
        </TouchableOpacity>

        {expanded ? (
          <View style={styles.expandWrap}>
            <Text style={styles.smsBody}>{item.body}</Text>
            <Text style={styles.meta}>
              Confidence: {item.confidence}%
              {item.parseReason ? ` - ${item.parseReason}` : ''}
            </Text>
            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                compact
                icon="refresh"
                onPress={() => onReparse(item.id)}
              >
                Re-check
              </Button>
              {item.parseStatus !== 'matched' ? (
                <Button
                  mode="contained"
                  compact
                  icon="check"
                  onPress={() => onConfirm(item)}
                  disabled={item.amountCents == null || item.amountCents <= 0}
                >
                  Add
                </Button>
              ) : null}
              {item.parseStatus !== 'ignored' ? (
                <Button
                  mode="outlined"
                  compact
                  icon="eye-off"
                  textColor={colors.warning}
                  onPress={() => onIgnore(item.id)}
                >
                  Ignore
                </Button>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={brokerFundingLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.headerTitle}>Needs review: {reviewCount}</Text>
            <Button
              mode="contained-tonal"
              icon="refresh-circle"
              onPress={onReparseAll}
            >
              Re-check All
            </Button>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="cash-multiple"
            title="No Broker Funding SMS Yet"
            subtitle="Run a funding sync from Stocks to review matched and unmatched messages."
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
  headerBlock: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
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
  headerText: { flex: 1, minWidth: 0 },
  headerRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  cardSub: { color: colors.textTertiary, fontSize: 12, marginTop: 1 },
  amountText: { color: colors.text, fontSize: 13, fontWeight: '700' },
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
});
