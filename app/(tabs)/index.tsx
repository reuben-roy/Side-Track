import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WorkoutScreen from './WorkoutScreen';

const EXERCISES = ['Squats', 'Push-ups', 'Lunges'];
const WEIGHTS = ['10kg', '20kg', '30kg'];
const REPS = ['10 reps', '15 reps', '20 reps'];
const ITEM_HEIGHT = 48;
const { width } = Dimensions.get('window');

function SlotPicker({ data, selectedIndex, onSelect }: { data: string[]; selectedIndex: number; onSelect: (i: number) => void }) {
  const flatListRef = useRef<FlatList>(null);

  React.useEffect(() => {
    flatListRef.current?.scrollToIndex({ index: selectedIndex, animated: true });
  }, [selectedIndex]);

  const handleMomentumScrollEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    onSelect(idx);
  };

  return (
    <FlatList
      ref={flatListRef}
      data={data}
      keyExtractor={item => item}
      showsVerticalScrollIndicator={false}
      style={{ height: ITEM_HEIGHT * 3 }}
      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      bounces={false}
      renderItem={({ item, index }) => (
        <View style={[styles.slotItem, selectedIndex === index && styles.slotItemSelected]}>
          <Text style={[styles.slotText, selectedIndex === index && styles.slotTextSelected]}>{item}</Text>
        </View>
      )}
      getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      scrollEventThrottle={16}
    />
  );
}

export default function HomeScreen() {
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [weightIdx, setWeightIdx] = useState(1);
  const [repsIdx, setRepsIdx] = useState(1);
  const [showWorkout, setShowWorkout] = useState(false);

  const spin = () => {
    setExerciseIdx(Math.floor(Math.random() * EXERCISES.length));
    setWeightIdx(Math.floor(Math.random() * WEIGHTS.length));
    setRepsIdx(Math.floor(Math.random() * REPS.length));
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
      <Text style={styles.header}>Workout Generator</Text>
      <Text style={styles.title}>Spin the wheel to pick{`\n`}your workout!</Text>
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
      <TouchableOpacity style={styles.spinButton} onPress={spin}>
        <Text style={styles.spinButtonText}>Spin</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.pickButton} onPress={() => setShowWorkout(true)}>
        <Text style={styles.pickButtonText}>Pick Exercise</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFF',
    paddingTop: 32,
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 24,
    color: '#181C20',
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#181C20',
    textAlign: 'center',
    marginBottom: 32,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
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
    opacity: 0.4,
  },
  slotItemSelected: {
    backgroundColor: '#F5F2F2',
    opacity: 1,
  },
  slotText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#C2BABA',
  },
  slotTextSelected: {
    color: '#181C20',
    fontWeight: 'bold',
    fontSize: 22,
  },
  spinButton: {
    backgroundColor: '#E6B3B3',
    borderRadius: 40,
    paddingVertical: 18,
    paddingHorizontal: 80,
    marginTop: 8,
    marginBottom: 12,
  },
  spinButtonText: {
    color: '#181C20',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pickButton: {
    backgroundColor: '#F5F2F2',
    borderRadius: 40,
    paddingVertical: 18,
    paddingHorizontal: 60,
    marginBottom: 24,
  },
  pickButtonText: {
    color: '#181C20',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
