import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Race } from './types';
import { getRaces, saveRace, deleteRace } from './storage';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useThemeColors } from './utils/theme';
import RaceForm from './components/RaceForm';
import RaceList from './components/RaceList';
import HomePage from './components/HomePage';
import Settings from './components/Settings';

type ViewMode = 'home' | 'list' | 'form' | 'settings';

function AppContent() {
  const { theme } = useTheme();
  const colors = useThemeColors();
  const [races, setRaces] = useState<Race[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRaces();
  }, []);

  const loadRaces = async () => {
    try {
      const loadedRaces = await getRaces();
      setRaces(loadedRaces);
    } catch (error) {
      console.error('Error loading races:', error);
      Alert.alert('Error', 'Failed to load races');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRace = async (raceData: Omit<Race, 'id'>) => {
    try {
      const newRace: Race = {
        ...raceData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      };
      await saveRace(newRace);
      setRaces(prev => [...prev, newRace]);
      setViewMode('home');
    } catch (error) {
      console.error('Error saving race:', error);
      Alert.alert('Error', 'Failed to save race');
    }
  };

  const handleDeleteRace = (id: string) => {
    console.log('Delete button clicked for race:', id);
    const raceToDelete = races.find(r => r.id === id);
    const raceDescription = raceToDelete 
      ? `${raceToDelete.distance}m ${raceToDelete.stroke === 'individual medley' ? 'IM' : raceToDelete.stroke} (${raceToDelete.time})`
      : 'this race';
    
    Alert.alert(
      'Delete Race',
      `Are you sure you want to delete ${raceDescription}? This action cannot be undone.`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting race:', id);
              await deleteRace(id);
              setRaces(prev => prev.filter(r => r.id !== id));
              console.log('Race deleted successfully');
            } catch (error) {
              console.error('Error deleting race:', error);
              Alert.alert('Error', 'Failed to delete race. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getHeaderTitle = () => {
    switch (viewMode) {
      case 'home':
        return 'AquaSplit';
      case 'list':
        return 'All Races';
      case 'form':
        return 'New Race';
      case 'settings':
        return 'Settings';
      default:
        return 'AquaSplit';
    }
  };

  const getHeaderActions = () => {
    switch (viewMode) {
      case 'home':
        return (
          <>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setViewMode('settings')}
            >
              <Text style={[styles.headerButtonText, { color: colors.primary }]}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setViewMode('form')}
            >
              <Text style={styles.addButtonText}>+ New</Text>
            </TouchableOpacity>
          </>
        );
      case 'list':
        return (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setViewMode('home')}
          >
            <Text style={[styles.headerButtonText, { color: colors.primary }]}>← Home</Text>
          </TouchableOpacity>
        );
      case 'form':
        return null;
      case 'settings':
        return null;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {viewMode !== 'form' && viewMode !== 'settings' && (
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{getHeaderTitle()}</Text>
          <View style={styles.headerActions}>
            {getHeaderActions()}
          </View>
        </View>
      )}

      {viewMode === 'home' && (
        <HomePage
          races={races}
          onViewRaces={() => setViewMode('list')}
          onNewRace={() => setViewMode('form')}
        />
      )}

      {viewMode === 'list' && (
        <RaceList races={races} onDelete={handleDeleteRace} />
      )}

      {viewMode === 'form' && (
        <>
          <View style={[styles.formHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setViewMode('home')}
            >
              <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.formHeaderTitle, { color: colors.text }]}>New Race</Text>
            <View style={styles.placeholder} />
          </View>
          <RaceForm
            onSubmit={handleSaveRace}
            onCancel={() => setViewMode('home')}
          />
        </>
      )}

      {viewMode === 'settings' && (
        <>
          <View style={[styles.formHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setViewMode('home')}
            >
              <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.formHeaderTitle, { color: colors.text }]}>Settings</Text>
            <View style={styles.placeholder} />
          </View>
          <Settings onBack={() => setViewMode('home')} />
        </>
      )}

      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  formHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
});
