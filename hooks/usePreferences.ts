import { MuscleGroup } from '@/constants/MuscleGroups';
import { getAllPreferences, setPreference } from '@/lib/database';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

export interface DrainSettings {
  overallMultiplier: number;
  metCoefficient: number;
  repsCoefficient: number;
  intensityCoefficient: number;
  userBodyweight: number;
}

export interface UserPreferences {
  enableNotifications: boolean;
  enableHaptics: boolean;
  enableSoundEffects: boolean;
  darkMode: boolean;
  units: 'metric' | 'imperial';
  restTimerEnabled: boolean;
  autoLogWorkouts: boolean;
  showCaloriesBurned: boolean;
  shareLocation: boolean;
  customRecoveryRates?: { [key in MuscleGroup]?: number };
  drainSettings?: DrainSettings;
}

export const DEFAULT_DRAIN_SETTINGS: DrainSettings = {
  overallMultiplier: 8.0,
  metCoefficient: 0.15,
  repsCoefficient: 0.08,
  intensityCoefficient: 0.7,
  userBodyweight: 150,
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  enableNotifications: true,
  enableHaptics: true,
  enableSoundEffects: true,
  darkMode: false,
  units: 'imperial',
  restTimerEnabled: true,
  autoLogWorkouts: true,
  showCaloriesBurned: true,
  shareLocation: true,
  drainSettings: DEFAULT_DRAIN_SETTINGS,
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      const allPrefs = await getAllPreferences();
      
      const loadedPrefs: UserPreferences = {
        enableNotifications: (allPrefs.enableNotifications as boolean) ?? DEFAULT_PREFERENCES.enableNotifications,
        enableHaptics: (allPrefs.enableHaptics as boolean) ?? DEFAULT_PREFERENCES.enableHaptics,
        enableSoundEffects: (allPrefs.enableSoundEffects as boolean) ?? DEFAULT_PREFERENCES.enableSoundEffects,
        darkMode: (allPrefs.darkMode as boolean) ?? DEFAULT_PREFERENCES.darkMode,
        units: (allPrefs.units as 'metric' | 'imperial') ?? DEFAULT_PREFERENCES.units,
        restTimerEnabled: (allPrefs.restTimerEnabled as boolean) ?? DEFAULT_PREFERENCES.restTimerEnabled,
        autoLogWorkouts: (allPrefs.autoLogWorkouts as boolean) ?? DEFAULT_PREFERENCES.autoLogWorkouts,
        showCaloriesBurned: (allPrefs.showCaloriesBurned as boolean) ?? DEFAULT_PREFERENCES.showCaloriesBurned,
        shareLocation: (allPrefs.shareLocation as boolean) ?? DEFAULT_PREFERENCES.shareLocation,
        customRecoveryRates: allPrefs.customRecoveryRates as { [key in MuscleGroup]?: number } || {},
        drainSettings: allPrefs.drainSettings as DrainSettings || DEFAULT_DRAIN_SETTINGS,
      };
      
      setPreferences(loadedPrefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, []);

  // Load preferences on initial mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Also reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  const savePreferences = async (newPreferences: UserPreferences) => {
    try {
      setIsSaving(true);
      for (const [key, value] of Object.entries(newPreferences)) {
        await setPreference(key, value);
      }
      setPreferences(newPreferences);
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setIsSaving(false);
    }
  };

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    savePreferences(newPreferences);
  };

  return {
    preferences,
    isSaving,
    updatePreference,
    savePreferences,
    loadPreferences,
    setPreferences, // Exposed for manual updates if needed
  };
}
