import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import ProfileButton from '../../../components/ProfileButton';
import { recoveryRatePerHour as defaultRecoveryRates, exercises } from '../../../constants/Exercises';
import { MuscleGroup } from '../../../constants/MuscleGroups';
import { useUserCapacity } from '../../../context/UserCapacityContext';

interface DrainSettings {
  overallMultiplier: number;
  metCoefficient: number;
  repsCoefficient: number;
  intensityCoefficient: number;
  userBodyweight: number;
}

interface UserPreferences {
  enableNotifications: boolean;
  enableHaptics: boolean;
  enableSoundEffects: boolean;
  darkMode: boolean;
  units: 'metric' | 'imperial';
  restTimerEnabled: boolean;
  autoLogWorkouts: boolean;
  showCaloriesBurned: boolean;
  customRecoveryRates?: { [key in MuscleGroup]?: number };
  drainSettings?: DrainSettings;
}

const DEFAULT_DRAIN_SETTINGS: DrainSettings = {
  overallMultiplier: 8.0,  // Increased from 5.0 for faster fatigue
  metCoefficient: 0.15,    // Increased from 0.1
  repsCoefficient: 0.08,   // Increased from 0.05
  intensityCoefficient: 0.7,  // Increased from 0.5
  userBodyweight: 150,
};

const DEFAULT_PREFERENCES: UserPreferences = {
  enableNotifications: true,
  enableHaptics: true,
  enableSoundEffects: true,
  darkMode: false,
  units: 'imperial',
  restTimerEnabled: true,
  autoLogWorkouts: true,
  showCaloriesBurned: true,
  drainSettings: DEFAULT_DRAIN_SETTINGS,
};

export default function PreferencesScreen() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [showRecoveryRates, setShowRecoveryRates] = useState(false);
  const [showAdvancedDrain, setShowAdvancedDrain] = useState(false);
  const [showExerciseLimits, setShowExerciseLimits] = useState(false);
  const [customRates, setCustomRates] = useState<{ [key in MuscleGroup]?: number }>({});
  const [drainSettings, setDrainSettings] = useState<DrainSettings>(DEFAULT_DRAIN_SETTINGS);
  const { capacityLimits, updateCapacityLimit, resetToDefaults: resetCapacityLimits, estimateFromAllWorkouts } = useUserCapacity();
  
  // Local state for drain setting inputs
  const [overallMultiplierInput, setOverallMultiplierInput] = useState('8.0');
  const [metCoefInput, setMetCoefInput] = useState('0.15');
  const [repsCoefInput, setRepsCoefInput] = useState('0.08');
  const [intensityCoefInput, setIntensityCoefInput] = useState('0.70');
  const [bodyweightInput, setBodyweightInput] = useState('150');

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
        const loadedPrefs = JSON.parse(stored);
        setPreferences(loadedPrefs);
        setCustomRates(loadedPrefs.customRecoveryRates || {});
        const loadedDrain = loadedPrefs.drainSettings || DEFAULT_DRAIN_SETTINGS;
        setDrainSettings(loadedDrain);
        
        // Set input field states
        setOverallMultiplierInput(loadedDrain.overallMultiplier.toFixed(1));
        setMetCoefInput(loadedDrain.metCoefficient.toFixed(2));
        setRepsCoefInput(loadedDrain.repsCoefficient.toFixed(2));
        setIntensityCoefInput(loadedDrain.intensityCoefficient.toFixed(2));
        setBodyweightInput(loadedDrain.userBodyweight.toFixed(0));
      }
      
      // Also load custom recovery rates if stored separately
      const storedRates = await AsyncStorage.getItem('customRecoveryRates');
      if (storedRates) {
        setCustomRates(JSON.parse(storedRates));
      }

      // Also load drain settings if stored separately
      const storedDrain = await AsyncStorage.getItem('drainSettings');
      if (storedDrain) {
        const loadedDrain = JSON.parse(storedDrain);
        setDrainSettings(loadedDrain);
        
        // Set input field states
        setOverallMultiplierInput(loadedDrain.overallMultiplier.toFixed(1));
        setMetCoefInput(loadedDrain.metCoefficient.toFixed(2));
        setRepsCoefInput(loadedDrain.repsCoefficient.toFixed(2));
        setIntensityCoefInput(loadedDrain.intensityCoefficient.toFixed(2));
        setBodyweightInput(loadedDrain.userBodyweight.toFixed(0));
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

  const updateRecoveryRate = async (muscle: MuscleGroup, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0.1 || numValue > 10) return;
    
    const newRates = { ...customRates, [muscle]: numValue };
    setCustomRates(newRates);
    
    // Save to AsyncStorage
    await AsyncStorage.setItem('customRecoveryRates', JSON.stringify(newRates));
    
    // Also update preferences
    const newPreferences = { ...preferences, customRecoveryRates: newRates };
    savePreferences(newPreferences);
  };

  const resetRecoveryRates = async () => {
    Alert.alert(
      'Reset Recovery Rates',
      'Reset all muscle recovery rates to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setCustomRates({});
            await AsyncStorage.removeItem('customRecoveryRates');
            const newPreferences = { ...preferences, customRecoveryRates: {} };
            savePreferences(newPreferences);
          },
        },
      ]
    );
  };

  const updateDrainSetting = async <K extends keyof DrainSettings>(
    key: K,
    value: DrainSettings[K]
  ) => {
    const newSettings = { ...drainSettings, [key]: value };
    setDrainSettings(newSettings);
    
    // Save to AsyncStorage
    await AsyncStorage.setItem('drainSettings', JSON.stringify(newSettings));
    
    // Also update preferences
    const newPreferences = { ...preferences, drainSettings: newSettings };
    savePreferences(newPreferences);
  };

  const resetDrainSettings = async () => {
    Alert.alert(
      'Reset Drain Settings',
      'Reset all muscle drain settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setDrainSettings(DEFAULT_DRAIN_SETTINGS);
            
            // Reset input field states
            setOverallMultiplierInput(DEFAULT_DRAIN_SETTINGS.overallMultiplier.toFixed(1));
            setMetCoefInput(DEFAULT_DRAIN_SETTINGS.metCoefficient.toFixed(2));
            setRepsCoefInput(DEFAULT_DRAIN_SETTINGS.repsCoefficient.toFixed(2));
            setIntensityCoefInput(DEFAULT_DRAIN_SETTINGS.intensityCoefficient.toFixed(2));
            setBodyweightInput(DEFAULT_DRAIN_SETTINGS.userBodyweight.toFixed(0));
            
            await AsyncStorage.setItem('drainSettings', JSON.stringify(DEFAULT_DRAIN_SETTINGS));
            const newPreferences = { ...preferences, drainSettings: DEFAULT_DRAIN_SETTINGS };
            savePreferences(newPreferences);
          },
        },
      ]
    );
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
          onPress: () => {
            // Reset all state
            setCustomRates({});
            setDrainSettings(DEFAULT_DRAIN_SETTINGS);
            
            // Reset drain input field states
            setOverallMultiplierInput(DEFAULT_DRAIN_SETTINGS.overallMultiplier.toFixed(1));
            setMetCoefInput(DEFAULT_DRAIN_SETTINGS.metCoefficient.toFixed(2));
            setRepsCoefInput(DEFAULT_DRAIN_SETTINGS.repsCoefficient.toFixed(2));
            setIntensityCoefInput(DEFAULT_DRAIN_SETTINGS.intensityCoefficient.toFixed(2));
            setBodyweightInput(DEFAULT_DRAIN_SETTINGS.userBodyweight.toFixed(0));
            
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

  const RecoveryRateInput = ({
    label,
    muscle,
    defaultValue,
  }: {
    label: string;
    muscle: MuscleGroup;
    defaultValue: number;
  }) => {
    const currentValue = customRates[muscle] ?? defaultValue;
    const [inputValue, setInputValue] = useState(currentValue.toFixed(1));
    const hoursToRecover = Math.round(100 / currentValue);
    
    // Update local state when customRates changes from outside
    React.useEffect(() => {
      setInputValue(currentValue.toFixed(1));
    }, [currentValue]);
    
    const handleBlur = () => {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue) && numValue >= 0.1 && numValue <= 10) {
        updateRecoveryRate(muscle, inputValue);
      } else {
        // Reset to current value if invalid
        setInputValue(currentValue.toFixed(1));
      }
    };
    
    return (
      <View style={styles.recoveryRateRow}>
        <View style={styles.recoveryRateTextContainer}>
          <Text style={styles.recoveryRateLabel}>{label}</Text>
          <Text style={styles.recoveryRateHint}>~{hoursToRecover}h to full recovery</Text>
        </View>
        <View style={styles.recoveryRateInputContainer}>
          <TextInput
            style={styles.recoveryRateInput}
            value={inputValue}
            onChangeText={setInputValue}
            onBlur={handleBlur}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
          <Text style={styles.recoveryRateUnit}>%/hr</Text>
        </View>
      </View>
    );
  };

  const ExerciseLimitInput = ({
    exerciseName,
    currentLimit,
  }: {
    exerciseName: string;
    currentLimit: number;
  }) => {
    const [inputValue, setInputValue] = useState(currentLimit.toString());
    
    // Update local state when currentLimit changes from outside
    React.useEffect(() => {
      setInputValue(currentLimit.toString());
    }, [currentLimit]);

    const handleBlur = () => {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue) && numValue >= 10 && numValue <= 1000) {
        updateCapacityLimit(exerciseName, numValue);
      } else {
        setInputValue(currentLimit.toString());
      }
    };

    return (
      <View style={styles.recoveryRateRow}>
        <View style={styles.recoveryRateTextContainer}>
          <Text style={styles.recoveryRateLabel}>{exerciseName}</Text>
          <Text style={styles.recoveryRateHint}>Estimated 1RM</Text>
        </View>
        <View style={styles.recoveryRateInputContainer}>
          <TextInput
            style={styles.recoveryRateInput}
            value={inputValue}
            onChangeText={setInputValue}
            onBlur={handleBlur}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
          <Text style={styles.recoveryRateUnit}>lbs</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout</Text>

          <PreferenceRow
            label="Rest Timer"
            description="Show rest timer between sets"
            value={preferences.restTimerEnabled}
            onValueChange={(value) => updatePreference('restTimerEnabled', value)}
          />
        </View> */}

        {/* Muscle Drain Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Muscle Fatigue Settings</Text>
          <Text style={styles.sectionSubtitle}>Control how quickly muscles get tired during workouts</Text>

          {/* Main Fatigue Sensitivity Input */}
          <View style={styles.inputRow}>
            <View style={styles.inputTextContainer}>
              <Text style={styles.inputLabel}>Fatigue Sensitivity</Text>
              <Text style={styles.inputHint}>
                {drainSettings.overallMultiplier <= 3 ? 'Light training' :
                  drainSettings.overallMultiplier <= 7 ? 'Normal training' :
                  drainSettings.overallMultiplier <= 12 ? 'Hard training' :
                  'Extreme training'}
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={overallMultiplierInput}
                onChangeText={setOverallMultiplierInput}
                onBlur={() => {
                  const num = parseFloat(overallMultiplierInput);
                  if (!isNaN(num) && num >= 1 && num <= 20) {
                    updateDrainSetting('overallMultiplier', num);
                    setOverallMultiplierInput(num.toFixed(1));
                  } else {
                    setOverallMultiplierInput(drainSettings.overallMultiplier.toFixed(1));
                  }
                }}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <Text style={styles.inputUnit}>x</Text>
            </View>
          </View>
          <Text style={styles.rangeHint}>Range: 1.0 - 20.0 (Default: 5.0)</Text>

          {/* Advanced Settings */}
          <TouchableOpacity 
            style={styles.advancedToggle}
            onPress={() => setShowAdvancedDrain(!showAdvancedDrain)}
          >
            <Text style={styles.advancedToggleText}>Advanced Settings</Text>
            <Text style={styles.toggleText}>{showAdvancedDrain ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>

          {showAdvancedDrain && (
            <View style={styles.advancedContainer}>
              <Text style={styles.advancedTitle}>Fine-tune Drain Formula</Text>
              <Text style={styles.advancedSubtitle}>
                Drain = (MET × {drainSettings.metCoefficient.toFixed(2)}) + (Reps × {drainSettings.repsCoefficient.toFixed(2)}) + (Intensity × {drainSettings.intensityCoefficient.toFixed(2)})
              </Text>

              {/* MET Coefficient */}
              <View style={styles.inputRow}>
                <View style={styles.inputTextContainer}>
                  <Text style={styles.inputLabel}>MET Weight</Text>
                  <Text style={styles.inputHint}>Exercise intensity contribution</Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={metCoefInput}
                    onChangeText={setMetCoefInput}
                    onBlur={() => {
                      const num = parseFloat(metCoefInput);
                      if (!isNaN(num) && num >= 0 && num <= 0.5) {
                        updateDrainSetting('metCoefficient', num);
                        setMetCoefInput(num.toFixed(2));
                      } else {
                        setMetCoefInput(drainSettings.metCoefficient.toFixed(2));
                      }
                    }}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                </View>
              </View>
              <Text style={styles.rangeHint}>Range: 0.0 - 0.5 (Default: 0.1)</Text>

              {/* Reps Coefficient */}
              <View style={styles.inputRow}>
                <View style={styles.inputTextContainer}>
                  <Text style={styles.inputLabel}>Reps Weight</Text>
                  <Text style={styles.inputHint}>Repetition count contribution</Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={repsCoefInput}
                    onChangeText={setRepsCoefInput}
                    onBlur={() => {
                      const num = parseFloat(repsCoefInput);
                      if (!isNaN(num) && num >= 0 && num <= 0.2) {
                        updateDrainSetting('repsCoefficient', num);
                        setRepsCoefInput(num.toFixed(2));
                      } else {
                        setRepsCoefInput(drainSettings.repsCoefficient.toFixed(2));
                      }
                    }}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                </View>
              </View>
              <Text style={styles.rangeHint}>Range: 0.0 - 0.2 (Default: 0.05)</Text>

              {/* Intensity Coefficient */}
              <View style={styles.inputRow}>
                <View style={styles.inputTextContainer}>
                  <Text style={styles.inputLabel}>Intensity Weight</Text>
                  <Text style={styles.inputHint}>% of 1RM contribution</Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={intensityCoefInput}
                    onChangeText={setIntensityCoefInput}
                    onBlur={() => {
                      const num = parseFloat(intensityCoefInput);
                      if (!isNaN(num) && num >= 0 && num <= 2.0) {
                        updateDrainSetting('intensityCoefficient', num);
                        setIntensityCoefInput(num.toFixed(2));
                      } else {
                        setIntensityCoefInput(drainSettings.intensityCoefficient.toFixed(2));
                      }
                    }}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                </View>
              </View>
              <Text style={styles.rangeHint}>Range: 0.0 - 2.0 (Default: 0.5)</Text>

              {/* Bodyweight */}
              <View style={styles.inputRow}>
                <View style={styles.inputTextContainer}>
                  <Text style={styles.inputLabel}>Your Bodyweight</Text>
                  <Text style={styles.inputHint}>For bodyweight exercises</Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={bodyweightInput}
                    onChangeText={setBodyweightInput}
                    onBlur={() => {
                      const num = parseFloat(bodyweightInput);
                      if (!isNaN(num) && num >= 50 && num <= 500) {
                        updateDrainSetting('userBodyweight', num);
                        setBodyweightInput(num.toFixed(0));
                      } else {
                        setBodyweightInput(drainSettings.userBodyweight.toFixed(0));
                      }
                    }}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.inputUnit}>lbs</Text>
                </View>
              </View>
              <Text style={styles.rangeHint}>Range: 50 - 500 (Default: 150)</Text>

              <TouchableOpacity style={styles.actionButton} onPress={resetDrainSettings}>
                <Text style={styles.actionButtonText}>Reset Drain Settings to Default</Text>
              </TouchableOpacity>
            </View>
          )}
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

        {/* Muscle Recovery Rates Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Muscle Recovery Rates</Text>
              <Text style={styles.sectionSubtitle}>Customize how fast muscles recover (% per hour)</Text>
            </View>
            <TouchableOpacity onPress={() => setShowRecoveryRates(!showRecoveryRates)}>
              <Text style={styles.toggleText}>{showRecoveryRates ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          {showRecoveryRates && (
            <>
              <View style={styles.recoveryRatesContainer}>
                <Text style={styles.recoveryGroupTitle}>Large Muscles (Slower Recovery)</Text>
                <RecoveryRateInput label="Quads" muscle="quads" defaultValue={defaultRecoveryRates.quads} />
                <RecoveryRateInput label="Hamstrings" muscle="hamstrings" defaultValue={defaultRecoveryRates.hamstrings} />
                <RecoveryRateInput label="Glutes" muscle="glutes" defaultValue={defaultRecoveryRates.glutes} />
                <RecoveryRateInput label="Lower Back" muscle="lowerBack" defaultValue={defaultRecoveryRates.lowerBack} />

                <Text style={styles.recoveryGroupTitle}>Medium Muscles</Text>
                <RecoveryRateInput label="Chest" muscle="pecs" defaultValue={defaultRecoveryRates.pecs} />
                <RecoveryRateInput label="Lats" muscle="lats" defaultValue={defaultRecoveryRates.lats} />
                <RecoveryRateInput label="Upper Back" muscle="upperBack" defaultValue={defaultRecoveryRates.upperBack} />
                <RecoveryRateInput label="Core" muscle="core" defaultValue={defaultRecoveryRates.core} />

                <Text style={styles.recoveryGroupTitle}>Small Muscles (Faster Recovery)</Text>
                <RecoveryRateInput label="Front Delts" muscle="anteriorDeltoids" defaultValue={defaultRecoveryRates.anteriorDeltoids} />
                <RecoveryRateInput label="Side Delts" muscle="medialDeltoids" defaultValue={defaultRecoveryRates.medialDeltoids} />
                <RecoveryRateInput label="Rear Delts" muscle="posteriorDeltoids" defaultValue={defaultRecoveryRates.posteriorDeltoids} />
                <RecoveryRateInput label="Triceps" muscle="triceps" defaultValue={defaultRecoveryRates.triceps} />
                <RecoveryRateInput label="Biceps" muscle="biceps" defaultValue={defaultRecoveryRates.biceps} />
                <RecoveryRateInput label="Calves" muscle="calves" defaultValue={defaultRecoveryRates.calves} />
                <RecoveryRateInput label="Forearms" muscle="forearms" defaultValue={defaultRecoveryRates.forearms} />
              </View>

              <TouchableOpacity style={styles.actionButton} onPress={resetRecoveryRates}>
                <Text style={styles.actionButtonText}>Reset Recovery Rates to Default</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Exercise Capacity Limits Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Exercise Capacity Limits</Text>
              <Text style={styles.sectionSubtitle}>Set your estimated 1-rep max for each exercise</Text>
            </View>
            <TouchableOpacity onPress={() => setShowExerciseLimits(!showExerciseLimits)}>
              <Text style={styles.toggleText}>{showExerciseLimits ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          {showExerciseLimits && (
            <>
              <View style={styles.recoveryRatesContainer}>
                <Text style={styles.recoveryGroupTitle}>Personalized Exercise Limits</Text>
                <Text style={styles.sectionSubtitle}>
                  These values help calculate workout intensity. Set to your estimated 1-rep max or personal best for each exercise.
                </Text>
                
                {exercises.map((exercise) => (
                  <ExerciseLimitInput
                    key={exercise.name}
                    exerciseName={exercise.name}
                    currentLimit={capacityLimits[exercise.name] || 0}
                  />
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#10B981', borderColor: '#059669' }]} 
                onPress={async () => {
                  Alert.alert(
                    'Estimate from Workouts',
                    'Analyze all your workout logs and automatically update your 1RM estimates based on your best performances?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Estimate',
                        onPress: async () => {
                          setIsSaving(true);
                          const updatedCount = await estimateFromAllWorkouts();
                          setIsSaving(false);
                          if (updatedCount > 0) {
                            Alert.alert(
                              'Success!',
                              `Updated ${updatedCount} exercise limit${updatedCount > 1 ? 's' : ''} based on your workout history.`
                            );
                          } else {
                            Alert.alert(
                              'No Updates',
                              'Your current limits are already at or above your workout performances.'
                            );
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                  Auto-Estimate from Workout History
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => {
                  Alert.alert(
                    'Reset Exercise Limits',
                    'Reset all exercise capacity limits to default values?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reset',
                        style: 'destructive',
                        onPress: resetCapacityLimits,
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.actionButtonText}>Reset Exercise Limits to Default</Text>
              </TouchableOpacity>
            </>
          )}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp('1.5%'),
  },
  sectionSubtitle: {
    fontSize: wp('3.2%'),
    color: '#6B7280',
    marginTop: 4,
  },
  toggleText: {
    fontSize: wp('3.8%'),
    fontWeight: '600',
    color: '#808080',
    marginTop: 4,
  },
  recoveryRatesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: wp('4%'),
    marginBottom: hp('1.5%'),
  },
  recoveryGroupTitle: {
    fontSize: wp('4%'),
    fontWeight: '700',
    color: '#374151',
    marginTop: hp('2%'),
    marginBottom: hp('1%'),
  },
  recoveryRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('3%'),
    borderRadius: 8,
    marginBottom: hp('0.8%'),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recoveryRateTextContainer: {
    flex: 1,
    marginRight: wp('3%'),
  },
  recoveryRateLabel: {
    fontSize: wp('3.8%'),
    fontWeight: '600',
    color: '#181C20',
  },
  recoveryRateHint: {
    fontSize: wp('3%'),
    color: '#9CA3AF',
    marginTop: 2,
  },
  recoveryRateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: wp('2%'),
  },
  recoveryRateInput: {
    fontSize: wp('3.8%'),
    fontWeight: '600',
    color: '#181C20',
    paddingVertical: hp('0.8%'),
    paddingHorizontal: wp('2%'),
    minWidth: wp('12%'),
    textAlign: 'center',
  },
  recoveryRateUnit: {
    fontSize: wp('3.2%'),
    color: '#6B7280',
    fontWeight: '500',
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('4%'),
    borderRadius: 12,
    marginBottom: hp('1.5%'),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  advancedToggleText: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#374151',
  },
  advancedContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: wp('4%'),
    marginBottom: hp('1.5%'),
  },
  advancedTitle: {
    fontSize: wp('4.2%'),
    fontWeight: '700',
    color: '#181C20',
    marginBottom: hp('0.5%'),
  },
  advancedSubtitle: {
    fontSize: wp('3%'),
    color: '#6B7280',
    marginBottom: hp('2%'),
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('4%'),
    borderRadius: 12,
    marginBottom: hp('1%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputTextContainer: {
    flex: 1,
    marginRight: wp('3%'),
  },
  inputLabel: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#181C20',
    marginBottom: 4,
  },
  inputHint: {
    fontSize: wp('3.2%'),
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: wp('2%'),
  },
  input: {
    fontSize: wp('3.8%'),
    fontWeight: '600',
    color: '#181C20',
    paddingVertical: hp('0.8%'),
    paddingHorizontal: wp('2%'),
    minWidth: wp('15%'),
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: wp('3.2%'),
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: wp('1%'),
  },
  rangeHint: {
    fontSize: wp('2.8%'),
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: hp('1.5%'),
    textAlign: 'center',
  },
  advancedHint: {
    fontSize: wp('3%'),
    color: '#9CA3AF',
    marginTop: hp('0.5%'),
    fontStyle: 'italic',
  },
});
