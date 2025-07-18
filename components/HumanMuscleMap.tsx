import React, { useCallback, useMemo, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Image, Path } from 'react-native-svg';

// --- Configuration (Grouped for clarity) ---
const CONFIG = {
  UNSELECTED_COLOR: '#E0E0E0', // Light gray for unselected muscles
  SELECTED_COLOR: '#3498db',   // A clear, vibrant blue for selected muscles
  STROKE_COLOR: '#2c3e50',     // Dark stroke for definition
  STROKE_WIDTH: 1.5, // Changed to number for StyleSheet
};

// --- Anatomical Data (Refactored with more realistic SVG paths) ---
// The paths are now more complex, using curves to better represent muscle shapes.
// Note: For multi-part muscles like 'abs', the 'path' property is now an array of strings.
const MUSCLE_DATA = {
  front: {
    outline: 'M100 5 C 50 5, 45 40, 50 80 S 40 150, 60 220 S 70 350, 100 395 S 130 350, 140 220 S 160 150, 150 80 S 150 5, 100 5 Z',
    muscles: {
      chest: { 
        name: 'Chest', 
        path: [
          // Left pectoralis major (15px left, 30px up)
          'M50 60 C 40 65, 35 75, 33 85 C 31 95, 33 105, 37 110 C 41 115, 47 117, 53 115 C 59 113, 63 108, 65 105 C 67 102, 67 98, 65 95 C 63 92, 59 90, 55 88 C 51 86, 47 85, 50 60 Z',
          // Right pectoralis major (15px right, 30px up)
          'M100 60 C 110 65, 115 75, 117 85 C 119 95, 117 105, 113 110 C 109 115, 103 117, 97 115 C 91 113, 87 108, 85 105 C 83 102, 83 98, 85 95 C 87 92, 91 90, 95 88 C 99 86, 103 85, 100 60 Z',
          // Sternum area (center line, unchanged)
          'M73 60 L 77 60 L 77 110 L 73 110 Z'
        ]
      },
      abs: {
        name: 'Abs',
        path: [
          // Top-left (unchanged)
          'M53 120 C 51 120, 51 138, 53 138 H 65 C 67 138, 67 120, 65 120 Z',
          // Top-right (5px left)
          'M84 120 C 82 120, 82 138, 84 138 H 96 C 98 138, 98 120, 96 120 Z',
          // Mid-left (unchanged)
          'M53 140 C 51 140, 51 158, 53 158 H 65 C 67 158, 67 140, 65 140 Z',
          // Mid-right (5px left)
          'M84 140 C 82 140, 82 158, 84 158 H 96 C 98 158, 98 140, 96 140 Z',
          // Low-left (unchanged)
          'M53 160 C 51 160, 51 178, 53 178 H 65 C 67 178, 67 160, 65 160 Z',
          // Low-right (5px left)
          'M84 160 C 82 160, 82 178, 84 178 H 96 C 98 178, 98 160, 96 160 Z',
        ]
      },
      shoulders: { name: 'Shoulders', path: 'M15 65 C 0 75, 0 95, 17 100 L 40 75 C 35 65, 25 60, 15 65 Z M135 65 C 150 75, 150 95, 133 100 L 110 75 C 115 65, 125 60, 135 65 Z' },
      biceps: {
        name: 'Biceps',
        path: [
          // Left biceps (moved 20px left and 15px up)
          'M10 95 Q20 90 30 95 Q35 105 35 120 Q35 135 30 145 Q25 150 20 150 Q15 150 10 145 Q5 135 5 120 Q5 105 10 95 Z',
          // Right biceps (moved 20px right and 15px up)
          'M120 95 Q130 90 140 95 Q145 105 145 120 Q145 135 140 145 Q135 150 130 150 Q125 150 120 145 Q115 135 115 120 Q115 105 120 95 Z'
        ]
      },
      quadriceps: { 
        name: 'Quadriceps', 
        path: [
          // Left quadriceps (up 10px, 5px left)
          'M45 210 Q60 208 67 215 Q70 225 70 240 Q70 255 67 265 Q63 270 60 270 Q53 270 45 265 Q40 255 40 240 Q40 225 45 210 Z',
          // Right quadriceps (up 10px, 5px right)
          'M83 210 Q98 208 105 215 Q108 225 108 240 Q108 255 105 265 Q101 270 98 270 Q91 270 83 265 Q78 255 78 240 Q78 225 83 210 Z',
          // Muscle definition lines for left quad
          'M48 215 L 48 260',
          'M62 215 L 62 260',
          // Muscle definition lines for right quad
          'M86 215 L 86 260',
          'M100 215 L 100 260'
        ]
      },
    },
  },
  back: {
    outline: 'M100 5 C 50 5, 45 40, 50 80 S 40 150, 60 220 S 70 350, 100 395 S 130 350, 140 220 S 160 150, 150 80 S 150 5, 100 5 Z',
    muscles: {
      traps: { name: 'Traps', path: 'M80 50 C 60 50, 60 80, 65 95 L 80 120 L 95 95 C 100 80, 100 50, 80 50 Z' },
      lats: {
        name: 'Lats', path: [
        // Left lat (25% smaller, centered)
        'M34 100 Q48 88 62 91 Q76 94 79 112 Q81 129 74 143 Q62 155 47 152 Q32 147 29 132 Q26 117 29 111 Q29 108 33 105 Z',
        // Right lat (25% smaller, centered)
        'M79 112 Q81 94 95 91 Q109 88 123 100 Q127 103 127 108 Q130 117 127 132 Q124 147 109 152 Q94 155 82 143 Q75 129 77 112 Q75 94 79 112 Z',
        // Muscle fiber definition (left, smaller)
        'M33 111 Q47 99 61 115 Q73 126 73 141 Q70 152 61 155',
        // Muscle fiber definition (right, smaller)
        'M109 155 Q100 152 97 141 Q100 126 112 115 Q126 99 117 111',
        // Inner edge detail (left, smaller)
        'M62 94 Q72 102 79 112 Q81 123 73 141',
        // Inner edge detail (right, smaller)
        'M82 141 Q86 123 89 112 Q96 102 106 94'
        ]
      },
      triceps: { name: 'Triceps', path: 'M7 95 C 5 130, 15 135, 20 130 L 30 90 C 25 95, 15 95, 7 95 Z M143 95 C 145 130, 135 135, 130 130 L 120 90 C 125 95, 135 95, 143 95 Z' },
      glutes: { name: 'Glutes', path: 'M40 170 C 50 165, 60 175, 70 205 L 40 205 Z M110 170 C 100 165, 90 175, 80 205 L 110 205 Z' },
      hamstrings: { 
        name: 'Hamstrings', 
        path: [
          // Left hamstring (up 10px, 5px left from previous)
          'M45 195 Q60 192 67 198 Q70 210 70 230 Q70 250 67 265 Q64 270 60 270 Q53 270 45 265 Q40 250 40 230 Q40 210 45 195 Z',
          // Right hamstring (up 10px, 5px left from previous)
          'M83 195 Q98 192 105 198 Q108 210 108 230 Q108 250 105 265 Q102 270 98 270 Q91 270 83 265 Q78 250 78 230 Q78 210 83 195 Z',
          // Muscle separation lines for left hamstring (up 10px, 5px left)
          'M48 200 L 48 260',
          'M62 200 L 62 260',
          // Muscle separation lines for right hamstring (up 10px, 5px left)
          'M86 200 L 86 260',
          'M100 200 L 100 260'
        ]
      },
    },
  },
  side: {
     outline: 'M100 5 C 120 5, 130 40, 120 80 S 90 150, 100 220 S 90 350, 100 395 L 95 395 C 85 350, 95 220, 80 150 S 110 40, 100 5 Z',
    muscles: {
      shoulders_side: { name: 'Shoulders', path: 'M120 80 C 140 90, 135 115, 118 115 C 125 105, 125 90, 120 80 Z' },
      chest_side: { name: 'Chest', path: 'M118 115 C 125 125, 125 135, 120 140 L 110 140 C 112 130, 115 120, 118 115 Z' },
      abs_side: { name: 'Obliques', path: 'M110 140 L 120 140 C 120 160, 115 190, 110 190 Z' },
      glutes_side: { name: 'Glutes', path: 'M80 185 C 105 185, 110 200, 105 225 L 85 225 C 85 200, 80 190, 80 185 Z' },
      quadriceps_side: { name: 'IT Band', path: 'M105 225 C 110 250, 110 290, 105 290 L 95 290 C 95 250, 100 230, 105 225 Z' },
    },
  },
  common: {
    muscles: {
      calves: { 
        name: 'Calves', 
        path: [
          // Left calf (up 10px, net 5px left)
          'M50 285 Q60 280 70 285 Q75 295 75 315 Q75 335 70 355 Q65 365 60 365 Q55 365 50 355 Q45 335 45 315 Q45 295 50 285 Z',
          // Right calf (up 10px, net 5px left)
          'M80 285 Q90 280 100 285 Q105 295 105 315 Q105 335 100 355 Q95 365 90 365 Q85 365 80 355 Q75 335 75 315 Q75 295 80 285 Z',
          // Muscle definition for left calf (up 10px, net 5px left)
          'M55 290 Q60 285 65 290 Q70 300 70 320 Q70 340 65 350 Q60 355 55 350 Q50 340 50 320 Q50 300 55 290 Z',
          // Muscle definition for right calf (up 10px, net 5px left)
          'M85 290 Q90 285 95 290 Q100 300 100 320 Q100 340 95 350 Q90 355 85 350 Q80 340 80 320 Q80 300 85 290 Z'
        ]
      },
    },
  },
};

interface MuscleProps {
  path: string;
  name: string;
  muscleId: string;
  isSelected: boolean;
  onPress: (muscleId: string) => void;
}

// --- Reusable Muscle Component (Memoized & Improved UX) ---
const Muscle = React.memo(({ path, name, muscleId, isSelected, onPress }: MuscleProps) => (
  <Path
    d={path}
    fill={isSelected ? CONFIG.SELECTED_COLOR : CONFIG.UNSELECTED_COLOR}
    stroke={CONFIG.STROKE_COLOR}
    strokeWidth={CONFIG.STROKE_WIDTH}
    onPress={() => onPress(muscleId)}
  />
));

interface BodyViewProps {
  view: 'front' | 'back' | 'side';
  selectedMuscles: Set<string>;
  onMusclePress: (muscleId: string) => void;
}

// --- Reusable Body View Component (Memoized & Handles Multi-Path Muscles) ---
const BodyView = React.memo(({ view, selectedMuscles, onMusclePress }: BodyViewProps) => {
  const viewData = MUSCLE_DATA[view];
  const commonMuscles = MUSCLE_DATA.common.muscles;
  const allMuscles = { ...viewData.muscles, ...commonMuscles };

  // Select the correct SVG image for the background
  const svgImage = view === 'back'
    ? require('../assets/images/back.svg')
    : require('../assets/images/front.svg');

  return (
    <View style={styles.bodyViewContainer}>
      <Text style={styles.bodyViewTitle}>{`${view.charAt(0).toUpperCase()}${view.slice(1)} View`}</Text>
      <Svg height="300" width="150" viewBox="0 0 148 380" style={styles.svgContainer}>
        <Image
          href={svgImage}
          width="148"
          height="380"
          x="0"
          y="0"
        />
        {Object.entries(allMuscles).map(([id, { name, path }]) => {
          // If the path is an array, map over it to render each part.
          // This allows muscles like the abs to be one clickable group made of multiple shapes.
          if (Array.isArray(path)) {
            return path.map((subPath, index) => (
              <Muscle
                key={`${view}-${id}-${index}`}
                path={subPath}
                name={name}
                muscleId={id}
                isSelected={selectedMuscles.has(id)}
                onPress={onMusclePress}
              />
            ));
          }
          // Otherwise, render a single path.
          return (
            <Muscle
              key={`${view}-${id}`}
              path={path}
              name={name}
              muscleId={id}
              isSelected={selectedMuscles.has(id)}
              onPress={onMusclePress}
            />
          );
        })}
      </Svg>
    </View>
  );
});

// --- Main App Component ---
export default function HumanMuscleMap() {
  const [selectedMuscles, setSelectedMuscles] = useState<Set<string>>(new Set());

  const toggleMuscleSelection = useCallback((muscleId: string) => {
    setSelectedMuscles(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(muscleId)) {
        newSelected.delete(muscleId);
      } else {
        newSelected.add(muscleId);
      }
      return newSelected;
    });
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedMuscles(new Set());
  }, []);
  
  const muscleNameMap = useMemo(() => {
    const map = new Map<string, string>();
    Object.values(MUSCLE_DATA).forEach(view => {
      if (view.muscles) {
        Object.entries(view.muscles).forEach(([id, { name }]) => {
          if (!map.has(id)) {
            map.set(id, name);
          }
        });
      }
    });
    return map;
  }, []);

  const hasSelection = selectedMuscles.size > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.bodyViewsWrapper}>
          <BodyView view="front" selectedMuscles={selectedMuscles} onMusclePress={toggleMuscleSelection} />
          <BodyView view="back" selectedMuscles={selectedMuscles} onMusclePress={toggleMuscleSelection} />
          {/* <BodyView view="side" selectedMuscles={selectedMuscles} onMusclePress={toggleMuscleSelection} /> */}
        </View>

        <View style={styles.selectedMusclesContainer}>
          <View style={styles.selectedMusclesHeader}>
            <Text style={styles.selectedMusclesTitle}>Selected Muscles</Text>
            <TouchableOpacity
              onPress={resetSelection}
              disabled={!hasSelection}
              style={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.selectedMusclesList}>
            {!hasSelection ? (
              <Text style={styles.noSelectionText}>Click on a muscle in the diagrams above to select it.</Text>
            ) : (
              Array.from(selectedMuscles).map(muscleId => (
                <View key={muscleId} style={styles.selectedMuscleTag}>
                  <Text style={styles.selectedMuscleText}>
                    {muscleNameMap.get(muscleId) || muscleId}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16, // p-4 sm:p-6
    flexGrow: 1, // min-h-screen
  },
  header: {
    fontSize: 28, // text-3xl
    fontWeight: 'bold',
    color: '#1F2937', // text-gray-800
    marginBottom: 24, // mb-6
    textAlign: 'center',
  },
  bodyViewsWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap', // flex-wrap
    gap: 16, // gap-4
    marginBottom: 32, // mb-8
  },
  bodyViewContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 8, // mx-2
  },
  bodyViewTitle: {
    fontSize: 18, // text-lg
    fontWeight: '600',
    color: '#4F46E5', // text-indigo-600
    marginBottom: 8, // mb-2
    textTransform: 'capitalize',
  },
  svgContainer: {
    borderWidth: 2, // border-2
    borderColor: '#D1D5DB', // border-gray-300
    borderRadius: 12, // rounded-xl
    backgroundColor: '#FFFFFF', // bg-white
    elevation: 6, // shadow-lg
    minHeight: 300, // min-h-[300px]
  },
  selectedMusclesContainer: {
    width: '100%',
    maxWidth: 800, // max-w-2xl
    backgroundColor: '#FFFFFF',
    borderRadius: 12, // rounded-xl
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6, // shadow-lg
    padding: 24, // p-6
  },
  selectedMusclesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB', // border-gray-200
    paddingBottom: 12, // pb-3
    marginBottom: 16, // mb-4
  },
  selectedMusclesTitle: {
    fontSize: 20, // text-xl
    fontWeight: 'bold',
    color: '#1F2937', // text-gray-800
  },
  resetButton: {
    backgroundColor: '#E5E7EB', // bg-gray-200
    paddingVertical: 8, // py-2
    paddingHorizontal: 16, // px-4
    borderRadius: 9999, // rounded-full
    // hover:bg-gray-300 handled by TouchableOpacity
  },
  resetButtonText: {
    color: '#4B5563', // text-gray-700
    fontWeight: '600',
    fontSize: 14, // text-sm
  },
  selectedMusclesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12, // gap-3
    minHeight: 48, // min-h-[3rem] (3 * 16 = 48)
    alignItems: 'center',
  },
  noSelectionText: {
    fontStyle: 'italic',
    color: '#6B7280', // text-gray-500
  },
  selectedMuscleTag: {
    backgroundColor: '#DBEAFE', // bg-blue-100
    borderRadius: 9999, // rounded-full
    paddingVertical: 6,
    paddingHorizontal: 16,
    // animate-fade-in not directly translated via StyleSheet
  },
  selectedMuscleText: {
    color: '#1E40AF', // text-blue-800
    fontWeight: '600',
    fontSize: 14, // text-sm
  },
}); 