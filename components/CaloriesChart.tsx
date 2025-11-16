import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { exercises } from '../constants/Exercises';

interface WorkoutLog {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

interface Profile {
  weight: string;
  height: string;
  calorieGoal: string;
}

interface CaloriesChartProps {
  workoutLogs: WorkoutLog[];
  profile: Profile;
  selectedPeriod: 'week' | 'month' | 'year';
  onPeriodChange: (period: 'week' | 'month' | 'year') => void;
}

// Helper functions for new log format
function getSetCount(log: WorkoutLog) {
  return 1;
}

function getExerciseMET(name: string) {
  const ex = exercises.find(e => e.name === name);
  return ex ? ex.met : 5; // fallback MET
}

//TODO: change to number from string
function parseWeight(weightStr: string) {
  // Expecting '170 lb' or just a number string
  const match = weightStr.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 170;
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

// Data preparation functions
function calculateWeeklyCalories(workoutLogs: WorkoutLog[], profile: Profile) {
  const now = new Date();
  const startOfWeek = getStartOfWeek(now);
  const weekDays = getWeekDays(startOfWeek);
  const weekCalories: { [key: string]: number } = {};
  
  weekDays.forEach(day => {
    const key = day.toLocaleDateString('en-US', { weekday: 'short' });
    weekCalories[key] = 0;
  });

  const weightLbs = parseWeight(profile.weight || '170');
  const weightKg = weightLbs * 0.453592;

  workoutLogs.forEach(log => {
    const logDate = new Date(log.date);
    // Only include logs from this week
    if (logDate >= startOfWeek && logDate <= weekDays[6]) {
      const met = getExerciseMET(log.exercise);
      let durationMin = getSetCount(log) * 2;
      const cals = (met * weightKg * 3.5 / 200) * durationMin;
      const key = logDate.toLocaleDateString('en-US', { weekday: 'short' });
      weekCalories[key] = (weekCalories[key] || 0) + Math.round(cals);
    }
  });

  return weekCalories;
}

function calculateMonthlyCalories(workoutLogs: WorkoutLog[], profile: Profile) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthDays = getMonthDays(currentYear, currentMonth);
  
  // Map: YYYY-MM-DD -> calories
  const caloriesPerDay: { [date: string]: number } = {};
  const weightLbs = parseWeight(profile.weight || '170');
  const weightKg = weightLbs * 0.453592;

  workoutLogs.forEach(log => {
    const d = new Date(log.date);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const key = d.toISOString().slice(0, 10);
      const met = getExerciseMET(log.exercise);
      let durationMin = getSetCount(log) * 2;
      const cals = (met * weightKg * 3.5 / 200) * durationMin;
      caloriesPerDay[key] = (caloriesPerDay[key] || 0) + Math.round(cals);
    }
  });

  return { caloriesPerDay, monthDays, maxCals: Math.max(...Object.values(caloriesPerDay), 1) };
}

function calculateYearlyCalories(workoutLogs: WorkoutLog[], profile: Profile) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const caloriesPerMonth: { [month: string]: number } = {};
  
  for (let i = 0; i < 12; i++) {
    caloriesPerMonth[months[i]] = 0;
  }

  const weightLbs = parseWeight(profile.weight || '170');
  const weightKg = weightLbs * 0.453592;
  const now = new Date();
  const currentYear = now.getFullYear();

  workoutLogs.forEach(log => {
    const d = new Date(log.date);
    if (d.getFullYear() === currentYear) {
      const met = getExerciseMET(log.exercise);
      let durationMin = getSetCount(log) * 2;
      const cals = (met * weightKg * 3.5 / 200) * durationMin;
      const monthName = months[d.getMonth()];
      caloriesPerMonth[monthName] = (caloriesPerMonth[monthName] || 0) + Math.round(cals);
    }
  });

  return months.map((month: string) => ({
    value: caloriesPerMonth[month] || 0,
    label: month,
    frontColor: '#ED2737',
    gradientColor: '#F5F2F2',
  }));
}

export default function CaloriesChart({ workoutLogs, profile, selectedPeriod, onPeriodChange }: CaloriesChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const totalHorizontalPadding = 64;
  
  // Chart dimensions
  const barWidth = 30;
  const initialSpacing = 10;
  const spacing = (screenWidth - totalHorizontalPadding * 2 - (barWidth * 7) - initialSpacing) / 7;
  const yearBarInitialSpacing = 5;
  const yearBarWidth = ((screenWidth - totalHorizontalPadding * 2 - yearBarInitialSpacing) * 4) / (5 * 12);
  const yearBarSpacing = (screenWidth - totalHorizontalPadding * 2 - (yearBarWidth * 12) - yearBarInitialSpacing) / 11;

  // Button styling
  const buttonCount = 3;
  const periodButtonHorizontalPadding = Math.max(10, (screenWidth - totalHorizontalPadding * 3 - 2 * 6) / (buttonCount * 2));

  function getPeriodButtonStyle(paddingHorizontal: number) {
    return {
      paddingVertical: 6,
      paddingHorizontal,
      borderRadius: 10,
      backgroundColor: '#ECECEC',
      marginHorizontal: 2,
    };
  }

  // Prepare data based on selected period
  const weeklyCalories = calculateWeeklyCalories(workoutLogs, profile);
  const weekOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const barData = weekOrder.map(day => ({
    value: weeklyCalories[day] || 0,
    label: day,
    frontColor: '#ED2737',
    gradientColor: '#F5F2F2',
  }));

  const { caloriesPerDay, monthDays, maxCals } = calculateMonthlyCalories(workoutLogs, profile);
  const yearBarData = calculateYearlyCalories(workoutLogs, profile);

  return (
    <View style={styles.chartSection}>
      {/* Period selector buttons */}
      <View style={styles.periodSelectorRow}>
        {['week', 'month', 'year'].map(period => (
          <TouchableOpacity
            key={period}
            style={[getPeriodButtonStyle(periodButtonHorizontalPadding), selectedPeriod === period && styles.periodButtonSelected]}
            onPress={() => onPeriodChange(period as 'week' | 'month' | 'year')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === period && styles.periodButtonTextSelected]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>
        {selectedPeriod === 'week' ? 'Calories Burned This Week' : selectedPeriod === 'month' ? 'Calories Burned This Month' : 'Calories Burned This Year'}
      </Text>

      {/* Week Chart */}
      {selectedPeriod === 'week' && (
        <BarChart
          data={barData}
          barWidth={30}
          initialSpacing={initialSpacing}
          spacing={spacing}
          barBorderRadius={8}
          // showGradient
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

      {/* Month Calendar */}
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
              // Circle radius: min 6, max 16
              const minR = 6, maxR = 16;
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

      {/* Year Chart */}
      {selectedPeriod === 'year' && (
        <BarChart
          data={yearBarData}
          barWidth={yearBarWidth}
          initialSpacing={yearBarInitialSpacing}
          spacing={yearBarSpacing}
          barBorderRadius={5}
          // showGradient
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
  );
}

const styles = StyleSheet.create({
  chartSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#181C20',
    marginBottom: 20,
    textAlign: 'center',
  },
  periodSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  periodButtonSelected: {
    backgroundColor: '#ED2737',
    shadowColor: '#ED2737',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  periodButtonTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarGrid: {
    marginTop: 8,
    marginBottom: 8,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#F0F0F0',
  },
  calendarHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#666',
    fontSize: 14,
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    marginVertical: 6,
    minHeight: 52,
  },
  calendarCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarDayText: {
    fontSize: 13,
    color: '#181C20',
    fontWeight: '600',
  },
  calendarCalsText: {
    fontSize: 10,
    color: '#ED2737',
    fontWeight: 'bold',
    marginTop: 2,
  },
});