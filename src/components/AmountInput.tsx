import React, { useState, useEffect, useRef } from 'react';
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
  const [text, setText] = useState(
    value > 0 ? centsToDollars(value).toFixed(2) : '',
  );
  const internalCents = useRef(value);

  useEffect(() => {
    if (value !== internalCents.current) {
      setText(value > 0 ? centsToDollars(value).toFixed(2) : '');
      internalCents.current = value;
    }
  }, [value]);

  const handleChange = (input: string) => {
    const cleaned = input.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const formatted =
      parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    setText(formatted);
    const num = parseFloat(formatted);
    if (!isNaN(num)) {
      const cents = dollarsToCents(num);
      internalCents.current = cents;
      onChange(cents);
    } else if (formatted === '') {
      internalCents.current = 0;
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
