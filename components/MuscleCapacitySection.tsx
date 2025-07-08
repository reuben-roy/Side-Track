import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { maxMuscleCapacity } from '../constants/Exercises';
import { MuscleGroup, muscleGroups } from '../constants/MuscleGroups';
import { applyRecovery } from '../helper/utils';

// --- Muscle Capacity Tracker Section ---
type MuscleCapacity = { [key in MuscleGroup]: number };

const DEFAULT_MUSCLE_CAPACITY: MuscleCapacity = { ...maxMuscleCapacity };

function fillMissingMuscleCapacity(cap: Partial<MuscleCapacity>): MuscleCapacity {
  // Ensure all muscle groups are present and have a number value
  const filled: MuscleCapacity = { ...maxMuscleCapacity };
  for (const key of muscleGroups) {
    if (typeof cap[key] === 'number') filled[key] = cap[key]!;
  }
  return filled;
}

// Helper: interpolate color between two hex colors
function interpolateColor(color1: string, color2: string, factor: number): string {
  // color1 and color2 are hex strings like '#RRGGBB'
  const c1 = color1.substring(1);
  const c2 = color2.substring(1);
  const r1 = parseInt(c1.substring(0, 2), 16);
  const g1 = parseInt(c1.substring(2, 4), 16);
  const b1 = parseInt(c1.substring(4, 6), 16);
  const r2 = parseInt(c2.substring(0, 2), 16);
  const g2 = parseInt(c2.substring(2, 4), 16);
  const b2 = parseInt(c2.substring(4, 6), 16);
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Get bar color: red (0%) -> yellow (50%) -> green (100%)
function getBarColor(percent: number): string {
  if (percent <= 0.5) {
    // Red to yellow
    return interpolateColor('#F44336', '#FFC107', percent / 0.5);
  } else {
    // Yellow to green
    return interpolateColor('#FFC107', '#4CAF50', (percent - 0.5) / 0.5);
  }
}

export default function MuscleCapacitySection() {
  const [muscleCapacity, setMuscleCapacity] = useState<MuscleCapacity>(DEFAULT_MUSCLE_CAPACITY);
  const [lastExerciseTime, setLastExerciseTime] = useState<number | null>(null);

  // Load from AsyncStorage on mount and whenever logs change
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('muscleCapacity');
      if (stored) setMuscleCapacity(fillMissingMuscleCapacity(JSON.parse(stored)));
      // Find the most recent exercise log
      const logsStr = await AsyncStorage.getItem('workoutLogs');
      if (logsStr) {
        const logs = JSON.parse(logsStr);
        if (Array.isArray(logs) && logs.length > 0) {
          // Find the latest log date
          const latest = logs.reduce((max, log) => {
            const t = new Date(log.date).getTime();
            return t > max ? t : max;
          }, 0);
          setLastExerciseTime(latest);
        }
      }
    })();
  }, []);

  // On mount and whenever lastExerciseTime changes, apply recovery
  useEffect(() => {
    if (lastExerciseTime) {
      const now = Date.now();
      const hoursPassed = (now - lastExerciseTime) / (1000 * 60 * 60);
      if (hoursPassed > 0) {
        setMuscleCapacity(prev => {
          const recovered = fillMissingMuscleCapacity(applyRecovery(prev, hoursPassed));
          AsyncStorage.setItem('muscleCapacity', JSON.stringify(recovered));
          return recovered;
        });
      }
    }
  }, [lastExerciseTime]);

  // Automatic recovery every hour as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      setMuscleCapacity(prev => {
        const recovered = fillMissingMuscleCapacity(applyRecovery(prev, 1));
        AsyncStorage.setItem('muscleCapacity', JSON.stringify(recovered));
        return recovered;
      });
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to group muscleGroups into pairs
  function getMusclePairs(arr: MuscleGroup[]): MuscleGroup[][] {
    const pairs: MuscleGroup[][] = [];
    for (let i = 0; i < arr.length; i += 2) {
      pairs.push([arr[i], arr[i + 1]].filter(Boolean) as MuscleGroup[]);
    }
    return pairs;
  }

  return (
    <View style={styles.muscleSection}>
      <Text style={styles.muscleHeader}>Muscle Capacity</Text>
      {getMusclePairs([...muscleGroups]).map((pair, idx) => (
        <View key={idx} style={styles.muscleRow}>
          {pair.map(muscle => {
            const capacity = muscleCapacity[muscle];
            const max = maxMuscleCapacity[muscle];
            const percent = Math.max(0, Math.min(1, capacity / max));
            const barColor = getBarColor(percent);
            const boxColor = getBarColor(percent);
            return (
              <View key={muscle} style={[styles.muscleBarContainerHalf, { backgroundColor: boxColor }]}>
                <View style={styles.muscleBoxContent}>
                  <Text style={styles.muscleName}>{muscle.replace(/([A-Z])/g, ' $1').trim()}</Text>
                  <View style={styles.muscleProgressBarBg}>
                    <View style={[styles.muscleProgressBarFill, { width: `${percent * 100}%`, backgroundColor: barColor }]} />
                    <View style={styles.musclePercentContainer} pointerEvents="none">
                      <Text style={styles.musclePercent}>{Math.round(capacity)}%</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
      <Text style={styles.info}>Indicates how much your muscles have recovered after previous exercises</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muscleSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  muscleHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#181C20',
  },
  info: {
    fontSize: 10,
    textAlign: 'center',
  },
  muscleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  muscleBarContainerHalf: {
    flex: 1,
    borderRadius: 12,
  },
  muscleBoxContent: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  muscleName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    color: '#444',
    textTransform: 'capitalize',
  },
  musclePercent: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
  },
  muscleProgressBarBg: {
    width: '100%',
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  muscleProgressBarFill: {
    height: '100%',
    borderRadius: 8,
  },
  musclePercentContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
}); 