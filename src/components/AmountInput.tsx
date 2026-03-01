import React, { useState, useEffect } from 'react';
import { TextInput } from 'react-native-paper';
import { dollarsToCents, centsToDollars } from '../utils/money';

interface AmountInputProps {
  value: number; // cents
  onChange: (cents: number) => void;
  error?: boolean;
  label?: string;
  currencySymbol?: string;
}

export default function AmountInput({
  value,
  onChange,
  error,
  label = 'Amount',
  currencySymbol = '$',
}: AmountInputProps) {
  const [text, setText] = useState(value > 0 ? centsToDollars(value).toFixed(2) : '');

  useEffect(() => {
    setText(value > 0 ? centsToDollars(value).toFixed(2) : '');
  }, [value]);

  const handleChange = (input: string) => {
    const cleaned = input.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    setText(formatted);
    const num = parseFloat(formatted);
    if (!isNaN(num)) {
      onChange(dollarsToCents(num));
    } else if (formatted === '') {
      onChange(0);
    }
  };

  return (
    <TextInput
      label={label}
      value={text}
      onChangeText={handleChange}
      mode="outlined"
      keyboardType="decimal-pad"
      left={<TextInput.Affix text={currencySymbol} />}
      error={error}
      placeholder="0.00"
    />
  );
}
