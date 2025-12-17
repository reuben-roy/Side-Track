/**
 * Type definitions for health platform integration
 */

export interface HealthWorkout {
  id?: string;
  exercise: string;
  weight: number;
  reps: number;
  date: string;
  duration?: number; // in seconds
  calories?: number;
}

export interface HealthBodyMetrics {
  weight?: number; // in kg
  height?: number; // in meters
  date: string;
}

export interface HealthActiveCaloriesSample {
  date: string; // ISO string
  calories: number; // kcal
}

export interface HealthSyncStatus {
  isAvailable: boolean;
  isAuthorized: boolean;
  lastSyncDate?: string;
  platform: 'ios' | 'android' | 'none';
}

export interface HealthPermissions {
  workouts: boolean;
  calories: boolean;
  bodyMetrics: boolean;
}

export interface HealthSyncOptions {
  autoSync: boolean;
  syncOnWorkoutLog: boolean;
  syncOnProfileUpdate: boolean;
}

