import { PreferenceRow, SegmentedControl } from '@/components/SettingsComponents';
import { usePreferences } from '@/hooks/usePreferences';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function GeneralSettingsScreen() {
  const { preferences, updatePreference } = usePreferences();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'General Settings',
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
          <SegmentedControl
            label="Units"
            options={[
              { label: 'Imperial', value: 'imperial' },
              { label: 'Metric', value: 'metric' },
            ]}
            selectedValue={preferences.units}
            onValueChange={(value) => updatePreference('units', value as 'metric' | 'imperial')}
          />

          <PreferenceRow
            label="Haptic Feedback"
            description="Vibrate on button presses and actions"
            value={preferences.enableHaptics}
            onValueChange={(value) => updatePreference('enableHaptics', value)}
          />
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
});
