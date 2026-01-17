import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Stroke, PoolLength, Distance, RaceFormData } from '../types';
import { getValidDistances, isValidCombination, formatTime, validateTime } from '../validation';
import SplitInput from './SplitInput';
import { useThemeColors } from '../utils/theme';

interface RaceFormProps {
  onSubmit: (race: Omit<import('../types').Race, 'id'>) => void;
  onCancel?: () => void;
}

const STROKES: Stroke[] = ['freestyle', 'backstroke', 'breaststroke', 'butterfly', 'individual medley'];
const POOL_LENGTHS: PoolLength[] = [25, 50];
const ALL_DISTANCES: Distance[] = [50, 100, 200, 400, 800, 1500];

export default function RaceForm({ onSubmit, onCancel }: RaceFormProps) {
  const colors = useThemeColors();
  const [formData, setFormData] = useState<RaceFormData>({
    stroke: '',
    poolLength: '',
    distance: '',
    time: '',
    splits: [],
    splitInterval: 50,
    date: new Date().toISOString().split('T')[0],
  });

  const [showSplits, setShowSplits] = useState(false);
  const [timeError, setTimeError] = useState(false);
  const [splitErrors, setSplitErrors] = useState<boolean[]>([]);

  const validDistances = formData.stroke && formData.poolLength
    ? getValidDistances(formData.stroke as Stroke, formData.poolLength as PoolLength)
    : [];

  // Calculate number of splits based on distance and interval
  const calculateNumSplits = (distance: Distance, interval: 25 | 50, poolLength: PoolLength): number => {
    if (!distance || !poolLength) return 0;
    // Can't use 25m splits in 50m pool
    if (interval === 25 && poolLength === 50) return 0;
    return Math.floor(distance / interval);
  };

  const numSplits = formData.distance && formData.poolLength
    ? calculateNumSplits(formData.distance as Distance, formData.splitInterval, formData.poolLength as PoolLength)
    : 0;

  useEffect(() => {
    // Reset distance when stroke or pool length changes
    if (formData.distance && !validDistances.includes(formData.distance as Distance)) {
      setFormData(prev => ({ ...prev, distance: '' }));
    }
    // Reset splits when distance, pool length, or interval changes
    if (formData.distance && formData.poolLength) {
      const newNumSplits = calculateNumSplits(
        formData.distance as Distance,
        formData.splitInterval,
        formData.poolLength as PoolLength
      );
      if (newNumSplits !== formData.splits.length) {
        const newSplits = Array(newNumSplits).fill('').map((_, i) => formData.splits[i] || '');
        setFormData(prev => ({ ...prev, splits: newSplits }));
        setSplitErrors(Array(newNumSplits).fill(false));
      } else {
        // Initialize split errors array if not already set
        if (splitErrors.length !== newNumSplits) {
          setSplitErrors(Array(newNumSplits).fill(false));
        }
      }
    }
  }, [formData.stroke, formData.poolLength, formData.distance, formData.splitInterval, validDistances]);

  // Validate time input
  const validateTimeInput = (time: string): boolean => {
    if (!time) return true; // Empty is valid (will be optional when splits enabled)
    return validateTime(time);
  };

  // Validate split input
  const validateSplitInput = (split: string, index: number): boolean => {
    if (!split) return false; // Split must be filled
    if (!validateTime(split)) return false;
    
    // If not first split, check that it's greater than previous split
    if (index > 0 && formData.splits[index - 1]) {
      const prevTime = timeToSeconds(formData.splits[index - 1]);
      const currTime = timeToSeconds(split);
      return currTime > prevTime;
    }
    return true;
  };

  const timeToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const [mins, secs] = parts;
      const [sec, cent] = secs.split('.');
      return parseInt(mins || '0', 10) * 60 + parseInt(sec || '0', 10) + parseInt(cent || '0', 10) / 100;
    }
    return parseFloat(timeStr) || 0;
  };

  const handleSubmit = () => {
    if (!formData.stroke || !formData.poolLength || !formData.distance) {
      Alert.alert('Missing Information', 'Please fill in stroke, pool length, and distance');
      return;
    }

    // Time is required if splits are not enabled
    if (!showSplits && !formData.time) {
      Alert.alert('Missing Information', 'Please enter a race time');
      return;
    }

    // If splits are enabled, validate all splits are filled
    if (showSplits) {
      const allSplitsFilled = formData.splits.every(s => s.trim() !== '');
      if (!allSplitsFilled) {
        Alert.alert(
          'Validation Error',
          'Please fill in all split times. All splits are required when split timing is enabled.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Validate all splits
      const splitValidationErrors = formData.splits.map((split, index) => !validateSplitInput(split, index));
      const hasErrors = splitValidationErrors.some(err => err);
      if (hasErrors) {
        setSplitErrors(splitValidationErrors);
        const errorCount = splitValidationErrors.filter(e => e).length;
        Alert.alert(
          'Validation Error',
          `Please check your split times. ${errorCount} split${errorCount > 1 ? 's' : ''} ${errorCount > 1 ? 'have' : 'has'} errors. Each split must be valid and greater than the previous one.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    if (!isValidCombination(
      formData.stroke as Stroke,
      formData.poolLength as PoolLength,
      formData.distance as Distance
    )) {
      Alert.alert('Invalid Combination', 'This stroke/distance/pool combination is not valid');
      return;
    }

    // Validate time if provided
    if (formData.time && !validateTime(formData.time)) {
      setTimeError(true);
      Alert.alert('Invalid Time', 'Please enter a valid time format');
      return;
    }

    // Determine final time: use provided time or last split
    let finalTime: string;
    if (showSplits && formData.splits.length > 0) {
      // Use last split as final time
      const lastSplit = formData.splits[formData.splits.length - 1];
      finalTime = formatTime(lastSplit);
    } else {
      finalTime = formatTime(formData.time);
    }

    const splits = showSplits && formData.splits.length > 0
      ? formData.splits.map(s => formatTime(s))
      : undefined;

    onSubmit({
      stroke: formData.stroke as Stroke,
      poolLength: formData.poolLength as PoolLength,
      distance: formData.distance as Distance,
      time: finalTime,
      splits,
      splitInterval: showSplits && splits ? formData.splitInterval : undefined,
      date: formData.date,
    });
  };


  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Stroke Selection */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.text }]}>Stroke</Text>
        <View style={styles.buttonRow}>
          {STROKES.map((stroke) => (
            <TouchableOpacity
              key={stroke}
              style={[
                styles.button,
                { backgroundColor: colors.surface, borderColor: colors.border },
                formData.stroke === stroke && styles.buttonActive,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, stroke }))}
            >
              <Text style={[
                styles.buttonText,
                { color: colors.textSecondary },
                formData.stroke === stroke && styles.buttonTextActive,
              ]}>
                {stroke.charAt(0).toUpperCase() + stroke.slice(1).replace('individual medley', 'IM')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pool Length with Split Toggle */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.text }]}>Pool Length</Text>
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>Add Splits</Text>
            <TouchableOpacity
              style={[styles.toggle, showSplits && styles.toggleActive]}
              onPress={() => setShowSplits(!showSplits)}
            >
              <View style={[styles.toggleThumb, showSplits && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.buttonRow}>
          {POOL_LENGTHS.map((length) => (
            <TouchableOpacity
              key={length}
              style={[
                styles.button,
                { backgroundColor: colors.surface, borderColor: colors.border },
                formData.poolLength === length && styles.buttonActive,
              ]}
              onPress={() => setFormData(prev => ({ ...prev, poolLength: length }))}
            >
              <Text style={[
                styles.buttonText,
                { color: colors.textSecondary },
                formData.poolLength === length && styles.buttonTextActive,
              ]}>
                {length}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Distance */}
      {validDistances.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Distance</Text>
          <View style={styles.buttonRow}>
            {validDistances.map((distance) => (
              <TouchableOpacity
                key={distance}
                style={[
                  styles.button,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  formData.distance === distance && styles.buttonActive,
                ]}
                onPress={() => setFormData(prev => ({ ...prev, distance }))}
              >
                <Text style={[
                  styles.buttonText,
                  { color: colors.textSecondary },
                  formData.distance === distance && styles.buttonTextActive,
                ]}>
                  {distance}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Time Input - Only show if splits are disabled */}
      {!showSplits && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Time</Text>
          <TextInput
            style={[
              styles.timeInput,
              { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
              timeError && styles.timeInputError,
            ]}
            value={formData.time}
            onChangeText={(text) => {
              setFormData(prev => ({ ...prev, time: text }));
              setTimeError(false);
            }}
            onBlur={() => {
              if (formData.time) {
                setTimeError(!validateTimeInput(formData.time));
              }
            }}
            placeholder="1:23.45 or 23.45"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            placeholderTextColor={colors.textTertiary}
          />
          <Text style={[styles.hint, { color: colors.textTertiary }]}>Enter time as MM:SS.mm or SS.mm</Text>
          {timeError && <Text style={styles.errorText}>Invalid time format</Text>}
        </View>
      )}

      {/* Date */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.text }]}>Date</Text>
        <TextInput
          style={[styles.dateInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          value={formData.date}
          onChangeText={(text) => setFormData(prev => ({ ...prev, date: text }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      {/* Splits Section - Only show if splits are enabled */}
      {showSplits && (
        <>
          {/* Split Interval Selection */}
          {formData.poolLength && (
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.text }]}>Split Interval</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    formData.splitInterval === 25 && styles.buttonActive,
                    formData.poolLength === 50 && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    if (formData.poolLength !== 50) {
                      setFormData(prev => ({ ...prev, splitInterval: 25 }));
                    }
                  }}
                  disabled={formData.poolLength === 50}
                >
                  <Text style={[
                    styles.buttonText,
                    { color: colors.textSecondary },
                    formData.splitInterval === 25 && styles.buttonTextActive,
                    formData.poolLength === 50 && styles.buttonTextDisabled,
                  ]}>
                    25m
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    formData.splitInterval === 50 && styles.buttonActive,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, splitInterval: 50 }))}
                >
                  <Text style={[
                    styles.buttonText,
                    { color: colors.textSecondary },
                    formData.splitInterval === 50 && styles.buttonTextActive,
                  ]}>
                    50m
                  </Text>
                </TouchableOpacity>
              </View>
              {formData.poolLength === 50 && (
                <Text style={[styles.hint, { color: colors.textTertiary }]}>
                  25m splits are not available for 50m pools
                </Text>
              )}
            </View>
          )}

          {/* Splits Input */}
          <View style={[styles.splitsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {formData.distance && formData.poolLength ? (
              <>
                {formData.splitInterval === 25 && formData.poolLength === 50 ? (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      25m splits are not available for 50m pools. Please select 50m splits.
                    </Text>
                  </View>
                ) : numSplits > 0 ? (
                  <>
                    <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>
                      Cumulative Splits (every {formData.splitInterval}m) - {numSplits} split{numSplits !== 1 ? 's' : ''}
                    </Text>
                    <Text style={[styles.hint, { color: colors.textTertiary }]}>
                      Enter cumulative times. Final time will be taken from the last split.
                    </Text>
                    {formData.splits.map((split, index) => (
                      <View key={index}>
                        <SplitInput
                          value={split}
                          onChange={(value) => {
                            const newSplits = [...formData.splits];
                            newSplits[index] = value;
                            setFormData(prev => ({ ...prev, splits: newSplits }));
                            // Validate on change
                            const errors = [...splitErrors];
                            errors[index] = !validateSplitInput(value, index);
                            setSplitErrors(errors);
                          }}
                          label={`Split ${index + 1} (${(index + 1) * formData.splitInterval}m)`}
                          distance={(index + 1) * formData.splitInterval}
                          hasError={splitErrors[index]}
                        />
                        {splitErrors[index] && (
                          <Text style={styles.errorText}>
                            Invalid split or must be greater than previous
                          </Text>
                        )}
                      </View>
                    ))}
                  </>
                ) : (
                  <Text style={[styles.hint, { color: colors.textTertiary }]}>Select a distance to calculate splits</Text>
                )}
              </>
            ) : (
              <Text style={[styles.hint, { color: colors.textTertiary }]}>Select stroke, pool length, and distance to add splits</Text>
            )}
          </View>
        </>
      )}

      {/* Submit Button */}
      <View style={styles.buttonContainer}>
        {onCancel && (
          <TouchableOpacity style={[styles.submitButton, styles.cancelButton]} onPress={onCancel}>
            <Text style={styles.submitButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Save Race</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  smallLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minWidth: 80,
    alignItems: 'center',
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 60,
  },
  buttonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  buttonTextActive: {
    color: '#fff',
  },
  buttonTextDisabled: {
    color: '#999',
  },
  timeInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    textAlign: 'center',
  },
  timeInputError: {
    borderColor: '#ff3b30',
  },
  optionalLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 4,
  },
  dateInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  splitsSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  splitInput: {
    marginTop: 12,
  },
  splitLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

