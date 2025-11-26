import {
    AutoBackupSettings,
    backupWithStorageCheck,
    formatBytes,
    getAutoBackupSettings,
    getCloudStorageInfo,
    getDeviceStorageQuota,
    restoreWithConfirmation,
    StorageQuota,
} from '@/lib/backup';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface BackupSettingsProps {
  onBackupComplete?: () => void;
  onRestoreComplete?: () => void;
}

export function BackupSettings({ onBackupComplete, onRestoreComplete }: BackupSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);
  const [autoBackupSettings, setAutoBackupSettings] = useState<AutoBackupSettings | null>(null);

  const cloudInfo = getCloudStorageInfo();

  useEffect(() => {
    loadStorageInfo();
    loadAutoBackupSettings();
  }, []);

  const loadStorageInfo = async () => {
    const quota = await getDeviceStorageQuota();
    setStorageQuota(quota);
  };

  const loadAutoBackupSettings = async () => {
    const settings = await getAutoBackupSettings();
    setAutoBackupSettings(settings);
  };

  const handleBackup = async () => {
    setIsLoading(true);
    try {
      await backupWithStorageCheck();
      onBackupComplete?.();
      loadAutoBackupSettings(); // Refresh last backup date
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      await restoreWithConfirmation();
      onRestoreComplete?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Info Row */}
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={Platform.OS === 'ios' ? 'cloud-outline' : 'logo-google'} 
            size={24} 
            color="#1C1C1E" 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>{cloudInfo.cloudService}</Text>
          <Text style={styles.description}>
            {Platform.OS === 'ios' ? 'iCloud Drive' : 'Google Drive'}
          </Text>
        </View>
      </View>

      {/* Storage Row */}
      {storageQuota && (
        <View style={styles.row}>
          <View style={styles.textContainer}>
            <View style={styles.storageHeader}>
              <Text style={styles.label}>Device Storage</Text>
              <Text style={[
                styles.storageStatus,
                storageQuota.isLow ? styles.statusLow : styles.statusOk
              ]}>
                {formatBytes(storageQuota.available)} free
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { width: `${Math.min(storageQuota.percentUsed, 100)}%` },
                  storageQuota.isLow && styles.progressBarLow
                ]} 
              />
            </View>
          </View>
        </View>
      )}

      {/* Last Backup Row */}
      {autoBackupSettings?.lastBackupDate && (
        <View style={styles.row}>
          <View style={styles.textContainer}>
            <Text style={styles.label}>Last Backup</Text>
            <Text style={styles.description}>
              {new Date(autoBackupSettings.lastBackupDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.backupButton]} 
          onPress={handleBackup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text style={styles.backupButtonText}>Backup Now</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.restoreButton]} 
          onPress={handleRestore}
          disabled={isLoading}
        >
          <Ionicons name="cloud-download-outline" size={20} color="#1C1C1E" />
          <Text style={styles.restoreButtonText}>Restore</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.helpText}>
        {cloudInfo.instructions}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: '#8E8E93',
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  storageStatus: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusOk: {
    color: '#34C759',
  },
  statusLow: {
    color: '#FF3B30',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  progressBarLow: {
    backgroundColor: '#FF3B30',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  backupButton: {
    backgroundColor: '#1C1C1E',
  },
  restoreButton: {
    backgroundColor: '#FFFFFF',
  },
  backupButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  restoreButtonText: {
    color: '#1C1C1E',
    fontSize: 15,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

export default BackupSettings;
