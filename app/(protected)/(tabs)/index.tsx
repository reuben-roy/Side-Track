import ProfileButton from '@/components/ProfileButton';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { exercises } from '../../../constants/Exercises';
import WorkoutScreen from '../workout/WorkoutScreen';

const ITEM_HEIGHT = 48;
const ITEM_MARGIN = 12; // Space between items
const ITEM_TOTAL_HEIGHT = ITEM_HEIGHT + ITEM_MARGIN;
const VISIBLE_ITEMS = 5; // Show 5 items like native pickers
const { width } = Dimensions.get('window');

const EXERCISES = exercises.map(e => e.name);

export default function HomeScreen() {
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [weightIdx, setWeightIdx] = useState(0);
  const [repsIdx, setRepsIdx] = useState(0);
  const [showWorkout, setShowWorkout] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const selectedExercise = exercises[exerciseIdx];
  const WEIGHTS = selectedExercise.weights.map(w => typeof w === 'number' ? `${w} lbs` : w);
  const REPS = selectedExercise.reps.map(r => `${r} reps`);

  React.useEffect(() => {
    setWeightIdx(0);
    setRepsIdx(0);
  }, [exerciseIdx]);

  const spin = () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const newExerciseIdx = Math.floor(Math.random() * EXERCISES.length);
    setExerciseIdx(newExerciseIdx);
    setWeightIdx(Math.floor(Math.random() * exercises[newExerciseIdx].weights.length));
    setRepsIdx(Math.floor(Math.random() * exercises[newExerciseIdx].reps.length));
    setShowWorkout(true);
  };

  if (showWorkout) {
    return (
      <WorkoutScreen
        exercise={EXERCISES[exerciseIdx]}
        weight={WEIGHTS[weightIdx]}
        reps={REPS[repsIdx]}
        onClose={() => setShowWorkout(false)}
      />
    );
  }

  return (
    <LinearGradient
      colors={['#FAFAFF', '#F0E6F6', '#E8D4F2']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ProfileButton top={57} right={20} />
      
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>SideTrack</Text>
        <Text style={styles.subHeader}>Work Out till you Pass Out</Text>
      </View>

      {/* Title Section */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Spin the wheel to pick your workout!</Text>
      </View>

      {/* Slot Pickers Card */}
      <View style={styles.slotCard}>
        <View style={styles.slotRow}>
          <View style={styles.slotCol}>
            <Text style={styles.slotLabel}>Exercise</Text>
            <SlotPicker data={EXERCISES} selectedIndex={exerciseIdx} onSelect={setExerciseIdx} />
          </View>
          <View style={styles.slotCol}>
            <Text style={styles.slotLabel}>Weight</Text>
            <SlotPicker data={WEIGHTS} selectedIndex={weightIdx} onSelect={setWeightIdx} />
          </View>
          <View style={styles.slotCol}>
            <Text style={styles.slotLabel}>Reps</Text>
            <SlotPicker data={REPS} selectedIndex={repsIdx} onSelect={setRepsIdx} />
          </View>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.pickButton} 
          onPress={() => setShowWorkout(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.pickButtonText}>Select Exercise</Text>
        </TouchableOpacity>
        
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity 
            style={styles.spinButton} 
            onPress={spin}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#E6B3B3', '#D89898']}
              style={styles.spinButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.spinButtonText}>Select For Me</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

function SlotPicker({
  data,
  selectedIndex,
  onSelect,
  style,
}: {
  data: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  style?: ViewStyle;
}) {
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(selectedIndex * ITEM_TOTAL_HEIGHT)).current;
  const lastIndexRef = useRef(selectedIndex);

  React.useEffect(() => {
    flatListRef.current?.scrollToIndex({ index: selectedIndex, animated: true });
    lastIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  // Helper to get the current index from scroll offset
  const getCurrentIndex = (offset: number) => {
    return Math.round(offset / ITEM_TOTAL_HEIGHT);
  };

  // Update parent every time the highlighted item changes
  const handleScroll = (e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const idx = getCurrentIndex(offsetY);
    if (idx !== lastIndexRef.current && idx >= 0 && idx < data.length) {
      lastIndexRef.current = idx;
      onSelect(idx);
    }
  };

  return (
    <View style={[{ height: ITEM_TOTAL_HEIGHT * VISIBLE_ITEMS, position: 'relative' }, style]}>
      <Animated.FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={item => item}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingVertical: ITEM_TOTAL_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
        snapToInterval={ITEM_TOTAL_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        getItemLayout={(_, index) => ({
          length: ITEM_TOTAL_HEIGHT,
          offset: ITEM_TOTAL_HEIGHT * index,
          index,
        })}
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: handleScroll }
        )}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          // Animate scale/opacity based on distance from center
          const inputRange = [
            (index - 2) * ITEM_TOTAL_HEIGHT,
            (index - 1) * ITEM_TOTAL_HEIGHT,
            index * ITEM_TOTAL_HEIGHT,
            (index + 1) * ITEM_TOTAL_HEIGHT,
            (index + 2) * ITEM_TOTAL_HEIGHT,
          ];
          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.8, 0.9, 1, 0.9, 0.8],
            extrapolate: 'clamp',
          });
          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.3, 0.6, 1, 0.6, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View style={[styles.slotItem, { marginBottom: ITEM_MARGIN, transform: [{ scale }], opacity }]}>
              <Text style={styles.slotText}>{item}</Text>
            </Animated.View>
          );
        }}
      />
      {/* Center highlight overlay */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <View
          style={{
            height: ITEM_HEIGHT,
            width: '90%',
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#E6B3B3',
            backgroundColor: 'rgba(230, 179, 179, 0.15)',
            shadowColor: '#E6B3B3',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 4,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
  },
  headerContainer: {
    marginTop: 25,
    marginBottom: 16,
    paddingHorizontal: 20,
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
  titleContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#181C20',
    textAlign: 'center',
  },
  slotCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  slotCol: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#F8F5F5',
    borderRadius: 20,
    overflow: 'hidden',
    paddingTop: 8,
  },
  slotLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  slotItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#181C20',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  spinButton: {
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#E6B3B3',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  spinButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinButtonText: {
    color: '#181C20',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pickButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 40,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: '#E6B3B3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  pickButtonText: {
    color: '#181C20',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});