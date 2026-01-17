import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { formatTime } from '../validation';
import { useThemeColors } from '../utils/theme';

interface SplitInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  distance: number;
  hasError?: boolean;
}

export default function SplitInput({ value, onChange, label, distance, hasError = false }: SplitInputProps) {
  const colors = useThemeColors();
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [decimals, setDecimals] = useState('');

  // Parse existing value into components
  useEffect(() => {
    if (value && value.trim() !== '') {
      const formatted = formatTime(value);
      const parts = formatted.split(':');
      if (parts.length === 2) {
        const [mins, secsDec] = parts;
        const [secs, cents] = secsDec.split('.');
        setMinutes(mins || '');
        setSeconds(secs || '');
        setDecimals(cents || '');
      }
    } else {
      setMinutes('');
      setSeconds('');
      setDecimals('');
    }
  }, [value]);

  const updateTime = (newMins: string, newSecs: string, newDecs: string) => {
    // If all fields are empty, send empty string
    if (!newMins && !newSecs && !newDecs) {
      onChange('');
      return;
    }
    // Combine into time string
    const mins = newMins || '0';
    const secs = newSecs.padStart(2, '0') || '00';
    const decs = newDecs.padEnd(2, '0').substring(0, 2) || '00';
    const timeStr = `${mins}:${secs}.${decs}`;
    onChange(timeStr);
  };

  const handleMinutesChange = (text: string) => {
    // Only allow digits
    const cleaned = text.replace(/[^\d]/g, '');
    if (cleaned === '' || (parseInt(cleaned, 10) >= 0 && parseInt(cleaned, 10) <= 99)) {
      setMinutes(cleaned);
      updateTime(cleaned, seconds, decimals);
    }
  };

  const handleSecondsChange = (text: string) => {
    // Only allow digits, max 59
    const cleaned = text.replace(/[^\d]/g, '');
    if (cleaned === '' || (parseInt(cleaned, 10) >= 0 && parseInt(cleaned, 10) <= 59)) {
      const secs = cleaned.length > 2 ? cleaned.substring(0, 2) : cleaned;
      setSeconds(secs);
      updateTime(minutes, secs, decimals);
    }
  };

  const handleDecimalsChange = (text: string) => {
    // Only allow digits, max 2 digits
    const cleaned = text.replace(/[^\d]/g, '');
    const decs = cleaned.length > 2 ? cleaned.substring(0, 2) : cleaned;
    setDecimals(decs);
    updateTime(minutes, seconds, decs);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Min</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
              hasError && styles.inputError,
            ]}
            value={minutes}
            onChangeText={handleMinutesChange}
            placeholder="0"
            keyboardType="number-pad"
            maxLength={2}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <Text style={[styles.separator, { color: colors.textSecondary }]}>:</Text>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Sec</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
              hasError && styles.inputError,
            ]}
            value={seconds}
            onChangeText={handleSecondsChange}
            placeholder="00"
            keyboardType="number-pad"
            maxLength={2}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <Text style={[styles.separator, { color: colors.textSecondary }]}>.</Text>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>Dec</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
              hasError && styles.inputError,
            ]}
            value={decimals}
            onChangeText={handleDecimalsChange}
            placeholder="00"
            keyboardType="number-pad"
            maxLength={2}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 2,
    textAlign: 'center',
    minWidth: 60,
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  separator: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
});

