import SlotPicker from '@/components/SlotPicker';
import { useProfile } from '@/context/ProfileContext';
import { useUserCapacity } from '@/context/UserCapacityContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { exercises, maxMuscleCapacity } from '../../../constants/Exercises';
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
  const [muscleCapacity, setMuscleCapacity] = useState<Record<string, number>>({});
  const [predictedDrain, setPredictedDrain] = useState<Record<string, number>>({});
  const [currentTab, setCurrentTab] = useState<'workout' | 'muscles'>('workout');
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
    loadMuscleCapacity();
  }, [exercise]);

  // Recalculate predicted drain when weight or reps change
  useEffect(() => {
    updatePredictedDrain();
  }, [weightIdx, repsIdx, muscleCapacity]);

  const loadMuscleCapacity = async () => {
    try {
      const capacityStr = await AsyncStorage.getItem('muscleCapacity');
      const capacity: Record<string, number> = capacityStr 
        ? JSON.parse(capacityStr) 
        : { ...maxMuscleCapacity };
      setMuscleCapacity(capacity);
    } catch (error) {
      console.error('Error loading muscle capacity:', error);
      setMuscleCapacity({ ...maxMuscleCapacity });
    }
  };

  const updatePredictedDrain = async () => {
    if (!exerciseObj) return;

    const currentWeight = parseInt(weights[weightIdx].split(" ")[0], 10);
    const currentReps = parseInt(repsList[repsIdx].split(" ")[0]);
    const profileWeight = parseInt(profile?.weight || '0', 10);
    const selectedWeight = weights[weightIdx];

    let actualWeight: number;
    if (selectedWeight === 'Bodyweight') {
      actualWeight = profileWeight;
    } else if (selectedWeight.startsWith('+')) {
      const additionalWeight = parseInt(selectedWeight.substring(1));
      actualWeight = profileWeight + additionalWeight;
    } else if (selectedWeight.startsWith('-')) {
      const additionalWeight = parseInt(selectedWeight.substring(1));
      actualWeight = profileWeight - additionalWeight;
    } else {
      actualWeight = currentWeight;
    }

    try {
      const drain = await calculateCapacityDrain(exercise, actualWeight, currentReps);
      setPredictedDrain(drain);
    } catch (error) {
      console.error('Error calculating predicted drain:', error);
      setPredictedDrain({});
    }
  };

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
      
      // Update local state to reflect changes immediately
      setMuscleCapacity(prevCapacity);
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

  const formatMuscleName = (muscle: string): string => {
    const nameMap: Record<string, string> = {
      'quads': 'Quads',
      'hamstrings': 'Hamstrings',
      'glutes': 'Glutes',
      'calves': 'Calves',
      'pecs': 'Chest',
      'anteriorDeltoids': 'Front Delts',
      'medialDeltoids': 'Side Delts',
      'posteriorDeltoids': 'Rear Delts',
      'rearDeltoids': 'Rear Delts',
      'triceps': 'Triceps',
      'biceps': 'Biceps',
      'lats': 'Lats',
      'upperBack': 'Upper Back',
      'lowerBack': 'Lower Back',
      'core': 'Core',
      'forearms': 'Forearms',
    };
    return nameMap[muscle] || muscle;
  };

  const getCapacityColor = (capacity: number): string => {
    if (capacity >= 70) return '#10B981'; // Green - fresh
    if (capacity >= 40) return '#F59E0B'; // Orange - moderate fatigue
    return '#EF4444'; // Red - high fatigue
  };

  const getMusclesEngaged = () => {
    if (!exerciseObj || !exerciseObj.muscles) return [];
    
    return Object.entries(exerciseObj.muscles)
      .sort(([, a], [, b]) => b - a) // Sort by involvement percentage (highest first)
      .map(([muscle, involvement]) => ({
        name: muscle,
        involvement: involvement * 100,
        currentCapacity: muscleCapacity[muscle] || 100,
        predictedDrain: predictedDrain[muscle] || 0,
      }));
  };

  const switchToTab = (tab: 'workout' | 'muscles') => {
    setCurrentTab(tab);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.close} onPress={onClose}>
        <Text style={{ fontSize: 32, color: '#181C20' }}>×</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Log Workout</Text>
      <Text style={styles.exerciseName}>{exercise}</Text>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, currentTab === 'workout' && styles.activeTab]}
          onPress={() => switchToTab('workout')}
        >
          <Text style={[styles.tabText, currentTab === 'workout' && styles.activeTabText]}>
            Log Set
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, currentTab === 'muscles' && styles.activeTab]}
          onPress={() => switchToTab('muscles')}
        >
          <Text style={[styles.tabText, currentTab === 'muscles' && styles.activeTabText]}>
            Exercise Info
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content - Conditional Rendering */}
      {currentTab === 'workout' ? (
        /* Workout Tab */
        <>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.contentContainer}>
            {completedSets.length > 0 && (
              <View style={styles.setsContainer}>
                <Text style={styles.setsTitle}>Completed Sets</Text>
                <View style={styles.setsList}>
                  {completedSets.map((set, index) => (
                    <View key={index} style={styles.setItem}>
                      <Text style={styles.setNumber}>Set {index + 1}</Text>
                      <Text style={styles.setDetails}>
                        {set.weight} lbs × {set.reps} reps
                      </Text>
                      <Text style={styles.setTime}>{set.timestamp}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Fixed Bottom Controls */}
          <View style={styles.bottomControls}>
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
        </>
      ) : (
        /* Exercise Info Tab */
        <ScrollView showsVerticalScrollIndicator={false} style={styles.contentContainer}>
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

          <View style={styles.muscleEngagementContainer}>
            <Text style={styles.muscleEngagementTitle}>Muscles Engaged</Text>
            <Text style={styles.muscleEngagementSubtitle}>
              Based on {weights[weightIdx]} × {repsList[repsIdx]}
            </Text>
            {getMusclesEngaged().map((muscle) => (
              <View key={muscle.name} style={styles.muscleRow}>
                <View style={styles.muscleInfo}>
                  <Text style={styles.muscleName}>{formatMuscleName(muscle.name)}</Text>
                  <Text style={styles.muscleInvolvement}>{muscle.involvement.toFixed(0)}% involvement</Text>
                </View>
                <View style={styles.muscleCapacityInfo}>
                  <View style={styles.capacityBarContainer}>
                    <View 
                      style={[
                        styles.capacityBar, 
                        { 
                          width: `${muscle.currentCapacity}%`,
                          backgroundColor: getCapacityColor(muscle.currentCapacity)
                        }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.drainIndicator,
                        { 
                          width: `${muscle.predictedDrain}%`,
                          left: `${Math.max(0, muscle.currentCapacity - muscle.predictedDrain)}%`
                        }
                      ]}
                    />
                  </View>
                  <View style={styles.capacityNumbers}>
                    <Text style={[styles.capacityText, { color: getCapacityColor(muscle.currentCapacity) }]}>
                      {muscle.currentCapacity.toFixed(0)}%
                    </Text>
                    {muscle.predictedDrain > 0 && (
                      <Text style={styles.drainText}>-{muscle.predictedDrain.toFixed(1)}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
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
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: '#ED2737',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 3,
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
  bottomControls: {
    backgroundColor: '#fff',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  inlinePickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
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
  muscleEngagementContainer: {
    marginTop: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  muscleEngagementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#181C20',
    marginBottom: 8,
    textAlign: 'center',
  },
  muscleEngagementSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  muscleRow: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  muscleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  muscleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#181C20',
  },
  muscleInvolvement: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  muscleCapacityInfo: {
    gap: 6,
  },
  capacityBarContainer: {
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  capacityBar: {
    height: '100%',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
  },
  drainIndicator: {
    height: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    position: 'absolute',
    borderRightWidth: 2,
    borderRightColor: '#EF4444',
  },
  capacityNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  drainText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
});