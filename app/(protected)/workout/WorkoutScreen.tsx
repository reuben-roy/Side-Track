import SlotPicker from '@/components/SlotPicker';
import MuscleInvolvementEditor from '@/components/MuscleInvolvementEditor';
import { useProfile } from '@/context/ProfileContext';
import { useUserCapacity } from '@/context/UserCapacityContext';
import {
  addWorkoutLog,
  getExerciseStats as getDBExerciseStats,
  getMuscleCapacity,
  getWorkoutLogsByExercise,
  updateAllMuscleCapacity,
  getPreference,
} from '@/lib/database';
import { flushWorkoutSession, getPendingSetCount, syncWorkoutToHealth } from '@/lib/healthSyncHelper';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const { updateCapacityFromWorkout, capacityLimits, syncStrengthToSupabase } = useUserCapacity();
  
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
  const [showInvolvementEditor, setShowInvolvementEditor] = useState(false);
  const [customMuscleInvolvement, setCustomMuscleInvolvement] = useState<Record<string, number> | null>(null);
  const [exerciseStats, setExerciseStats] = useState<ExerciseStats>({
    estimated1RM: 0,
    maxWeight: 0,
    maxReps: 0,
    totalSets: 0,
    lastWorkoutDate: null,
  });

  // Track app state for flushing workout session on background
  const appState = useRef(AppState.currentState);

  // Fetch exercise statistics and today's sets on component mount
  useEffect(() => {
    fetchExerciseStats();
    loadMuscleCapacity();
    loadTodaysSets();
    loadCustomInvolvement();
  }, [exercise]);

  const loadCustomInvolvement = async () => {
    try {
      const custom = await getPreference<Record<string, number>>(
        `exerciseMuscleInvolvement_${exercise}`,
        null
      );
      setCustomMuscleInvolvement(custom);
    } catch (error) {
      console.error('Error loading custom involvement:', error);
      setCustomMuscleInvolvement(null);
    }
  };

  const loadTodaysSets = async () => {
    try {
      const logs = await getWorkoutLogsByExercise(exercise);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaysLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime();
      });
      
      // Convert to CompletedSet format (logs are already in DESC order, reverse to get chronological)
      const sets: CompletedSet[] = todaysLogs.reverse().map(log => ({
        weight: log.weight,
        reps: log.reps,
        timestamp: new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      
      setCompletedSets(sets);
    } catch (error) {
      console.error('Error loading today\'s sets:', error);
    }
  };

  // Flush workout session and sync to Supabase when app goes to background
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to background - flush the workout session and sync
        console.log('App backgrounding - flushing workout session and syncing...');
        try {
          await flushWorkoutSession();
          // Wait a moment for workout to be fully saved before syncing calories
          await new Promise(resolve => setTimeout(resolve, 300));
          await syncStrengthToSupabase();
        } catch (error) {
          console.error('Error flushing workout session or syncing on background:', error);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [syncStrengthToSupabase]);

  // Handle screen close - flush session, sync to Supabase, then call original onClose
  const handleClose = useCallback(async () => {
    const pendingCount = getPendingSetCount();
    if (pendingCount > 0) {
      console.log(`Closing workout screen - flushing ${pendingCount} pending sets...`);
      try {
        await flushWorkoutSession();
        // Wait a moment for workout to be fully saved before syncing calories
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('Error flushing workout session on close:', error);
      }
    }
    
    // Sync to Supabase when workout screen closes (ensures new workout is included)
    try {
      console.log('Syncing to Supabase after workout screen close...');
      await syncStrengthToSupabase();
    } catch (syncError) {
      console.error('Error syncing to Supabase on close:', syncError);
      // Don't block closing if sync fails
    }
    
    onClose();
  }, [onClose, syncStrengthToSupabase]);

  const loadMuscleCapacity = async () => {
    try {
      const capacity = await getMuscleCapacity();
      setMuscleCapacity(capacity);
    } catch (error) {
      console.error('Error loading muscle capacity:', error);
      setMuscleCapacity({ ...maxMuscleCapacity });
    }
  };

  // Helper function to calculate actual weight from selected weight string
  const calculateActualWeight = (selectedWeight: string | number): number => {
    const profileWeight = parseInt(profile?.weight || '0', 10);
    
    if (typeof selectedWeight === 'string') {
      if (selectedWeight === 'Bodyweight') {
        return profileWeight;
      } else if (selectedWeight.startsWith('+')) {
        const additionalWeight = parseInt(selectedWeight.substring(1), 10);
        return profileWeight + additionalWeight;
      } else if (selectedWeight.startsWith('-')) {
        const additionalWeight = parseInt(selectedWeight.substring(1), 10);
        return Math.max(0, profileWeight - additionalWeight);
      } else {
        // Try to parse number from string like "135 lbs"
        const parsed = parseInt(selectedWeight.split(" ")[0], 10);
        return isNaN(parsed) ? 0 : parsed;
      }
    }
    return typeof selectedWeight === 'number' ? selectedWeight : 0;
  };

  // Helper function to format weight for display
  const formatWeightForDisplay = (selectedWeight: string | number): string => {
    const profileWeight = parseInt(profile?.weight || '0', 10);
    
    if (typeof selectedWeight === 'string') {
      if (selectedWeight === 'Bodyweight') {
        return `${profileWeight} lbs`;
      } else if (selectedWeight.startsWith('+')) {
        const additionalWeight = parseInt(selectedWeight.substring(1), 10);
        return `${profileWeight + additionalWeight} lbs`;
      } else if (selectedWeight.startsWith('-')) {
        const additionalWeight = parseInt(selectedWeight.substring(1), 10);
        return `${Math.max(0, profileWeight - additionalWeight)} lbs`;
      } else if (selectedWeight.includes(' lbs')) {
        // Already formatted, return as-is
        return selectedWeight;
      } else {
        // Try to parse as number
        const parsed = parseInt(selectedWeight.split(" ")[0], 10);
        return isNaN(parsed) ? selectedWeight : `${parsed} lbs`;
      }
    }
    // It's a number
    return `${selectedWeight} lbs`;
  };

  const updatePredictedDrain = useCallback(async () => {
    if (!exerciseObj) return;

    const currentReps = parseInt(repsList[repsIdx].split(" ")[0], 10);
    const selectedWeight = exerciseObj.weights[weightIdx];
    const actualWeight = calculateActualWeight(selectedWeight);

    console.log('=== PREDICTED DRAIN DEBUG ===');
    console.log('Selected weight (raw):', selectedWeight);
    console.log('Actual weight calculated:', actualWeight);
    console.log('Reps:', currentReps);
    console.log('Profile weight:', profile?.weight);
    console.log('Exercise:', exercise);

    try {
      const drain = await calculateCapacityDrain(exercise, actualWeight, currentReps);
      console.log('Calculated drain:', drain);
      setPredictedDrain(drain);
    } catch (error) {
      console.error('Error calculating predicted drain:', error);
      setPredictedDrain({});
    }
    console.log('=== END DEBUG ===');
  }, [exercise, exerciseObj, weightIdx, repsIdx, profile?.weight]);

  // Recalculate predicted drain when weight or reps change
  useEffect(() => {
    updatePredictedDrain();
  }, [updatePredictedDrain, muscleCapacity]);

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
    const currentReps = parseInt(repsList[repsIdx].split(" ")[0], 10);
    const selectedWeight = exerciseObj?.weights[weightIdx] || weights[weightIdx];
    const actualWeight = calculateActualWeight(selectedWeight);
    
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

      // Note: Supabase sync will happen when workout screen closes or app backgrounds
      // This avoids hitting Supabase too frequently and ensures new workout is included

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
    
    // Handle negative days (date in future - likely timezone/clock issue)
    if (diffDays < 0) return 'Today';
    
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
    
    // Use custom involvement if available, otherwise use default
    const involvementData = customMuscleInvolvement || exerciseObj.muscles;
    
    return Object.entries(involvementData)
      .sort(([, a], [, b]) => b - a) // Sort by involvement percentage (highest first)
      .map(([muscle, involvement]) => ({
        name: muscle,
        involvement: involvement * 100,
        currentCapacity: muscleCapacity[muscle] || 100,
        predictedDrain: predictedDrain[muscle] || 0,
      }));
  };

  const handleInvolvementSave = async (newInvolvement: Record<string, number>) => {
    setCustomMuscleInvolvement(newInvolvement);
    // Recalculate predicted drain with new involvement
    await updatePredictedDrain();
  };

  const switchToTab = (tab: 'workout' | 'muscles') => {
    setCurrentTab(tab);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.close} onPress={handleClose}>
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
                  {[...completedSets].reverse().map((set, index) => {
                    const setNumber = completedSets.length - index;
                    return (
                      <View key={setNumber} style={styles.setItem}>
                        <Text style={styles.setNumber}>Set {setNumber}</Text>
                        <Text style={styles.setDetails}>
                          {set.weight} lbs × {set.reps} reps
                        </Text>
                        <Text style={styles.setTime}>{set.timestamp}</Text>
                      </View>
                    );
                  })}
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

          <TouchableOpacity
            style={styles.muscleEngagementContainer}
            onPress={() => setShowInvolvementEditor(true)}
            activeOpacity={0.7}
          >
            <View style={styles.muscleEngagementHeader}>
              <View>
                <Text style={styles.muscleEngagementTitle}>Muscles Engaged</Text>
                <Text style={styles.muscleEngagementSubtitle}>
                  Based on {formatWeightForDisplay(exerciseObj?.weights[weightIdx] || weights[weightIdx])} × {repsList[repsIdx]}
                </Text>
              </View>
              <Text style={styles.editHint}>Tap to edit</Text>
            </View>
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
                    <View style={styles.capacityLabelContainer}>
                      <Text style={styles.capacityLabel}>Remaining</Text>
                      <Text style={[styles.capacityText, { color: getCapacityColor(muscle.currentCapacity) }]}>
                        {muscle.currentCapacity.toFixed(0)}%
                      </Text>
                    </View>
                    {muscle.predictedDrain > 0 && (
                      <View style={styles.drainLabelContainer}>
                        <Text style={styles.drainLabel}>Drain</Text>
                        <Text style={styles.drainText}>-{muscle.predictedDrain.toFixed(1)}%</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </TouchableOpacity>
        </ScrollView>
      )}

      <MuscleInvolvementEditor
        exerciseName={exercise}
        visible={showInvolvementEditor}
        onClose={() => setShowInvolvementEditor(false)}
        onSave={handleInvolvementSave}
      />

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
    padding: 16,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
  muscleEngagementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  muscleEngagementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  muscleEngagementSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  editHint: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '500',
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
  capacityLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  capacityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  drainLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drainLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  drainText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
});