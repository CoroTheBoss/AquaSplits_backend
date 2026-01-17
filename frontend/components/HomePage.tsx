import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Race, Stroke, PoolLength, Distance } from '../types';
import { getUsername } from '../storage';
import { useThemeColors } from '../utils/theme';

interface HomePageProps {
  races: Race[];
  onViewRaces: () => void;
  onNewRace: () => void;
}

interface PersonalBest {
  stroke: Stroke;
  poolLength: PoolLength;
  distance: Distance;
  time: string;
  date: string;
}

export default function HomePage({ races, onViewRaces, onNewRace }: HomePageProps) {
  const colors = useThemeColors();
  const [username, setUsername] = React.useState('');

  React.useEffect(() => {
    loadUsername();
  }, []);

  const loadUsername = async () => {
    const name = await getUsername();
    setUsername(name);
  };

  const calculatePersonalBests = (): PersonalBest[] => {
    const bests = new Map<string, PersonalBest>();

    races.forEach((race) => {
      const key = `${race.stroke}-${race.poolLength}-${race.distance}`;
      const existing = bests.get(key);

      if (!existing) {
        bests.set(key, {
          stroke: race.stroke,
          poolLength: race.poolLength,
          distance: race.distance,
          time: race.time,
          date: race.date,
        });
      } else {
        // Compare times (convert to seconds for comparison)
        const existingSeconds = timeToSeconds(existing.time);
        const currentSeconds = timeToSeconds(race.time);

        if (currentSeconds < existingSeconds) {
          bests.set(key, {
            stroke: race.stroke,
            poolLength: race.poolLength,
            distance: race.distance,
            time: race.time,
            date: race.date,
          });
        }
      }
    });

    return Array.from(bests.values()).sort((a, b) => {
      // Sort by stroke, then pool length, then distance
      if (a.stroke !== b.stroke) {
        return a.stroke.localeCompare(b.stroke);
      }
      if (a.poolLength !== b.poolLength) {
        return a.poolLength - b.poolLength;
      }
      return a.distance - b.distance;
    });
  };

  const timeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const [mins, secs] = parts;
      const [sec, cent] = secs.split('.');
      return parseInt(mins, 10) * 60 + parseInt(sec, 10) + parseInt(cent || '0', 10) / 100;
    }
    return parseFloat(timeStr) || 0;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStrokeDisplayName = (stroke: Stroke) => {
    if (stroke === 'individual medley') return 'IM';
    return stroke.charAt(0).toUpperCase() + stroke.slice(1);
  };

  const personalBests = calculatePersonalBests();
  const totalRaces = races.length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          {username ? `Welcome, ${username}!` : 'Welcome to AquaSplit!'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Track your swimming progress</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{totalRaces}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Races</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{personalBests.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Personal Bests</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Bests</Text>
          {personalBests.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No personal bests yet. Add your first race!</Text>
          )}
        </View>

        {personalBests.map((pb, index) => (
          <View key={index} style={[styles.pbCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.pbHeader}>
              <View style={styles.pbInfo}>
                <Text style={[styles.pbTitle, { color: colors.text }]}>
                  {pb.distance}m {getStrokeDisplayName(pb.stroke)}
                </Text>
                <Text style={[styles.pbSubtitle, { color: colors.textSecondary }]}>
                  {pb.poolLength}m pool
                </Text>
              </View>
              <View style={styles.pbTimeContainer}>
                <Text style={[styles.pbTime, { color: colors.primary }]}>{pb.time}</Text>
              </View>
            </View>
            <Text style={[styles.pbDate, { color: colors.textTertiary }]}>{formatDate(pb.date)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={onNewRace}>
          <Text style={styles.primaryButtonText}>+ New Race</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: colors.cardBackground, borderColor: colors.primary }]} onPress={onViewRaces}>
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>View All Races</Text>
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
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  pbCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pbHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pbInfo: {
    flex: 1,
  },
  pbTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  pbSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  pbTimeContainer: {
    alignItems: 'flex-end',
  },
  pbTime: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  pbDate: {
    fontSize: 12,
    color: '#999',
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

