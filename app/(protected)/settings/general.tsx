import { PreferenceRow, SegmentedControl } from '@/components/SettingsComponents';
import { useProfile } from '@/context/ProfileContext';
import { usePreferences } from '@/hooks/usePreferences';
import { convertHeight, convertWeight } from '@/lib/unitConversions';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function GeneralSettingsScreen() {
  const { preferences, updatePreference } = usePreferences();
  const { profile, updateFullProfile } = useProfile();
  const router = useRouter();

  const handleUnitsChange = async (newUnits: 'metric' | 'imperial') => {
    const oldUnits = preferences.units;
    
    // Only convert if units are actually changing
    if (oldUnits !== newUnits && profile.weight && profile.height) {
      // Convert weight and height values
      const convertedWeight = convertWeight(profile.weight, oldUnits, newUnits);
      const convertedHeight = convertHeight(profile.height, oldUnits, newUnits);
      
      // Update profile with converted values (use updateFullProfile to avoid race condition)
      await updateFullProfile({
        ...profile,
        weight: convertedWeight,
        height: convertedHeight,
      });
    }
    
    // Update the units preference
    updatePreference('units', newUnits);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>General Settings</Text>
        </View>
        <View style={styles.section}>
          <SegmentedControl
            label="Units"
            options={[
              { label: 'Imperial', value: 'imperial' },
              { label: 'Metric', value: 'metric' },
            ]}
            selectedValue={preferences.units}
            onValueChange={(value) => handleUnitsChange(value as 'metric' | 'imperial')}
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
  },
  section: {
    marginBottom: 32,
  },
});
