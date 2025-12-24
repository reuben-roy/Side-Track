import { exercises } from '@/constants/Exercises';
import { useUserCapacity } from '@/context/UserCapacityContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ExerciseLimitsScreen() {
  const { capacityLimits, updateCapacityLimit, resetToDefaults: resetCapacityLimits, estimateFromAllWorkouts } = useUserCapacity();
  const router = useRouter();
  const [isEstimating, setIsEstimating] = useState(false);

  const ExerciseLimitInput = ({
    exerciseName,
    currentLimit,
  }: {
    exerciseName: string;
    currentLimit: number;
  }) => {
    const [inputValue, setInputValue] = useState(currentLimit.toString());
    
    useEffect(() => {
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Exercise Limits</Text>
          <Text style={styles.headerSubtitle}>Set your estimated 1-rep max for each exercise</Text>
        </View>
        <View style={styles.section}>

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
            style={[styles.actionButton, { backgroundColor: '#000000' }]} 
            onPress={async () => {
              Alert.alert(
                'Estimate from Workouts',
                'Analyze all your workout logs and automatically update your 1RM estimates based on your best performances?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Estimate',
                    onPress: async () => {
                      setIsEstimating(true);
                      const updatedCount = await estimateFromAllWorkouts();
                      setIsEstimating(false);
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
            disabled={isEstimating}
          >
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
              {isEstimating ? 'Estimating...' : 'Auto-Estimate from Workout History'}
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
