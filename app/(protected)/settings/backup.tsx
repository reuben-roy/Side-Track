import BackupSettings from '@/components/BackupSettings';
import { usePreferences } from '@/hooks/usePreferences';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function BackupSettingsScreen() {
  const { loadPreferences } = usePreferences();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Cloud Backup',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ fontSize: 32, color: '#181C20', marginRight: 10 }}>×</Text>
            </TouchableOpacity>
          ),
          headerBackVisible: false,
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
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
    padding: 24,
  },
});
