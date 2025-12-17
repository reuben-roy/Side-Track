/**
 * Health Sync Service - Platform-agnostic interface
 * 
 * This file provides a unified interface for syncing with Apple HealthKit (iOS)
 * and Android Health Connect. Platform-specific implementations are in:
 * - lib/healthSyncIOS.ts (iOS/HealthKit)
 * - lib/healthSyncAndroid.ts (Android/Health Connect)
 */

import { Platform } from 'react-native';
import type {
  HealthActiveCaloriesSample,
  HealthBodyMetrics,
  HealthSyncStatus,
  HealthWorkout,
  HealthPermissions,
  HealthSyncOptions,
} from '../types/health';

// No-op implementation for when health sync isn't available
const noopImplementation = {
  checkAvailability: async () => false,
  requestPermissions: async () => false,
  getSyncStatus: async () => ({
    isAvailable: false,
    isAuthorized: false,
    platform: 'none' as const,
  }),
  writeWorkout: async () => false,
  writeWorkouts: async () => 0,
  readWorkouts: async () => [] as HealthWorkout[],
  writeBodyMetrics: async () => false,
  readBodyMetrics: async () => [] as HealthBodyMetrics[],
  writeCalories: async () => false,
  readActiveCalories: async () => [] as HealthActiveCaloriesSample[],
};

// Platform-specific implementations will be imported conditionally
let healthSyncImpl: typeof noopImplementation | null = null;
let loadAttempted = false;

// Lazy load platform-specific implementation
const getHealthSyncImpl = async (): Promise<typeof noopImplementation> => {
  if (healthSyncImpl) {
    return healthSyncImpl;
  }

  if (loadAttempted) {
    return noopImplementation;
  }

  loadAttempted = true;

  try {
    if (Platform.OS === 'ios') {
      // Try to load iOS implementation
      const iosImpl = await import('./healthSyncIOS');
      if (iosImpl?.default) {
        healthSyncImpl = iosImpl.default;
        return healthSyncImpl;
      }
    } else if (Platform.OS === 'android') {
      // Try to load Android implementation
      const androidImpl = await import('./healthSyncAndroid');
      if (androidImpl?.default) {
        healthSyncImpl = androidImpl.default;
        return healthSyncImpl;
      }
    }
  } catch (error) {
    console.warn('Health sync implementation not available:', error);
  }

  // Fallback to no-op implementation
  healthSyncImpl = noopImplementation;
  return healthSyncImpl;
};

/**
 * Check if health platform is available on this device
 */
export async function checkHealthAvailability(): Promise<boolean> {
  try {
    const impl = await getHealthSyncImpl();
    return impl?.checkAvailability?.() ?? false;
  } catch (error) {
    console.warn('checkHealthAvailability error:', error);
    return false;
  }
}

/**
 * Request permissions from the user
 */
export async function requestHealthPermissions(
  permissions: HealthPermissions
): Promise<boolean> {
  try {
    const impl = await getHealthSyncImpl();
    return impl?.requestPermissions?.(permissions) ?? false;
  } catch (error) {
    console.warn('requestHealthPermissions error:', error);
    return false;
  }
}

/**
 * Get current sync status
 */
export async function getHealthSyncStatus(): Promise<HealthSyncStatus> {
  try {
    const impl = await getHealthSyncImpl();
    return impl?.getSyncStatus?.() ?? {
      isAvailable: false,
      isAuthorized: false,
      platform: 'none',
    };
  } catch (error) {
    console.warn('getHealthSyncStatus error:', error);
    return {
      isAvailable: false,
      isAuthorized: false,
      platform: 'none',
    };
  }
}

/**
 * Write a single workout to health platform
 */
export async function writeWorkoutToHealth(workout: HealthWorkout): Promise<boolean> {
  try {
    const impl = await getHealthSyncImpl();
    return impl?.writeWorkout?.(workout) ?? false;
  } catch (error) {
    console.warn('writeWorkoutToHealth error:', error);
    return false;
  }
}

/**
 * Write multiple workouts to health platform
 * Returns the number of successfully written workouts
 */
export async function writeWorkoutsToHealth(workouts: HealthWorkout[]): Promise<number> {
  try {
    const impl = await getHealthSyncImpl();
    return impl?.writeWorkouts?.(workouts) ?? 0;
  } catch (error) {
    console.warn('writeWorkoutsToHealth error:', error);
    return 0;
  }
}

/**
 * Read workouts from health platform within a date range
 */
export async function readWorkoutsFromHealth(
  startDate: Date,
  endDate: Date
): Promise<HealthWorkout[]> {
  try {
    const impl = await getHealthSyncImpl();
    return impl?.readWorkouts?.(startDate, endDate) ?? [];
  } catch (error) {
    console.warn('readWorkoutsFromHealth error:', error);
    return [];
  }
}

/**
 * Write body metrics to health platform
 */
export async function writeBodyMetricsToHealth(
  metrics: HealthBodyMetrics
): Promise<boolean> {
  try {
    const impl = await getHealthSyncImpl();
    return impl?.writeBodyMetrics?.(metrics) ?? false;
  } catch (error) {
    console.warn('writeBodyMetricsToHealth error:', error);
    return false;
  }
}

/**
 * Read body metrics from health platform
 */
export async function readBodyMetricsFromHealth(
  startDate: Date,
  endDate: Date
): Promise<HealthBodyMetrics[]> {
  try {
    const impl = await getHealthSyncImpl();
    return impl?.readBodyMetrics?.(startDate, endDate) ?? [];
  } catch (error) {
    console.warn('readBodyMetricsFromHealth error:', error);
    return [];
  }
}

/**
 * Write calories burned to health platform
 */
export async function writeCaloriesToHealth(
  calories: number,
  date: Date
): Promise<boolean> {
  try {
    const impl = await getHealthSyncImpl();
    return impl?.writeCalories?.(calories, date) ?? false;
  } catch (error) {
    console.warn('writeCaloriesToHealth error:', error);
    return false;
  }
}

/**
 * Read active calories (kcal) from health platform within a date range.
 * Returned samples may need aggregation (e.g. per-day) by the caller.
 */
export async function readActiveCaloriesFromHealth(
  startDate: Date,
  endDate: Date
): Promise<HealthActiveCaloriesSample[]> {
  try {
    const impl = await getHealthSyncImpl();
    return impl?.readActiveCalories?.(startDate, endDate) ?? [];
  } catch (error) {
    console.warn('readActiveCaloriesFromHealth error:', error);
    return [];
  }
}

