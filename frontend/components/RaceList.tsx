import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Race } from '../types';
import { calculateInternalSplits } from '../utils/splitUtils';
import { useThemeColors } from '../utils/theme';

interface RaceListProps {
  races: Race[];
  onDelete?: (id: string) => void;
}

export default function RaceList({ races, onDelete }: RaceListProps) {
  const colors = useThemeColors();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderRace = ({ item }: { item: Race }) => {
    const strokeName = item.stroke === 'individual medley' ? 'IM' : item.stroke.charAt(0).toUpperCase() + item.stroke.slice(1);
    
    return (
      <View style={[styles.raceCard, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.raceHeader}>
          <View style={styles.raceInfo}>
            <Text style={[styles.raceTitle, { color: colors.text }]}>
              {item.distance}m {strokeName}
            </Text>
            <Text style={[styles.raceSubtitle, { color: colors.textSecondary }]}>
              {item.poolLength}m pool • {formatDate(item.date)}
            </Text>
          </View>
          <Text style={[styles.raceTime, { color: colors.primary }]}>{item.time}</Text>
        </View>
        
        {item.splits && item.splits.length > 0 && (
          <View style={[styles.splitsContainer, { borderTopColor: colors.border }]}>
            <Text style={[styles.splitsLabel, { color: colors.textTertiary }]}>
              Splits {item.splitInterval ? `(every ${item.splitInterval}m)` : ''}:
            </Text>
            <View style={styles.splitsRow}>
              {(() => {
                const internalSplits = calculateInternalSplits(item.splits);
                return item.splits.map((cumulative, index) => (
                  <View key={index} style={styles.splitItem}>
                    <Text style={[styles.splitText, { color: colors.textSecondary, backgroundColor: colors.background }]}>
                      {cumulative}
                      {index > 0 && (
                        <Text style={[styles.internalSplitText, { color: colors.textTertiary }]}>
                          {' '}({internalSplits[index]})
                        </Text>
                      )}
                    </Text>
                  </View>
                ));
              })()}
            </View>
          </View>
        )}

        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              console.log('Delete button pressed for competition:', item.id);
              onDelete(item.id);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (races.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No races recorded yet</Text>
        <Text style={styles.emptySubtext}>Add your first race to get started!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={races.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
      renderItem={renderRace}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 20,
  },
  raceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  raceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  raceInfo: {
    flex: 1,
  },
  raceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  raceSubtitle: {
    fontSize: 14,
  },
  raceTime: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  splitsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  splitsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  splitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  splitItem: {
    marginBottom: 4,
  },
  splitText: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontWeight: '600',
  },
  internalSplitText: {
    fontSize: 12,
    fontWeight: '400',
  },
  deleteButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
    backgroundColor: 'transparent',
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

