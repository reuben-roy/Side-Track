import { DEFAULT_DRAIN_SETTINGS, DrainSettings, usePreferences } from '@/hooks/usePreferences';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function FatigueSettingsScreen() {
  const { preferences, savePreferences } = usePreferences();
  const router = useRouter();
  
  // Local state for drain setting inputs
  const [overallMultiplierInput, setOverallMultiplierInput] = useState('8.0');
  const [metCoefInput, setMetCoefInput] = useState('0.15');
  const [repsCoefInput, setRepsCoefInput] = useState('0.08');
  const [intensityCoefInput, setIntensityCoefInput] = useState('0.70');
  const [bodyweightInput, setBodyweightInput] = useState('150');

  const drainSettings = preferences.drainSettings || DEFAULT_DRAIN_SETTINGS;

  useEffect(() => {
    if (preferences.drainSettings) {
      setOverallMultiplierInput(preferences.drainSettings.overallMultiplier.toFixed(1));
      setMetCoefInput(preferences.drainSettings.metCoefficient.toFixed(2));
      setRepsCoefInput(preferences.drainSettings.repsCoefficient.toFixed(2));
      setIntensityCoefInput(preferences.drainSettings.intensityCoefficient.toFixed(2));
      setBodyweightInput(preferences.drainSettings.userBodyweight.toFixed(0));
    }
  }, [preferences.drainSettings]);

  const updateDrainSetting = async <K extends keyof DrainSettings>(
    key: K,
    value: DrainSettings[K]
  ) => {
    const newSettings = { ...drainSettings, [key]: value };
    const newPreferences = { ...preferences, drainSettings: newSettings };
    savePreferences(newPreferences);
  };

  const resetDrainSettings = async () => {
    setOverallMultiplierInput(DEFAULT_DRAIN_SETTINGS.overallMultiplier.toFixed(1));
    setMetCoefInput(DEFAULT_DRAIN_SETTINGS.metCoefficient.toFixed(2));
    setRepsCoefInput(DEFAULT_DRAIN_SETTINGS.repsCoefficient.toFixed(2));
    setIntensityCoefInput(DEFAULT_DRAIN_SETTINGS.intensityCoefficient.toFixed(2));
    setBodyweightInput(DEFAULT_DRAIN_SETTINGS.userBodyweight.toFixed(0));
    
    const newPreferences = { ...preferences, drainSettings: DEFAULT_DRAIN_SETTINGS };
    savePreferences(newPreferences);
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
          <Text style={styles.header}>Muscle Fatigue</Text>
          <Text style={styles.headerSubtitle}>Control how quickly muscles get tired during workouts</Text>
        </View>
        <View style={styles.section}>

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
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 32,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  inputTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 12,
    color: '#8E8E93',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  input: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 60,
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    marginLeft: 4,
  },
  rangeHint: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginBottom: 12,
    textAlign: 'center',
  },
  advancedContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  advancedTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  advancedSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});
