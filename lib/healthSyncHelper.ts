/**
 * Health Sync Helper
 * 
 * Helper functions to integrate health sync with Side-Track's database
 */

import { getPreference, setPreference } from './database';
import { getProfile, getWorkoutLogs } from './database';
import { exercises } from '../constants/Exercises';
import {
  writeWorkoutToHealth,
  writeWorkoutsToHealth,
  readWorkoutsFromHealth,
  writeBodyMetricsToHealth,
  writeCaloriesToHealth,
  checkHealthAvailability,
  requestHealthPermissions,
  getHealthSyncStatus,
} from './healthSync';
import type { HealthWorkout, HealthBodyMetrics, HealthSyncOptions } from '../types/health';

const SYNC_PREFERENCES_KEY = 'healthSyncOptions';
const LAST_SYNC_DATE_KEY = 'healthLastSyncDate';

/**
 * Session-based workout buffer
 * Aggregates sets during a workout session and syncs as one workout to Apple Health
 */
interface PendingWorkoutSet {
  exercise: string;
  weight: number;
  reps: number;
  timestamp: Date;
}

// In-memory buffer for current session
let pendingWorkoutSets: PendingWorkoutSet[] = [];
let sessionStartTime: Date | null = null;

/**
 * Get health sync preferences
 */
export async function getHealthSyncOptions(): Promise<HealthSyncOptions> {
  const defaults: HealthSyncOptions = {
    autoSync: false,
    syncOnWorkoutLog: false,
    syncOnProfileUpdate: false,
  };
  
  const stored = await getPreference<HealthSyncOptions>(SYNC_PREFERENCES_KEY, defaults);
  return { ...defaults, ...stored };
}

/**
 * Save health sync preferences
 */
export async function saveHealthSyncOptions(options: HealthSyncOptions): Promise<void> {
  await setPreference(SYNC_PREFERENCES_KEY, options);
}

/**
 * Get last sync date
 */
export async function getLastSyncDate(): Promise<Date | null> {
  const dateStr = await getPreference<string>(LAST_SYNC_DATE_KEY, null);
  return dateStr ? new Date(dateStr) : null;
}

/**
 * Update last sync date
 */
export async function updateLastSyncDate(): Promise<void> {
  await setPreference(LAST_SYNC_DATE_KEY, new Date().toISOString());
}

/**
 * Exercise categories for duration estimation
 * Based on typical set execution time, setup requirements, and rest needs
 */
type ExerciseCategory = 'heavy_compound' | 'medium_compound' | 'machine' | 'isolation' | 'bodyweight';

const exerciseCategories: Record<string, ExerciseCategory> = {
  // Heavy compound lifts - longest duration (setup, bracing, controlled reps)
  'Deadlift': 'heavy_compound',
  'Squat': 'heavy_compound',
  'Front Squat': 'heavy_compound',
  'Sumo Deadlift': 'heavy_compound',
  
  // Medium compound lifts - moderate duration
  'Bench Press': 'medium_compound',
  'Incline Bench Press': 'medium_compound',
  'Overhead Press': 'medium_compound',
  'Barbell Row': 'medium_compound',
  'Hip Thrust': 'medium_compound',
  'Leg Press': 'medium_compound',
  'Bulgarian Split Squat': 'medium_compound',
  'Dumbbell Press': 'medium_compound',
  
  // Machine/cable exercises - shorter setup, controlled movement
  'Lat Pulldown': 'machine',
  'Seated Row': 'machine',
  'Machine Chest Press': 'machine',
  'Machine Shoulder Press': 'machine',
  'Rope Triceps Pushdown': 'machine',
  'Cable Lateral Raise': 'machine',
  'Face Pull': 'machine',
  
  // Bodyweight exercises - variable duration
  'Pull-Up': 'bodyweight',
  'Triceps Dip': 'bodyweight',
  
  // Isolation exercises - shortest duration per rep
  'Dumbbell Curl': 'isolation',
  'Hammer Curl': 'isolation',
  'Preacher Curl': 'isolation',
  'Dumbbell Lateral Raise': 'isolation',
  'Reverse Fly': 'isolation',
  'Calf Raise': 'isolation',
};

/**
 * Estimate workout duration based on exercise type and rep count
 * Returns duration in seconds
 */
function estimateWorkoutDuration(exerciseName: string, reps: number): number {
  const category = exerciseCategories[exerciseName] || 'medium_compound';
  
  // Time per rep (in seconds) based on exercise category
  // Includes eccentric + concentric movement + brief pause
  const secondsPerRep: Record<ExerciseCategory, number> = {
    heavy_compound: 5,      // Deadlifts, squats need setup per rep
    medium_compound: 3.5,   // Bench, rows - controlled movement
    machine: 2.5,           // Machines guide the movement
    bodyweight: 3,          // Pull-ups, dips
    isolation: 2,           // Curls, raises - faster tempo
  };
  
  // Rest/setup time between reps (heavier exercises need more)
  const restTimeSeconds: Record<ExerciseCategory, number> = {
    heavy_compound: 90,     // Heavy lifts need more recovery
    medium_compound: 60,    // Standard rest
    machine: 45,            // Less recovery needed
    bodyweight: 60,         // Moderate rest
    isolation: 30,          // Quick rest for isolation
  };
  
  // Calculate total duration: (time per rep × reps) + rest time
  const repTime = secondsPerRep[category] * reps;
  const rest = restTimeSeconds[category];
  
  // Minimum 30 seconds, maximum 5 minutes per set
  return Math.max(30, Math.min(300, repTime + rest));
}

/**
 * Calculate calories for a workout using MET values
 */
function calculateWorkoutCalories(
  exerciseName: string,
  weightLbs: number,
  reps: number,
  profileWeightLbs: number
): number {
  const exercise = exercises.find(e => e.name === exerciseName);
  const met = exercise ? exercise.met : 5; // Default MET if exercise not found
  
  // Use estimated duration based on exercise type
  const durationSeconds = estimateWorkoutDuration(exerciseName, reps);
  const durationMin = durationSeconds / 60;
  const weightKg = profileWeightLbs * 0.453592;
  
  // Calories = (MET * weightKg * 3.5 / 200) * duration (min)
  const calories = (met * weightKg * 3.5 / 200) * durationMin;
  return Math.round(calories);
}

/**
 * Convert Side-Track workout log to Health workout format
 */
function convertWorkoutLogToHealth(
  log: { exercise: string; weight: number; reps: number; date: string },
  profileWeightLbs: number
): HealthWorkout {
  const duration = estimateWorkoutDuration(log.exercise, log.reps);
  const calories = calculateWorkoutCalories(log.exercise, log.weight, log.reps, profileWeightLbs);
  
  return {
    exercise: log.exercise,
    weight: log.weight,
    reps: log.reps,
    date: log.date,
    duration,
    calories,
  };
}

/**
 * Add a workout set to the session buffer (does NOT sync immediately)
 * Call flushWorkoutSession() when the workout session ends
 */
export function addWorkoutToSession(
  exercise: string,
  weight: number,
  reps: number
): void {
  const now = new Date();
  
  // Start session if this is the first set
  if (!sessionStartTime) {
    sessionStartTime = now;
  }
  
  pendingWorkoutSets.push({
    exercise,
    weight,
    reps,
    timestamp: now,
  });
  
  console.log(`Added to session buffer: ${exercise} ${weight}lbs x${reps} (${pendingWorkoutSets.length} sets buffered)`);
}

/**
 * Get the number of sets currently in the buffer
 */
export function getPendingSetCount(): number {
  return pendingWorkoutSets.length;
}

/**
 * Clear the session buffer without syncing
 */
export function clearWorkoutSession(): void {
  pendingWorkoutSets = [];
  sessionStartTime = null;
  console.log('Workout session buffer cleared');
}

/**
 * Flush the workout session - aggregate all sets and sync as ONE workout to Apple Health
 * Call this when the workout screen closes or app backgrounds
 */
export async function flushWorkoutSession(): Promise<boolean> {
  if (pendingWorkoutSets.length === 0) {
    console.log('No pending sets to sync');
    return true;
  }
  
  try {
    const options = await getHealthSyncOptions();
    if (!options.syncOnWorkoutLog) {
      console.log('Health sync disabled, clearing buffer');
      clearWorkoutSession();
      return false;
    }

    const status = await getHealthSyncStatus();
    if (!status.isAuthorized) {
      console.warn('Health platform not authorized, clearing buffer');
      clearWorkoutSession();
      return false;
    }

    const profile = await getProfile();
    const profileWeightLbs = profile?.weight 
      ? parseFloat(profile.weight.match(/(\d+\.?\d*)/)?.[1] || '170')
      : 170;

    // Aggregate all sets into one workout
    const aggregatedWorkout = aggregateSessionSets(pendingWorkoutSets, profileWeightLbs);
    
    console.log(`Syncing aggregated workout: ${aggregatedWorkout.exercise} - ${pendingWorkoutSets.length} sets, ${Math.round(aggregatedWorkout.duration! / 60)} min, ${aggregatedWorkout.calories} cal`);
    
    const success = await writeWorkoutToHealth(aggregatedWorkout);
    if (success) {
      await updateLastSyncDate();
      console.log('Successfully synced aggregated workout to Apple Health');
    }
    
    // Clear buffer regardless of success (don't want to re-sync on failure)
    clearWorkoutSession();
    
    return success;
  } catch (error) {
    console.error('Error flushing workout session:', error);
    clearWorkoutSession();
    return false;
  }
}

/**
 * Aggregate multiple sets into a single workout entry
 */
function aggregateSessionSets(
  sets: PendingWorkoutSet[],
  profileWeightLbs: number
): HealthWorkout {
  if (sets.length === 0) {
    throw new Error('Cannot aggregate empty sets array');
  }

  // Find start and end times
  const sortedSets = [...sets].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const firstSet = sortedSets[0];
  const lastSet = sortedSets[sortedSets.length - 1];
  
  // Calculate total calories and estimate total duration
  let totalCalories = 0;
  let totalDuration = 0;
  
  // Group sets by exercise for metadata
  const exerciseSummary: Record<string, { sets: number; totalReps: number; maxWeight: number }> = {};
  
  for (const set of sets) {
    // Add calories for this set
    totalCalories += calculateWorkoutCalories(set.exercise, set.weight, set.reps, profileWeightLbs);
    
    // Add duration for this set
    totalDuration += estimateWorkoutDuration(set.exercise, set.reps);
    
    // Track exercise summary
    if (!exerciseSummary[set.exercise]) {
      exerciseSummary[set.exercise] = { sets: 0, totalReps: 0, maxWeight: 0 };
    }
    exerciseSummary[set.exercise].sets++;
    exerciseSummary[set.exercise].totalReps += set.reps;
    exerciseSummary[set.exercise].maxWeight = Math.max(exerciseSummary[set.exercise].maxWeight, set.weight);
  }
  
  // Calculate actual session duration (time from first to last set + last set's duration)
  const lastSetDuration = estimateWorkoutDuration(lastSet.exercise, lastSet.reps);
  const sessionDuration = Math.max(
    totalDuration,
    (lastSet.timestamp.getTime() - firstSet.timestamp.getTime()) / 1000 + lastSetDuration
  );
  
  // Create exercise summary string for metadata
  const exerciseList = Object.entries(exerciseSummary)
    .map(([ex, data]) => `${ex}: ${data.sets}x (${data.maxWeight}lbs)`)
    .join(', ');
  
  // Use the most common exercise as the primary, or just list count
  const exerciseNames = Object.keys(exerciseSummary);
  const primaryExercise = exerciseNames.length === 1 
    ? exerciseNames[0] 
    : `${sets.length} sets (${exerciseNames.length} exercises)`;
  
  return {
    exercise: primaryExercise,
    weight: Math.max(...sets.map(s => s.weight)),  // Max weight used
    reps: sets.reduce((sum, s) => sum + s.reps, 0),  // Total reps
    date: firstSet.timestamp.toISOString(),
    duration: Math.round(sessionDuration),
    calories: totalCalories,
  };
}

/**
 * Sync a single workout to health platform (DEPRECATED - use session-based sync)
 * Kept for backwards compatibility but now just adds to session buffer
 */
export async function syncWorkoutToHealth(
  exercise: string,
  weight: number,
  reps: number
): Promise<boolean> {
  // Add to session buffer instead of syncing immediately
  addWorkoutToSession(exercise, weight, reps);
  return true; // Always return true since we're just buffering
}

/**
 * Sync all workouts to health platform (bulk export)
 */
export async function syncAllWorkoutsToHealth(): Promise<{ success: number; total: number }> {
  try {
    const status = await getHealthSyncStatus();
    if (!status.isAuthorized) {
      throw new Error('Health platform not authorized');
    }

    const logs = await getWorkoutLogs();
    const profile = await getProfile();
    const profileWeightLbs = profile?.weight 
      ? parseFloat(profile.weight.match(/(\d+\.?\d*)/)?.[1] || '170')
      : 170;

    const healthWorkouts = logs.map(log => 
      convertWorkoutLogToHealth(log, profileWeightLbs)
    );

    const successCount = await writeWorkoutsToHealth(healthWorkouts);
    if (successCount > 0) {
      await updateLastSyncDate();
    }

    return { success: successCount, total: healthWorkouts.length };
  } catch (error) {
    console.error('Error syncing all workouts to health:', error);
    throw error;
  }
}

/**
 * Import workouts from health platform
 */
export async function importWorkoutsFromHealth(
  startDate: Date,
  endDate: Date
): Promise<{ imported: number; skipped: number }> {
  try {
    const status = await getHealthSyncStatus();
    if (!status.isAuthorized) {
      throw new Error('Health platform not authorized');
    }

    const healthWorkouts = await readWorkoutsFromHealth(startDate, endDate);
    
    // TODO: Import workouts into database
    // For now, just return counts
    // You'll need to:
    // 1. Check for duplicates (same exercise, weight, reps, date)
    // 2. Add new workouts using addWorkoutLog
    // 3. Handle conflicts (Side-Track data takes precedence)
    
    console.warn('Import workouts from health not yet fully implemented');
    
    return { imported: 0, skipped: healthWorkouts.length };
  } catch (error) {
    console.error('Error importing workouts from health:', error);
    throw error;
  }
}

/**
 * Sync body metrics to health platform
 */
export async function syncBodyMetricsToHealth(): Promise<boolean> {
  try {
    const options = await getHealthSyncOptions();
    if (!options.syncOnProfileUpdate) {
      return false; // Auto-sync disabled
    }

    const status = await getHealthSyncStatus();
    if (!status.isAuthorized) {
      console.warn('Health platform not authorized, skipping sync');
      return false;
    }

    const profile = await getProfile();
    if (!profile) {
      return false;
    }

    const weightMatch = profile.weight?.match(/(\d+\.?\d*)/);
    const weightLbs = weightMatch ? parseFloat(weightMatch[1]) : null;
    const weightKg = weightLbs ? weightLbs * 0.453592 : undefined;

    // Parse height (assuming format like "5'9"" or "175 cm")
    let heightM: number | undefined;
    if (profile.height) {
      // Try to parse imperial format (feet'inches")
      const imperialMatch = profile.height.match(/(\d+)'(\d+)"/);
      if (imperialMatch) {
        const feet = parseFloat(imperialMatch[1]);
        const inches = parseFloat(imperialMatch[2]);
        heightM = (feet * 12 + inches) * 0.0254;
      } else {
        // Try to parse metric format (cm)
        const metricMatch = profile.height.match(/(\d+\.?\d*)\s*cm/i);
        if (metricMatch) {
          heightM = parseFloat(metricMatch[1]) / 100;
        }
      }
    }

    if (!weightKg && !heightM) {
      return false; // No metrics to sync
    }

    const metrics: HealthBodyMetrics = {
      weight: weightKg,
      height: heightM,
      date: new Date().toISOString(),
    };

    const success = await writeBodyMetricsToHealth(metrics);
    if (success) {
      await updateLastSyncDate();
    }
    return success;
  } catch (error) {
    console.error('Error syncing body metrics to health:', error);
    return false;
  }
}

/**
 * Sync daily calories to health platform
 */
export async function syncDailyCaloriesToHealth(date: Date): Promise<boolean> {
  try {
    const status = await getHealthSyncStatus();
    if (!status.isAuthorized) {
      return false;
    }

    // Get all workouts for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await getWorkoutLogs();
    const dayLogs = logs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= startOfDay && logDate <= endOfDay;
    });

    const profile = await getProfile();
    const profileWeightLbs = profile?.weight 
      ? parseFloat(profile.weight.match(/(\d+\.?\d*)/)?.[1] || '170')
      : 170;

    // Calculate total calories for the day
    let totalCalories = 0;
    for (const log of dayLogs) {
      totalCalories += calculateWorkoutCalories(log.exercise, log.weight, log.reps, profileWeightLbs);
    }

    if (totalCalories > 0) {
      const success = await writeCaloriesToHealth(totalCalories, date);
      if (success) {
        await updateLastSyncDate();
      }
      return success;
    }

    return false;
  } catch (error) {
    console.error('Error syncing daily calories to health:', error);
    return false;
  }
}

