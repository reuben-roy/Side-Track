/**
 * iOS HealthKit Implementation
 *
 * NOTE: This file is intentionally NOT named `healthSync.ios.ts`.
 * React Native will prefer `*.ios.*` when importing, which would shadow the
 * cross-platform API in `lib/healthSync.ts` and break named exports.
 */

import { Platform } from 'react-native';
import type {
    HealthActiveCaloriesSample,
    HealthBodyMetrics,
    HealthPermissions,
    HealthSyncStatus,
    HealthWorkout,
} from '../types/health';

const isIOS = Platform.OS === 'ios';

/**
 * Map HealthKit workout activity type numbers to readable names
 * Based on HKWorkoutActivityType enum values
 */
function getWorkoutTypeName(activityType: number | undefined): string {
  const workoutTypeNames: Record<number, string> = {
    1: 'American Football',
    2: 'Archery',
    3: 'Australian Football',
    4: 'Badminton',
    5: 'Baseball',
    6: 'Basketball',
    7: 'Bowling',
    8: 'Boxing',
    9: 'Climbing',
    10: 'Cricket',
    11: 'Cross Training',
    12: 'Curling',
    13: 'Cycling',
    14: 'Dance',
    15: 'Dance Inspired Training',
    16: 'Elliptical',
    17: 'Equestrian Sports',
    18: 'Fencing',
    19: 'Fishing',
    20: 'Functional Strength Training',
    21: 'Golf',
    22: 'Gymnastics',
    23: 'Handball',
    24: 'Hiking',
    25: 'Hockey',
    26: 'Hunting',
    27: 'Lacrosse',
    28: 'Martial Arts',
    29: 'Mind and Body',
    30: 'Mixed Cardio',
    31: 'Paddle Sports',
    32: 'Play',
    33: 'Preparation and Recovery',
    34: 'Racquetball',
    35: 'Rowing',
    36: 'Rugby',
    37: 'Running',
    38: 'Sailing',
    39: 'Skating Sports',
    40: 'Snow Sports',
    41: 'Soccer',
    42: 'Softball',
    43: 'Squash',
    44: 'Stair Climbing',
    45: 'Surfing Sports',
    46: 'Swimming',
    47: 'Table Tennis',
    48: 'Tennis',
    49: 'Track and Field',
    50: 'Traditional Strength Training',
    51: 'Volleyball',
    52: 'Walking',
    53: 'Water Fitness',
    54: 'Water Polo',
    55: 'Water Sports',
    56: 'Wrestling',
    57: 'Yoga',
    58: 'Barre',
    59: 'Core Training',
    60: 'Cross Country Skiing',
    61: 'Downhill Skiing',
    62: 'Flexibility',
    63: 'High Intensity Interval Training',
    64: 'Jump Rope',
    65: 'Kickboxing',
    66: 'Pilates',
    67: 'Snowboarding',
    68: 'Stairs',
    69: 'Step Training',
    70: 'Wheelchair Walk Pace',
    71: 'Wheelchair Run Pace',
    72: 'Tai Chi',
    73: 'Mixed Cardio',
    74: 'Hand Cycling',
    75: 'Disc Sports',
    76: 'Fitness Gaming',
    77: 'Cardio Dance',
    78: 'Social Dance',
    79: 'Pickleball',
    80: 'Cooldown',
    3000: 'Other',
  };
  
  return workoutTypeNames[activityType ?? 0] || 'Workout';
}

/**
 * HealthKit Integration Status
 *
 * HealthKit **permissions** are granted by the user (Apple Health app / iOS Settings),
 * but the HealthKit **native module** must also be present in your build.
 *
 * With Expo, that means:
 * - This will NOT work in Expo Go
 * - You must run a dev build (`npx expo run:ios`) after installing the native deps
 *
 * This file will automatically attempt to load the native module at runtime and will
 * safely fall back (returning empty data / not available) if it's not present.
 */

let healthKitModule: any | null = null;
let loadAttempted = false;

function getHealthKit(): any | null {
  if (healthKitModule) return healthKitModule;
  if (loadAttempted) return null;
  loadAttempted = true;

  try {
    // Keep require inside function so app can still boot when native module isn't present.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleName = '@kingstinct/react-native-healthkit';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    healthKitModule = require(moduleName);
    return healthKitModule;
  } catch (error) {
    console.warn('HealthKit module not available in this build. Rebuild with: npx expo run:ios', error);
    return null;
  }
}

const healthSyncIOS = {
  checkAvailability: async (): Promise<boolean> => {
    if (!isIOS) return false;

    try {
      const hk = getHealthKit();
      if (!hk) return false;
      return hk.isHealthDataAvailable();
    } catch (error) {
      console.error('Error checking HealthKit availability:', error);
      return false;
    }
  },

  requestPermissions: async (permissions: HealthPermissions): Promise<boolean> => {
    if (!isIOS) return false;

    try {
      const hk = getHealthKit();
      if (!hk) {
        console.warn('HealthKit library not available');
        return false;
      }

      const toRead: string[] = [];
      const toShare: string[] = [];

      if (permissions.workouts) {
        toRead.push('HKWorkoutTypeIdentifier');
        toShare.push('HKWorkoutTypeIdentifier');
      }

      if (permissions.calories) {
        toShare.push('HKQuantityTypeIdentifierActiveEnergyBurned');
      }

      if (permissions.bodyMetrics) {
        toShare.push('HKQuantityTypeIdentifierBodyMass');
        toShare.push('HKQuantityTypeIdentifierHeight');
      }

      await hk.requestAuthorization({
        toRead: toRead.length > 0 ? toRead : undefined,
        toShare: toShare.length > 0 ? toShare : undefined,
      });

      return true;
    } catch (error) {
      console.error('Error requesting HealthKit permissions:', error);
      return false;
    }
  },

  getSyncStatus: async (): Promise<HealthSyncStatus> => {
    if (!isIOS) {
      return {
        isAvailable: false,
        isAuthorized: false,
        platform: 'none',
      };
    }

    try {
      const hk = getHealthKit();
      if (!hk) {
        return {
          isAvailable: false,
          isAuthorized: false,
          platform: 'ios',
        };
      }

      const isAvailable = await healthSyncIOS.checkAvailability();

      // Check authorization status for workouts (as a proxy for overall authorization)
      let isAuthorized = false;
      if (isAvailable) {
        try {
          const workoutAuthStatus = hk.authorizationStatusFor('HKWorkoutTypeIdentifier');
          isAuthorized = workoutAuthStatus === hk.AuthorizationStatus.sharingAuthorized;
        } catch (error) {
          console.warn('Could not check authorization status:', error);
        }
      }

      return {
        isAvailable,
        isAuthorized,
        platform: 'ios',
      };
    } catch (error) {
      console.error('Error getting HealthKit status:', error);
      return {
        isAvailable: false,
        isAuthorized: false,
        platform: 'ios',
      };
    }
  },

  writeWorkout: async (workout: HealthWorkout): Promise<boolean> => {
    if (!isIOS) return false;

    try {
      const hk = getHealthKit();
      if (!hk) {
        console.warn('HealthKit library not available');
        return false;
      }

      const startDate = new Date(workout.date);
      const durationSeconds = workout.duration || 120;
      const endDate = new Date(startDate.getTime() + durationSeconds * 1000);

      // WorkoutActivityType.traditionalStrengthTraining = 50
      const workoutActivityType = 50;
      
      // quantities array (empty for strength training - we use totals for energy)
      const quantities: any[] = [];
      
      // totals object for energy burned
      const totals = workout.calories 
        ? { energyBurned: workout.calories }
        : undefined;
      
      // metadata for custom workout info
      const metadata = {
        exercise: workout.exercise,
        weight: workout.weight.toString(),
        reps: workout.reps.toString(),
      };

      await hk.saveWorkoutSample(
        workoutActivityType,
        quantities,
        startDate,
        endDate,
        totals,
        metadata
      );

      return true;
    } catch (error) {
      console.error('Error writing workout to HealthKit:', error);
      return false;
    }
  },

  writeWorkouts: async (workouts: HealthWorkout[]): Promise<number> => {
    if (!isIOS) return 0;

    let successCount = 0;
    for (const workout of workouts) {
      const success = await healthSyncIOS.writeWorkout(workout);
      if (success) successCount++;
    }
    return successCount;
  },

  readWorkouts: async (startDate: Date, endDate: Date): Promise<HealthWorkout[]> => {
    if (!isIOS) return [];

    try {
      const hk = getHealthKit();
      if (!hk) {
        console.warn('HealthKit library not available');
        return [];
      }

      let workouts: any[] = [];
      try {
        // WorkoutActivityType.traditionalStrengthTraining = 50
        // This only reads strength training workouts (for import purposes)
        workouts = await hk.queryWorkoutSamples({
          filter: {
            date: { startDate, endDate },
            workoutActivityType: 50,
          },
          limit: -1, // Get all samples
          ascending: false,
        });
      } catch (queryError) {
        // HealthKit throws when there's no data or permission issues - return empty gracefully
        console.log('No workout data available:', queryError);
        return [];
      }

      if (!workouts || !Array.isArray(workouts) || workouts.length === 0) {
        return [];
      }

      return workouts
        .filter((w: any) => w && w.startDate != null)
        .map((w: any) => {
          const duration =
            w.endDate && w.startDate
              ? (new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 1000
              : undefined;

          return {
            id: w.uuid,
            exercise: (w.metadata as any)?.exercise || 'Unknown',
            weight: parseFloat((w.metadata as any)?.weight || '0'),
            reps: parseInt((w.metadata as any)?.reps || '0', 10),
            date: w.startDate,
            duration,
            calories: typeof w.totalEnergyBurned?.quantity === 'number' ? w.totalEnergyBurned.quantity : undefined,
          };
        });
    } catch (error) {
      console.error('Error reading workouts from HealthKit:', error);
      return [];
    }
  },

  /**
   * Read ALL workouts from Apple Health (any workout type)
   * Used for display purposes only - shows runs, walks, cycling, etc.
   */
  readAllWorkouts: async (startDate: Date, endDate: Date): Promise<HealthWorkout[]> => {
    if (!isIOS) return [];

    try {
      const hk = getHealthKit();
      if (!hk) {
        console.warn('HealthKit library not available');
        return [];
      }

      let workouts: any[] = [];
      try {
        // Query ALL workout types (no workoutActivityType filter)
        workouts = await hk.queryWorkoutSamples({
          filter: {
            date: { startDate, endDate },
          },
          limit: -1,
          ascending: false,
        });
      } catch (queryError) {
        console.log('No workout data available:', queryError);
        return [];
      }

      if (!workouts || !Array.isArray(workouts) || workouts.length === 0) {
        return [];
      }

      return workouts
        .filter((w: any) => w && w.startDate != null)
        .map((w: any) => {
          const duration =
            w.endDate && w.startDate
              ? (new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 1000
              : undefined;

          // Map workout activity type to readable name
          const workoutTypeName = getWorkoutTypeName(w.workoutActivityType);

          return {
            id: w.uuid,
            exercise: (w.metadata as any)?.exercise || workoutTypeName,
            weight: parseFloat((w.metadata as any)?.weight || '0'),
            reps: parseInt((w.metadata as any)?.reps || '0', 10),
            date: w.startDate instanceof Date ? w.startDate.toISOString() : w.startDate,
            duration,
            calories: typeof w.totalEnergyBurned?.quantity === 'number' ? w.totalEnergyBurned.quantity : undefined,
            workoutType: workoutTypeName,
          };
        });
    } catch (error) {
      console.error('Error reading all workouts from HealthKit:', error);
      return [];
    }
  },

  writeBodyMetrics: async (metrics: HealthBodyMetrics): Promise<boolean> => {
    if (!isIOS) return false;

    try {
      const hk = getHealthKit();
      if (!hk) {
        console.warn('HealthKit library not available');
        return false;
      }

      const date = new Date(metrics.date);
      const promises: Promise<any>[] = [];

      // saveQuantitySample(identifier, unit, value, start, end, metadata?)
      if (metrics.weight !== undefined) {
        promises.push(
          hk.saveQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg', metrics.weight, date, date)
        );
      }

      if (metrics.height !== undefined) {
        promises.push(
          hk.saveQuantitySample('HKQuantityTypeIdentifierHeight', 'm', metrics.height, date, date)
        );
      }

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error writing body metrics to HealthKit:', error);
      return false;
    }
  },

  readBodyMetrics: async (startDate: Date, endDate: Date): Promise<HealthBodyMetrics[]> => {
    if (!isIOS) return [];

    try {
      const hk = getHealthKit();
      if (!hk) {
        console.warn('HealthKit library not available');
        return [];
      }

      let weights: any[] = [];
      let heights: any[] = [];

      // Query each metric separately to handle errors gracefully
      // queryQuantitySamples(identifier, options)
      try {
        weights = await hk.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
          filter: { date: { startDate, endDate } },
          limit: -1,
          unit: 'kg',
        });
      } catch (queryError) {
        console.log('No weight data available:', queryError);
        weights = [];
      }

      try {
        heights = await hk.queryQuantitySamples('HKQuantityTypeIdentifierHeight', {
          filter: { date: { startDate, endDate } },
          limit: -1,
          unit: 'm',
        });
      } catch (queryError) {
        console.log('No height data available:', queryError);
        heights = [];
      }

      // Ensure arrays
      weights = Array.isArray(weights) ? weights : [];
      heights = Array.isArray(heights) ? heights : [];

      if (weights.length === 0 && heights.length === 0) {
        return [];
      }

      const metricsMap = new Map<string, HealthBodyMetrics>();

      weights
        .filter((sample: any) => sample && sample.startDate != null)
        .forEach((sample: any) => {
          const dateKey = sample.startDate instanceof Date 
            ? sample.startDate.toISOString() 
            : sample.startDate;
          if (!metricsMap.has(dateKey)) metricsMap.set(dateKey, { date: dateKey });
          if (typeof sample.quantity === 'number') {
            metricsMap.get(dateKey)!.weight = sample.quantity;
          }
        });

      heights
        .filter((sample: any) => sample && sample.startDate != null)
        .forEach((sample: any) => {
          const dateKey = sample.startDate instanceof Date 
            ? sample.startDate.toISOString() 
            : sample.startDate;
          if (!metricsMap.has(dateKey)) metricsMap.set(dateKey, { date: dateKey });
          if (typeof sample.quantity === 'number') {
            metricsMap.get(dateKey)!.height = sample.quantity;
          }
        });

      return Array.from(metricsMap.values());
    } catch (error) {
      console.error('Error reading body metrics from HealthKit:', error);
      return [];
    }
  },

  writeCalories: async (calories: number, date: Date): Promise<boolean> => {
    if (!isIOS) return false;

    try {
      const hk = getHealthKit();
      if (!hk) {
        console.warn('HealthKit library not available');
        return false;
      }

      // saveQuantitySample(identifier, unit, value, start, end, metadata?)
      await hk.saveQuantitySample('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', calories, date, date);

      return true;
    } catch (error) {
      console.error('Error writing calories to HealthKit:', error);
      return false;
    }
  },

  /**
   * Get total calories burned from ALL workout types in a date range
   * Lightweight function for ranking - only returns calories and workout type
   */
  getTotalWorkoutCalories: async (startDate: Date, endDate: Date): Promise<{ total: number; byType: Record<string, number> }> => {
    if (!isIOS) return { total: 0, byType: {} };

    try {
      const hk = getHealthKit();
      if (!hk) {
        return { total: 0, byType: {} };
      }

      let workouts: any[] = [];
      try {
        // Query ALL workout types
        workouts = await hk.queryWorkoutSamples({
          filter: {
            date: { startDate, endDate },
          },
          limit: -1,
          ascending: false,
        });
      } catch (queryError) {
        console.log('No workout data available for calories:', queryError);
        return { total: 0, byType: {} };
      }

      if (!workouts || !Array.isArray(workouts) || workouts.length === 0) {
        return { total: 0, byType: {} };
      }

      let total = 0;
      const byType: Record<string, number> = {};

      for (const w of workouts) {
        const calories = typeof w.totalEnergyBurned?.quantity === 'number' 
          ? w.totalEnergyBurned.quantity 
          : 0;
        
        if (calories > 0) {
          total += calories;
          const typeName = getWorkoutTypeName(w.workoutActivityType);
          byType[typeName] = (byType[typeName] || 0) + calories;
        }
      }

      return { total: Math.round(total), byType };
    } catch (error) {
      console.error('Error getting total workout calories:', error);
      return { total: 0, byType: {} };
    }
  },

  readActiveCalories: async (startDate: Date, endDate: Date): Promise<HealthActiveCaloriesSample[]> => {
    if (!isIOS) return [];

    try {
      const hk = getHealthKit();
      if (!hk) {
        console.warn('HealthKit library not available');
        return [];
      }

      // HealthKit returns individual samples; we map them 1:1 and let UI aggregate per-day.
      let samples: any[] = [];
      try {
        // queryQuantitySamples(identifier, options)
        samples = await hk.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
          filter: { date: { startDate, endDate } },
          limit: -1,
          unit: 'kcal',
        });
      } catch (queryError) {
        // HealthKit throws when there's no data or permission issues - return empty gracefully
        console.log('No active calories data available:', queryError);
        return [];
      }

      if (!samples || !Array.isArray(samples) || samples.length === 0) {
        return [];
      }

      return samples
        .filter((s: any) => s && s.startDate != null)
        .map((s: any) => ({
          date: s.startDate instanceof Date ? s.startDate.toISOString() : s.startDate,
          calories: typeof s.quantity === 'number' ? s.quantity : 0,
        }));
    } catch (error) {
      console.error('Error reading active calories from HealthKit:', error);
      return [];
    }
  },
};

export default healthSyncIOS;


