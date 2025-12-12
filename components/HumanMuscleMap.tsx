import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

// --- Configuration ---
const CONFIG = {
  UNSELECTED_COLOR: 'rgba(200, 200, 200, 0.0)', // Transparent when not selected
  SELECTED_COLOR: '#FF6B6B',   // Vibrant coral red
  STROKE_COLOR: 'rgba(0, 0, 0, 0.1)', 
  STROKE_WIDTH: 1,
  BODY_FILL_GRADIENT_START: '#DCDCDC',
  BODY_FILL_GRADIENT_END: '#CFCFCF',
  BODY_STROKE: '#999999',
  BODY_DETAIL_STROKE: '#B0B0B0',
};

// --- Anatomical Data - Matching new "Mannequin" SVGs ---
const MUSCLE_DATA: any = {
  front: {
    muscles: {
      chest: {
        name: 'Chest',
        path: [
          'M74 55 L40 65 Q35 85 40 105 Q60 115 74 105 Z',
          'M74 55 L108 65 Q113 85 108 105 Q88 115 74 105 Z',
        ]
      },
      abs: {
        name: 'Abs',
        path: [
          'M60 108 L88 108 L86 132 L62 132 Z', 
          'M62 134 L86 134 L84 160 L64 160 Z', 
          'M64 162 L84 162 L82 188 L66 188 Z',
        ]
      },
      shoulders: { 
        name: 'Shoulders', 
        path: [
          'M40 65 Q30 68 25 68 Q12 75 12 95 L28 100 Q35 80 40 65 Z',
          'M108 65 Q118 68 123 68 Q136 75 136 95 L120 100 Q113 80 108 65 Z',
        ]
      },
      biceps: {
        name: 'Biceps',
        path: [
          'M12 95 Q10 115 12 140 L28 130 Q25 110 28 100 Z',
          'M136 95 Q138 115 136 140 L120 130 Q123 110 120 100 Z',
        ]
      },
      quadriceps: {
        name: 'Quadriceps',
        path: [
          'M38 200 Q35 240 40 280 L62 280 Q65 240 74 215 L68 210 Q50 200 38 200 Z',
          'M110 200 Q113 240 108 280 L86 280 Q83 240 74 215 L80 210 Q98 200 110 200 Z',
        ]
      },
    },
  },
  back: {
    muscles: {
      traps: { 
        name: 'Traps', 
        path: 'M74 50 L98 65 L74 90 L50 65 Z'
      },
      lats: {
        name: 'Lats', 
        path: [
          'M50 65 L35 115 L35 140 L55 160 L74 160 L74 90 Z',
          'M98 65 L113 115 L113 140 L93 160 L74 160 L74 90 Z',
        ]
      },
      triceps: { 
        name: 'Triceps', 
        path: [
          'M12 95 L28 100 Q30 120 28 130 L12 140 Q10 120 12 95 Z',
          'M136 95 L120 100 Q118 120 120 130 L136 140 Q138 120 136 95 Z',
        ]
      },
      glutes: { 
        name: 'Glutes', 
        path: [
          'M42 180 L74 180 L74 215 Q55 230 42 200 Z',
          'M106 180 L74 180 L74 215 Q93 230 106 200 Z',
        ]
      },
      hamstrings: {
        name: 'Hamstrings',
        path: [
          'M42 210 Q35 240 40 280 L62 280 Q65 240 74 215 Z',
          'M106 210 Q113 240 108 280 L86 280 Q83 240 74 215 Z',
        ]
      },
    },
  },
  common: {
    muscles: {
      calves: {
        name: 'Calves',
        path: [
          'M40 280 Q38 300 40 320 L65 320 Q67 300 62 280 Z',
          'M108 280 Q110 300 108 320 L83 320 Q81 300 86 280 Z',
        ]
      },
    },
  },
};

// --- Inline SVG Components for Robust Rendering ---

const FrontBody = () => (
  <>
    <Path 
      d="M74 10 C65 10 58 18 58 30 C58 40 64 48 74 48 C84 48 90 40 90 30 C90 18 83 10 74 10 Z" 
      fill="url(#skinGradient)" 
      stroke={CONFIG.BODY_STROKE} 
      strokeWidth="1"
    />
    <Path 
      d="M74 48 L65 50 Q50 55 40 65 Q35 68 25 68 Q15 70 12 85 Q10 100 15 115 L12 140 Q10 150 8 160 L5 180 L18 185 L22 175 L25 155 L28 130 Q30 120 35 115 L35 140 Q38 160 42 180 Q40 190 38 200 Q35 220 35 240 Q35 260 40 280 Q38 300 40 320 L42 360 L55 365 L65 360 L65 330 Q65 300 62 280 Q60 250 68 210 L74 215 L80 210 Q88 250 86 280 Q83 300 83 330 L83 360 L93 365 L106 360 Q108 320 110 300 Q112 280 108 260 Q113 240 113 220 Q110 190 106 180 Q110 160 113 140 L113 115 Q118 120 120 130 L123 155 L126 175 L130 185 L143 180 L140 160 Q138 150 136 140 Q138 115 133 100 Q130 70 123 68 Q113 65 98 55 L83 50 L74 48 Z" 
      fill="url(#skinGradient)" 
      stroke={CONFIG.BODY_STROKE} 
      strokeWidth="1"
    />
    {/* Definition Lines */}
    <Path d="M45 95 Q60 105 74 105 Q88 105 103 95" fill="none" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="1"/>
    <Path d="M74 50 L74 105" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
    <Path d="M74 105 L74 190" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
    <Path d="M65 125 Q74 130 83 125" fill="none" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
    <Path d="M66 145 Q74 150 82 145" fill="none" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
    <Path d="M67 165 Q74 170 81 165" fill="none" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
    <Path d="M45 280 Q50 285 58 280" fill="none" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
    <Path d="M90 280 Q98 285 103 280" fill="none" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
  </>
);

const BackBody = () => (
  <>
    <Path 
      d="M74 10 C65 10 58 18 58 30 C58 40 64 48 74 48 C84 48 90 40 90 30 C90 18 83 10 74 10 Z" 
      fill="url(#skinGradientBack)" 
      stroke={CONFIG.BODY_STROKE} 
      strokeWidth="1"
    />
    <Path 
      d="M74 48 L65 50 Q50 55 40 65 Q35 68 25 68 Q15 70 12 85 Q10 100 15 115 L12 140 Q10 150 8 160 L5 180 L18 185 L22 175 L25 155 L28 130 Q30 120 35 115 L35 140 Q38 160 42 180 Q40 190 38 200 Q35 220 35 240 Q35 260 40 280 Q38 300 40 320 L42 360 L55 365 L65 360 L65 330 Q65 300 62 280 Q60 250 68 210 L74 215 L80 210 Q88 250 86 280 Q83 300 83 330 L83 360 L93 365 L106 360 Q108 320 110 300 Q112 280 108 260 Q113 240 113 220 Q110 190 106 180 Q110 160 113 140 L113 115 Q118 120 120 130 L123 155 L126 175 L130 185 L143 180 L140 160 Q138 150 136 140 Q138 115 133 100 Q130 70 123 68 Q113 65 98 55 L83 50 L74 48 Z" 
      fill="url(#skinGradientBack)" 
      stroke={CONFIG.BODY_STROKE} 
      strokeWidth="1"
    />
    {/* Definition Lines */}
    <Path d="M74 50 L74 190" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
    <Path d="M74 90 L55 80" fill="none" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
    <Path d="M74 90 L93 80" fill="none" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
    <Path d="M42 200 Q55 230 74 215" fill="none" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
    <Path d="M106 200 Q93 230 74 215" fill="none" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
    <Path d="M40 300 Q50 310 62 300" fill="none" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
    <Path d="M86 300 Q98 310 108 300" fill="none" stroke={CONFIG.BODY_DETAIL_STROKE} strokeWidth="0.5"/>
  </>
);

interface MuscleProps {
  path: string;
  name: string;
  muscleId: string;
  isSelected: boolean;
  onPress?: (muscleId: string) => void;
}

// --- Reusable Muscle Component ---
const Muscle = React.memo(({ path, muscleId, isSelected, onPress }: MuscleProps) => (
  <Path
    d={path}
    fill={isSelected ? CONFIG.SELECTED_COLOR : CONFIG.UNSELECTED_COLOR}
    stroke={isSelected ? CONFIG.SELECTED_COLOR : 'none'}
    strokeWidth={CONFIG.STROKE_WIDTH}
    onPress={onPress ? () => onPress(muscleId) : undefined}
    opacity={isSelected ? 0.7 : 0} 
  />
));

Muscle.displayName = 'Muscle';

interface BodyViewProps {
  view: 'front' | 'back';
  selectedMuscles: Set<string>;
  onMusclePress?: (muscleId: string) => void;
  height?: number;
  width?: number;
}

// --- Body View Component ---
const BodyView = React.memo(({ view, selectedMuscles, onMusclePress, height = 300, width = 150 }: BodyViewProps) => {
  const commonMuscles = MUSCLE_DATA.common.muscles;
  const viewMuscles = MUSCLE_DATA[view].muscles;
  const allMuscles = { ...viewMuscles, ...commonMuscles };

  return (
    <View style={styles.bodyViewContainer}>
      <Svg height={height} width={width} viewBox="0 0 148 380" style={styles.svgContainer}>
        <Defs>
          <LinearGradient id="skinGradient" x1="74" y1="0" x2="74" y2="380" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={CONFIG.BODY_FILL_GRADIENT_START} />
            <Stop offset="1" stopColor={CONFIG.BODY_FILL_GRADIENT_END} />
          </LinearGradient>
          <LinearGradient id="skinGradientBack" x1="74" y1="0" x2="74" y2="380" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={CONFIG.BODY_FILL_GRADIENT_START} />
            <Stop offset="1" stopColor={CONFIG.BODY_FILL_GRADIENT_END} />
          </LinearGradient>
        </Defs>

        {/* Draw the human body directly using Paths */}
        {view === 'front' ? <FrontBody /> : <BackBody />}
        
        {/* Draw muscles on top */}
        {Object.entries(allMuscles).map(([id, { name, path }]: [string, any]) => {
          if (Array.isArray(path)) {
            return path.map((subPath: string, index: number) => (
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

BodyView.displayName = 'BodyView';

interface MuscleMapProps {
    highlightedMuscles: Set<string>;
    height?: number;
    width?: number;
}

export const MuscleMap = React.memo(({ highlightedMuscles, height = 150, width = 75 }: MuscleMapProps) => {
    return (
        <View style={styles.muscleMapRow}>
            <BodyView 
                view="front" 
                selectedMuscles={highlightedMuscles} 
                height={height} 
                width={width}
            />
            <BodyView 
                view="back" 
                selectedMuscles={highlightedMuscles} 
                height={height} 
                width={width}
            />
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
    Object.values(MUSCLE_DATA).forEach((view: any) => {
      if (view.muscles) {
        Object.entries(view.muscles).forEach(([id, { name }]: [string, any]) => {
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
          <View style={styles.viewColumn}>
            <Text style={styles.bodyViewTitle}>Front</Text>
            <BodyView view="front" selectedMuscles={selectedMuscles} onMusclePress={toggleMuscleSelection} />
          </View>
          <View style={styles.viewColumn}>
            <Text style={styles.bodyViewTitle}>Back</Text>
            <BodyView view="back" selectedMuscles={selectedMuscles} onMusclePress={toggleMuscleSelection} />
          </View>
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
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  bodyViewsWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 32,
  },
  viewColumn: {
    alignItems: 'center',
  },
  muscleMapRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  bodyViewContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  bodyViewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  svgContainer: {
    backgroundColor: 'transparent',
  },
  selectedMusclesContainer: {
    width: '100%',
    maxWidth: 800,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
    padding: 24,
  },
  selectedMusclesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
    marginBottom: 16,
  },
  selectedMusclesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  resetButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },
  resetButtonText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 14,
  },
  selectedMusclesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    minHeight: 48,
    alignItems: 'center',
  },
  noSelectionText: {
    fontStyle: 'italic',
    color: '#6B7280',
  },
  selectedMuscleTag: {
    backgroundColor: '#FEE2E2',
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  selectedMuscleText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 14,
  },
});
