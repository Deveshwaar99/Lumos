import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { colors, typography } from '../../theme';
import { formatMoney } from '../../utils/money';

export type AmountTextProps = Omit<TextProps, 'children'> & {
  cents: number;
  currencySymbol?: string;
  decimalPlaces?: number;
  /** Extra prefix before formatted money (e.g. "+" for income). `formatMoney` may already include "-". */
  signPrefix?: string;
  tone?: 'default' | 'income' | 'expense' | 'transfer' | 'custom';
  customColor?: string;
  size?: 'hero' | 'title' | 'body';
};

function AmountText({
  cents,
  currencySymbol,
  decimalPlaces = 2,
  signPrefix = '',
  tone = 'default',
  customColor,
  size = 'body',
  style,
  ...rest
}: AmountTextProps) {
  const formatted = formatMoney(cents, currencySymbol, decimalPlaces);
  const display =
    signPrefix && formatted.startsWith('-')
      ? formatted
      : `${signPrefix}${formatted}`;

  const color =
    tone === 'custom' && customColor
      ? customColor
      : tone === 'income'
        ? colors.income
        : tone === 'expense'
          ? colors.expense
          : tone === 'transfer'
            ? colors.transfer
            : colors.text;

  const sizeStyle: TextStyle =
    size === 'hero'
      ? styles.hero
      : size === 'title'
        ? styles.title
        : styles.body;

  return (
    <Text
      {...rest}
      style={[sizeStyle, { color }, style]}
      maxFontSizeMultiplier={rest.maxFontSizeMultiplier ?? 2}
    >
      {display}
    </Text>
  );
}

const styles = StyleSheet.create({
  hero: {
    ...typography.headlineSmall,
    fontVariant: ['tabular-nums'],
  },
  title: {
    ...typography.titleSmall,
    fontVariant: ['tabular-nums'],
  },
  body: {
    ...typography.bodyMedium,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});

export default AmountText;
