import SlotPicker from '@/components/SlotPicker';
import { useProfile } from '@/context/ProfileContext';
import { useUserCapacity } from '@/context/UserCapacityContext';
import {
  addWorkoutLog,
  getExerciseStats as getDBExerciseStats,
  getMuscleCapacity,
  updateAllMuscleCapacity,
} from '@/lib/database';
import { syncWorkoutToHealth } from '@/lib/healthSyncHelper';
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
      const capacity = await getMuscleCapacity();
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
      const stats = await getDBExerciseStats(exercise);
      setExerciseStats({
        estimated1RM: capacityLimits[exercise] || 0,
        maxWeight: stats.maxWeight,
        maxReps: stats.maxReps,
        totalSets: stats.totalSets,
        lastWorkoutDate: stats.lastWorkoutDate,
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
      // Add workout log to database
      await addWorkoutLog(exercise, actualWeight, currentReps);

      // --- Decrease muscle capacity after logging workout ---
      const prevCapacity = await getMuscleCapacity();
      
      console.log('=== MUSCLE CAPACITY DEBUG ===');
      console.log('Exercise:', exercise);
      console.log('Actual Weight:', actualWeight);
      console.log('Current Reps:', currentReps);
      console.log('Previous Capacity:', prevCapacity);
      
      // Use actualWeight and currentReps that were already calculated
      const drain = await calculateCapacityDrain(exercise, actualWeight, currentReps);
      console.log('Calculated Drain:', drain);
      
      const newCapacity = { ...prevCapacity };
      muscleGroups.forEach(muscle => {
        if (drain[muscle]) {
          const oldValue = prevCapacity[muscle] || 100;
          const drainValue = drain[muscle]!;
          const newValue = Math.max(0, oldValue - drainValue);
          console.log(`${muscle}: ${oldValue} - ${drainValue} = ${newValue}`);
          newCapacity[muscle] = newValue;
        }
      });
      
      console.log('New Capacity:', newCapacity);
      await updateAllMuscleCapacity(newCapacity);
      console.log('=== END DEBUG ===');
      
      // Update local state to reflect changes immediately
      setMuscleCapacity(newCapacity);
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

      // --- Sync to Health Platform (if enabled) ---
      try {
        await syncWorkoutToHealth(exercise, actualWeight, currentReps);
      } catch (healthError) {
        // Silently fail health sync - don't interrupt user flow
        console.error('Health sync error:', healthError);
      }
      // --- End health sync ---

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
      <Text style={styles.header}>{exercise}Log Workout</Text>
      <Text style={styles.exerciseName}>Log Workout</Text>

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
          <Text style={styles.prToastText}>New Personal Record</Text>
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
    top: 24,
    zIndex: 10,
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 24,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
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
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#000000',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 4,
    color: '#000000',
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 0,
    marginBottom: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  exerciseName: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  logButton: {
    backgroundColor: '#000000',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  prToast: {
    position: 'absolute',
    top: '30%',
    left: 32,
    right: 32,
    backgroundColor: '#000000',
    padding: 32,
    borderRadius: 32,
    alignItems: 'center',
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 16,
  },
  prToastText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  prToastSubtext: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  flexBottomContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomControls: {
    backgroundColor: '#fff',
    paddingTop: 16,
  },
  inlinePickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  inlinePickerCol: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    paddingVertical: 12,
  },
  setsContainer: {
    marginTop: 20,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 16,
  },
  setsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
  },
  setNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  setDetails: {
    fontSize: 16,
    color: '#000000',
    flex: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  setTime: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  secondaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  secondaryStat: {
    alignItems: 'center',
  },
  secondaryStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  secondaryStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  muscleEngagementContainer: {
    marginTop: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 20,
  },
  muscleEngagementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
  },
  muscleEngagementSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
  },
  muscleRow: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  muscleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  muscleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  muscleInvolvement: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  muscleCapacityInfo: {
    gap: 8,
  },
  capacityBarContainer: {
    height: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  capacityBar: {
    height: '100%',
    borderRadius: 3,
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
    fontSize: 12,
    fontWeight: '600',
  },
  drainText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
});