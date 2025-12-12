/**
 * Health Sync Service - Platform-agnostic interface
 * 
 * This file provides a unified interface for syncing with Apple HealthKit (iOS)
 * and Android Health Connect. Platform-specific implementations are in:
 * - lib/healthSync.ios.ts (iOS/HealthKit)
 * - lib/healthSync.android.ts (Android/Health Connect)
 */

import { Platform } from 'react-native';
import type { HealthBodyMetrics, HealthSyncStatus, HealthWorkout, HealthPermissions, HealthSyncOptions } from '../types/health';

// Platform-specific implementations will be imported conditionally
let healthSyncImpl: {
  checkAvailability: () => Promise<boolean>;
  requestPermissions: (permissions: HealthPermissions) => Promise<boolean>;
  getSyncStatus: () => Promise<HealthSyncStatus>;
  writeWorkout: (workout: HealthWorkout) => Promise<boolean>;
  writeWorkouts: (workouts: HealthWorkout[]) => Promise<number>;
  readWorkouts: (startDate: Date, endDate: Date) => Promise<HealthWorkout[]>;
  writeBodyMetrics: (metrics: HealthBodyMetrics) => Promise<boolean>;
  readBodyMetrics: (startDate: Date, endDate: Date) => Promise<HealthBodyMetrics[]>;
  writeCalories: (calories: number, date: Date) => Promise<boolean>;
} | null = null;

// Lazy load platform-specific implementation
const getHealthSyncImpl = async () => {
  if (healthSyncImpl) {
    return healthSyncImpl;
  }

  try {
    if (Platform.OS === 'ios') {
      const iosImpl = await import('./healthSync.ios');
      healthSyncImpl = iosImpl.default;
    } else if (Platform.OS === 'android') {
      const androidImpl = await import('./healthSync.android');
      healthSyncImpl = androidImpl.default;
    } else {
      // Web/unsupported platform - return no-op implementation
      healthSyncImpl = {
        checkAvailability: async () => false,
        requestPermissions: async () => false,
        getSyncStatus: async () => ({
          isAvailable: false,
          isAuthorized: false,
          platform: 'none',
        }),
        writeWorkout: async () => false,
        writeWorkouts: async () => 0,
        readWorkouts: async () => [],
        writeBodyMetrics: async () => false,
        readBodyMetrics: async () => [],
        writeCalories: async () => false,
      };
    }
  } catch (error) {
    console.error('Failed to load health sync implementation:', error);
    // Return no-op implementation on error
    healthSyncImpl = {
      checkAvailability: async () => false,
      requestPermissions: async () => false,
      getSyncStatus: async () => ({
        isAvailable: false,
        isAuthorized: false,
        platform: 'none',
      }),
      writeWorkout: async () => false,
      writeWorkouts: async () => 0,
      readWorkouts: async () => [],
      writeBodyMetrics: async () => false,
      readBodyMetrics: async () => [],
      writeCalories: async () => false,
    };
  }

  return healthSyncImpl;
};

/**
 * Check if health platform is available on this device
 */
export async function checkHealthAvailability(): Promise<boolean> {
  const impl = await getHealthSyncImpl();
  return impl.checkAvailability();
}

/**
 * Request permissions from the user
 */
export async function requestHealthPermissions(
  permissions: HealthPermissions
): Promise<boolean> {
  const impl = await getHealthSyncImpl();
  return impl.requestPermissions(permissions);
}

/**
 * Get current sync status
 */
export async function getHealthSyncStatus(): Promise<HealthSyncStatus> {
  const impl = await getHealthSyncImpl();
  return impl.getSyncStatus();
}

/**
 * Write a single workout to health platform
 */
export async function writeWorkoutToHealth(workout: HealthWorkout): Promise<boolean> {
  const impl = await getHealthSyncImpl();
  return impl.writeWorkout(workout);
}

/**
 * Write multiple workouts to health platform
 * Returns the number of successfully written workouts
 */
export async function writeWorkoutsToHealth(workouts: HealthWorkout[]): Promise<number> {
  const impl = await getHealthSyncImpl();
  return impl.writeWorkouts(workouts);
}

/**
 * Read workouts from health platform within a date range
 */
export async function readWorkoutsFromHealth(
  startDate: Date,
  endDate: Date
): Promise<HealthWorkout[]> {
  const impl = await getHealthSyncImpl();
  return impl.readWorkouts(startDate, endDate);
}

/**
 * Write body metrics to health platform
 */
export async function writeBodyMetricsToHealth(
  metrics: HealthBodyMetrics
): Promise<boolean> {
  const impl = await getHealthSyncImpl();
  return impl.writeBodyMetrics(metrics);
}

/**
 * Read body metrics from health platform
 */
export async function readBodyMetricsFromHealth(
  startDate: Date,
  endDate: Date
): Promise<HealthBodyMetrics[]> {
  const impl = await getHealthSyncImpl();
  return impl.readBodyMetrics(startDate, endDate);
}

/**
 * Write calories burned to health platform
 */
export async function writeCaloriesToHealth(
  calories: number,
  date: Date
): Promise<boolean> {
  const impl = await getHealthSyncImpl();
  return impl.writeCalories(calories, date);
}

