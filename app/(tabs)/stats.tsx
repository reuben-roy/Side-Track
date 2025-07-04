import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import ProfileButton from '../../components/ProfileButton';
import { exercises } from '../../constants/Exercises';

interface WorkoutLog {
  exercise: string;
  sets: Array<{ set: number; weight: string; reps: string }>;
  timer: { h: string; m: string; s: string };
  date: string;
}

function getExerciseMET(name: string) {
  const ex = exercises.find(e => e.name === name);
  return ex ? ex.met : 5; // fallback MET
}

function parseWeight(weightStr: string) {
  // Expecting '170 lb' or just a number string
  const match = weightStr.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 170;
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

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

function getWeekDays(start: Date) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthDays(year: number, month: number) {
  const days = [];
  const total = getDaysInMonth(year, month);
  for (let i = 1; i <= total; i++) {
    days.push(new Date(year, month, i));
  }
  return days;
}

export default function StatsScreen() {
  const [calories, setCalories] = useState<number | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [weeklyCalories, setWeeklyCalories] = useState<{ [key: string]: number }>({});
  const [profile, setProfile] = useState<{ weight: string; height: string; calorieGoal: string }>({ weight: '', height: '', calorieGoal: '' });
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [personalBests, setPersonalBests] = useState<{ [exercise: string]: { maxWeight: number; maxReps: number } }>({});
  const [monthlyTotals, setMonthlyTotals] = useState({ workouts: 0, calories: 0, sets: 0, reps: 0 });
  const [allTimeTotals, setAllTimeTotals] = useState({ workouts: 0, calories: 0, sets: 0, reps: 0 });
  const [goalProgress, setGoalProgress] = useState({ week: 0, month: 0 });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthDays = getMonthDays(currentYear, currentMonth);
  // Map: YYYY-MM-DD -> calories
  const caloriesPerDay: { [date: string]: number } = {};
  workoutLogs.forEach(log => {
    const d = new Date(log.date);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const key = d.toISOString().slice(0, 10);
      const met = getExerciseMET(log.exercise);
      let durationMin = 0;
      if (log.timer && (log.timer.h !== '00' || log.timer.m !== '00' || log.timer.s !== '00')) {
        durationMin = (parseInt(log.timer.h) || 0) * 60 + (parseInt(log.timer.m) || 0) + ((parseInt(log.timer.s) || 0) / 60);
      } else {
        durationMin = (log.sets?.length || 1) * 2;
      }
      const weightLbs = parseWeight(profile.weight || '170');
      const weightKg = weightLbs * 0.453592;
      const cals = (met * weightKg * 3.5 / 200) * durationMin;
      caloriesPerDay[key] = (caloriesPerDay[key] || 0) + Math.round(cals);
    }
  });
  // Find max calories in month for scaling
  const maxCals = Math.max(...Object.values(caloriesPerDay), 1);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const caloriesPerMonth: { [month: string]: number } = {};
  for (let i = 0; i < 12; i++) {
    caloriesPerMonth[months[i]] = 0;
  }
  workoutLogs.forEach(log => {
    const d = new Date(log.date);
    if (d.getFullYear() === currentYear) {
      const met = getExerciseMET(log.exercise);
      let durationMin = 0;
      if (log.timer && (log.timer.h !== '00' || log.timer.m !== '00' || log.timer.s !== '00')) {
        durationMin = (parseInt(log.timer.h) || 0) * 60 + (parseInt(log.timer.m) || 0) + ((parseInt(log.timer.s) || 0) / 60);
      } else {
        durationMin = (log.sets?.length || 1) * 2;
      }
      const weightLbs = parseWeight(profile.weight || '170');
      const weightKg = weightLbs * 0.453592;
      const cals = (met * weightKg * 3.5 / 200) * durationMin;
      const monthName = months[d.getMonth()];
      caloriesPerMonth[monthName] = (caloriesPerMonth[monthName] || 0) + Math.round(cals);
    }
  });
  const yearBarData = months.map((month: string) => ({
    value: caloriesPerMonth[month] || 0,
    label: month,
    frontColor: '#ED2737',
    gradientColor: '#F5F2F2',
  }));

  useEffect(() => {
    async function fetchStats() {
      // Get user weight and calorie goal
      const profileStr = await AsyncStorage.getItem('profile');
      let weightLbs = 170;
      let calorieGoal = 2000;
      if (profileStr) {
        const profileObj = JSON.parse(profileStr);
        weightLbs = parseWeight(profileObj.weight || '170');
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
          const met = getExerciseMET(log.exercise);
          // Estimate duration: 2 min per set if timer not used
          let durationMin = 0;
          if (log.timer && (log.timer.h !== '00' || log.timer.m !== '00' || log.timer.s !== '00')) {
            durationMin = (parseInt(log.timer.h) || 0) * 60 + (parseInt(log.timer.m) || 0) + ((parseInt(log.timer.s) || 0) / 60);
          } else {
            durationMin = (log.sets?.length || 1) * 2;
          }
          // Calories = (MET * weightKg * 3.5 / 200) * duration (min)
          const cals = (met * weightKg * 3.5 / 200) * durationMin;
          totalCals += cals;
        }
      }
      setCalories(Math.round(totalCals));
      setWorkoutLogs(logs);

      // Calculate weekly calories
      const now = new Date();
      const startOfWeek = getStartOfWeek(now);
      const weekDays = getWeekDays(startOfWeek);
      const weekCalories: { [key: string]: number } = {};
      weekDays.forEach(day => {
        const key = day.toLocaleDateString('en-US', { weekday: 'short' });
        weekCalories[key] = 0;
      });
      if (logsStr) {
        const logs: WorkoutLog[] = JSON.parse(logsStr);
        logs.forEach(log => {
          const logDate = new Date(log.date);
          // Only include logs from this week
          if (logDate >= startOfWeek && logDate <= weekDays[6]) {
            const met = getExerciseMET(log.exercise);
            let durationMin = 0;
            if (log.timer && (log.timer.h !== '00' || log.timer.m !== '00' || log.timer.s !== '00')) {
              durationMin = (parseInt(log.timer.h) || 0) * 60 + (parseInt(log.timer.m) || 0) + ((parseInt(log.timer.s) || 0) / 60);
            } else {
              durationMin = (log.sets?.length || 1) * 2;
            }
            const cals = (met * weightKg * 3.5 / 200) * durationMin;
            const key = logDate.toLocaleDateString('en-US', { weekday: 'short' });
            weekCalories[key] = (weekCalories[key] || 0) + Math.round(cals);
          }
        });
      }
      setWeeklyCalories(weekCalories);

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
        (log.sets || []).forEach(set => {
          const weight = parseInt(set.weight);
          const reps = parseInt(set.reps);
          if (!isNaN(weight) && weight > bests[log.exercise].maxWeight) bests[log.exercise].maxWeight = weight;
          if (!isNaN(reps) && reps > bests[log.exercise].maxReps) bests[log.exercise].maxReps = reps;
        });
      });
      setPersonalBests(bests);

      // --- Monthly & All-Time Totals ---
      const nowMonth = now.getMonth(), nowYear = now.getFullYear();
      let monthWorkouts = 0, monthCalories = 0, monthSets = 0, monthReps = 0;
      let allWorkouts = logs.length, allCalories = 0, allSets = 0, allReps = 0;
      logs.forEach(log => {
        const logDate = new Date(log.date);
        const met = getExerciseMET(log.exercise);
        let durationMin = 0;
        if (log.timer && (log.timer.h !== '00' || log.timer.m !== '00' || log.timer.s !== '00')) {
          durationMin = (parseInt(log.timer.h) || 0) * 60 + (parseInt(log.timer.m) || 0) + ((parseInt(log.timer.s) || 0) / 60);
        } else {
          durationMin = ((log.sets || []).length || 1) * 2;
        }
        const cals = (met * weightKg * 3.5 / 200) * durationMin;
        allCalories += cals;
        allSets += (log.sets || []).length;
        allReps += (log.sets || []).reduce((sum, s) => sum + parseInt(s.reps), 0);
        if (logDate.getMonth() === nowMonth && logDate.getFullYear() === nowYear) {
          monthWorkouts++;
          monthCalories += cals;
          monthSets += (log.sets || []).length;
          monthReps += (log.sets || []).reduce((sum, s) => sum + parseInt(s.reps), 0);
        }
      });
      setMonthlyTotals({ workouts: monthWorkouts, calories: Math.round(monthCalories), sets: monthSets, reps: monthReps });
      setAllTimeTotals({ workouts: allWorkouts, calories: Math.round(allCalories), sets: allSets, reps: allReps });

      // --- Goal Progress ---
      // Week
      let weekCals = 0, monthCals = 0;
      const startOfWeekForGoal = getStartOfWeek(now);
      logs.forEach(log => {
        const logDate = new Date(log.date);
        const met = getExerciseMET(log.exercise);
        let durationMin = 0;
        if (log.timer && (log.timer.h !== '00' || log.timer.m !== '00' || log.timer.s !== '00')) {
          durationMin = (parseInt(log.timer.h) || 0) * 60 + (parseInt(log.timer.m) || 0) + ((parseInt(log.timer.s) || 0) / 60);
        } else {
          durationMin = (log.sets?.length || 1) * 2;
        }
        const cals = (met * weightKg * 3.5 / 200) * durationMin;
        if (logDate >= startOfWeekForGoal) weekCals += cals;
        if (logDate.getMonth() === nowMonth && logDate.getFullYear() === nowYear) monthCals += cals;
      });
      setGoalProgress({ week: Math.round((weekCals / calorieGoal) * 100), month: Math.round((monthCals / (calorieGoal * 4)) * 100) });
    }
    fetchStats();
  }, []);

  // Prepare data for BarChart
  const weekOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const barData = weekOrder.map(day => ({
    value: weeklyCalories[day] || 0,
    label: day,
    frontColor: '#ED2737',
    gradientColor: '#F5F2F2',
  }));

  const screenWidth = Dimensions.get('window').width;
  console.log(screenWidth)
  const barWidth = 30;
  const initialSpacing = 10;
  const totalHorizontalPadding = 64;
  const spacing = (screenWidth - totalHorizontalPadding * 2 - (barWidth * 7) - initialSpacing) / 7;
  const yearBarInitialSpacing = 5;
  const yearBarWidth = ((screenWidth - totalHorizontalPadding * 2 - yearBarInitialSpacing) * 4) / (5 * 12);
  const yearBarSpacing = (screenWidth - totalHorizontalPadding * 2 - (yearBarWidth * 12) - yearBarInitialSpacing) / 11;

  const buttonCount = 3;
  const minButtonWidth = 60; // Minimum width for each button's content
  const periodButtonHorizontalPadding = Math.max(10, (screenWidth - totalHorizontalPadding *3 - 2*6) / (buttonCount * 2));

  // Dynamic style for periodButton
  function getPeriodButtonStyle(paddingHorizontal: number) {
    return {
      paddingVertical: 6,
      paddingHorizontal,
      borderRadius: 10,
      backgroundColor: '#ECECEC',
      marginHorizontal: 2,
    };
  }

  return (
    <ScrollView style={styles.container}>
      <ProfileButton />
      <Text style={styles.text}>Stats</Text>
      
      <View style={styles.caloriesSection}>
        <Text style={styles.label}>Total Calories Burned:</Text>
        <Text style={styles.calories}>{calories !== null ? calories + ' kcal' : '...'}</Text>
      </View>

        {/* Inline period selector buttons */}
        <View style={styles.periodSelectorRow}>
          {['week', 'month', 'year'].map(period => (
            <TouchableOpacity
              key={period}
              style={[getPeriodButtonStyle(periodButtonHorizontalPadding), selectedPeriod === period && styles.periodButtonSelected]}
              onPress={() => setSelectedPeriod(period as 'week' | 'month' | 'year')}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === period && styles.periodButtonTextSelected]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      {/* Weekly Calories Bar Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>
          {selectedPeriod === 'week' ? 'Calories Burned This Week' : selectedPeriod === 'month' ? 'Calories Burned This Month' : 'Calories Burned This Year'}
        </Text>
        {selectedPeriod === 'week' && (
          <BarChart
            data={barData}
            barWidth={30}
            initialSpacing={initialSpacing}
            spacing={spacing}
            barBorderRadius={8}
            showGradient
            yAxisThickness={0}
            xAxisType={'dashed'}
            xAxisColor={'#ECECEC'}
            yAxisTextStyle={{ color: '#C2BABA' }}
            maxValue={Math.max(...barData.map(b => b.value), 100)}
            noOfSections={4}
            xAxisLabelTextStyle={{ color: '#C2BABA', textAlign: 'center', fontWeight: 'bold' }}
            height={180}
            disableScroll
          />
        )}
        {selectedPeriod === 'month' && (
          <View style={styles.calendarGrid}>
            {/* Render days of week header */}
            <View style={styles.calendarHeaderRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <Text key={d} style={styles.calendarHeaderText}>{d}</Text>
              ))}
            </View>
            {/* Render calendar days */}
            <View style={styles.calendarDaysGrid}>
              {/* Add empty slots for first day of month */}
              {Array(monthDays[0].getDay()).fill(null).map((_, i) => (
                <View key={'empty-' + i} style={styles.calendarDayCell} />
              ))}
              {monthDays.map((date: Date, idx: number) => {
                const key = date.toISOString().slice(0, 10);
                const cals = caloriesPerDay[key] || 0;
                // Circle radius: min 10, max 28
                const minR = 10, maxR = 28;
                const r = cals === 0 ? minR : minR + ((maxR - minR) * cals) / maxCals;
                return (
                  <View key={key} style={styles.calendarDayCell}>
                    <View style={[styles.calendarCircle, { width: r * 2, height: r * 2, borderRadius: r, backgroundColor: cals > 0 ? '#ED2737' : '#ECECEC' }]}/>
                    <Text style={styles.calendarDayText}>{date.getDate()}</Text>
                    {cals > 0 && <Text style={styles.calendarCalsText}>{cals}</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        )}
        {selectedPeriod === 'year' && (
          <BarChart
            data={yearBarData}
            barWidth={yearBarWidth}
            initialSpacing={yearBarInitialSpacing}
            spacing={yearBarSpacing}
            barBorderRadius={5}
            showGradient
            yAxisThickness={0}
            xAxisType={'dashed'}
            xAxisColor={'#ECECEC'}
            yAxisTextStyle={{ color: '#C2BABA' }}
            maxValue={Math.max(...yearBarData.map((b: any) => b.value), 100)}
            noOfSections={4}
            xAxisLabelTextStyle={{ color: '#C2BABA', textAlign: 'center', fontWeight: 'bold', fontSize: 10 }}
            height={180}
            disableScroll
          />
        )}
      </View>


      {/* --- Streak Counter, Personal Bests, Totals, Goal Progress --- */}
      <View style={styles.statsSummaryGrid}>
        {/* Week Goal Progress */}
        <View style={styles.statsSummaryBox}>
          <Text style={[styles.goalLabel, {color: '#B6F533'}]}>🎯 Week</Text>
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
                <Text style={styles.workoutDate}>{formatDate(log.date)}</Text>
              </View>
              <View style={styles.setsContainer}>
                {(log.sets || []).map((set, setIndex) => (
                  <Text key={setIndex} style={styles.setText}>
                    Set {set.set}: {set.weight} lbs × {set.reps} reps
                  </Text>
                ))}
              </View>
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
    padding: 20,
  },
  text: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#181C20',
    marginTop: 25,
    marginBottom: 24,
    left: 20,
  },
  caloriesSection: {
    alignItems: 'center',
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 20,
    color: '#181C20',
    marginBottom: 8,
  },
  calories: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ED2737',
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
  setsContainer: {
    marginTop: 8,
  },
  setText: {
    fontSize: 16,
    color: '#181C20',
    marginBottom: 4,
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
  periodSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  periodButtonSelected: {
    backgroundColor: '#ED2737',
  },
  periodButtonText: {
    color: '#181C20',
    fontWeight: 'bold',
    fontSize: 16,
  },
  periodButtonTextSelected: {
    color: '#fff',
  },
  calendarGrid: {
    marginTop: 8,
    marginBottom: 8,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calendarHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#232B5D',
    fontSize: 15,
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    marginVertical: 4,
    minHeight: 48,
  },
  calendarCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  calendarDayText: {
    fontSize: 13,
    color: '#181C20',
    fontWeight: 'bold',
  },
  calendarCalsText: {
    fontSize: 11,
    color: '#ED2737',
    fontWeight: 'bold',
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