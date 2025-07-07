import { exercises, maxMuscleCapacity, recoveryRatePerHour } from '../constants/Exercises';
import { MuscleGroup } from '../constants/MuscleGroups';

// --- One-Rep Max (1RM) Estimation (from previous answer) ---
// This is a placeholder. In a real app, you'd calculate and store
// user's actual 1RMs or use a more dynamic prediction.
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
    // Add logic to handle 'Bodyweight' if necessary
    if (typeof weight === 'string' && weight.includes('Bodyweight')) {
        // You'll need to know the user's bodyweight for these calculations
        // For simplicity, let's assume 'Bodyweight' = 150 lbs + added weight
        const baseBodyweight = 150; // Example
        const addedWeightMatch = weight.match(/\+(\d+)/);
        const actualWeight = addedWeightMatch ? baseBodyweight + parseInt(addedWeightMatch[1]) : baseBodyweight;
        return actualWeight * (1 + reps / 30);
    }
    return (typeof weight === 'number' ? weight : 0) * (1 + reps / 30);
}

// Placeholder for user's estimated 1RMs for demonstration
// In a real app, this would be dynamic, perhaps stored in async storage or a backend.
const userEstimated1RMs: UserEstimated1RMs = {
    'Deadlift': 315,
    'Squat': 250,
    'Bench Press': 180,
    'Overhead Press': 120,
    'Barbell Row': 180,
    'Pull-Up': 220, // If user is 180lbs + 40lbs, then 220
    'Dumbbell Press': 120,
    'Dumbbell Curl': 80,
    'Dumbbell Lateral Raise': 50,
    'Triceps Dip': 200, // If user is 180lbs + 20lbs, then 200
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
    'Bulgarian Split Squat': 80, // per leg
    'Machine Chest Press': 220,
    'Machine Shoulder Press': 150,
    'Preacher Curl': 90,
    'Reverse Fly': 40,
    'Rope Triceps Pushdown': 110,
};

export function calculateCapacityDrain(
    exerciseName: string,
    weightUsed: Weight,
    repsCompleted: number
): MuscleCapacity {
    const exercise = exercises.find((ex: Exercise) => ex.name === exerciseName);
    if (!exercise) {
        console.error("Exercise not found:", exerciseName);
        return {};
    }

    // Convert 'Bodyweight' strings to numerical values for calculation
    let effectiveWeightUsed: number = typeof weightUsed === 'number' ? weightUsed : 0;
    if (typeof weightUsed === 'string' && weightUsed.includes('Bodyweight')) {
        const baseBodyweight = 150; // Assume a default bodyweight for calculations
        const addedWeightMatch = weightUsed.match(/\+(\d+)/);
        effectiveWeightUsed = addedWeightMatch ? baseBodyweight + parseInt(addedWeightMatch[1]) : baseBodyweight;
    }

    const user1RM = userEstimated1RMs[exerciseName] ?? estimate1RM(exerciseName, effectiveWeightUsed, repsCompleted); // Fallback to calculation
    const percentageOf1RM = user1RM > 0 ? effectiveWeightUsed / user1RM : 0;

    // A more sophisticated intensity factor based on % of 1RM
    // These values are arbitrary and need tuning!
    let intensityFactor: number;
    if (repsCompleted === 1 && percentageOf1RM >= 0.95) intensityFactor = 1.2; // Max effort single
    else if (percentageOf1RM >= 0.9) intensityFactor = 1.0;
    else if (percentageOf1RM >= 0.8) intensityFactor = 0.8;
    else if (percentageOf1RM >= 0.7) intensityFactor = 0.6;
    else if (percentageOf1RM >= 0.6) intensityFactor = 0.4;
    else intensityFactor = 0.2; // Lighter weight

    // Combine MET, reps, and intensity factor for drain multiplier
    // Tune these coefficients (e.g., 0.1, 0.05, 0.5) to get the right "feel" for drain per set.
    const drainMultiplier = (exercise.met * 0.1) + (repsCompleted * 0.05) + (intensityFactor * 0.5);

    const drain: MuscleCapacity = {};
    for (const muscle in exercise.muscles) {
        if (Object.prototype.hasOwnProperty.call(exercise.muscles, muscle)) {
            // @ts-expect-error: muscle may not be a MuscleGroup, but we want to allow it for flexibility
            drain[muscle] = drainMultiplier * exercise.muscles[muscle] * 5; // Final multiplier for overall drain magnitude
        }
    }
    return drain;
}

export function applyRecovery(
    currentCapacity: MuscleCapacity,
    hoursPassed: number
): MuscleCapacity {
    const newCapacity: MuscleCapacity = { ...currentCapacity };
    for (const muscle in newCapacity) {
        if (Object.prototype.hasOwnProperty.call(newCapacity, muscle)) {
            // @ts-expect-error: muscle may not be a MuscleGroup, but we want to allow it for flexibility
            newCapacity[muscle] = (newCapacity[muscle] ?? 0) + recoveryRatePerHour * hoursPassed;
            // @ts-expect-error: muscle may not be a MuscleGroup, but we want to allow it for flexibility
            if (newCapacity[muscle] > (maxMuscleCapacity as any)[muscle]) {
                // @ts-expect-error: muscle may not be a MuscleGroup, but we want to allow it for flexibility
                newCapacity[muscle] = (maxMuscleCapacity as any)[muscle];
            }
        }
    }
    return newCapacity;
}