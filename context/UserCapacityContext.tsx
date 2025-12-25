import { calculateStrengthScore, calculateWilksScore, getCoreLiftPRs } from '@/constants/StrengthMetrics';
import {
  getAllExerciseLimits,
  getProfile,
  getPreference,
  setPreference,
  getWorkoutLogs,
  saveAllExerciseLimits,
  saveExerciseLimit,
} from '@/lib/database';
import { getTotalWorkoutCaloriesFromHealth } from '@/lib/healthSync';
import { calculateWeeklyCaloriesFromLogs, flushWorkoutSession } from '@/lib/healthSyncHelper';
import { invalidateCache } from '@/lib/leaderboardCache';
import { supabase } from '@/lib/supabase';
import { generateUsernameFromProfile } from '@/helper/username';
import { estimate1RM_MultiFormula } from '@/helper/utils';
import React, { createContext, ReactNode, useContext, useEffect, useState, useRef } from 'react';
// import { useAuth } from './AuthContext'; // OLD: Custom OAuth
import { useSupabaseAuth } from './SupabaseAuthContext'; // NEW: Supabase Auth

/**
 * User-specific capacity limits (estimated 1RM) for each exercise.
 * This allows each user to have personalized settings that reflect their individual strength levels.
 */
export type UserCapacityLimits = {
  [exerciseName: string]: number;
};

interface UserCapacityContextType {
  capacityLimits: UserCapacityLimits;
  updateCapacityLimit: (exerciseName: string, value: number) => Promise<void>;
  updateCapacityFromWorkout: (exerciseName: string, weight: number, reps: number) => Promise<boolean>;
  estimateFromAllWorkouts: () => Promise<number>;
  resetToDefaults: () => Promise<void>;
  syncStrengthToSupabase: () => Promise<void>;
  isLoading: boolean;
}

const UserCapacityContext = createContext<UserCapacityContextType | undefined>(undefined);

export const useUserCapacity = () => {
  const context = useContext(UserCapacityContext);
  if (!context) {
    throw new Error('useUserCapacity must be used within a UserCapacityProvider');
  }
  return context;
};

interface UserCapacityProviderProps {
  children: ReactNode;
}

// Default 1RM estimates - these are conservative starting values
const DEFAULT_CAPACITY_LIMITS: UserCapacityLimits = {
  'Deadlift': 185,
  'Squat': 205,
  'Bench Press': 145,
  'Overhead Press': 95,
  'Barbell Row': 145,
  'Pull-Up': 175,
  'Dumbbell Press': 95,
  'Dumbbell Curl': 60,
  'Dumbbell Lateral Raise': 35,
  'Triceps Dip': 160,
  'Lat Pulldown': 145,
  'Seated Row': 160,
  'Leg Press': 320,
  'Calf Raise': 200,
  'Hammer Curl': 60,
  'Incline Bench Press': 125,
  'Face Pull': 55,
  'Cable Lateral Raise': 30,
  'Front Squat': 175,
  'Sumo Deadlift': 265,
  'Hip Thrust': 280,
  'Bulgarian Split Squat': 60,
  'Machine Chest Press': 175,
  'Machine Shoulder Press': 120,
  'Preacher Curl': 70,
  'Reverse Fly': 30,
  'Rope Triceps Pushdown': 85,
};

export const UserCapacityProvider: React.FC<UserCapacityProviderProps> = ({ children }) => {
  const [capacityLimits, setCapacityLimits] = useState<UserCapacityLimits>(DEFAULT_CAPACITY_LIMITS);
  const [isLoading, setIsLoading] = useState(true);
  // const { user } = useAuth(); // OLD
  const { user } = useSupabaseAuth(); // NEW
  
  // Debounce timer ref - batches multiple rapid updates into a single sync
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSyncRef = useRef(false);

  // Load capacity limits when component mounts or user changes
  useEffect(() => {
    loadCapacityLimits();
  }, [user]);

  // Debounced sync strength score to Supabase whenever capacity limits change
  // This batches multiple updates (even longer sequences) into a single API call
  // Debounce duration is configurable via EXPO_PUBLIC_SYNC_DEBOUNCE_MS env variable
  // Default: 5 minutes - reduces server load, syncs happen on workout close/app background
  useEffect(() => {
    if (user && !isLoading) {
      // Clear any pending sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      // Set flag that we have pending changes
      pendingSyncRef.current = true;
      
      // Debounce: wait for configured duration after last change before syncing
      // This batches multiple updates (even longer sequences) into a single Supabase call
      // Set EXPO_PUBLIC_SYNC_DEBOUNCE_MS in your .env file to customize
      // Example: EXPO_PUBLIC_SYNC_DEBOUNCE_MS=300000 (5 minutes)
      const debounceMs = process.env.EXPO_PUBLIC_SYNC_DEBOUNCE_MS
        ? parseInt(process.env.EXPO_PUBLIC_SYNC_DEBOUNCE_MS, 10)
        : 5 * 60 * 1000; // Default: 5 minutes (reduced frequency)
      
      syncTimeoutRef.current = setTimeout(() => {
        if (pendingSyncRef.current) {
          syncStrengthToSupabase();
          pendingSyncRef.current = false;
        }
      }, debounceMs);
      
      return () => {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
      };
    }
  }, [capacityLimits, user, isLoading]);

  const syncStrengthToSupabase = async () => {
    if (!user) return;

    try {
      const profile = await getProfile();
      const totalScore = calculateStrengthScore(capacityLimits);

      // Extract bodyweight from profile (handles formats like "170" or "170 lbs")
      const bodyweight = profile?.weight 
        ? parseFloat(profile.weight.match(/(\d+\.?\d*)/)?.[1] || '0')
        : null;

      // Extract gender (normalize to lowercase)
      const gender = profile?.gender?.toLowerCase();
      const validGender = gender === 'male' || gender === 'female' ? gender : null;

      // Get username from preferences (generated during onboarding)
      // If no username exists, generate one from profile data (for existing users who completed onboarding before this feature)
      let username = await getPreference<string>('username', null);
      if (!username) {
        username = generateUsernameFromProfile(validGender, bodyweight, user.id);
        await setPreference('username', username);
      }

      // Calculate Wilks score if we have bodyweight and valid gender
      const wilksScore = bodyweight && validGender
        ? calculateWilksScore(totalScore, bodyweight, validGender)
        : null;

      // Get individual lift PRs
      const liftPRs = getCoreLiftPRs(capacityLimits);

      // Fetch weekly calories - try Apple Health first, fallback to app's workout logs
      // Use Monday-based week (Monday to now) for consistency with goals
      const now = new Date();
      // Import getStartOfWeek from healthSyncHelper to ensure consistency
      const getStartOfWeek = (date: Date): Date => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust so Monday is day 1
        d.setDate(diff);
        d.setHours(0, 0, 0, 0); // Set to start of day
        return d;
      };
      const weekStart = getStartOfWeek(now);
      console.log(`📅 Week calculation - Now: ${now.toISOString()}, WeekStart (Monday): ${weekStart.toISOString()}`);
      
      // Ensure any pending workouts are flushed to Health before reading
      // Also wait a moment to ensure workout logs are fully saved to database
      try {
        await flushWorkoutSession();
        // Small delay to ensure workout is fully saved before calculating calories
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (flushError) {
        // Silently fail - flushing is best effort
        console.log('Note: Could not flush workout session before syncing calories:', flushError);
        // Still wait a bit even if flush failed, to ensure DB writes are complete
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      let weeklyCalories = 0;
      try {
        // First, try to get calories from Apple Health (includes all workout types)
        // Use Monday-based week for consistency
        const healthCalories = await getTotalWorkoutCaloriesFromHealth(weekStart, now);
        weeklyCalories = healthCalories.total || 0;
        console.log(`🏥 Health calories: ${weeklyCalories} cal`);
        
        // If Health returns 0 or isn't available, fallback to calculating from app's workout logs
        if (weeklyCalories === 0) {
          console.log('⚠️ Health calories returned 0, calculating from app logs...');
          weeklyCalories = await calculateWeeklyCaloriesFromLogs(weekStart, now);
        }
      } catch (healthError) {
        // If Health read fails, fallback to app's workout logs
        console.log('⚠️ Health read failed, calculating from app logs:', healthError);
        weeklyCalories = await calculateWeeklyCaloriesFromLogs(weekStart, now);
      }
      
      console.log(`✅ Final weekly calories to sync: ${weeklyCalories} cal (Monday ${weekStart.toLocaleDateString()} to ${now.toLocaleDateString()})`);

      // Upsert to Supabase (use user_id for conflict resolution since it has the unique constraint)
      const { error } = await supabase
        .from('user_strength')
        .upsert({
          user_id: user.id,
          username: username,
          total_score: totalScore,
          wilks_score: wilksScore,
          weekly_calories: weeklyCalories > 0 ? weeklyCalories : null,
          bodyweight_lbs: bodyweight,
          gender: validGender,
          ...liftPRs,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Failed to sync strength score:', error);
      } else {
        console.log('✅ Strength score synced:', totalScore, 'lbs (Wilks:', wilksScore, ', Weekly Cal:', weeklyCalories, ')');
        // Invalidate leaderboard cache so user sees their updated rank when they visit leaderboard
        invalidateCache();
      }
    } catch (err) {
      console.error('Error syncing strength:', err);
    }
  };

  const loadCapacityLimits = async () => {
    setIsLoading(true);
    try {
      const storedLimits = await getAllExerciseLimits();
      
      if (Object.keys(storedLimits).length > 0) {
        // Ensure all exercises have a value, fill in missing ones with defaults
        const completeLimits = { ...DEFAULT_CAPACITY_LIMITS, ...storedLimits };
        setCapacityLimits(completeLimits);
      } else {
        // No stored data, use defaults and save them
        setCapacityLimits(DEFAULT_CAPACITY_LIMITS);
        await saveAllExerciseLimits(DEFAULT_CAPACITY_LIMITS);
      }
    } catch (error) {
      console.error('Error loading user capacity limits:', error);
      setCapacityLimits(DEFAULT_CAPACITY_LIMITS);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCapacityLimit = async (exerciseName: string, value: number) => {
    try {
      const updated = { ...capacityLimits, [exerciseName]: value };
      setCapacityLimits(updated);
      await saveExerciseLimit(exerciseName, value);
    } catch (error) {
      console.error('Error updating capacity limit:', error);
    }
  };

  /**
   * Automatically update 1RM estimate based on workout performance.
   * Uses multi-formula approach for maximum accuracy across all rep ranges.
   * Only updates if the calculated 1RM is higher than current estimate.
   * @returns true if a new PR was set, false otherwise
   */
  const updateCapacityFromWorkout = async (
    exerciseName: string,
    weight: number,
    reps: number
  ): Promise<boolean> => {
    try {
      // Calculate estimated 1RM using multi-formula approach
      // Automatically selects best formula based on rep range (1-3: Brzycki, 4+: Wathan)
      const estimated1RM = Math.round(estimate1RM_MultiFormula(weight, reps));
      
      const currentLimit = capacityLimits[exerciseName] || DEFAULT_CAPACITY_LIMITS[exerciseName] || 0;
      
      // Only update if this is a new personal record
      if (estimated1RM > currentLimit) {
        console.log(`🎉 NEW PR for ${exerciseName}! Old: ${currentLimit} lbs, New: ${estimated1RM} lbs`);
        await updateCapacityLimit(exerciseName, estimated1RM);
        return true; // New PR!
      }
      
      return false; // No PR
    } catch (error) {
      console.error('Error updating capacity from workout:', error);
      return false;
    }
  };

  /**
   * Analyze all workout logs and estimate 1RM for each exercise.
   * Updates capacity limits to the highest estimated 1RM found for each exercise.
   * @returns number of exercises that were updated
   */
  const estimateFromAllWorkouts = async (): Promise<number> => {
    try {
      const logs = await getWorkoutLogs();
      if (logs.length === 0) {
        console.log('No workout logs found');
        return 0;
      }

      // Group logs by exercise and find best performance for each
      const bestPerformance: { [exercise: string]: number } = {};
      
      logs.forEach((log) => {
        if (log.exercise && typeof log.weight === 'number' && typeof log.reps === 'number') {
          // Use multi-formula approach for accurate estimation across all rep ranges
          const estimated1RM = Math.round(estimate1RM_MultiFormula(log.weight, log.reps));
          
          if (!bestPerformance[log.exercise] || estimated1RM > bestPerformance[log.exercise]) {
            bestPerformance[log.exercise] = estimated1RM;
          }
        }
      });

      // Update capacity limits with best performances
      let updatedCount = 0;
      const newLimits = { ...capacityLimits };
      
      for (const exercise in bestPerformance) {
        const estimated = bestPerformance[exercise];
        const current = capacityLimits[exercise] || DEFAULT_CAPACITY_LIMITS[exercise] || 0;
        
        if (estimated > current) {
          newLimits[exercise] = estimated;
          updatedCount++;
          console.log(`Updated ${exercise}: ${current} → ${estimated} lbs`);
        }
      }

      if (updatedCount > 0) {
        setCapacityLimits(newLimits);
        await saveAllExerciseLimits(newLimits);
      }

      return updatedCount;
    } catch (error) {
      console.error('Error estimating from workout logs:', error);
      return 0;
    }
  };

  const resetToDefaults = async () => {
    try {
      setCapacityLimits(DEFAULT_CAPACITY_LIMITS);
      await saveAllExerciseLimits(DEFAULT_CAPACITY_LIMITS);
    } catch (error) {
      console.error('Error resetting capacity limits:', error);
    }
  };

  return (
    <UserCapacityContext.Provider 
      value={{ 
        capacityLimits, 
        updateCapacityLimit,
        updateCapacityFromWorkout,
        estimateFromAllWorkouts,
        resetToDefaults,
        syncStrengthToSupabase,
        isLoading 
      }}
    >
      {children}
    </UserCapacityContext.Provider>
  );
};
