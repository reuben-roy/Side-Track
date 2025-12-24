import BackupSettings from '@/components/BackupSettings';
import { usePreferences } from '@/hooks/usePreferences';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function BackupSettingsScreen() {
  const { loadPreferences } = usePreferences();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Cloud Backup</Text>
          <Text style={styles.headerSubtitle}>Sync your data across devices</Text>
        </View>
        <BackupSettings 
          onBackupComplete={() => {
            // Optionally refresh data or show feedback
          }}
          onRestoreComplete={() => {
            // Reload preferences after restore
            loadPreferences();
          }}
        />
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
  headerRow: {
    paddingTop: 60,
    marginBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    padding: 8,
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
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: 0.3,
  },
});
