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
import { invalidateCache } from '@/lib/leaderboardCache';
import { supabase } from '@/lib/supabase';
import { generateUsername, generateUsernameFromProfile } from '@/helper/username';
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
  // Default: 10 seconds - batches all updates within 10 seconds into one API call
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
      // Example: EXPO_PUBLIC_SYNC_DEBOUNCE_MS=15000 (15 seconds)
      const debounceMs = process.env.EXPO_PUBLIC_SYNC_DEBOUNCE_MS
        ? parseInt(process.env.EXPO_PUBLIC_SYNC_DEBOUNCE_MS, 10)
        : 10 * 1000; // Default: 10 seconds
      
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

      // Upsert to Supabase (use user_id for conflict resolution since it has the unique constraint)
      const { error } = await supabase
        .from('user_strength')
        .upsert({
          user_id: user.id,
          username: username,
          total_score: totalScore,
          wilks_score: wilksScore,
          bodyweight_lbs: bodyweight,
          gender: validGender,
          ...liftPRs,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Failed to sync strength score:', error);
      } else {
        console.log('✅ Strength score synced:', totalScore, 'lbs (Wilks:', wilksScore, ')');
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
   * Uses Epley formula: 1RM = Weight × (1 + Reps/30)
   * Only updates if the calculated 1RM is higher than current estimate.
   * @returns true if a new PR was set, false otherwise
   */
  const updateCapacityFromWorkout = async (
    exerciseName: string,
    weight: number,
    reps: number
  ): Promise<boolean> => {
    try {
      // Calculate estimated 1RM using Epley formula
      const estimated1RM = Math.round(weight * (1 + reps / 30));
      
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
          const estimated1RM = Math.round(log.weight * (1 + log.reps / 30));
          
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
        isLoading 
      }}
    >
      {children}
    </UserCapacityContext.Provider>
  );
};
