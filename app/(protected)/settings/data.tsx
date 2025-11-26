import { DEFAULT_PREFERENCES, usePreferences } from '@/hooks/usePreferences';
import { clearAllData as clearDatabase } from '@/lib/database';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DataManagementScreen() {
  const { savePreferences } = usePreferences();
  const router = useRouter();

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Preferences',
      'Are you sure you want to reset all preferences to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            savePreferences(DEFAULT_PREFERENCES);
          },
        },
      ]
    );
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your workout logs, profile data, and preferences. This action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearDatabase();
              savePreferences(DEFAULT_PREFERENCES);
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Data Management',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ fontSize: 32, color: '#181C20', marginRight: 10 }}>×</Text>
            </TouchableOpacity>
          ),
          headerBackVisible: false,
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>Manage your app data and preferences</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={resetToDefaults}>
            <Text style={styles.actionButtonText}>Reset Preferences to Defaults</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dangerButton} 
            onPress={clearAllData}
          >
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
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
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  dangerButton: {
    backgroundColor: '#FFE5E5',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
