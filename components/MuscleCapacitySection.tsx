import {
    getMuscleCapacity,
    getWorkoutLogs,
    updateAllMuscleCapacity,
} from '@/lib/database';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
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
  return '#000000';
}

export default function MuscleCapacitySection() {
  const [muscleCapacity, setMuscleCapacity] = useState<MuscleCapacity>(DEFAULT_MUSCLE_CAPACITY);
  const [lastExerciseTime, setLastExerciseTime] = useState<number | null>(null);

  // Load from database whenever the screen comes into focus
  const loadMuscleCapacity = useCallback(async () => {
    const storedCapacity = await getMuscleCapacity();
    setMuscleCapacity(fillMissingMuscleCapacity(storedCapacity));
    // Find the most recent exercise log
    const logs = await getWorkoutLogs(1); // Get most recent log
    if (logs.length > 0) {
      const latest = new Date(logs[0].date).getTime();
      setLastExerciseTime(latest);
    }
  }, []);

  // Reload muscle capacity whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMuscleCapacity();
    }, [loadMuscleCapacity])
  );

  // On mount and whenever lastExerciseTime changes, apply recovery
  useEffect(() => {
    if (lastExerciseTime) {
      const now = Date.now();
      const hoursPassed = (now - lastExerciseTime) / (1000 * 60 * 60);
      if (hoursPassed > 0) {
        (async () => {
          const recovered = fillMissingMuscleCapacity(await applyRecovery(muscleCapacity, hoursPassed));
          setMuscleCapacity(recovered);
          await updateAllMuscleCapacity(recovered);
        })();
      }
    }
  }, [lastExerciseTime]);

  // Automatic recovery every hour as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      (async () => {
        const recovered = fillMissingMuscleCapacity(await applyRecovery(muscleCapacity, 1));
        setMuscleCapacity(recovered);
        await updateAllMuscleCapacity(recovered);
      })();
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [muscleCapacity]);

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
      <View style={styles.muscleTitleContainer}>
        <Text style={styles.muscleHeader}>Muscle Capacity</Text>
      </View>
      {getMusclePairs([...muscleGroups]).map((pair, idx) => (
        <View key={idx} style={styles.muscleRow}>
          {pair.map(muscle => {
            const capacity = muscleCapacity[muscle];
            const max = maxMuscleCapacity[muscle];
            const percent = Math.max(0, Math.min(1, capacity / max));
            const barColor = '#000000';
            const boxColor = '#F2F2F7';
            return (
              <View key={muscle} style={[styles.muscleBarContainerHalf, { backgroundColor: boxColor }]}>
                <View style={styles.muscleBoxContent}>
                  <Text style={styles.muscleName}>{muscle.replace(/([A-Z])/g, ' $1').trim()}</Text>
                  <View style={styles.muscleProgressBarBg}>
                    <View style={[styles.muscleProgressBarFill, { width: `${percent * 100}%`, backgroundColor: barColor }]} />
                    <View style={styles.musclePercentContainer} pointerEvents="none">
                      <Text style={[styles.musclePercent, { color: percent > 0.5 ? '#FFFFFF' : '#000000' }]}>{Math.round(capacity)}%</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
      <Text style={styles.info}>Shows how recovered your muscles are after previous exercises</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muscleSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 0,
    marginBottom: 20,
  },
  muscleTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
    gap: 8,
  },
  muscleIcon: {
    fontSize: 24,
  },
  muscleHeader: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
  },
  info: {
    fontSize: 12,
    textAlign: 'center',
    color: '#8E8E93',
    fontStyle: 'italic',
    padding: 10,
  },
  muscleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 10,
    gap: 10,
  },
  muscleBarContainerHalf: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  muscleBoxContent: {
    padding: 10,
    backgroundColor: '#F2F2F7',
  },
  muscleName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    color: '#000000',
    textTransform: 'capitalize',
  },
  musclePercent: {
    fontSize: 12,
    fontWeight: '800',
  },
  muscleProgressBarBg: {
    width: '100%',
    height: 24,
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  muscleProgressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
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