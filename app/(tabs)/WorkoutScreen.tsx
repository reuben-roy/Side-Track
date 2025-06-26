import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface WorkoutScreenProps {
  exercise: string;
  weight: string;
  reps: string;
  onClose: () => void;
}

const initialSets = [
  { set: 1, weight: '135', reps: '8' },
//   { set: 2, weight: '145', reps: '10' },
//   { set: 3, weight: '155', reps: '12' },
];

export default function WorkoutScreen({ exercise, weight, reps, onClose }: WorkoutScreenProps) {
  const [sets, setSets] = useState(initialSets);
  const [timer, setTimer] = useState({ h: '00', m: '00', s: '00' });
  const [selectedSet, setSelectedSet] = useState(1);
  const [logging, setLogging] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSetChange = (idx: number, field: 'weight' | 'reps', value: string) => {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const logExercise = async () => {
    setLogging(true);
    const workout = {
      exercise,
      sets,
      timer,
      date: new Date().toISOString(),
    };
    try {
      const prev = await AsyncStorage.getItem('workoutLogs');
      const logs = prev ? JSON.parse(prev) : [];
      logs.push(workout);
      await AsyncStorage.setItem('workoutLogs', JSON.stringify(logs));
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
      <Text style={styles.header}>Workout</Text>
      <Text style={styles.sectionTitle}>Exercise</Text>
      <Text style={styles.exerciseName}>{exercise}</Text>
      <Text style={styles.sectionTitle}>Sets</Text>
      <View style={{ marginBottom: 24 }}>
        {sets.map((s, i) => (
          <TouchableOpacity
            key={s.set}
            style={[styles.setRow, selectedSet === s.set && styles.setRowSelected]}
            onPress={() => setSelectedSet(s.set)}
            activeOpacity={0.8}
          >
            <Text style={[styles.setText, selectedSet === s.set && styles.setTextSelected]}>{s.set}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
              <TextInput
                style={[styles.setText, styles.input, selectedSet === s.set && styles.setTextSelected, { flex: 0 }]}
                value={s.weight}
                onChangeText={val => handleSetChange(i, 'weight', val.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                maxLength={4}
              />
              <Text style={[styles.setText, { marginLeft: 2, color: '#C2BABA', fontSize: 16 }]}>lbs</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
              <TextInput
                style={[styles.setText, styles.input, selectedSet === s.set && styles.setTextSelected, { flex: 0 }]}
                value={s.reps}
                onChangeText={val => handleSetChange(i, 'reps', val.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={[styles.setText, { marginLeft: 2, color: '#C2BABA', fontSize: 16 }]}>reps</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      {/* <Text style={styles.sectionTitle}>Timer</Text>
      <View style={styles.timerRow}>
        <View style={styles.timerBox}><Text style={styles.timerNum}>{timer.h}</Text><Text style={styles.timerLabel}>Hours</Text></View>
        <View style={styles.timerBox}><Text style={styles.timerNum}>{timer.m}</Text><Text style={styles.timerLabel}>Minutes</Text></View>
        <View style={styles.timerBox}><Text style={styles.timerNum}>{timer.s}</Text><Text style={styles.timerLabel}>Seconds</Text></View>
      </View> */}
      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Workout logged!</Text>
        </View>
      )}
      <TouchableOpacity style={styles.logButton} onPress={logExercise} disabled={logging}>
        <Text style={styles.logButtonText}>{logging ? 'Logging...' : 'Log Exercise'}</Text>
      </TouchableOpacity>
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
    top: 32,
    zIndex: 10,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
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
    marginBottom: 16,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  setRowSelected: {
    backgroundColor: '#F5F2F2',
  },
  setText: {
    flex: 1,
    fontSize: 18,
    color: '#C2BABA',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  setTextSelected: {
    color: '#181C20',
  },
  input: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: '#ECECEC',
    textAlign: 'center',
    fontSize: 18,
    marginHorizontal: 4,
    minWidth: 60,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 24,
  },
  timerBox: {
    flex: 1,
    backgroundColor: '#F5F2F2',
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 6,
    paddingVertical: 18,
  },
  timerNum: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#181C20',
  },
  timerLabel: {
    fontSize: 16,
    color: '#181C20',
    marginTop: 4,
  },
  logButton: {
    backgroundColor: '#ED2737',
    borderRadius: 40,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 32,
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
    bottom: 120,
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
}); 