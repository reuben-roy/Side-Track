import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CaloriesChart from '../../../components/CaloriesChart';
import MuscleCapacitySection from '../../../components/MuscleCapacitySection';
import ProfileButton from '../../../components/ProfileButton';
import { exercises } from '../../../constants/Exercises';

interface WorkoutLog {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

// Helper functions for new log format
function getRepsCount(log: WorkoutLog) {
  return typeof log.reps === 'number' ? log.reps : 0;
}
function getWeight(log: WorkoutLog, fallbackWeight: number) {
  return typeof log.weight === 'number' ? log.weight : fallbackWeight;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StatsScreen() {
  const [calories, setCalories] = useState<number | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [profile, setProfile] = useState<{ weight: string; height: string; calorieGoal: string }>({ weight: '', height: '', calorieGoal: '' });
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [personalBests, setPersonalBests] = useState<{ [exercise: string]: { maxWeight: number; maxReps: number } }>({});
  const [monthlyTotals, setMonthlyTotals] = useState({ workouts: 0, calories: 0, sets: 0, reps: 0 });
  const [allTimeTotals, setAllTimeTotals] = useState({ workouts: 0, calories: 0, sets: 0, reps: 0 });
  const [goalProgress, setGoalProgress] = useState({ week: 0, month: 0 });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [expandedOptions, setExpandedOptions] = useState<number | null>(null);

  // Function to toggle options for a specific workout
  const toggleOptions = (index: number) => {
    setExpandedOptions(expandedOptions === index ? null : index);
  };

  // Function to delete a workout
  const deleteWorkout = async (index: number) => {
    console.log('Delete button pressed for index:', index);
    
    // Use different confirmation methods for web vs native
    let shouldDelete = false;
    
    if (Platform.OS === 'web') {
      shouldDelete = window.confirm('Are you sure you want to delete this workout? This action cannot be undone.');
    } else {
      // For native platforms, use Alert.alert
      Alert.alert(
        'Delete Workout',
        'Are you sure you want to delete this workout? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await performDelete(index);
            },
          },
        ]
      );
      return; // Exit early for native platforms
    }
    
    // For web, perform delete directly if confirmed
    if (shouldDelete) {
      await performDelete(index);
    }
  };

  const performDelete = async (index: number) => {
    console.log('Delete confirmed for index:', index);
    try {
      const updatedLogs = workoutLogs.filter((_, i) => i !== index);
      console.log('Updated logs:', updatedLogs);
      await AsyncStorage.setItem('workoutLogs', JSON.stringify(updatedLogs));
      setWorkoutLogs(updatedLogs);
      
      // Refresh stats after deletion
      fetchStats();
    } catch (error) {
      console.error('Error deleting workout:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete workout. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete workout. Please try again.');
      }
    }
  };

  // Function to fetch and calculate stats
  const fetchStats = async () => {
    // Get user weight and calorie goal
    const profileStr = await AsyncStorage.getItem('profile');
    let weightLbs = 170;
    let calorieGoal = 2000;
    if (profileStr) {
      const profileObj = JSON.parse(profileStr);
      // Parse weight from string format
      const weightMatch = profileObj.weight?.match(/(\d+\.?\d*)/);
      weightLbs = weightMatch ? parseFloat(weightMatch[1]) : 170;
      calorieGoal = parseInt((profileObj.calorieGoal || '2000').replace(/[^0-9]/g, ''));
      setProfile(profileObj);
    }
    const weightKg = weightLbs * 0.453592;

    // Get workout logs
    const logsStr = await AsyncStorage.getItem('workoutLogs');
    let totalCals = 0;
    let logs: WorkoutLog[] = [];
    if (logsStr) {
      logs = JSON.parse(logsStr);
      // Sort logs by date (newest first)
      logs.sort((a: WorkoutLog, b: WorkoutLog) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      for (const log of logs) {
        // Get exercise MET value
        const exercise = exercises.find(e => e.name === log.exercise);
        const met = exercise ? exercise.met : 5;
        // Estimate duration: 2 min per set if timer not used
        let durationMin = 1 * 2; // 1 set * 2 minutes
        // Calories = (MET * weightKg * 3.5 / 200) * duration (min)
        const cals = (met * weightKg * 3.5 / 200) * durationMin;
        totalCals += cals;
      }
    }
    setCalories(Math.round(totalCals));
    setWorkoutLogs(logs);

    // --- Streak Counter ---
    // Get unique workout days (YYYY-MM-DD)
    const daysSet = new Set(logs.map(log => new Date(log.date).toISOString().slice(0, 10)));
    const daysArr = Array.from(daysSet).sort();
    let currentStreak = 0, bestStreak = 0, streak = 0;
    let prev = null;
    for (let i = 0; i < daysArr.length; i++) {
      const d = new Date(daysArr[i]);
      if (prev) {
        const diff = (d.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak++;
        } else {
          streak = 1;
        }
      } else {
        streak = 1;
      }
      if (streak > bestStreak) bestStreak = streak;
      prev = d;
    }
    // Current streak: count back from today
    let today = new Date(); today.setHours(0,0,0,0);
    let streakCount = 0;
    for (let i = daysArr.length - 1; i >= 0; i--) {
      const d = new Date(daysArr[i]);
      if ((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) === streakCount) {
        streakCount++;
      } else {
        break;
      }
    }
    setStreak({ current: streakCount, best: bestStreak });

    // --- Personal Bests ---
    const bests: { [exercise: string]: { maxWeight: number; maxReps: number } } = {};
    logs.forEach(log => {
      if (!bests[log.exercise]) bests[log.exercise] = { maxWeight: 0, maxReps: 0 };
      const weight = getWeight(log, 0);
      const reps = getRepsCount(log);
      if (!isNaN(weight) && weight > bests[log.exercise].maxWeight) bests[log.exercise].maxWeight = weight;
      if (!isNaN(reps) && reps > bests[log.exercise].maxReps) bests[log.exercise].maxReps = reps;
    });
    setPersonalBests(bests);

    // --- Monthly & All-Time Totals ---
    const now = new Date();
    const nowMonth = now.getMonth(), nowYear = now.getFullYear();
    let monthWorkouts = 0, monthCalories = 0, monthSets = 0, monthReps = 0;
    let allWorkouts = logs.length, allCalories = 0, allSets = 0, allReps = 0;
    logs.forEach(log => {
      const logDate = new Date(log.date);
      const exercise = exercises.find(e => e.name === log.exercise);
      const met = exercise ? exercise.met : 5;
      let durationMin = 1 * 2; // 1 set * 2 minutes
      const cals = (met * weightKg * 3.5 / 200) * durationMin;
      allCalories += cals;
      allSets += 1; // 1 set per log
      allReps += getRepsCount(log);
      if (logDate.getMonth() === nowMonth && logDate.getFullYear() === nowYear) {
        monthWorkouts++;
        monthCalories += cals;
        monthSets += 1; // 1 set per log
        monthReps += getRepsCount(log);
      }
    });
    setMonthlyTotals({ workouts: monthWorkouts, calories: Math.round(monthCalories), sets: monthSets, reps: monthReps });
    setAllTimeTotals({ workouts: allWorkouts, calories: Math.round(allCalories), sets: allSets, reps: allReps });

    // --- Goal Progress ---
    // Week
    let weekCals = 0, monthCals = 0;
    const startOfWeek = getStartOfWeekForGoal(now);
    logs.forEach(log => {
      const logDate = new Date(log.date);
      const exercise = exercises.find(e => e.name === log.exercise);
      const met = exercise ? exercise.met : 5;
      let durationMin = 1 * 2; // 1 set * 2 minutes
      const cals = (met * weightKg * 3.5 / 200) * durationMin;
      if (logDate >= startOfWeek) weekCals += cals;
      if (logDate.getMonth() === nowMonth && logDate.getFullYear() === nowYear) monthCals += cals;
    });
    setGoalProgress({ week: Math.round((weekCals / calorieGoal) * 100), month: Math.round((monthCals / (calorieGoal * 4)) * 100) });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Helper function for getting start of week
  function getStartOfWeekForGoal(date: Date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }



  return (
    <ScrollView style={styles.container}>
      <ProfileButton top={18} right={0} />
      <Text style={styles.text}>Stats</Text>
      
      <CaloriesChart
        workoutLogs={workoutLogs}
        profile={profile}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <MuscleCapacitySection />

      {/* --- Streak Counter, Personal Bests, Totals, Goal Progress --- */}
      <View style={styles.statsSummaryGrid}>
        {/* Week Goal Progress */}
        <View style={styles.statsSummaryBox}>
          <Text style={[styles.goalLabel, {color: '#B6F533'}]}>Week</Text>
          <View style={styles.progressBarBgSmall}>
            <View style={[styles.progressBar, { width: `${Math.min(goalProgress.week, 100)}%` }]} />
          </View>
          <Text style={styles.goalValue}>{goalProgress.week}%</Text>
        </View>
        {/* Month Goal Progress */}
        <View style={styles.statsSummaryBox}>
          <Text style={[styles.goalLabel, {color: '#B6F533'}]}>Month</Text>
          <View style={styles.progressBarBgSmall}>
            <View style={[styles.progressBar, { width: `${Math.min(goalProgress.month, 100)}%` }]} />
          </View>
          <Text style={styles.goalValue}>{goalProgress.month}%</Text>
        </View>
        <View style={styles.statsSummaryBox}>
          <Text style={styles.totalsLabel}>Total Calories Burned:</Text>
          <Text style={styles.calories}>{calories !== null ? calories + ' kcal' : '...'}</Text>
        </View>
        {/* Streak */}
        <View style={styles.statsSummaryBox}>
          <Text style={styles.streakLabel}>Streak</Text>
          <Text style={styles.streakValue}>Current: {streak.current} days</Text>
          <Text style={styles.streakValue}>Best: {streak.best} days</Text>
        </View>
        {/* This Month Totals */}
        <View style={styles.statsSummaryBox}>
          <Text style={styles.totalsLabel}>This Month</Text>
          <Text style={styles.totalsValue}>Workouts: {monthlyTotals.workouts}</Text>
          <Text style={styles.totalsValue}>Calories: {monthlyTotals.calories}</Text>
          <Text style={styles.totalsValue}>Sets: {monthlyTotals.sets}</Text>
          <Text style={styles.totalsValue}>Reps: {monthlyTotals.reps}</Text>
        </View>
        {/* All Time Totals */}
        <View style={styles.statsSummaryBox}>
          <Text style={styles.totalsLabel}>All Time</Text>
          <Text style={styles.totalsValue}>W: {allTimeTotals.workouts}</Text>
          <Text style={styles.totalsValue}>C: {allTimeTotals.calories}</Text>
          <Text style={styles.totalsValue}>S: {allTimeTotals.sets}</Text>
          <Text style={styles.totalsValue}>R: {allTimeTotals.reps}</Text>
        </View>
        {/* Personal Bests */}
        <View style={styles.statsSummaryBox}>
          <Text style={styles.bestsLabel}>Personal Bests</Text>
          {Object.keys(personalBests).length === 0 ? (
            <Text style={styles.bestsValue}>No data</Text>
          ) : (
            Object.entries(personalBests).map(([exercise, best]) => (
              <Text key={exercise} style={styles.bestsValue} numberOfLines={1}>
                {exercise}: {best.maxWeight > 0 ? `${best.maxWeight} lbs` : '-'} / {best.maxReps > 0 ? `${best.maxReps} reps` : '-'}
              </Text>
            ))
          )}
        </View>
      </View>
      
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Workout History</Text>
        {workoutLogs.length === 0 ? (
          <Text style={styles.noWorkouts}>No workouts logged yet</Text>
        ) : (
          workoutLogs.map((log, index) => (
            <View key={index} style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <Text style={styles.exerciseName}>{log.exercise}</Text>
                <View style={styles.headerRight}>
                  <Text style={styles.workoutDate}>{formatDate(log.date)}</Text>
                  <TouchableOpacity 
                    style={styles.optionsButton}
                    onPress={() => toggleOptions(index)}
                  >
                    <Text style={styles.optionsIcon}>⋮</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.setsContainer}>
                <Text style={styles.setText}>
                  {log.weight ? `${log.weight} lbs` : '-'} × {log.reps ? `${log.reps} reps` : '-'}
                </Text>
              </View>
              {expandedOptions === index && (
                <View style={styles.optionsContainer}>
                  <TouchableOpacity 
                    style={styles.deleteButtonContainer}
                    onPress={() => deleteWorkout(index)}
                  >
                    <Text style={styles.deleteButton}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFF',
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  text: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#181C20',
    marginTop: 25,
    marginBottom: 24,
  },
  calories: {
    fontWeight: 'bold',
    color: '#ED2737',
    // textAlign: 'right',
  },
  historySection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#181C20',
    marginBottom: 16,
  },
  noWorkouts: {
    fontSize: 16,
    color: '#C2BABA',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  workoutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#181C20',
    flex: 1,
  },
  workoutDate: {
    fontSize: 14,
    color: '#C2BABA',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionsButton: {
    padding: 4,
  },
  optionsIcon: {
    fontSize: 18,
    color: '#C2BABA',
    fontWeight: 'bold',
  },
  optionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  setsContainer: {
    marginTop: 8,
  },
  setText: {
    fontSize: 16,
    color: '#181C20',
    marginBottom: 4,
  },
  workoutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFE5E5',
    borderRadius: 6,
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    // justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsSummaryBox: {
    width: `${(100 - 3) / 2}%`,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  streakLabel: {
    fontWeight: 'bold',
    color: '#ED2737',
    fontSize: 16,
  },
  streakValue: {
    fontSize: 16,
    color: '#181C20',
  },
  goalLabel: {
    fontWeight: 'bold',
    color: '#B6F533',
    fontSize: 16,
    flex: 1,
  },
  progressBarBg: {
    flex: 2,
    height: 12,
    backgroundColor: '#ECECEC',
    borderRadius: 8,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#ED2737',
    borderRadius: 8,
  },
  goalValue: {
    fontWeight: 'bold',
    color: '#181C20',
    fontSize: 16,
    minWidth: 36,
    textAlign: 'right',
  },
  totalsLabel: {
    fontWeight: 'bold',
    color: '#232B5D',
    fontSize: 16,
    flex: 1,
  },
  totalsValue: {
    fontSize: 15,
    color: '#181C20',
  },
  bestsLabel: {
    fontWeight: 'bold',
    color: '#006DFF',
    fontSize: 16,
    marginBottom: 2,
  },
  bestsValue: {
    fontSize: 15,
    color: '#181C20',
  },
  deleteButton: {
    color: '#ED2737',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarBgSmall: {
    flex: 2,
    height: 12,
    backgroundColor: '#ECECEC',
    borderRadius: 8,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
});