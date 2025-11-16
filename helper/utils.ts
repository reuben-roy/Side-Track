import AsyncStorage from '@react-native-async-storage/async-storage';
import { exercises, maxMuscleCapacity, recoveryRatePerHour } from '../constants/Exercises';
import { MuscleGroup } from '../constants/MuscleGroups';

// --- One-Rep Max (1RM) Estimation ---
type Weight = number | string;

type Exercise = typeof exercises[number];

type UserEstimated1RMs = {
    [key: string]: number;
};

type MuscleCapacity = {
    [key in MuscleGroup]?: number;
};

function estimate1RM(
    exerciseName: string,
    weight: Weight,
    reps: number
): number {
    // Using Epley formula: 1RM = Weight * (1 + Reps / 30)
    if (typeof weight === 'string' && weight.includes('Bodyweight')) {
        const baseBodyweight = 150;
        const addedWeightMatch = weight.match(/\+(\d+)/);
        const actualWeight = addedWeightMatch ? baseBodyweight + parseInt(addedWeightMatch[1]) : baseBodyweight;
        return actualWeight * (1 + reps / 30);
    }
    return (typeof weight === 'number' ? weight : 0) * (1 + reps / 30);
}

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

// Get user-specific capacity limit (1RM) for an exercise
async function getUserCapacityLimit(exerciseName: string): Promise<number> {
    try {
        // Search for any user's capacity limits (there should only be one logged-in user)
        const allKeys = await AsyncStorage.getAllKeys();
        const capacityKeys = allKeys.filter(key => key.startsWith('userCapacityLimits_'));
        
        // Get the first (and should be only) user's capacity limits
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
    
    // Fall back to default hardcoded value
    return userEstimated1RMs[exerciseName] ?? 100;
}

// Get drain settings from AsyncStorage or use defaults
async function getDrainSettings() {
    try {
        const storedSettings = await AsyncStorage.getItem('drainSettings');
        if (storedSettings) {
            return JSON.parse(storedSettings);
        }
    } catch (error) {
        console.error('Error loading drain settings:', error);
    }
    // Default values - increased for more significant drain
    return {
        overallMultiplier: 12.0,
        metCoefficient: 0.15,
        repsCoefficient: 0.08,
        intensityCoefficient: 0.7,
        userBodyweight: 150,
    };
}

export async function calculateCapacityDrain(
    exerciseName: string,
    weightUsed: Weight,
    repsCompleted: number
): Promise<MuscleCapacity> {
    const drainSettings = await getDrainSettings();
    
    const exercise = exercises.find((ex: Exercise) => ex.name === exerciseName);
    if (!exercise) {
        console.error("Exercise not found:", exerciseName);
        return {};
    }

    let effectiveWeightUsed: number = typeof weightUsed === 'number' ? weightUsed : 0;
    if (typeof weightUsed === 'string' && weightUsed.includes('Bodyweight')) {
        const baseBodyweight = drainSettings.userBodyweight; // Use custom bodyweight
        const addedWeightMatch = weightUsed.match(/\+(\d+)/);
        effectiveWeightUsed = addedWeightMatch ? baseBodyweight + parseInt(addedWeightMatch[1]) : baseBodyweight;
    }

    // Get user-specific 1RM instead of using hardcoded value
    const user1RM = await getUserCapacityLimit(exerciseName);
    const percentageOf1RM = user1RM > 0 ? effectiveWeightUsed / user1RM : 0;

    let intensityFactor: number;
    if (repsCompleted === 1 && percentageOf1RM >= 0.95) intensityFactor = 1.2;
    else if (percentageOf1RM >= 0.9) intensityFactor = 1.0;
    else if (percentageOf1RM >= 0.8) intensityFactor = 0.8;
    else if (percentageOf1RM >= 0.7) intensityFactor = 0.6;
    else if (percentageOf1RM >= 0.6) intensityFactor = 0.4;
    else intensityFactor = 0.2;

    // Use custom coefficients
    const drainMultiplier = (exercise.met * drainSettings.metCoefficient) + 
                           (repsCompleted * drainSettings.repsCoefficient) + 
                           (intensityFactor * drainSettings.intensityCoefficient);

    const drain: MuscleCapacity = {};
    for (const muscle in exercise.muscles) {
        if (Object.prototype.hasOwnProperty.call(exercise.muscles, muscle)) {
            // Use custom overall multiplier
            // @ts-expect-error: muscle may not be a MuscleGroup, but we want to allow it for flexibility
            drain[muscle] = drainMultiplier * exercise.muscles[muscle] * drainSettings.overallMultiplier;
        }
    }
    return drain;
}

// Get recovery rate for a muscle, checking custom rates first
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

export async function applyRecovery(
    currentCapacity: MuscleCapacity,
    hoursPassed: number
): Promise<MuscleCapacity> {
    const newCapacity: MuscleCapacity = { ...currentCapacity };
    for (const muscle in newCapacity) {
        if (Object.prototype.hasOwnProperty.call(newCapacity, muscle)) {
            // Get muscle-specific recovery rate (custom or default)
            const muscleRecoveryRate = await getRecoveryRate(muscle);
            // @ts-expect-error: muscle may not be a MuscleGroup, but we want to allow it for flexibility
            newCapacity[muscle] = (newCapacity[muscle] ?? 0) + muscleRecoveryRate * hoursPassed;
            // @ts-expect-error: muscle may not be a MuscleGroup, but we want to allow it for flexibility
            if (newCapacity[muscle] > (maxMuscleCapacity as any)[muscle]) {
                // @ts-expect-error: muscle may not be a MuscleGroup, but we want to allow it for flexibility
                newCapacity[muscle] = (maxMuscleCapacity as any)[muscle];
            }
        }
    }
    return newCapacity;
} 