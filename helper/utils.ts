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
    'Deadlift': 315,
    'Squat': 250,
    'Bench Press': 180,
    'Overhead Press': 120,
    'Barbell Row': 180,
    'Pull-Up': 220,
    'Dumbbell Press': 120,
    'Dumbbell Curl': 80,
    'Dumbbell Lateral Raise': 50,
    'Triceps Dip': 200,
    'Lat Pulldown': 180,
    'Seated Row': 200,
    'Leg Press': 400,
    'Calf Raise': 250,
    'Hammer Curl': 80,
    'Incline Bench Press': 160,
    'Face Pull': 70,
    'Cable Lateral Raise': 40,
    'Front Squat': 220,
    'Sumo Deadlift': 330,
    'Hip Thrust': 350,
    'Bulgarian Split Squat': 80,
    'Machine Chest Press': 220,
    'Machine Shoulder Press': 150,
    'Preacher Curl': 90,
    'Reverse Fly': 40,
    'Rope Triceps Pushdown': 110,
};

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
    // Default values
    return {
        overallMultiplier: 5.0,
        metCoefficient: 0.1,
        repsCoefficient: 0.05,
        intensityCoefficient: 0.5,
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

    const user1RM = userEstimated1RMs[exerciseName] ?? estimate1RM(exerciseName, effectiveWeightUsed, repsCompleted);
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