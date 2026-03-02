import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { colors, spacing } from '../theme';

interface CalculatorPadProps {
  onDigit: (digit: string) => void;
  onOperator: (op: string) => void;
  onDecimal: () => void;
  onBackspace: () => void;
  onEquals: () => void;
  onClear: () => void;
}

const BUTTONS = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['.', '0', 'backspace', '+'],
];

export default function CalculatorPad({
  onDigit,
  onOperator,
  onDecimal,
  onBackspace,
  onEquals,
  onClear,
}: CalculatorPadProps) {
  const operators = new Set(['/', '*', '-', '+']);

  const handlePress = (key: string) => {
    if (key === 'backspace') return onBackspace();
    if (key === '.') return onDecimal();
    if (operators.has(key)) return onOperator(key);
    onDigit(key);
  };

  const renderKey = (key: string) => {
    const isOp = operators.has(key);
    const isBackspace = key === 'backspace';

    return (
      <TouchableOpacity
        key={key}
        style={[styles.key, isOp && styles.opKey]}
        onPress={() => handlePress(key)}
        activeOpacity={0.6}
      >
        {isBackspace ? (
          <Icon source="backspace-outline" size={24} color={colors.text} />
        ) : (
          <Text
            variant="headlineSmall"
            style={[styles.keyText, isOp && styles.opKeyText]}
          >
            {key === '*' ? '×' : key === '/' ? '÷' : key}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {BUTTONS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map(renderKey)}
        </View>
      ))}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.key, styles.clearKey]}
          onPress={onClear}
          activeOpacity={0.6}
        >
          <Text variant="titleMedium" style={styles.clearKeyText}>
            C
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.key, styles.equalsKey, { flex: 3 }]}
          onPress={onEquals}
          activeOpacity={0.6}
        >
          <Text variant="headlineSmall" style={styles.equalsKeyText}>
            =
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  key: {
    flex: 1,
    height: 60,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    color: colors.text,
    fontWeight: '600',
  },
  opKey: {
    backgroundColor: colors.primaryContainer,
  },
  opKeyText: {
    color: colors.primary,
    fontWeight: '700',
  },
  clearKey: {
    backgroundColor: colors.surfaceVariant,
  },
  clearKeyText: {
    color: colors.expense,
    fontWeight: '700',
  },
  equalsKey: {
    backgroundColor: colors.primary,
  },
  equalsKeyText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
