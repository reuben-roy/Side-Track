import ProfileButton from '@/components/ProfileButton';
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { exercises } from '../../constants/Exercises';
import WorkoutScreen from './WorkoutScreen';

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

  const selectedExercise = exercises[exerciseIdx];
  const WEIGHTS = selectedExercise.weights.map(w => typeof w === 'number' ? `${w} lbs` : w);
  const REPS = selectedExercise.reps.map(r => `${r} reps`);

  React.useEffect(() => {
    setWeightIdx(0);
    setRepsIdx(0);
  }, [exerciseIdx]);

  const spin = () => {
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
    <View style={styles.container}>
      <ProfileButton />
      <Text style={styles.header}>Workout</Text>
      <Text style={styles.title}>Spin the wheel to pick your workout!</Text>
      <View style={styles.slotRow}>
        <View style={styles.slotCol}>
          <SlotPicker data={EXERCISES} selectedIndex={exerciseIdx} onSelect={setExerciseIdx} />
        </View>
        <View style={styles.slotCol}>
          <SlotPicker data={WEIGHTS} selectedIndex={weightIdx} onSelect={setWeightIdx} />
        </View>
        <View style={styles.slotCol}>
          <SlotPicker data={REPS} selectedIndex={repsIdx} onSelect={setRepsIdx} />
        </View>
      </View>
      <TouchableOpacity style={styles.pickButton} onPress={() => setShowWorkout(true)}>
        <Text style={styles.pickButtonText}>Pick Exercise</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.spinButton} onPress={spin}>
        <Text style={styles.spinButtonText}>Pick For Me</Text>
      </TouchableOpacity>
    </View>
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
            width: '100%',
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#E6B3B3',
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFF',
    paddingTop: 32,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 25,
    marginBottom: 24,
    color: '#181C20',
    left: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#181C20',
    marginBottom: 32,
    marginTop:32,
    left: 20,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    width: width - 32,
    alignSelf: 'center',
  },
  slotCol: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#F5F2F2',
    borderRadius: 32,
    overflow: 'hidden',
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
  spinButton: {
    backgroundColor: '#E6B3B3',
    borderRadius: 40,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  spinButtonText: {
    color: '#181C20',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pickButton: {
    backgroundColor: '#F5F2F2',
    borderRadius: 40,
    paddingVertical: 16,
    marginHorizontal: 20,
  },
  pickButtonText: {
    color: '#181C20',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});