import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
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

  // Load capacity limits when component mounts or user changes
  useEffect(() => {
    loadCapacityLimits();
  }, [user]);

  const getStorageKey = () => {
    // User-specific storage key based on logged-in user
    if (!user) {
      console.warn('No user logged in');
      return 'userCapacityLimits_default';
    }
    // return `userCapacityLimits_${user.sub}`; // OLD: Custom OAuth used 'sub'
    return `userCapacityLimits_${user.id}`; // NEW: Supabase uses 'id'
  };

  const loadCapacityLimits = async () => {
    setIsLoading(true);
    try {
      const storageKey = getStorageKey();
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (stored) {
        const parsedLimits = JSON.parse(stored);
        // Ensure all exercises have a value, fill in missing ones with defaults
        const completeLimits = { ...DEFAULT_CAPACITY_LIMITS };
        for (const exerciseName in parsedLimits) {
          if (parsedLimits[exerciseName] !== undefined) {
            completeLimits[exerciseName] = parsedLimits[exerciseName];
          }
        }
        setCapacityLimits(completeLimits);
      } else {
        // No stored data, use defaults
        setCapacityLimits(DEFAULT_CAPACITY_LIMITS);
        await AsyncStorage.setItem(storageKey, JSON.stringify(DEFAULT_CAPACITY_LIMITS));
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
      const storageKey = getStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
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
      const logsStr = await AsyncStorage.getItem('workoutLogs');
      if (!logsStr) {
        console.log('No workout logs found');
        return 0;
      }

      const logs = JSON.parse(logsStr);
      if (!Array.isArray(logs) || logs.length === 0) {
        console.log('No workout logs to process');
        return 0;
      }

      // Group logs by exercise and find best performance for each
      const bestPerformance: { [exercise: string]: number } = {};
      
      logs.forEach((log: { exercise: string; weight: number; reps: number }) => {
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
        const storageKey = getStorageKey();
        await AsyncStorage.setItem(storageKey, JSON.stringify(newLimits));
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
      const storageKey = getStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(DEFAULT_CAPACITY_LIMITS));
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
