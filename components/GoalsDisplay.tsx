import { getPreference, getProfile, getWorkoutLogs, setPreference, WorkoutLog } from '@/lib/database';
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { exercises } from '../constants/Exercises';

interface GoalsDisplayProps {
  onRefresh?: () => void;
}

// Default goals
const DEFAULT_WEEK_GOAL = 2500; // calories per week
const DEFAULT_MONTH_GOAL = 10000; // calories per month

// Helper functions
function getExerciseMET(name: string) {
  const ex = exercises.find(e => e.name === name);
  return ex ? ex.met : 5;
}

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function GoalsDisplay({ onRefresh }: GoalsDisplayProps) {
  const [weekGoal, setWeekGoal] = useState(DEFAULT_WEEK_GOAL);
  const [monthGoal, setMonthGoal] = useState(DEFAULT_MONTH_GOAL);
  const [weekCalories, setWeekCalories] = useState(0);
  const [monthCalories, setMonthCalories] = useState(0);
  const [editingGoal, setEditingGoal] = useState<'week' | 'month' | null>(null);
  const [inputValue, setInputValue] = useState('');

  const loadData = useCallback(async () => {
    try {
      // Load goals from preferences
      const savedWeekGoal = await getPreference<number>('weeklyCalorieGoal', DEFAULT_WEEK_GOAL);
      const savedMonthGoal = await getPreference<number>('monthlyCalorieGoal', DEFAULT_MONTH_GOAL);
      setWeekGoal(savedWeekGoal);
      setMonthGoal(savedMonthGoal);

      // Get profile for weight
      const profile = await getProfile();
      let weightLbs = 170;
      if (profile?.weight) {
        const match = profile.weight.match(/(\d+\.?\d*)/);
        weightLbs = match ? parseFloat(match[1]) : 170;
      }
      const weightKg = weightLbs * 0.453592;

      // Get workout logs
      const logs = await getWorkoutLogs();
      
      // Calculate calories for week and month
      const now = new Date();
      const startOfWeek = getStartOfWeek(now);
      const startOfMonth = getStartOfMonth(now);

      let weekCals = 0;
      let monthCals = 0;

      logs.forEach((log: WorkoutLog) => {
        const logDate = new Date(log.date);
        const met = getExerciseMET(log.exercise);
        const durationMin = 2; // 2 minutes per set
        const cals = (met * weightKg * 3.5 / 200) * durationMin;

        if (logDate >= startOfWeek) {
          weekCals += cals;
        }
        if (logDate >= startOfMonth) {
          monthCals += cals;
        }
      });

      setWeekCalories(Math.round(weekCals));
      setMonthCalories(Math.round(monthCals));
    } catch (error) {
      console.error('Error loading goals data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEditGoal = (goalType: 'week' | 'month') => {
    setEditingGoal(goalType);
    setInputValue(goalType === 'week' ? weekGoal.toString() : monthGoal.toString());
  };

  const handleSaveGoal = async () => {
    if (!editingGoal) return;

    const newValue = parseInt(inputValue.replace(/[^0-9]/g, '')) || 0;
    
    if (editingGoal === 'week') {
      await setPreference('weeklyCalorieGoal', newValue);
      setWeekGoal(newValue);
    } else {
      await setPreference('monthlyCalorieGoal', newValue);
      setMonthGoal(newValue);
    }

    setEditingGoal(null);
    setInputValue('');
    onRefresh?.();
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setInputValue('');
  };

  const getProgressPercent = (current: number, goal: number) => {
    if (goal <= 0) return 0;
    return Math.min(Math.round((current / goal) * 100), 100);
  };

  const weekProgress = getProgressPercent(weekCalories, weekGoal);
  const monthProgress = getProgressPercent(monthCalories, monthGoal);

  return (
    <>
      <View style={styles.container}>
        {/* Week Goal */}
        <TouchableOpacity 
          style={styles.goalCard}
          onPress={() => openEditGoal('week')}
          activeOpacity={0.7}
        >
          <View style={styles.goalRow}>
            <View style={styles.goalLeft}>
              <Text style={styles.goalLabel}>Week</Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${weekProgress}%` }]} />
              </View>
              <Text style={styles.goalTarget}>{weekProgress}% of {weekGoal.toLocaleString()} cal</Text>
            </View>
            <Text style={styles.goalValue}>{weekCalories.toLocaleString()}</Text>
          </View>
        </TouchableOpacity>

        {/* Month Goal */}
        <TouchableOpacity 
          style={styles.goalCard}
          onPress={() => openEditGoal('month')}
          activeOpacity={0.7}
        >
          <View style={styles.goalRow}>
            <View style={styles.goalLeft}>
              <Text style={styles.goalLabel}>Month</Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${monthProgress}%` }]} />
              </View>
              <Text style={styles.goalTarget}>{monthProgress}% of {monthGoal.toLocaleString()} cal</Text>
            </View>
            <Text style={styles.goalValue}>{monthCalories.toLocaleString()}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Edit Goal Modal */}
      <Modal
        visible={editingGoal !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {editingGoal === 'week' ? 'Weekly' : 'Monthly'} Goal
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType="numeric"
                placeholder="Enter calorie goal"
                autoFocus
              />
              <Text style={styles.inputUnit}>cal</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveGoal}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  goalCard: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 10,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalLeft: {
    flex: 1,
    marginRight: 8,
  },
  goalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  goalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 2,
  },
  goalTarget: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    paddingVertical: 16,
  },
  inputUnit: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
