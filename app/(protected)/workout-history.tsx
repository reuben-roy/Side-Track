import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { exercises } from '../../constants/Exercises';

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

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [profile, setProfile] = useState<{ weight: string; height: string; calorieGoal: string }>({ weight: '', height: '', calorieGoal: '' });
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
    } catch (error) {
      console.error('Error deleting workout:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete workout. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete workout. Please try again.');
      }
    }
  };

  // Function to fetch workout logs
  const fetchWorkoutLogs = async () => {
    // Get user profile
    const profileStr = await AsyncStorage.getItem('profile');
    if (profileStr) {
      const profileObj = JSON.parse(profileStr);
      setProfile(profileObj);
    }

    // Get workout logs
    const logsStr = await AsyncStorage.getItem('workoutLogs');
    let logs: WorkoutLog[] = [];
    if (logsStr) {
      logs = JSON.parse(logsStr);
      // Sort logs by date (newest first)
      logs.sort((a: WorkoutLog, b: WorkoutLog) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    setWorkoutLogs(logs);
  };

  // Helper function to group workouts by day
  const groupWorkoutsByDay = (logs: WorkoutLog[]) => {
    const grouped: { [date: string]: { logs: WorkoutLog[], totalCalories: number } } = {};
    
    logs.forEach(log => {
      const dateKey = new Date(log.date).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = { logs: [], totalCalories: 0 };
      }
      grouped[dateKey].logs.push(log);
      
      // Calculate calories for this log
      const exercise = exercises.find(e => e.name === log.exercise);
      const met = exercise ? exercise.met : 5;
      const profileStr = profile.weight || '170';
      const weightMatch = profileStr.match(/(\d+\.?\d*)/);
      const weightLbs = weightMatch ? parseFloat(weightMatch[1]) : 170;
      const weightKg = weightLbs * 0.453592;
      const durationMin = 1 * 2; // 1 set * 2 minutes
      const cals = (met * weightKg * 3.5 / 200) * durationMin;
      grouped[dateKey].totalCalories += Math.round(cals);
    });
    
    return grouped;
  };

  const groupedWorkouts = groupWorkoutsByDay(workoutLogs);
  const sortedDates = Object.keys(groupedWorkouts).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Add focus effect to refresh data when screen becomes active
  useFocusEffect(
    useCallback(() => {
      fetchWorkoutLogs();
    }, [])
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Workout History</Text>
          <Text style={styles.subHeader}>View and manage your workout logs</Text>
        </View>

        {/* Workout History */}
        <View style={styles.historySection}>
          {workoutLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.noWorkouts}>No workouts logged yet</Text>
              <Text style={styles.emptyStateSubtext}>Start your fitness journey today!</Text>
            </View>
          ) : (
            sortedDates.map((dateKey) => {
              const dayData = groupedWorkouts[dateKey];
              const formattedDate = new Date(dateKey).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              
              return (
                <View key={dateKey} style={styles.dayGroup}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayHeaderText}>{formattedDate}</Text>
                    <View style={styles.caloriesBadge}>
                      <Text style={styles.dayCaloriesText}>{dayData.totalCalories} kcal</Text>
                    </View>
                  </View>
                  <View style={styles.scrollableExercisesContainer}>
                    <ScrollView 
                      style={styles.scrollableExercises} 
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                      bounces={true}
                    >
                      {dayData.logs.map((log, exerciseIndex) => {
                        const globalIndex = workoutLogs.findIndex(wl => wl === log);
                        return (
                          <View key={`${dateKey}-${exerciseIndex}`} style={styles.exerciseCard}>
                            <View style={styles.exerciseHeader}>
                              <Text style={styles.exerciseName}>{log.exercise}</Text>
                              <View style={styles.headerRight}>
                                <Text style={styles.workoutDate}>{formatDate(log.date)}</Text>
                                <TouchableOpacity style={styles.optionsButton} onPress={() => toggleOptions(globalIndex)}>
                                  <Text style={styles.optionsIcon}>⋮</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                            <Text style={styles.setText}>
                              {log.weight ? `${log.weight} lbs` : '-'} × {log.reps ? `${log.reps} reps` : '-'}
                            </Text>
                            {expandedOptions === globalIndex && (
                              <View style={styles.optionsContainer}>
                                <TouchableOpacity 
                                  style={styles.deleteButtonContainer}
                                  onPress={() => deleteWorkout(globalIndex)}
                                >
                                  <Text style={styles.deleteButton}>Delete</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              );
            })
          )}
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
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  header: {
    fontSize: 34,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subHeader: {
    fontSize: 17,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: 0.3,
  },
  historySection: {
    flex: 1,
    marginBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    marginTop: 20,
  },
  noWorkouts: {
    fontSize: 18,
    color: '#000000',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  dayGroup: {
    marginBottom: 24,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dayHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  caloriesBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dayCaloriesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  scrollableExercisesContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 24,
    overflow: 'hidden',
    padding: 4,
  },
  scrollableExercises: {
    maxHeight: 300,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 4,
    marginHorizontal: 4,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  workoutDate: {
    fontSize: 13,
    color: '#8E8E93',
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
    fontSize: 20,
    color: '#000000',
    fontWeight: 'bold',
  },
  optionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  setText: {
    fontSize: 15,
    color: '#000000',
    marginBottom: 4,
    fontWeight: '500',
  },
  deleteButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  deleteButton: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
});
