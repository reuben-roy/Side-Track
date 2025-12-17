import { PreferenceRow } from '@/components/SettingsComponents';
import {
  getHealthSyncOptions,
  saveHealthSyncOptions,
  syncAllWorkoutsToHealth,
  importWorkoutsFromHealth,
  getLastSyncDate,
} from '@/lib/healthSyncHelper';
import {
  getHealthSyncStatus,
  checkHealthAvailability,
  requestHealthPermissions,
} from '@/lib/healthSync';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { HealthSyncOptions, HealthSyncStatus } from '@/types/health';

export default function HealthSettingsScreen() {
  const router = useRouter();
  const [syncOptions, setSyncOptions] = useState<HealthSyncOptions>({
    autoSync: false,
    syncOnWorkoutLog: false,
    syncOnProfileUpdate: false,
  });
  const [syncStatus, setSyncStatus] = useState<HealthSyncStatus>({
    isAvailable: false,
    isAuthorized: false,
    platform: 'none',
  });
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [options, status, lastSync] = await Promise.all([
        getHealthSyncOptions(),
        getHealthSyncStatus(),
        getLastSyncDate(),
      ]);
      setSyncOptions(options);
      setSyncStatus(status);
      setLastSyncDate(lastSync);
    } catch (error) {
      console.error('Error loading health settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      setSyncing(true);
      const available = await checkHealthAvailability();
      if (!available) {
        Alert.alert(
          'Not Available',
          'Health platform is not available on this device.',
          [{ text: 'OK' }]
        );
        return;
      }

      const granted = await requestHealthPermissions({
        workouts: true,
        calories: true,
        bodyMetrics: true,
      });

      if (granted) {
        Alert.alert('Success', 'Health permissions granted!', [{ text: 'OK' }]);
        await loadSettings();
      } else {
        Alert.alert(
          'Permission Denied',
          'Please grant health permissions in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.', [{ text: 'OK' }]);
    } finally {
      setSyncing(false);
    }
  };

  const handleExportWorkouts = async () => {
    try {
      setSyncing(true);
      const result = await syncAllWorkoutsToHealth();
      Alert.alert(
        'Export Complete',
        `Successfully exported ${result.success} of ${result.total} workouts.`,
        [{ text: 'OK' }]
      );
      await loadSettings();
    } catch (error) {
      console.error('Error exporting workouts:', error);
      Alert.alert('Error', 'Failed to export workouts. Please try again.', [{ text: 'OK' }]);
    } finally {
      setSyncing(false);
    }
  };

  const handleImportWorkouts = async () => {
    try {
      setSyncing(true);
      // Import workouts from last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const result = await importWorkoutsFromHealth(startDate, endDate);
      Alert.alert(
        'Import Complete',
        `Imported ${result.imported} workouts. ${result.skipped} were skipped (duplicates).`,
        [{ text: 'OK' }]
      );
      await loadSettings();
    } catch (error) {
      console.error('Error importing workouts:', error);
      Alert.alert('Error', 'Failed to import workouts. Please try again.', [{ text: 'OK' }]);
    } finally {
      setSyncing(false);
    }
  };

  const handleViewHealthData = () => {
    router.push('/settings/health-data');
  };

  const updateSyncOption = async (key: keyof HealthSyncOptions, value: boolean) => {
    const updated = { ...syncOptions, [key]: value };
    setSyncOptions(updated);
    await saveHealthSyncOptions(updated);
  };

  const formatLastSync = () => {
    if (!lastSyncDate) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - lastSyncDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const getPlatformName = () => {
    if (syncStatus.platform === 'ios') return 'Apple Health';
    if (syncStatus.platform === 'android') return 'Health Connect';
    return 'Not Available';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Health Integration</Text>
        </View>

        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Platform:</Text>
              <Text style={styles.statusValue}>{getPlatformName()}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Available:</Text>
              <Text style={[styles.statusValue, syncStatus.isAvailable && styles.statusSuccess]}>
                {syncStatus.isAvailable ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Authorized:</Text>
              <Text style={[styles.statusValue, syncStatus.isAuthorized && styles.statusSuccess]}>
                {syncStatus.isAuthorized ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Sync:</Text>
              <Text style={styles.statusValue}>{formatLastSync()}</Text>
            </View>
          </View>

          {!syncStatus.isAuthorized && syncStatus.isAvailable && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={handleRequestPermissions}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.permissionButtonText}>Request Permissions</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Sync Options */}
        {syncStatus.isAuthorized && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sync Options</Text>
              <PreferenceRow
                label="Auto Sync"
                description="Automatically sync data when available"
                value={syncOptions.autoSync}
                onValueChange={(value) => updateSyncOption('autoSync', value)}
              />
              <PreferenceRow
                label="Sync on Workout Log"
                description="Automatically sync when you log a workout"
                value={syncOptions.syncOnWorkoutLog}
                onValueChange={(value) => updateSyncOption('syncOnWorkoutLog', value)}
              />
              <PreferenceRow
                label="Sync on Profile Update"
                description="Automatically sync body metrics when profile is updated"
                value={syncOptions.syncOnProfileUpdate}
                onValueChange={(value) => updateSyncOption('syncOnProfileUpdate', value)}
              />
            </View>

            {/* Manual Sync Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Manual Sync</Text>
              <TouchableOpacity
                style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                onPress={handleExportWorkouts}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.syncButtonText}>Export All Workouts</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.syncButton, styles.syncButtonSecondary, syncing && styles.syncButtonDisabled]}
                onPress={handleImportWorkouts}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={[styles.syncButtonText, styles.syncButtonTextSecondary]}>
                    Import Workouts (Last 30 Days)
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>View</Text>
              <TouchableOpacity style={styles.syncButton} onPress={handleViewHealthData}>
                <Text style={styles.syncButtonText}>View Health Data</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!syncStatus.isAvailable && (
          <View style={styles.section}>
            <Text style={styles.infoText}>
              Health platform is not available on this device. This feature requires iOS with HealthKit or Android with Health Connect.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    paddingTop: 60,
    marginBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  closeButtonText: {
    fontSize: 32,
    color: '#181C20',
  },
  headerContainer: {
    marginBottom: 24,
  },
  header: {
    fontSize: 34,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '600',
  },
  statusSuccess: {
    color: '#10B981',
  },
  permissionButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  syncButtonSecondary: {
    backgroundColor: '#F2F2F7',
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  syncButtonTextSecondary: {
    color: '#000000',
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});

