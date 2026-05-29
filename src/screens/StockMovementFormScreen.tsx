import { format } from 'date-fns';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Icon, Snackbar, Text, TextInput } from 'react-native-paper';
import InlineCalendar from '../components/InlineCalendar';
import type { StockMovementDirection } from '../models/types';
import type { RootStackScreenProps } from '../navigation/types';
import { stockService } from '../services/stockService';
import { useStockStore } from '../stores/useStockStore';
import { colors, radius, spacing } from '../theme';

export default function StockMovementFormScreen({
  navigation,
  route,
}: RootStackScreenProps<'StockMovementForm'>) {
  const movementId = route.params?.movementId;
  const initialStockCode = route.params?.stockCode ?? '';
  const isEditing = !!movementId;

  const holdings = useStockStore((state) => state.holdings);
  const loadAll = useStockStore((state) => state.loadAll);
  const addManualMovement = useStockStore((state) => state.addManualMovement);
  const updateMovement = useStockStore((state) => state.updateMovement);
  const [stockCode, setStockCode] = useState(initialStockCode.toUpperCase());
  const [direction, setDirection] = useState<StockMovementDirection>('buy');
  const [quantityText, setQuantityText] = useState('');
  const [tradeDate, setTradeDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Movement' : 'Add Movement',
    });
  }, [isEditing, navigation]);

  useEffect(() => {
    if (!movementId) return;
    stockService.getMovementById(movementId).then((movement) => {
      if (!movement) return;
      setStockCode(movement.stockCode);
      setDirection(movement.direction);
      setQuantityText(String(movement.quantity));
      setTradeDate(movement.tradeDate);
      setNote(movement.note ?? '');
    });
  }, [movementId]);

  const knownCodes = useMemo(
    () => [...new Set(holdings.map((h) => h.stockCode))].sort(),
    [holdings],
  );

  const tradeDateLabel = format(
    new Date(`${tradeDate}T00:00:00`),
    'MMM d, yyyy',
  );

  const onSubmit = async () => {
    const code = stockCode.trim().toUpperCase();
    const quantity = Number(quantityText);

    if (!/^[A-Z]{2,8}$/.test(code)) {
      setSnackbar('Enter a valid stock code (2-8 letters)');
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setSnackbar('Quantity should be a positive whole number');
      return;
    }

    try {
      if (isEditing && movementId) {
        await updateMovement(movementId, {
          stockCode: code,
          direction,
          quantity,
          tradeDate,
          note: note.trim() || null,
        });
      } else {
        await addManualMovement({
          stockCode: code,
          direction,
          quantity,
          tradeDate,
          note: note.trim() || null,
        });
      }
      navigation.goBack();
    } catch (error: any) {
      setSnackbar(error?.message ?? 'Failed to save movement');
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 80}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            label="Stock Code"
            value={stockCode}
            onChangeText={(text) =>
              setStockCode(text.toUpperCase().replace(/[^A-Z]/g, ''))
            }
            mode="outlined"
            placeholder="e.g. JKH"
            autoCapitalize="characters"
            style={styles.input}
          />

          {knownCodes.length > 0 && (
            <View style={styles.codeWrap}>
              <Text style={styles.sectionLabel}>Existing Codes</Text>
              <View style={styles.codeRow}>
                {knownCodes.slice(0, 12).map((code) => (
                  <TouchableOpacity
                    key={code}
                    style={[
                      styles.codeChip,
                      stockCode === code && styles.codeChipActive,
                    ]}
                    onPress={() => setStockCode(code)}
                  >
                    <Text
                      style={[
                        styles.codeChipText,
                        stockCode === code && styles.codeChipTextActive,
                      ]}
                    >
                      {code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.directionRow}>
            <TouchableOpacity
              style={[
                styles.directionBtn,
                direction === 'buy' && styles.directionBtnBuyActive,
              ]}
              onPress={() => setDirection('buy')}
            >
              <Icon
                source="arrow-bottom-left"
                size={18}
                color={direction === 'buy' ? colors.onPrimary : colors.income}
              />
              <Text
                style={[
                  styles.directionText,
                  direction === 'buy' && styles.directionTextActive,
                ]}
              >
                Buy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.directionBtn,
                direction === 'sell' && styles.directionBtnSellActive,
              ]}
              onPress={() => setDirection('sell')}
            >
              <Icon
                source="arrow-top-right"
                size={18}
                color={direction === 'sell' ? colors.onPrimary : colors.expense}
              />
              <Text
                style={[
                  styles.directionText,
                  direction === 'sell' && styles.directionTextActive,
                ]}
              >
                Sell
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            label="Quantity"
            value={quantityText}
            onChangeText={(text) =>
              setQuantityText(text.replace(/[^0-9]/g, ''))
            }
            mode="outlined"
            keyboardType="number-pad"
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => setShowCalendar((v) => !v)}
          >
            <Icon source="calendar-month" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>Trade Date</Text>
              <Text style={styles.dateValue}>{tradeDateLabel}</Text>
            </View>
            <Icon source="chevron-down" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          {showCalendar && (
            <InlineCalendar
              variant="sheet"
              selectedDate={tradeDate}
              onDateSelect={setTradeDate}
              onDone={() => setShowCalendar(false)}
            />
          )}

          <TextInput
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            mode="outlined"
            multiline
            style={styles.input}
          />

          <Button mode="contained" onPress={onSubmit} style={styles.saveButton}>
            {isEditing ? 'Update' : 'Add'} Movement
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: { padding: spacing.cardInset, paddingBottom: 120 },
  input: { marginBottom: spacing.sm },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  codeWrap: { marginBottom: spacing.md },
  codeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  codeChip: {
    borderRadius: radius.capsule,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  codeChipText: { color: colors.text, fontWeight: '600', fontSize: 12 },
  codeChipTextActive: { color: colors.primary },
  directionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  directionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  directionBtnBuyActive: {
    backgroundColor: colors.income,
    borderColor: colors.income,
  },
  directionBtnSellActive: {
    backgroundColor: colors.expense,
    borderColor: colors.expense,
  },
  directionText: { color: colors.text, fontWeight: '700' },
  directionTextActive: { color: colors.onPrimary },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dateLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  dateValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  saveButton: {
    marginTop: spacing.md,
    borderRadius: radius.capsule,
    backgroundColor: colors.primary,
  },
});
