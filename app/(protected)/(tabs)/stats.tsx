import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const router = useRouter();
  const [calories, setCalories] = useState<number | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [profile, setProfile] = useState<{ weight: string; height: string; calorieGoal: string }>({ weight: '', height: '', calorieGoal: '' });
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [personalBests, setPersonalBests] = useState<{ [exercise: string]: { maxWeight: number; maxReps: number } }>({});
  const [monthlyTotals, setMonthlyTotals] = useState({ workouts: 0, calories: 0, sets: 0, reps: 0 });
  const [allTimeTotals, setAllTimeTotals] = useState({ workouts: 0, calories: 0, sets: 0, reps: 0 });
  const [goalProgress, setGoalProgress] = useState({ week: 0, month: 0 });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  // Function to fetch and calculate stats
  const fetchStats = async () => {
    // Get user weight and calorie goal
    const profileStr = await AsyncStorage.getItem('profile');
    let weightLbs = 170;
    let calorieGoal = 360;
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

  // Add focus effect to refresh data when tab becomes active
  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  // Helper function for getting start of week
  function getStartOfWeekForGoal(date: Date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  return (
    <ScrollView 
      style={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <ProfileButton top={25} right={0} />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Stats</Text>
        <Text style={styles.subHeader}>Track your progress and achievements</Text>
      </View>

      <CaloriesChart
        workoutLogs={workoutLogs}
        profile={profile}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <MuscleCapacitySection />

      {/* --- Streak Counter, Personal Bests, Totals, Goal Progress --- */}
      <View style={styles.statsCardsContainer}>
        {/* Week Goal Progress */}
        <View style={styles.statsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Week Goal</Text>
          </View>
          <View style={styles.progressBarBgSmall}>
            <View
            style={[styles.progressBar, { width: `${Math.min(goalProgress.week, 100)}%`, backgroundColor: '#1E90FF' }]}
            />
          </View>
          <Text style={styles.goalValue}>{goalProgress.week}%</Text>
          </View>
          
          {/* Month Goal Progress */}
          <View style={styles.statsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Month Goal</Text>
          </View>
          <View style={styles.progressBarBgSmall}>
            <View
            style={[styles.progressBar, { width: `${Math.min(goalProgress.month, 100)}%`, backgroundColor: '#1E90FF' }]}
            />
          </View>
          <Text style={styles.goalValue}>{goalProgress.month}%</Text>
        </View>
        
        {/* Total Calories */}
        <View style={styles.statsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Total Calories</Text>
          </View>
          <Text style={styles.calories}>{calories !== null ? calories + ' kcal' : '...'}</Text>
        </View>
        
        {/* Streak */}
        <View style={styles.statsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Streak</Text>
          </View>
          <Text style={styles.streakValue}>Current: {streak.current} days</Text>
          <Text style={styles.streakValue}>Best: {streak.best} days</Text>
        </View>
        
        {/* This Month Totals */}
        <View style={styles.statsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>This Month</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.totalsValue}>Workouts: {monthlyTotals.workouts}</Text>
            <Text style={styles.totalsValue}>Calories: {monthlyTotals.calories}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.totalsValue}>Sets: {monthlyTotals.sets}</Text>
            <Text style={styles.totalsValue}>Reps: {monthlyTotals.reps}</Text>
          </View>
        </View>
        
        {/* All Time Totals */}
        <View style={styles.statsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>All Time</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.totalsValue}>Workouts: {allTimeTotals.workouts}</Text>
            <Text style={styles.totalsValue}>Calories: {allTimeTotals.calories}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.totalsValue}>Sets: {allTimeTotals.sets}</Text>
            <Text style={styles.totalsValue}>Reps: {allTimeTotals.reps}</Text>
          </View>
        </View>
      </View>
      
      {/* Workout History Button */}
      <TouchableOpacity 
        style={styles.historyButton}
        onPress={() => router.push('/(protected)/workout-history')}
      >
          <View style={styles.historyButtonGradient}>
          <Text style={styles.historyButtonText}>View Workout History</Text>
          <Text style={styles.historyButtonIcon}>→</Text>
          </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContainer: {
    marginTop: 25,
    marginBottom: 24,
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#181C20',
    marginBottom: 4,
  },
  subHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#181C20',
    marginTop: 25,
    marginBottom: 24,
  },
  statsCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  statsCard: {
    width: `${(100 - 3) / 2}%`,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'column',
    gap: 4,
  },
  calories: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ED2737',
    marginTop: 4,
  },
  historyButton: {
    marginTop: 8,
    marginBottom: 40,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  historyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 8,
  },
  historyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#181C20',
  },
  historyButtonIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#181C20',
  },
  streakValue: {
    fontSize: 14,
    color: '#181C20',
    fontWeight: '500',
    marginTop: 2,
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
    height: '100%',
    borderRadius: 8,
  },
  goalValue: {
    fontWeight: 'bold',
    color: '#181C20',
    fontSize: 20,
    marginTop: 8,
  },
  totalsLabel: {
    fontWeight: 'bold',
    color: '#232B5D',
    fontSize: 16,
    flex: 1,
  },
  totalsValue: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
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
    fontWeight: '700',
  },
  progressBarBgSmall: {
    height: 10,
    backgroundColor: '#ECECEC',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
});