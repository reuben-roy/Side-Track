/**
 * Android Health Connect Implementation
 *
 * NOTE: This file is intentionally NOT named `healthSync.android.ts`.
 * React Native will prefer `*.android.*` when importing, which would shadow the
 * cross-platform API in `lib/healthSync.ts` and break named exports.
 */

import { Platform } from 'react-native';
import type { HealthActiveCaloriesSample, HealthBodyMetrics, HealthSyncStatus, HealthWorkout, HealthPermissions } from '../types/health';

const isAndroid = Platform.OS === 'android';

const healthSyncAndroid = {
  checkAvailability: async (): Promise<boolean> => {
    if (!isAndroid) return false;

    try {
      // TODO: Implement actual Health Connect availability check
      return true;
    } catch (error) {
      console.error('Error checking Health Connect availability:', error);
      return false;
    }
  },

  requestPermissions: async (_permissions: HealthPermissions): Promise<boolean> => {
    if (!isAndroid) return false;

    try {
      console.warn('Health Connect permissions not yet implemented - install react-native-health-connect');
      return false;
    } catch (error) {
      console.error('Error requesting Health Connect permissions:', error);
      return false;
    }
  },

  getSyncStatus: async (): Promise<HealthSyncStatus> => {
    if (!isAndroid) {
      return {
        isAvailable: false,
        isAuthorized: false,
        platform: 'none',
      };
    }

    try {
      return {
        isAvailable: await healthSyncAndroid.checkAvailability(),
        isAuthorized: false,
        platform: 'android',
      };
    } catch (error) {
      console.error('Error getting Health Connect status:', error);
      return {
        isAvailable: false,
        isAuthorized: false,
        platform: 'android',
      };
    }
  },

  writeWorkout: async (_workout: HealthWorkout): Promise<boolean> => {
    if (!isAndroid) return false;

    try {
      console.warn('Health Connect workout write not yet implemented');
      return false;
    } catch (error) {
      console.error('Error writing workout to Health Connect:', error);
      return false;
    }
  },

  writeWorkouts: async (workouts: HealthWorkout[]): Promise<number> => {
    if (!isAndroid) return 0;

    let successCount = 0;
    for (const workout of workouts) {
      const success = await healthSyncAndroid.writeWorkout(workout);
      if (success) successCount++;
    }
    return successCount;
  },

  readWorkouts: async (_startDate: Date, _endDate: Date): Promise<HealthWorkout[]> => {
    if (!isAndroid) return [];

    try {
      console.warn('Health Connect workout read not yet implemented');
      return [];
    } catch (error) {
      console.error('Error reading workouts from Health Connect:', error);
      return [];
    }
  },

  writeBodyMetrics: async (_metrics: HealthBodyMetrics): Promise<boolean> => {
    if (!isAndroid) return false;

    try {
      console.warn('Health Connect body metrics write not yet implemented');
      return false;
    } catch (error) {
      console.error('Error writing body metrics to Health Connect:', error);
      return false;
    }
  },

  readBodyMetrics: async (_startDate: Date, _endDate: Date): Promise<HealthBodyMetrics[]> => {
    if (!isAndroid) return [];

    try {
      console.warn('Health Connect body metrics read not yet implemented');
      return [];
    } catch (error) {
      console.error('Error reading body metrics from Health Connect:', error);
      return [];
    }
  },

  writeCalories: async (_calories: number, _date: Date): Promise<boolean> => {
    if (!isAndroid) return false;

    try {
      console.warn('Health Connect calories write not yet implemented');
      return false;
    } catch (error) {
      console.error('Error writing calories to Health Connect:', error);
      return false;
    }
  },

  readActiveCalories: async (_startDate: Date, _endDate: Date): Promise<HealthActiveCaloriesSample[]> => {
    if (!isAndroid) return [];

    // TODO: Implement with react-native-health-connect (ActiveCaloriesBurnedRecord)
    return [];
  },
};

export default healthSyncAndroid;


