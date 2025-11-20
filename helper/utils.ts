import AsyncStorage from '@react-native-async-storage/async-storage';
import { exercises, maxMuscleCapacity, recoveryRatePerHour } from '../constants/Exercises';
import { MuscleGroup } from '../constants/MuscleGroups';

// --- Types ---
type Weight = number | string;
type Exercise = typeof exercises[number];
type UserEstimated1RMs = {
    [key: string]: number;
};
type MuscleCapacity = {
    [key in MuscleGroup]?: number;
};

// --- Tunable Fatigue Parameters (can be customized via AsyncStorage) ---
export const defaultFatigueParams = {
    C0: 0.05,        // Base fatigue magnitude
    p: 2.0,          // Sensitivity to %1RM (exponential scaling)
    q: 1.0,          // Sensitivity to reps
    metMultiplier: 0.15, // MET value contribution
};

// --- Muscle Key Normalization (for handling synonyms) ---
const MUSCLE_SYNONYMS: { [key: string]: string } = {
    rearDeltoids: 'posteriorDeltoids',
    posteriorDeltoids: 'posteriorDeltoids',
};

function normalizeMuscleKey(key: string): string {
    return MUSCLE_SYNONYMS[key] || key;
}

// --- Fallback 1RM values for exercises (used when user hasn't set custom values) ---
const userEstimated1RMs: UserEstimated1RMs = {
    'Deadlift': 185,
    'Squat': 205,
    'Bench Press': 145,
    'Overhead Press': 95,
    'Barbell Row': 145,
    'Pull-Up': 175,
    'Dumbbell Press': 95,
    'Dumbbell Curl': 60,
    'Dumbbell Lateral Raise': 35,
    'Triceps Dip': 160,
    'Lat Pulldown': 145,
    'Seated Row': 160,
    'Leg Press': 320,
    'Calf Raise': 200,
    'Hammer Curl': 60,
    'Incline Bench Press': 125,
    'Face Pull': 55,
    'Cable Lateral Raise': 30,
    'Front Squat': 175,
    'Sumo Deadlift': 265,
    'Hip Thrust': 280,
    'Bulgarian Split Squat': 60,
    'Machine Chest Press': 175,
    'Machine Shoulder Press': 120,
    'Preacher Curl': 70,
    'Reverse Fly': 30,
    'Rope Triceps Pushdown': 85,
};

// --- Get user-specific 1RM for an exercise ---
async function getUserCapacityLimit(exerciseName: string): Promise<number> {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const capacityKeys = allKeys.filter(key => key.startsWith('userCapacityLimits_'));
        
        if (capacityKeys.length > 0) {
            const limitsStr = await AsyncStorage.getItem(capacityKeys[0]);
            if (limitsStr) {
                const limits = JSON.parse(limitsStr);
                if (limits[exerciseName] !== undefined) {
                    return limits[exerciseName];
                }
            }
        }
    } catch (error) {
        console.error('Error loading user capacity limit:', error);
    }
    
    // Fallback: use default hardcoded value
    return userEstimated1RMs[exerciseName] ?? 100;
}

// --- Get muscle-specific 1RM from AsyncStorage ---
async function getMuscle1RM(muscleKey: string): Promise<number> {
    try {
        const muscle1RMsStr = await AsyncStorage.getItem('muscle1RMs');
        if (muscle1RMsStr) {
            const muscle1RMs = JSON.parse(muscle1RMsStr);
            if (muscle1RMs[muscleKey] !== undefined) {
                return muscle1RMs[muscleKey];
            }
        }
    } catch (error) {
        console.error('Error loading muscle 1RM:', error);
    }
    return 0; // Will trigger fallback in calculation
}

// --- Estimate muscle 1RM from exercise set using Epley formula ---
function estimateMuscle1RMFromSet(
    exerciseName: string,
    weight: number,
    reps: number,
    muscleKey: string
): number {
    const exercise = exercises.find((ex: Exercise) => ex.name === exerciseName);
    if (!exercise) return weight;

    // Estimate exercise 1RM using Epley: 1RM = Weight * (1 + Reps / 30)
    const exercise1RM = weight * (1 + reps / 30);
    
    // Find muscle involvement (handle normalized keys)
    let involvement = 0;
    for (const rawMuscle of Object.keys(exercise.muscles)) {
        if (normalizeMuscleKey(rawMuscle) === muscleKey) {
            involvement = exercise.muscles[rawMuscle as keyof typeof exercise.muscles] as number;
            break;
        }
    }
    
    // Scale exercise 1RM by muscle involvement
    return exercise1RM * (involvement || 0.5);
}

// --- Get fatigue parameters (customizable via AsyncStorage) ---
async function getFatigueParams() {
    try {
        const storedParams = await AsyncStorage.getItem('fatigueParams');
        if (storedParams) {
            return { ...defaultFatigueParams, ...JSON.parse(storedParams) };
        }
    } catch (error) {
        console.error('Error loading fatigue params:', error);
    }
    return defaultFatigueParams;
}

// --- Get user bodyweight ---
async function getUserBodyweight(): Promise<number> {
    try {
        const settings = await AsyncStorage.getItem('drainSettings');
        if (settings) {
            const parsed = JSON.parse(settings);
            return parsed.userBodyweight || 150;
        }
    } catch (error) {
        console.error('Error loading bodyweight:', error);
    }
    return 150;
}

// --- Convert weight string to number ---
async function parseWeight(weight: Weight): Promise<number> {
    if (typeof weight === 'number') return weight;
    
    if (weight.includes('Bodyweight')) {
        const bodyweight = await getUserBodyweight();
        const addedWeightMatch = weight.match(/([+-])(\d+)/);
        if (addedWeightMatch) {
            const modifier = addedWeightMatch[1] === '+' ? 1 : -1;
            return bodyweight + (modifier * parseInt(addedWeightMatch[2]));
        }
        return bodyweight;
    }
    
    return parseFloat(weight) || 0;
}

// --- IMPROVED CAPACITY DRAIN CALCULATION ---
export async function calculateCapacityDrain(
    exerciseName: string,
    weightUsed: Weight,
    repsCompleted: number
): Promise<MuscleCapacity> {
    const exercise = exercises.find((ex: Exercise) => ex.name === exerciseName);
    if (!exercise) {
        console.error("Exercise not found:", exerciseName);
        return {};
    }

    const params = await getFatigueParams();
    const effectiveWeight = await parseWeight(weightUsed);
    const exercise1RM = await getUserCapacityLimit(exerciseName);

    const drain: MuscleCapacity = {};

    // Calculate drain for each involved muscle
    for (const rawMuscle in exercise.muscles) {
        if (!Object.prototype.hasOwnProperty.call(exercise.muscles, rawMuscle)) continue;

        const muscleKey = normalizeMuscleKey(rawMuscle);
        const involvement = exercise.muscles[rawMuscle as keyof typeof exercise.muscles] as number;

        // Get muscle-specific 1RM (or estimate it)
        let muscle1RM = await getMuscle1RM(muscleKey);
        if (muscle1RM <= 0) {
            muscle1RM = estimateMuscle1RMFromSet(exerciseName, effectiveWeight, repsCompleted, muscleKey);
        }

        // Calculate relative intensity (%1RM)
        const percentOf1RM = muscle1RM > 0 ? effectiveWeight / muscle1RM : 0;

        // Compute fatigue cost using improved formula:
        // cost = involvement * C0 * (percentOf1RM^p) * (reps^q) * metMultiplier * MET
        const relativeIntensity = Math.pow(Math.max(0, percentOf1RM), params.p);
        const repsComponent = Math.pow(repsCompleted, params.q);
        const metComponent = exercise.met * params.metMultiplier;

        const cost = involvement * params.C0 * relativeIntensity * repsComponent * metComponent;

        // Convert cost to capacity drain (0-100 scale)
        // Using exponential decay: drain = 100 * (1 - exp(-cost))
        const capacityDrain = 100 * (1 - Math.exp(-cost));

        // @ts-expect-error: muscle may not be a MuscleGroup, but we want to allow it for flexibility
        drain[muscleKey] = Math.min(100, Math.max(0, capacityDrain));
    }

    return drain;
}

// --- Get recovery rate for a muscle ---
async function getRecoveryRate(muscle: string): Promise<number> {
    try {
        const customRatesStr = await AsyncStorage.getItem('customRecoveryRates');
        if (customRatesStr) {
            const customRates = JSON.parse(customRatesStr);
            if (customRates[muscle] !== undefined) {
                return customRates[muscle];
            }
        }
    } catch (error) {
        console.error('Error loading custom recovery rates:', error);
    }
    return (recoveryRatePerHour as any)[muscle] || 2.0;
}

// --- IMPROVED RECOVERY CALCULATION ---
// Uses exponential approach to 100% capacity for more realistic recovery
export async function applyRecovery(
    currentCapacity: MuscleCapacity,
    hoursPassed: number
): Promise<MuscleCapacity> {
    const newCapacity: MuscleCapacity = { ...currentCapacity };
    
    for (const muscle in newCapacity) {
        if (!Object.prototype.hasOwnProperty.call(newCapacity, muscle)) continue;

        const rPercent = await getRecoveryRate(muscle);
        // @ts-expect-error: muscle may not be a MuscleGroup, but we want to allow it for flexibility
        const currentCap = newCapacity[muscle] ?? 100;
        const maxCap = (maxMuscleCapacity as any)[muscle] || 100;

        // Convert percent per hour to exponential rate
        // cap(t+dt) = maxCap - (maxCap - cap(t)) * exp(-lambda * dt)
        // where exp(-lambda*1hour) = (1 - r/100)  => lambda = -ln(1 - r/100)
        const r = Math.min(rPercent / 100, 0.9999);
        const lambda = -Math.log(Math.max(1 - r, 1e-6));
        
        const recovered = maxCap - (maxCap - currentCap) * Math.exp(-lambda * hoursPassed);
        
        // @ts-expect-error: muscle may not be a MuscleGroup, but we want to allow it for flexibility
        newCapacity[muscle] = Math.min(maxCap, Math.max(0, recovered));
    }
    
    return newCapacity;
}

// --- PREDICT REPS POSSIBLE ---
// Predicts how many reps are possible at a given weight based on current muscle fatigue
export async function predictRepsPossible(
    exerciseName: string,
    weight: Weight,
    currentCapacity: MuscleCapacity
): Promise<number> {
    const exercise = exercises.find((ex: Exercise) => ex.name === exerciseName);
    if (!exercise) return 0;

    const effectiveWeight = await parseWeight(weight);
    
    // Calculate effective 1RM based on current muscle capacities
    let numerator = 0;
    let denominator = 0;

    for (const rawMuscle in exercise.muscles) {
        if (!Object.prototype.hasOwnProperty.call(exercise.muscles, rawMuscle)) continue;

        const muscleKey = normalizeMuscleKey(rawMuscle);
        const involvement = exercise.muscles[rawMuscle as keyof typeof exercise.muscles] as number;

        let muscle1RM = await getMuscle1RM(muscleKey);
        if (muscle1RM <= 0) {
            muscle1RM = estimateMuscle1RMFromSet(exerciseName, effectiveWeight, 1, muscleKey);
        }

        const capacity = currentCapacity[muscleKey as MuscleGroup] ?? 100;
        
        // Weighted effective 1RM
        numerator += involvement * (capacity / 100) * muscle1RM;
        denominator += involvement;
    }

    const effectiveOneRM = denominator > 0 ? numerator / denominator : 0;
    
    if (effectiveOneRM <= effectiveWeight) return 0;

    // Invert Epley formula: reps = 30 * (1RM / weight - 1)
    const repsPossible = Math.floor(30 * (effectiveOneRM / effectiveWeight - 1));
    
    return Math.max(0, repsPossible);
} 