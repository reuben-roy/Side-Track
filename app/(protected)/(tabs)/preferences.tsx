import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import ProfileButton from '../../../components/ProfileButton';

interface UserPreferences {
  enableNotifications: boolean;
  enableHaptics: boolean;
  enableSoundEffects: boolean;
  darkMode: boolean;
  units: 'metric' | 'imperial';
  restTimerEnabled: boolean;
  autoLogWorkouts: boolean;
  showCaloriesBurned: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  enableNotifications: true,
  enableHaptics: true,
  enableSoundEffects: true,
  darkMode: false,
  units: 'imperial',
  restTimerEnabled: true,
  autoLogWorkouts: true,
  showCaloriesBurned: true,
};

export default function PreferencesScreen() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [])
  );

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem('userPreferences');
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async (newPreferences: UserPreferences) => {
    try {
      setIsSaving(true);
      await AsyncStorage.setItem('userPreferences', JSON.stringify(newPreferences));
      setPreferences(newPreferences);
      // Show brief success feedback
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
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

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Preferences',
      'Are you sure you want to reset all preferences to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => savePreferences(DEFAULT_PREFERENCES),
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
              await AsyncStorage.clear();
              setPreferences(DEFAULT_PREFERENCES);
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

  const PreferenceRow = ({
    label,
    description,
    value,
    onValueChange,
  }: {
    label: string;
    description?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceTextContainer}>
        <Text style={styles.preferenceLabel}>{label}</Text>
        {description && <Text style={styles.preferenceDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D1D5DB', true: '#E6B3B3' }}
        thumbColor={value ? '#D89898' : '#F3F4F6'}
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );

  const SegmentedControl = ({
    label,
    options,
    selectedValue,
    onValueChange,
  }: {
    label: string;
    options: { label: string; value: string }[];
    selectedValue: string;
    onValueChange: (value: string) => void;
  }) => (
    <View style={styles.segmentedContainer}>
      <Text style={styles.segmentedLabel}>{label}</Text>
      <View style={styles.segmentedControl}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.segmentedButton,
              selectedValue === option.value && styles.segmentedButtonActive,
            ]}
            onPress={() => onValueChange(option.value)}
          >
            <Text
              style={[
                styles.segmentedButtonText,
                selectedValue === option.value && styles.segmentedButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F8F9FA', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Preferences</Text>
          <ProfileButton />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* General Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General</Text>
            
            <SegmentedControl
              label="Units"
              options={[
                { label: 'Imperial', value: 'imperial' },
                { label: 'Metric', value: 'metric' },
              ]}
              selectedValue={preferences.units}
              onValueChange={(value) => updatePreference('units', value as 'metric' | 'imperial')}
            />

            {/* <PreferenceRow
              label="Dark Mode"
              description="Use dark theme throughout the app"
              value={preferences.darkMode}
              onValueChange={(value) => updatePreference('darkMode', value)}
            /> */}
          </View>

          {/* Workout Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workout</Text>

            <PreferenceRow
              label="Rest Timer"
              description="Show rest timer between sets"
              value={preferences.restTimerEnabled}
              onValueChange={(value) => updatePreference('restTimerEnabled', value)}
            />
          </View>

          {/* Notifications & Feedback Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications & Feedback</Text>

            <PreferenceRow
              label="Haptic Feedback"
              description="Vibrate on button presses and actions"
              value={preferences.enableHaptics}
              onValueChange={(value) => updatePreference('enableHaptics', value)}
            />
          </View>

          {/* Data Management Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Management</Text>
            
            <TouchableOpacity style={styles.actionButton} onPress={resetToDefaults}>
              <Text style={styles.actionButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.dangerButton} 
              onPress={() => {
                Alert.alert(
                  'Confirm Delete',
                  'Are you absolutely sure? This will permanently delete all your data.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Yes, Delete Everything',
                      style: 'destructive',
                      onPress: clearAllData,
                    },
                  ]
                );
              }}
            >
              <Text style={styles.dangerButtonText}>Clear All Data</Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>Side-Track v1.0.0</Text>
          </View>
        </ScrollView>

        {isSaving && (
          <View style={styles.savingIndicator}>
            <Text style={styles.savingText}>Saved ✓</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
    paddingTop: Platform.OS === 'ios' ? hp('6%') : hp('4%'),
    paddingBottom: hp('2%'),
  },
  title: {
    fontSize: wp('8%'),
    fontWeight: 'bold',
    color: '#181C20',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp('5%'),
    paddingBottom: hp('3%'),
  },
  section: {
    marginBottom: hp('3%'),
  },
  sectionTitle: {
    fontSize: wp('5%'),
    fontWeight: '700',
    color: '#181C20',
    marginBottom: hp('1.5%'),
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('4%'),
    borderRadius: 12,
    marginBottom: hp('1%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  preferenceTextContainer: {
    flex: 1,
    marginRight: wp('3%'),
  },
  preferenceLabel: {
    fontSize: wp('4.2%'),
    fontWeight: '600',
    color: '#181C20',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: wp('3.2%'),
    color: '#6B7280',
  },
  segmentedContainer: {
    marginBottom: hp('1.5%'),
  },
  segmentedLabel: {
    fontSize: wp('4.2%'),
    fontWeight: '600',
    color: '#181C20',
    marginBottom: hp('1%'),
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: hp('1.2%'),
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentedButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedButtonText: {
    fontSize: wp('3.8%'),
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentedButtonTextActive: {
    color: '#181C20',
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: hp('1.8%'),
    paddingHorizontal: wp('4%'),
    borderRadius: 12,
    marginBottom: hp('1%'),
    borderWidth: 1,
    borderColor: '#E6B3B3',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#D89898',
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: hp('1.8%'),
    paddingHorizontal: wp('4%'),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#DC2626',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: hp('2%'),
    paddingVertical: hp('2%'),
  },
  appInfoText: {
    fontSize: wp('3.5%'),
    color: '#6B7280',
    fontWeight: '500',
  },
  appInfoSubtext: {
    fontSize: wp('3%'),
    color: '#9CA3AF',
    marginTop: 4,
  },
  savingIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? hp('12%') : hp('11%'),
    alignSelf: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: wp('6%'),
    paddingVertical: hp('1.2%'),
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  savingText: {
    color: '#FFFFFF',
    fontSize: wp('3.8%'),
    fontWeight: '600',
  },
});
