import {
    getExerciseLimit,
    getPreference,
} from '@/lib/database';
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
        const limit = await getExerciseLimit(exerciseName);
        if (limit !== null) {
            return limit;
        }
    } catch (error) {
        console.error('Error loading user capacity limit:', error);
    }
    
    // Fallback: use default hardcoded value
    return userEstimated1RMs[exerciseName] ?? 100;
}

// --- Get muscle-specific 1RM from database ---
async function getMuscle1RM(muscleKey: string): Promise<number> {
    try {
        const muscle1RMs = await getPreference<Record<string, number>>('muscle1RMs', {});
        if (muscle1RMs[muscleKey] !== undefined) {
            return muscle1RMs[muscleKey];
        }
    } catch (error) {
        console.error('Error loading muscle 1RM:', error);
    }
    return 0; // Will trigger fallback in calculation
}

// --- 1RM ESTIMATION FORMULAS ---
// Multiple formulas for different rep ranges and accuracy

/**
 * Epley Formula: 1RM = Weight × (1 + Reps/30)
 * Good for 1-10 reps, but overestimates at high reps
 */
function estimate1RM_Epley(weight: number, reps: number): number {
    return weight * (1 + reps / 30);
}

/**
 * Brzycki Formula: 1RM = Weight / (1.0278 - 0.0278 × Reps)
 * Most accurate for 1-6 reps, underestimates at high reps
 */
function estimate1RM_Brzycki(weight: number, reps: number): number {
    if (reps >= 37) return weight; // Prevent division by zero
    return weight / (1.0278 - 0.0278 * reps);
}

/**
 * Lombardi Formula: 1RM = Weight × Reps^0.10
 * Excellent across all rep ranges
 */
function estimate1RM_Lombardi(weight: number, reps: number): number {
    return weight * Math.pow(reps, 0.10);
}

/**
 * Wathan Formula: 1RM = (100 × Weight) / (48.8 + 53.8 × e^(-0.075 × Reps))
 * Most accurate overall, research-backed
 */
function estimate1RM_Wathan(weight: number, reps: number): number {
    return (100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps));
}

/**
 * Mayhew Formula: 1RM = (100 × Weight) / (52.2 + 41.9 × e^(-0.055 × Reps))
 * Very accurate across wide rep range
 */
function estimate1RM_Mayhew(weight: number, reps: number): number {
    return (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps));
}

/**
 * O'Conner Formula: 1RM = Weight × (1 + Reps/40)
 * More conservative than Epley, less accurate
 */
function estimate1RM_OConner(weight: number, reps: number): number {
    return weight * (1 + reps / 40);
}

/**
 * Multi-Formula Approach: Selects best formula based on rep range
 * Uses research-backed formula selection for maximum accuracy
 */
export function estimate1RM_MultiFormula(weight: number, reps: number): number {
    // Clamp reps to valid range
    const clampedReps = Math.max(1, Math.min(reps, 50));
    
    // Select formula based on rep range for optimal accuracy
    if (clampedReps <= 3) {
        // 1-3 reps: Brzycki is most accurate for near-max efforts
        return estimate1RM_Brzycki(weight, clampedReps);
    } else if (clampedReps <= 6) {
        // 4-6 reps: Brzycki or Wathan (use Wathan for consistency)
        return estimate1RM_Wathan(weight, clampedReps);
    } else if (clampedReps <= 10) {
        // 7-10 reps: Wathan or Epley (Wathan more accurate)
        return estimate1RM_Wathan(weight, clampedReps);
    } else if (clampedReps <= 15) {
        // 11-15 reps: Wathan or Lombardi (Wathan preferred)
        return estimate1RM_Wathan(weight, clampedReps);
    } else {
        // 16+ reps: Wathan or Lombardi (Wathan handles high reps well)
        return estimate1RM_Wathan(weight, clampedReps);
    }
}

/**
 * Invert 1RM formula to predict reps possible at given weight
 * Uses Wathan formula inversion for consistency
 */
export function predictRepsFrom1RM(oneRM: number, weight: number): number {
    if (oneRM <= weight) return 0;
    // Invert Wathan formula: reps = -ln((100*weight/oneRM - 48.8)/53.8) / 0.075
    const ratio = (100 * weight) / oneRM;
    if (ratio <= 48.8) return 0; // Can't do any reps
    const reps = -Math.log((ratio - 48.8) / 53.8) / 0.075;
    return Math.max(0, Math.floor(reps));
}

// --- Estimate muscle 1RM from exercise set using multi-formula approach ---
function estimateMuscle1RMFromSet(
    exerciseName: string,
    weight: number,
    reps: number,
    muscleKey: string
): number {
    const exercise = exercises.find((ex: Exercise) => ex.name === exerciseName);
    if (!exercise) return weight;

    // Estimate exercise 1RM using multi-formula approach
    const exercise1RM = estimate1RM_MultiFormula(weight, reps);
    
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

// --- Get fatigue parameters (customizable via database) ---
async function getFatigueParams() {
    try {
        const storedParams = await getPreference<typeof defaultFatigueParams>('fatigueParams', defaultFatigueParams);
        return { ...defaultFatigueParams, ...storedParams };
    } catch (error) {
        console.error('Error loading fatigue params:', error);
    }
    return defaultFatigueParams;
}

// --- Get user bodyweight ---
async function getUserBodyweight(): Promise<number> {
    try {
        const userBodyweight = await getPreference<number>('userBodyweight', 150);
        return userBodyweight;
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

    // Check for custom muscle involvement override
    let muscleInvolvement: Record<string, number> = exercise.muscles as unknown as Record<string, number>;
    try {
        const customInvolvement = await getPreference<Record<string, number>>(
            `exerciseMuscleInvolvement_${exerciseName}`,
            {}
        );
        if (customInvolvement && Object.keys(customInvolvement).length > 0) {
            muscleInvolvement = customInvolvement;
        }
    } catch (error) {
        // Fallback to default if error loading custom involvement
        console.error('Error loading custom involvement:', error);
    }

    const drain: MuscleCapacity = {};

    // Calculate drain for each involved muscle
    for (const rawMuscle in muscleInvolvement) {
        if (!Object.prototype.hasOwnProperty.call(muscleInvolvement, rawMuscle)) continue;

        const muscleKey = normalizeMuscleKey(rawMuscle);
        const involvement = muscleInvolvement[rawMuscle as keyof typeof muscleInvolvement] as number;

        // Get muscle-specific 1RM (or estimate it from exercise 1RM)
        let muscle1RM = await getMuscle1RM(muscleKey);
        if (muscle1RM <= 0) {
            // Use exercise-level 1RM scaled by muscle involvement, rather than estimating from current set
            // This ensures that changing weight actually changes the percentage of 1RM
            if (exercise1RM > 0) {
                muscle1RM = exercise1RM * involvement;
            } else {
                // Fallback: estimate from current set only if no exercise 1RM is available
                muscle1RM = estimateMuscle1RMFromSet(exerciseName, effectiveWeight, repsCompleted, muscleKey);
            }
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
        const customRates = await getPreference<Record<string, number>>('customRecoveryRates', {});
        if (customRates[muscle] !== undefined) {
            return customRates[muscle];
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

    // Use Wathan formula inversion for consistent predictions
    const repsPossible = predictRepsFrom1RM(effectiveOneRM, effectiveWeight);
    
    return Math.max(0, repsPossible);
} 