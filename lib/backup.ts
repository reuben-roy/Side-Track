import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { Alert, Platform } from 'react-native';
import {
    getAllExerciseLimits,
    getAllPreferences,
    getCurrentDatabaseUserId,
    getMuscleCapacity,
    getProfile,
    getWorkoutLogs,
    MuscleCapacityState,
    Profile,
    saveAllExerciseLimits,
    saveProfile,
    setPreference,
    updateAllMuscleCapacity,
    WorkoutLog,
} from './database';

// Lazy load native modules to prevent crashes if not available
let Sharing: typeof import('expo-sharing') | null = null;
let DocumentPicker: typeof import('expo-document-picker') | null = null;

async function loadSharingModule() {
  if (!Sharing) {
    try {
      Sharing = await import('expo-sharing');
    } catch (e) {
      console.warn('expo-sharing not available:', e);
    }
  }
  return Sharing;
}

async function loadDocumentPickerModule() {
  if (!DocumentPicker) {
    try {
      DocumentPicker = await import('expo-document-picker');
    } catch (e) {
      console.warn('expo-document-picker not available:', e);
    }
  }
  return DocumentPicker;
}

// ============================================================================
// BACKUP DATA TYPES
// ============================================================================

export interface BackupData {
  version: number;
  createdAt: string;
  userId: string | null;
  profile: Profile | null;
  workoutLogs: WorkoutLog[];
  exerciseLimits: Record<string, number>;
  muscleCapacity: MuscleCapacityState;
  preferences: Record<string, unknown>;
}

export interface BackupMetadata {
  fileName: string;
  createdAt: string;
  size: number;
  userId: string | null;
  workoutCount: number;
}

export interface StorageQuota {
  used: number;
  available: number;
  total: number;
  percentUsed: number;
  isLow: boolean; // True if less than 50MB available
}

// Current backup format version
const BACKUP_VERSION = 1;

// Backup file naming
const getBackupFileName = (userId: string | null): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const userPart = userId ? `_${userId.substring(0, 8)}` : '';
  return `sidetrack_backup${userPart}_${timestamp}.json`;
};

// ============================================================================
// STORAGE QUOTA CHECKING
// ============================================================================

/**
 * Get device storage information
 * Note: This returns device storage, not cloud storage quota
 * Cloud storage quota requires platform-specific APIs
 */
export async function getDeviceStorageQuota(): Promise<StorageQuota> {
  try {
    const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
    const totalDiskStorage = await FileSystem.getTotalDiskCapacityAsync();
    
    const used = totalDiskStorage - freeDiskStorage;
    const percentUsed = (used / totalDiskStorage) * 100;
    
    return {
      used,
      available: freeDiskStorage,
      total: totalDiskStorage,
      percentUsed,
      isLow: freeDiskStorage < 50 * 1024 * 1024, // Less than 50MB
    };
  } catch (error) {
    console.error('Error getting storage quota:', error);
    return {
      used: 0,
      available: 0,
      total: 0,
      percentUsed: 0,
      isLow: false,
    };
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// EXPORT DATA
// ============================================================================

/**
 * Export all user data to a JSON object
 */
export async function exportAllData(): Promise<BackupData> {
  const userId = getCurrentDatabaseUserId();
  
  const [profile, workoutLogs, exerciseLimits, muscleCapacity, preferences] = await Promise.all([
    getProfile(),
    getWorkoutLogs(),
    getAllExerciseLimits(),
    getMuscleCapacity(),
    getAllPreferences(),
  ]);

  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    userId,
    profile,
    workoutLogs,
    exerciseLimits,
    muscleCapacity,
    preferences,
  };
}

/**
 * Create a backup file and save to device
 * Returns the file URI
 */
export async function createBackupFile(): Promise<string> {
  const data = await exportAllData();
  const jsonString = JSON.stringify(data, null, 2);
  const fileName = getBackupFileName(data.userId);
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  
  await FileSystem.writeAsStringAsync(fileUri, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  
  return fileUri;
}

// ============================================================================
// BACKUP TO CLOUD (via Share Sheet)
// ============================================================================

/**
 * Backup data to iCloud (iOS) or Google Drive (Android) via system share sheet
 * This approach works because:
 * - iOS: Share sheet includes "Save to Files" which can save to iCloud Drive
 * - Android: Share sheet includes Google Drive if installed
 */
export async function backupToCloud(): Promise<{ success: boolean; message: string }> {
  try {
    // Load sharing module
    const SharingModule = await loadSharingModule();
    if (!SharingModule) {
      return {
        success: false,
        message: 'Backup feature requires app rebuild. Please restart the app or rebuild with: npx expo run:ios',
      };
    }

    // Check storage quota first
    const quota = await getDeviceStorageQuota();
    if (quota.isLow) {
      return {
        success: false,
        message: `Low device storage! Only ${formatBytes(quota.available)} available. Free up space before creating backup.`,
      };
    }

    // Check if sharing is available
    const isAvailable = await SharingModule.isAvailableAsync();
    if (!isAvailable) {
      return {
        success: false,
        message: 'Sharing is not available on this device.',
      };
    }

    // Create the backup file
    const fileUri = await createBackupFile();
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    
    if (!fileInfo.exists) {
      return {
        success: false,
        message: 'Failed to create backup file.',
      };
    }

    // Get file size for user feedback
    const fileSize = fileInfo.size || 0;
    
    // Open share sheet
    // On iOS: User can choose "Save to Files" -> iCloud Drive
    // On Android: User can choose Google Drive
    await SharingModule.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Save Backup to Cloud',
      UTI: 'public.json', // iOS Uniform Type Identifier
    });

    // Clean up temporary file after sharing
    await FileSystem.deleteAsync(fileUri, { idempotent: true });

    const platformHint = Platform.OS === 'ios' 
      ? 'Choose "Save to Files" → "iCloud Drive" to backup to iCloud.'
      : 'Choose "Google Drive" to backup to your Google account.';

    return {
      success: true,
      message: `Backup created (${formatBytes(fileSize)}). ${platformHint}`,
    };
  } catch (error) {
    console.error('Backup error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create backup.',
    };
  }
}

// ============================================================================
// RESTORE FROM CLOUD
// ============================================================================

/**
 * Restore data from a backup file
 * User selects file from iCloud Drive (iOS) or Google Drive (Android)
 */
export async function restoreFromCloud(): Promise<{ success: boolean; message: string; data?: BackupData }> {
  try {
    // Load document picker module
    const DocumentPickerModule = await loadDocumentPickerModule();
    if (!DocumentPickerModule) {
      return {
        success: false,
        message: 'Restore feature requires app rebuild. Please restart the app or rebuild with: npx expo run:ios',
      };
    }

    // Open document picker
    // On iOS: This shows iCloud Drive and other document providers
    // On Android: This shows Google Drive and other storage providers
    const result = await DocumentPickerModule.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true, // Copy to app's cache so we can read it
    });

    if (result.canceled) {
      return {
        success: false,
        message: 'Restore cancelled.',
      };
    }

    const file = result.assets[0];
    if (!file) {
      return {
        success: false,
        message: 'No file selected.',
      };
    }

    // Read the file content
    const content = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Parse and validate
    const data = JSON.parse(content) as BackupData;
    
    if (!data.version || !data.createdAt) {
      return {
        success: false,
        message: 'Invalid backup file format.',
      };
    }

    // Check version compatibility
    if (data.version > BACKUP_VERSION) {
      return {
        success: false,
        message: `Backup version ${data.version} is newer than supported version ${BACKUP_VERSION}. Please update the app.`,
      };
    }

    return {
      success: true,
      message: `Found backup from ${new Date(data.createdAt).toLocaleDateString()} with ${data.workoutLogs.length} workouts.`,
      data,
    };
  } catch (error) {
    console.error('Restore error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to restore backup.',
    };
  }
}

/**
 * Apply backup data to the current database
 * This will REPLACE all existing data
 */
export async function applyBackupData(data: BackupData): Promise<{ success: boolean; message: string }> {
  try {
    const currentUserId = getCurrentDatabaseUserId();
    
    // Restore profile
    if (data.profile) {
      await saveProfile(data.profile);
    }

    // Restore exercise limits
    if (data.exerciseLimits && Object.keys(data.exerciseLimits).length > 0) {
      await saveAllExerciseLimits(data.exerciseLimits);
    }

    // Restore muscle capacity
    if (data.muscleCapacity && Object.keys(data.muscleCapacity).length > 0) {
      await updateAllMuscleCapacity(data.muscleCapacity);
    }

    // Restore preferences
    if (data.preferences) {
      for (const [key, value] of Object.entries(data.preferences)) {
        await setPreference(key, value);
      }
    }

    // Restore workout logs (need to add directly to database)
    if (data.workoutLogs && data.workoutLogs.length > 0) {
      await restoreWorkoutLogs(data.workoutLogs);
    }

    return {
      success: true,
      message: `Restored ${data.workoutLogs.length} workouts, profile, and settings from backup.`,
    };
  } catch (error) {
    console.error('Apply backup error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to apply backup data.',
    };
  }
}

/**
 * Restore workout logs from backup
 * Clears existing logs and imports from backup
 */
async function restoreWorkoutLogs(logs: WorkoutLog[]): Promise<void> {
  // We need direct database access for bulk insert
  // This is a special case for restore functionality
  const dbName = getCurrentDatabaseUserId() 
    ? `sidetrack_${getCurrentDatabaseUserId()!.replace(/[^a-zA-Z0-9]/g, '_')}.db`
    : 'sidetrack_anonymous.db';
  
  const db = await SQLite.openDatabaseAsync(dbName);
  
  // Clear existing workout logs
  await db.runAsync('DELETE FROM workout_logs');
  
  // Insert all logs from backup
  const stmt = await db.prepareAsync(
    'INSERT INTO workout_logs (exercise_name, weight, reps, created_at) VALUES (?, ?, ?, ?)'
  );
  
  try {
    for (const log of logs) {
      await stmt.executeAsync([log.exercise, log.weight, log.reps, log.date]);
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

// ============================================================================
// AUTO-BACKUP SETTINGS
// ============================================================================

export interface AutoBackupSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  lastBackupDate: string | null;
  wifiOnly: boolean;
}

const DEFAULT_AUTO_BACKUP_SETTINGS: AutoBackupSettings = {
  enabled: false,
  frequency: 'weekly',
  lastBackupDate: null,
  wifiOnly: true,
};

/**
 * Get auto-backup settings
 */
export async function getAutoBackupSettings(): Promise<AutoBackupSettings> {
  try {
    const stored = await FileSystem.readAsStringAsync(
      `${FileSystem.documentDirectory}auto_backup_settings.json`,
      { encoding: FileSystem.EncodingType.UTF8 }
    );
    return { ...DEFAULT_AUTO_BACKUP_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_AUTO_BACKUP_SETTINGS;
  }
}

/**
 * Save auto-backup settings
 */
export async function saveAutoBackupSettings(settings: AutoBackupSettings): Promise<void> {
  await FileSystem.writeAsStringAsync(
    `${FileSystem.documentDirectory}auto_backup_settings.json`,
    JSON.stringify(settings),
    { encoding: FileSystem.EncodingType.UTF8 }
  );
}

// ============================================================================
// CLOUD STORAGE STATUS (Platform-Specific Info)
// ============================================================================

/**
 * Get cloud storage status information for display to user
 */
export function getCloudStorageInfo(): {
  platform: 'ios' | 'android' | 'web';
  cloudService: string;
  instructions: string;
  lowSpaceWarning: string;
} {
  if (Platform.OS === 'ios') {
    return {
      platform: 'ios',
      cloudService: 'iCloud Drive',
      instructions: 'When saving, choose "Save to Files" → "iCloud Drive" folder. When restoring, navigate to iCloud Drive to find your backup.',
      lowSpaceWarning: 'If iCloud is full, go to Settings → [Your Name] → iCloud → Manage Storage to free up space or upgrade your plan.',
    };
  } else if (Platform.OS === 'android') {
    return {
      platform: 'android',
      cloudService: 'Google Drive',
      instructions: 'When saving, choose "Google Drive" from the share menu. When restoring, open from Google Drive.',
      lowSpaceWarning: 'If Google Drive is full, go to drive.google.com to manage storage or upgrade your Google One plan.',
    };
  } else {
    return {
      platform: 'web',
      cloudService: 'Local Download',
      instructions: 'The backup will be downloaded to your computer. Save it to your preferred cloud storage manually.',
      lowSpaceWarning: 'Ensure you have enough disk space for the backup file.',
    };
  }
}

/**
 * Show alert for low cloud storage scenario
 */
export function showLowStorageAlert(): void {
  const info = getCloudStorageInfo();
  
  Alert.alert(
    `${info.cloudService} Storage Full?`,
    `If you can't save your backup due to insufficient cloud storage:\n\n${info.lowSpaceWarning}\n\nAlternatively, you can save the backup locally on your device first.`,
    [{ text: 'OK', style: 'default' }]
  );
}

/**
 * Backup with storage check and user-friendly error handling
 */
export async function backupWithStorageCheck(): Promise<void> {
  const result = await backupToCloud();
  
  if (result.success) {
    Alert.alert('Backup Ready', result.message, [
      { text: 'OK', style: 'default' },
      { 
        text: 'Storage Full?', 
        onPress: showLowStorageAlert,
        style: 'cancel' 
      },
    ]);
  } else {
    Alert.alert('Backup Failed', result.message, [
      { text: 'OK', style: 'default' },
      { 
        text: 'Storage Help', 
        onPress: showLowStorageAlert,
        style: 'cancel' 
      },
    ]);
  }
}

/**
 * Full restore flow with confirmation
 */
export async function restoreWithConfirmation(): Promise<void> {
  Alert.alert(
    'Restore from Backup',
    'This will replace all your current data with the backup data. This cannot be undone.\n\nDo you want to continue?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Choose Backup File',
        style: 'destructive',
        onPress: async () => {
          const result = await restoreFromCloud();
          
          if (result.success && result.data) {
            Alert.alert(
              'Confirm Restore',
              result.message,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Restore',
                  style: 'destructive',
                  onPress: async () => {
                    const applyResult = await applyBackupData(result.data!);
                    Alert.alert(
                      applyResult.success ? 'Success' : 'Error',
                      applyResult.message
                    );
                  },
                },
              ]
            );
          } else if (!result.success && result.message !== 'Restore cancelled.') {
            Alert.alert('Error', result.message);
          }
        },
      },
    ]
  );
}
