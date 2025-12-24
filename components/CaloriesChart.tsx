import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
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
function calculateWeeklyCalories(workoutLogs: WorkoutLog[], profile: Profile, weekOffset: number = 0) {
  const now = new Date();
  // Calculate the start of the target week (0 = current week, 1 = last week, 2 = two weeks ago, etc.)
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() - (weekOffset * 7));
  const startOfWeek = getStartOfWeek(targetDate);
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
    // Only include logs from the target week
    if (logDate >= startOfWeek && logDate <= weekDays[6]) {
      const met = getExerciseMET(log.exercise);
      let durationMin = getSetCount(log) * 2;
      const cals = (met * weightKg * 3.5 / 200) * durationMin;
      const key = logDate.toLocaleDateString('en-US', { weekday: 'short' });
      weekCalories[key] = (weekCalories[key] || 0) + Math.round(cals);
    }
  });

  return { weekCalories, startOfWeek, weekDays };
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
    frontColor: '#000000',
    gradientColor: '#F2F2F7',
  }));
}

export default function CaloriesChart({ workoutLogs, profile, selectedPeriod, onPeriodChange }: CaloriesChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const totalHorizontalPadding = 64;
  const [weekOffset, setWeekOffset] = useState(0);
  const swipeStartX = useRef(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Chart dimensions for line charts
  const availableWidth = screenWidth - totalHorizontalPadding * 2;
  const weekDataPoints = 7;
  const weekInitialSpacing = 20;
  const weekSpacing = (availableWidth - weekInitialSpacing * 2) / (weekDataPoints - 1);
  
  const yearDataPoints = 12;
  const yearInitialSpacing = 10;
  const yearSpacing = (availableWidth - yearInitialSpacing * 2) / (yearDataPoints - 1);

  // Button styling
  const buttonCount = 3;
  const periodButtonHorizontalPadding = Math.max(10, (screenWidth - totalHorizontalPadding * 3 - 2 * 6) / (buttonCount * 2));

  function getPeriodButtonStyle(paddingHorizontal: number) {
    return {
      paddingVertical: 8,
      paddingHorizontal,
      borderRadius: 12,
      backgroundColor: '#F2F2F7',
      marginHorizontal: 2,
    };
  }

  // Animation function for smooth transitions
  // weekOffset: 0 = current week, 1 = last week, 2 = two weeks ago, etc.
  const animateWeekChange = (newOffset: number) => {
    const isGoingToPast = newOffset > weekOffset; // higher offset = further in past
    const slideDistance = 40;
    // Fade out and slide in direction of navigation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: isGoingToPast ? slideDistance : -slideDistance,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Update the offset
      setWeekOffset(newOffset);
      // Reset slide position from opposite direction
      slideAnim.setValue(isGoingToPast ? -slideDistance : slideDistance);
      // Fade in and slide back with spring for smoother feel
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
      ]).start();
    });
  };

  // PanResponder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => selectedPeriod === 'week',
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return selectedPeriod === 'week' && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: (evt) => {
        swipeStartX.current = evt.nativeEvent.pageX;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const swipeThreshold = 50;
        const dx = gestureState.dx;

        if (Math.abs(dx) > swipeThreshold) {
          if (dx > 0) {
            // Swipe right - go to older week (increase offset)
            animateWeekChange(weekOffset + 1);
          } else {
            // Swipe left - go to more recent week (decrease offset, min 0 = current week)
            if (weekOffset > 0) {
              animateWeekChange(weekOffset - 1);
            }
          }
        }
      },
    })
  ).current;

  // Helper function to format week date range
  const formatWeekRange = (offset: number) => {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - (offset * 7));
    const startOfWeek = getStartOfWeek(targetDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (offset === 0) {
      return 'This Week';
    } else if (offset === 1) {
      return 'Last Week';
    } else {
      return `${startStr} - ${endStr}`;
    }
  };

  // Prepare data based on selected period
  const { weekCalories, startOfWeek, weekDays } = calculateWeeklyCalories(workoutLogs, profile, weekOffset);
  const weekOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const barData = weekOrder.map(day => ({
    value: weekCalories[day] || 0,
    label: day,
    frontColor: '#000000',
    gradientColor: '#F2F2F7',
  }));

  const { caloriesPerDay, monthDays, maxCals } = calculateMonthlyCalories(workoutLogs, profile);
  const yearBarData = calculateYearlyCalories(workoutLogs, profile);

  // Reset week offset when period changes
  useEffect(() => {
    if (selectedPeriod !== 'week') {
      setWeekOffset(0);
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
    }
  }, [selectedPeriod]);

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

      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.sectionTitle}>
          {selectedPeriod === 'week' 
            ? `Calories Burned ${formatWeekRange(weekOffset)}` 
            : selectedPeriod === 'month' 
            ? 'Calories Burned This Month' 
            : 'Calories Burned This Year'}
        </Text>
      </Animated.View>

      {/* Week Chart */}
      {selectedPeriod === 'week' && (
        <View {...panResponder.panHandlers} style={styles.swipeableContainer}>
          {/* Swipe navigation indicator */}
          <View style={styles.swipeIndicatorContainer}>
            <TouchableOpacity 
              onPress={() => animateWeekChange(weekOffset + 1)} 
              style={styles.swipeArrowButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.swipeArrow}>‹</Text>
            </TouchableOpacity>
            <View style={styles.paginationDots}>
              {[0, 1, 2].map((offset) => (
                <View
                  key={offset}
                  style={[
                    styles.paginationDot,
                    weekOffset === offset && styles.paginationDotActive,
                  ]}
                />
              ))}
              {weekOffset > 2 && <View style={[styles.paginationDot, styles.paginationDotActive]} />}
            </View>
            <TouchableOpacity 
              onPress={() => weekOffset > 0 && animateWeekChange(weekOffset - 1)} 
              style={[styles.swipeArrowButton, weekOffset === 0 && styles.swipeArrowDisabled]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={weekOffset === 0}
            >
              <Text style={[styles.swipeArrow, weekOffset === 0 && styles.swipeArrowTextDisabled]}>›</Text>
            </TouchableOpacity>
          </View>
          
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            <LineChart
              data={barData}
              initialSpacing={weekInitialSpacing}
              spacing={weekSpacing}
              thickness={3}
              color="#000000"
              yAxisThickness={0}
              xAxisType={'dashed'}
              xAxisColor={'#E5E5EA'}
              yAxisTextStyle={{ color: '#8E8E93' }}
              maxValue={Math.max(...barData.map(b => b.value), 100)}
              noOfSections={4}
              xAxisLabelTextStyle={{ color: '#8E8E93', textAlign: 'center', fontWeight: 'bold' }}
              height={180}
              disableScroll
              curved
              areaChart
              startFillColor="#000000"
              endFillColor="#F2F2F7"
              startOpacity={0.3}
              endOpacity={0.1}
              width={availableWidth}
            />
          </Animated.View>
        </View>
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
                  <View style={[styles.calendarCircle, { width: r * 2, height: r * 2, borderRadius: r, backgroundColor: cals > 0 ? '#000000' : '#E5E5EA' }]}/>
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
        <LineChart
          data={yearBarData}
          initialSpacing={yearInitialSpacing}
          spacing={yearSpacing}
          thickness={3}
          color="#000000"
          yAxisThickness={0}
          xAxisType={'dashed'}
          xAxisColor={'#E5E5EA'}
          yAxisTextStyle={{ color: '#8E8E93' }}
          maxValue={Math.max(...yearBarData.map((b: any) => b.value), 100)}
          noOfSections={4}
          xAxisLabelTextStyle={{ color: '#8E8E93', textAlign: 'center', fontWeight: 'bold', fontSize: 10 }}
          height={180}
          disableScroll
          curved
          areaChart
          startFillColor="#000000"
          endFillColor="#F2F2F7"
          startOpacity={0.3}
          endOpacity={0.1}
          width={availableWidth}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chartSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 0,
    paddingVertical: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  periodSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  periodButtonSelected: {
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButtonText: {
    color: '#8E8E93',
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  calendarHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    color: '#8E8E93',
    fontSize: 13,
    textTransform: 'uppercase',
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
    marginBottom: 6,
  },
  calendarDayText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  calendarCalsText: {
    fontSize: 10,
    color: '#000000',
    fontWeight: '700',
    marginTop: 2,
  },
  swipeableContainer: {
    width: '100%',
  },
  swipeIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  swipeArrowButton: {
    padding: 4,
  },
  swipeArrow: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
  },
  swipeArrowDisabled: {
    opacity: 0.3,
  },
  swipeArrowTextDisabled: {
    color: '#C7C7CC',
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
  },
  paginationDotActive: {
    backgroundColor: '#000000',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});