import { recoveryRatePerHour as defaultRecoveryRates } from '@/constants/Exercises';
import { MuscleGroup } from '@/constants/MuscleGroups';
import { usePreferences } from '@/hooks/usePreferences';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RecoverySettingsScreen() {
  const { preferences, savePreferences } = usePreferences();
  const router = useRouter();
  const [customRates, setCustomRates] = useState<{ [key in MuscleGroup]?: number }>({});

  useEffect(() => {
    setCustomRates(preferences.customRecoveryRates || {});
  }, [preferences.customRecoveryRates]);

  const updateRecoveryRate = async (muscle: MuscleGroup, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0.1 || numValue > 10) return;
    
    const newRates = { ...customRates, [muscle]: numValue };
    setCustomRates(newRates);
    
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
            const newPreferences = { ...preferences, customRecoveryRates: {} };
            savePreferences(newPreferences);
          },
        },
      ]
    );
  };

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
    
    useEffect(() => {
      setInputValue(currentValue.toFixed(1));
    }, [currentValue]);
    
    const handleBlur = () => {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue) && numValue >= 0.1 && numValue <= 10) {
        updateRecoveryRate(muscle, inputValue);
      } else {
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

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Recovery Rates',
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
          <Text style={styles.sectionSubtitle}>Customize how fast muscles recover (% per hour)</Text>

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
  recoveryRatesContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  recoveryGroupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recoveryRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  recoveryRateTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  recoveryRateLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  recoveryRateHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  recoveryRateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  recoveryRateInput: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 50,
    textAlign: 'center',
  },
  recoveryRateUnit: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
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
});
