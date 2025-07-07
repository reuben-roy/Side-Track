import HumanMuscleMap from '@/components/HumanMuscleMap';
import SlotPicker from '@/components/SlotPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { exercises } from '../../constants/Exercises';
import { muscleGroups } from '../../constants/MuscleGroups';
import { calculateCapacityDrain } from '../../helper/utils';

interface WorkoutScreenProps {
  exercise: string;
  weight: string;
  reps: string;
  onClose: () => void;
}

export default function WorkoutScreen({ exercise, weight, reps, onClose }: WorkoutScreenProps) {
  // Find the exercise object
  const exerciseObj = exercises.find(e => e.name === exercise);
  const weights = exerciseObj ? exerciseObj.weights.map(w => typeof w === 'number' ? `${w} lbs` : w) : [];
  const repsList = exerciseObj ? exerciseObj.reps.map((r: number) => `${r} reps`) : [];

  // Initial indices based on props
  const initialWeightIdx = weights.findIndex(w => w === weight);
  const initialRepsIdx = repsList.findIndex(r => r === reps);

  const [weightIdx, setWeightIdx] = useState(initialWeightIdx >= 0 ? initialWeightIdx : 0);
  const [repsIdx, setRepsIdx] = useState(initialRepsIdx >= 0 ? initialRepsIdx : 0);
  const [logging, setLogging] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const logExercise = async () => {
    setLogging(true);
    const workout = {
      exercise,
      weight: weights[weightIdx],
      reps: repsList[repsIdx],
      date: new Date().toISOString(),
    };
    try {
      const prev = await AsyncStorage.getItem('workoutLogs');
      const logs = prev ? JSON.parse(prev) : [];
      logs.push(workout);
      await AsyncStorage.setItem('workoutLogs', JSON.stringify(logs));

      // --- Decrease muscle capacity after logging workout ---
      const prevCapacityStr = await AsyncStorage.getItem('muscleCapacity');
      let prevCapacity: Record<string, number> = prevCapacityStr ? JSON.parse(prevCapacityStr) : { ...require('../../constants/Exercises').maxMuscleCapacity };
      // Parse reps as number (e.g., '10 reps' -> 10)
      const repsNum = parseInt(repsList[repsIdx]);
      // Parse weight as number (e.g., '135 lbs' -> 135, or 'Bodyweight' remains string)
      const weightVal = weights[weightIdx].includes('lbs') ? parseInt(weights[weightIdx]) : weights[weightIdx];
      const drain = calculateCapacityDrain(exercise, weightVal, repsNum);
      muscleGroups.forEach(muscle => {
        if (drain[muscle]) {
          prevCapacity[muscle] = Math.max(0, (prevCapacity[muscle] || 100) - drain[muscle]!);
        }
      });
      await AsyncStorage.setItem('muscleCapacity', JSON.stringify(prevCapacity));
      // --- End muscle capacity update ---

      setLogging(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setTimeout(onClose, 1200);
    } catch (e) {
      setLogging(false);
      alert('Failed to log workout');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.close} onPress={onClose}>
        <Text style={{ fontSize: 32, color: '#181C20' }}>×</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Log Workout</Text>
      <Text style={styles.exerciseName}>{exercise}</Text>
      <HumanMuscleMap />
      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Workout logged!</Text>
        </View>
      )}
      <View style={styles.flexBottomContainer}>
          {/* <Text style={styles.sectionTitle}>Exercise</Text> */}
          <View style={styles.inlinePickersRow}>
            <View style={styles.inlinePickerCol}>
              <Text style={styles.sectionTitle}>Weight</Text>
              <SlotPicker
                data={weights}
                selectedIndex={weightIdx}
                onSelect={setWeightIdx}
                style={{}}
              />
            </View>
            <View style={styles.inlinePickerCol}>
              <Text style={styles.sectionTitle}>Reps</Text>
              <SlotPicker
                data={repsList}
                selectedIndex={repsIdx}
                onSelect={setRepsIdx}
              />
            </View>
          </View>
        <TouchableOpacity style={styles.logButton} onPress={logExercise} disabled={logging}>
          <Text style={styles.logButtonText}>{logging ? 'Logging...' : 'Log Exercise'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 32,
  },
  close: {
    position: 'absolute',
    left: 24,
    top: 50,
    zIndex: 10,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 25,
    marginBottom: 5,
    color: '#181C20',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
    color: '#181C20',
  },
  exerciseName: {
    fontSize: 20,
    color: '#C2BABA',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logButton: {
    backgroundColor: '#ED2737',
    borderRadius: 40,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 60,
    backgroundColor: '#181C20',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    zIndex: 100,
    opacity: 0.95,
  },
  toastText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  flexBottomContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  inlinePickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginTop: 16,
  },
  inlinePickerCol: {
    flex: 1,
    alignItems: 'center',
  },
}); 