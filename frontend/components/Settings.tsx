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
import { ThemeMode } from '../types';
import { getUsername, saveUsername, getThemeMode, saveThemeMode } from '../storage';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeColors } from '../utils/theme';

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const { themeMode, setThemeMode } = useTheme();
  const colors = useThemeColors();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedUsername, savedTheme] = await Promise.all([
        getUsername(),
        getThemeMode(),
      ]);
      setUsername(savedUsername);
      setThemeMode(savedTheme);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await Promise.all([
        saveUsername(username),
        setThemeMode(themeMode), // Theme is already saved when changed
      ]);
      Alert.alert('Success', 'Settings saved!');
      onBack();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleThemeChange = async (mode: ThemeMode) => {
    await setThemeMode(mode);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      {/* Username */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.text }]}>Username</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your name"
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      {/* Theme Mode */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.text }]}>Theme</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Choose your preferred theme mode
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.surface, borderColor: colors.border },
              themeMode === 'light' && styles.buttonActive,
            ]}
            onPress={() => handleThemeChange('light')}
          >
            <Text style={[
              styles.buttonText,
              { color: colors.textSecondary },
              themeMode === 'light' && styles.buttonTextActive,
            ]}>
              Light
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.surface, borderColor: colors.border },
              themeMode === 'dark' && styles.buttonActive,
            ]}
            onPress={() => handleThemeChange('dark')}
          >
            <Text style={[
              styles.buttonText,
              { color: colors.textSecondary },
              themeMode === 'dark' && styles.buttonTextActive,
            ]}>
              Dark
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.surface, borderColor: colors.border },
              themeMode === 'system' && styles.buttonActive,
            ]}
            onPress={() => handleThemeChange('system')}
          >
            <Text style={[
              styles.buttonText,
              { color: colors.textSecondary },
              themeMode === 'system' && styles.buttonTextActive,
            ]}>
              System
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
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
  description: {
    fontSize: 14,
    marginBottom: 12,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextActive: {
    color: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 20,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

