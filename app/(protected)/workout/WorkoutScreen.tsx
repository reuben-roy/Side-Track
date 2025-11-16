import SlotPicker from '@/components/SlotPicker';
import { useProfile } from '@/context/ProfileContext';
import { useUserCapacity } from '@/context/UserCapacityContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { exercises } from '../../../constants/Exercises';
import { muscleGroups } from '../../../constants/MuscleGroups';
import { calculateCapacityDrain } from '../../../helper/utils';

interface WorkoutScreenProps {
  exercise: string;
  weight: string;
  reps: string;
  onClose: () => void;
}

interface CompletedSet {
  weight: number;
  reps: number;
  timestamp: string;
}

interface WorkoutLog {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

interface ExerciseStats {
  estimated1RM: number;
  maxWeight: number;
  maxReps: number;
  totalSets: number;
  lastWorkoutDate: string | null;
}

export default function WorkoutScreen({ exercise, weight, reps, onClose }: WorkoutScreenProps) {
  const { profile } = useProfile();
  const { updateCapacityFromWorkout, capacityLimits } = useUserCapacity();
  
  // Find the exercise object
  const exerciseObj = exercises.find(e => e.name === exercise);
  const weights = exerciseObj ? exerciseObj.weights.map(w => typeof w === 'number' ? `${w} lbs` : w) : [];
  const repsList = exerciseObj ? exerciseObj.reps.map((r: number) => `${r} reps`) : [];

  // Initial indices based on props
  const initialWeightIdx = weights.findIndex(w => w === weight);
  const initialRepsIdx = repsList.findIndex(r => r === reps);

  const [weightIdx, setWeightIdx] = useState(initialWeightIdx >= 0 ? initialWeightIdx : 0);
  const [repsIdx, setRepsIdx] = useState(initialRepsIdx >= 0 ? initialRepsIdx : 0);
  const [logging, setLogging] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showPRToast, setShowPRToast] = useState(false);
  const [completedSets, setCompletedSets] = useState<CompletedSet[]>([]);
  const [exerciseStats, setExerciseStats] = useState<ExerciseStats>({
    estimated1RM: 0,
    maxWeight: 0,
    maxReps: 0,
    totalSets: 0,
    lastWorkoutDate: null,
  });

  // Fetch exercise statistics on component mount
  useEffect(() => {
    fetchExerciseStats();
  }, [exercise]);

  const fetchExerciseStats = async () => {
    try {
      const logsStr = await AsyncStorage.getItem('workoutLogs');
      if (!logsStr) {
        setExerciseStats({
          estimated1RM: capacityLimits[exercise] || 0,
          maxWeight: 0,
          maxReps: 0,
          totalSets: 0,
          lastWorkoutDate: null,
        });
        return;
      }

      const logs: WorkoutLog[] = JSON.parse(logsStr);
      const exerciseLogs = logs.filter(log => log.exercise === exercise);

      if (exerciseLogs.length === 0) {
        setExerciseStats({
          estimated1RM: capacityLimits[exercise] || 0,
          maxWeight: 0,
          maxReps: 0,
          totalSets: 0,
          lastWorkoutDate: null,
        });
        return;
      }

      // Calculate stats
      let maxWeight = 0;
      let maxReps = 0;
      const sortedLogs = exerciseLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastWorkoutDate = sortedLogs[0].date;

      exerciseLogs.forEach(log => {
        if (log.weight > maxWeight) maxWeight = log.weight;
        if (log.reps > maxReps) maxReps = log.reps;
      });

      setExerciseStats({
        estimated1RM: capacityLimits[exercise] || 0,
        maxWeight,
        maxReps,
        totalSets: exerciseLogs.length,
        lastWorkoutDate,
      });
    } catch (error) {
      console.error('Error fetching exercise stats:', error);
    }
  };

  const logExercise = async () => {
    setLogging(true);
    const currentWeight = parseInt(weights[weightIdx].split(" ")[0], 10);
    const currentReps = parseInt(repsList[repsIdx].split(" ")[0]);

    let actualWeight: number;
    const selectedWeight = weights[weightIdx];
    const profileWeight = parseInt(profile?.weight || '0', 10);
    
    if (selectedWeight === 'Bodyweight') {
      actualWeight = profileWeight;
    } else if (selectedWeight.startsWith('+')) {
      // Handle +10, +20, +30 etc as bodyweight + additional weight
      const additionalWeight = parseInt(selectedWeight.substring(1));
      actualWeight = profileWeight + additionalWeight;
    } else if (selectedWeight.startsWith('-')) {
      // Handle -10, -20, -30 etc as bodyweight - additional weight
      const additionalWeight = parseInt(selectedWeight.substring(1));
      actualWeight = profileWeight - additionalWeight;
    } else {
      actualWeight = currentWeight;
    }
    
    // Add to completed sets first
    const newSet: CompletedSet = {
      weight: actualWeight,
      reps: currentReps,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setCompletedSets(prev => [...prev, newSet]);

    const workout = {
      exercise,
      weight: actualWeight,
      reps: currentReps,
      date: new Date().toISOString(),
    };

    try {
      const prev = await AsyncStorage.getItem('workoutLogs');
      const logs = prev ? JSON.parse(prev) : [];
      logs.push(workout);
      await AsyncStorage.setItem('workoutLogs', JSON.stringify(logs));

      // --- Decrease muscle capacity after logging workout ---
      const prevCapacityStr = await AsyncStorage.getItem('muscleCapacity');
      let prevCapacity: Record<string, number> = prevCapacityStr ? JSON.parse(prevCapacityStr) : { ...require('../../../constants/Exercises').maxMuscleCapacity };
      
      console.log('=== MUSCLE CAPACITY DEBUG ===');
      console.log('Exercise:', exercise);
      console.log('Actual Weight:', actualWeight);
      console.log('Current Reps:', currentReps);
      console.log('Previous Capacity:', prevCapacity);
      
      // Use actualWeight and currentReps that were already calculated
      const drain = await calculateCapacityDrain(exercise, actualWeight, currentReps);
      console.log('Calculated Drain:', drain);
      
      muscleGroups.forEach(muscle => {
        if (drain[muscle]) {
          const oldValue = prevCapacity[muscle] || 100;
          const drainValue = drain[muscle]!;
          const newValue = Math.max(0, oldValue - drainValue);
          console.log(`${muscle}: ${oldValue} - ${drainValue} = ${newValue}`);
          prevCapacity[muscle] = newValue;
        }
      });
      
      console.log('New Capacity:', prevCapacity);
      await AsyncStorage.setItem('muscleCapacity', JSON.stringify(prevCapacity));
      console.log('=== END DEBUG ===');
      // --- End muscle capacity update ---

      // --- Check for Personal Record and update 1RM estimate ---
      const isNewPR = await updateCapacityFromWorkout(exercise, actualWeight, currentReps);
      if (isNewPR) {
        setShowPRToast(true);
        setTimeout(() => setShowPRToast(false), 3000);
      }
      // --- End PR check ---

      // Refresh stats after logging
      await fetchExerciseStats();

      setLogging(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      
    } catch (e) {
      setLogging(false);
      alert('Failed to log workout');
    }
  };

  const formatLastWorkout = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.close} onPress={onClose}>
        <Text style={{ fontSize: 32, color: '#181C20' }}>×</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Log Workout</Text>
      <Text style={styles.exerciseName}>{exercise}</Text>

      {/* Exercise Stats - Motivational Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Est. 1RM</Text>
          <Text style={styles.statValue}>{exerciseStats.estimated1RM} lbs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>PR Weight</Text>
          <Text style={styles.statValue}>{exerciseStats.maxWeight > 0 ? `${exerciseStats.maxWeight} lbs` : '-'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>PR Reps</Text>
          <Text style={styles.statValue}>{exerciseStats.maxReps > 0 ? exerciseStats.maxReps : '-'}</Text>
        </View>
      </View>

      <View style={styles.secondaryStatsRow}>
        <View style={styles.secondaryStat}>
          <Text style={styles.secondaryStatLabel}>Total Sets</Text>
          <Text style={styles.secondaryStatValue}>{exerciseStats.totalSets}</Text>
        </View>
        <View style={styles.secondaryStat}>
          <Text style={styles.secondaryStatLabel}>Last Workout</Text>
          <Text style={styles.secondaryStatValue}>{formatLastWorkout(exerciseStats.lastWorkoutDate)}</Text>
        </View>
      </View>

      {completedSets.length > 0 && (
        <View style={styles.setsContainer}>
          <Text style={styles.setsTitle}>Completed Sets</Text>
            <ScrollView 
            style={[styles.setsList, { height: 150 }]} 
            showsVerticalScrollIndicator={false}
            >
            {completedSets.map((set, index) => (
              <View key={index} style={styles.setItem}>
              <Text style={styles.setNumber}>Set {index + 1}</Text>
              <Text style={styles.setDetails}>
                {set.weight} lbs × {set.reps} reps
              </Text>
              <Text style={styles.setTime}>{set.timestamp}</Text>
              </View>
            ))}
            </ScrollView>
        </View>
      )}

      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Set logged!</Text>
        </View>
      )}

      {showPRToast && (
        <View style={styles.prToast}>
          <Text style={styles.prToastText}>🎉 NEW PERSONAL RECORD! 🎉</Text>
          <Text style={styles.prToastSubtext}>Your 1RM estimate has been updated</Text>
        </View>
      )}

      <View style={styles.flexBottomContainer}>
        <View style={styles.inlinePickersRow}>
          <View style={styles.inlinePickerCol}>
            <Text style={styles.sectionTitle}>Weight</Text>
            <SlotPicker
              data={weights}
              selectedIndex={weightIdx}
              onSelect={setWeightIdx}
              style={{}}
            />
          </View>
          <View style={styles.inlinePickerCol}>
            <Text style={styles.sectionTitle}>Reps</Text>
            <SlotPicker
              data={repsList}
              selectedIndex={repsIdx}
              onSelect={setRepsIdx}
            />
          </View>
        </View>
        <TouchableOpacity style={styles.logButton} onPress={logExercise} disabled={logging}>
          <Text style={styles.logButtonText}>{logging ? 'Logging...' : 'Log Set'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 32,
  },
  close: {
    position: 'absolute',
    left: 24,
    top: 50,
    zIndex: 10,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 25,
    marginBottom: 5,
    color: '#181C20',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
    color: '#181C20',
  },
  exerciseName: {
    fontSize: 20,
    color: '#C2BABA',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logButton: {
    backgroundColor: '#ED2737',
    borderRadius: 40,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 60,
    backgroundColor: '#181C20',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    zIndex: 100,
    opacity: 0.95,
  },
  toastText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  prToast: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 100,
    backgroundColor: '#10B981',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  prToastText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  prToastSubtext: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.9,
  },
  flexBottomContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  inlinePickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginTop: 16,
  },
  inlinePickerCol: {
    flex: 1,
    alignItems: 'center',
  },
  setsContainer: {
    marginTop: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 16,
    maxHeight: 200,
  },
  setsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#181C20',
    marginBottom: 12,
    textAlign: 'center',
  },
  setsList: {
    flexGrow: 1,
  },
  setItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  setNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#181C20',
    flex: 1,
  },
  setDetails: {
    fontSize: 16,
    color: '#181C20',
    flex: 2,
    textAlign: 'center',
  },
  setTime: {
    fontSize: 14,
    color: '#C2BABA',
    flex: 1,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ED2737',
  },
  secondaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  secondaryStat: {
    alignItems: 'center',
  },
  secondaryStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  secondaryStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#181C20',
  },
});