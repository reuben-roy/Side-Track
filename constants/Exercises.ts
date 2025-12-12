export const exercises = [
    { name: 'Deadlift', weights: [5, 10, 15, 25, 35, 45, 55, 65, 75, 95, 115, 135, 165, 185, 205, 225, 245, 265, 285, 305, 325, 345, 365, 385, 405], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 8, muscles: { hamstrings: 0.3, glutes: 0.3, lowerBack: 0.2, quads: 0.1, upperBack: 0.1 } },
    { name: 'Squat', weights: [0, 5, 10, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 125, 145, 155, 165, 185, 195, 215, 235, 255, 275, 295, 315], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 7.5, muscles: { quads: 0.5, glutes: 0.3, hamstrings: 0.1, core: 0.1 } },
    { name: 'Bench Press', weights: [5, 10, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165, 185, 205, 225], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 6, muscles: { pecs: 0.6, triceps: 0.2, anteriorDeltoids: 0.2 } },
    { name: 'Overhead Press', weights: [5, 10, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 5.5, muscles: { anteriorDeltoids: 0.5, medialDeltoids: 0.2, triceps: 0.2, core: 0.1 } },
    { name: 'Barbell Row', weights: [5, 10, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165, 175, 185], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 6.5, muscles: { lats: 0.4, upperBack: 0.4, biceps: 0.1, rearDeltoids: 0.1 } },
    { name: 'Pull-Up', weights: ['-80', '-70', '-60', '-50', '-40', '-30', '-20', '-10', 'Bodyweight', '+10', '+20', '+30', '+40', '+50', '+60', '+70', '+80', '+90', '+100', '+110', '+120'], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 7, muscles: { lats: 0.5, biceps: 0.3, upperBack: 0.2 } },
    { name: 'Dumbbell Press', weights: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 5.5, muscles: { pecs: 0.6, triceps: 0.2, anteriorDeltoids: 0.2 } },
    { name: 'Dumbbell Curl', weights: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 3.5, muscles: { biceps: 0.8, forearms: 0.2 } },
    { name: 'Dumbbell Lateral Raise', weights: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 3, muscles: { medialDeltoids: 0.9, anteriorDeltoids: 0.1 } },
    { name: 'Triceps Dip', weights: ['-80', '-70', '-60', '-50', '-40', '-30', '-20', '-10', 'Bodyweight', '+10', '+20', '+30', '+40', '+50', '+60', '+70', '+80', '+90', '+100', '+110', '+120'], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 6.5, muscles: { triceps: 0.6, pecs: 0.2, anteriorDeltoids: 0.2 } },
    { name: 'Lat Pulldown', weights: [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 200, 220], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 6, muscles: { lats: 0.6, biceps: 0.2, upperBack: 0.2 } },
    { name: 'Seated Row', weights: [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200, 220, 240], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 5.5, muscles: { upperBack: 0.5, lats: 0.3, biceps: 0.2 } },
    { name: 'Leg Press', weights: [10, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 360, 400, 450, 500], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 7, muscles: { quads: 0.6, glutes: 0.2, hamstrings: 0.1, calves: 0.1 } },
    { name: 'Calf Raise', weights: [0, 5, 10, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 240, 280, 320], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 4, muscles: { calves: 1.0 } },
    { name: 'Hammer Curl', weights: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 3.5, muscles: { biceps: 0.6, forearms: 0.4 } },
    { name: 'Incline Bench Press', weights: [5, 10, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165, 185, 205], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 6, muscles: { pecs: 0.6, anteriorDeltoids: 0.2, triceps: 0.2 } },
    { name: 'Face Pull', weights: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 4.5, muscles: { rearDeltoids: 0.5, upperBack: 0.5 } },
    { name: 'Cable Lateral Raise', weights: [0, 5, 10, 15, 20, 25, 30, 40, 50, 60], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 3, muscles: { medialDeltoids: 0.9, anteriorDeltoids: 0.1 } },
    { name: 'Front Squat', weights: [5, 10, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165, 175, 185, 205, 225, 245], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 7.5, muscles: { quads: 0.6, upperBack: 0.2, core: 0.1, glutes: 0.1 } },
    { name: 'Sumo Deadlift', weights: [5, 10, 15, 25, 35, 45, 55, 65, 85, 105, 125, 145, 165, 185, 205, 225, 245, 265, 285, 305, 325, 345, 365, 385, 405], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 8, muscles: { glutes: 0.4, hamstrings: 0.3, quads: 0.2, lowerBack: 0.1 } },
    { name: 'Hip Thrust', weights: [0, 5, 10, 15, 25, 35, 45, 55, 75, 95, 115, 135, 155, 175, 195, 215, 235, 255, 275, 295, 325, 365, 405], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 6.5, muscles: { glutes: 0.7, hamstrings: 0.2, quads: 0.1 } },
    { name: 'Bulgarian Split Squat', weights: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 7, muscles: { quads: 0.5, glutes: 0.4, hamstrings: 0.1 } },
    { name: 'Machine Chest Press', weights: [0, 5, 10, 20, 40, 60, 80, 100, 120, 140, 160, 180, 220, 260, 300], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 5.5, muscles: { pecs: 0.7, triceps: 0.2, anteriorDeltoids: 0.1 } },
    { name: 'Machine Shoulder Press', weights: [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 140, 160, 180, 200], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 5, muscles: { anteriorDeltoids: 0.6, medialDeltoids: 0.2, triceps: 0.2 } },
    { name: 'Preacher Curl', weights: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 90, 100, 110], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 3.5, muscles: { biceps: 0.9, forearms: 0.1 } },
    { name: 'Reverse Fly', weights: [0, 5, 10, 15, 20, 25, 30, 40, 50, 60], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 3, muscles: { rearDeltoids: 0.6, upperBack: 0.4 } },
    { name: 'Rope Triceps Pushdown', weights: [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 4.5, muscles: { triceps: 1.0 } },
];

export const maxMuscleCapacity = {
    quads: 100,
    hamstrings: 100,
    glutes: 100,
    calves: 100,
    pecs: 100,
    anteriorDeltoids: 100,
    medialDeltoids: 100,
    posteriorDeltoids: 100,
    triceps: 100,
    biceps: 100,
    lats: 100,
    upperBack: 100,
    lowerBack: 100,
    core: 100,
    forearms: 100,
};

// Muscle-specific recovery rates (% per hour)
// Based on muscle size and recovery science:
// - Small muscles: 2.5-3.5% per hour (faster recovery, ~29-40 hours)
// - Medium muscles: 1.8-2.2% per hour (moderate recovery, ~45-56 hours)
// - Large muscles: 1.2-1.5% per hour (slower recovery, ~67-83 hours)
export const recoveryRatePerHour = {
    // Large muscle groups - slowest recovery (48-72+ hours)
    quads: 1.2,          // ~83 hours for full recovery
    hamstrings: 1.3,     // ~77 hours
    glutes: 1.3,         // ~77 hours
    lowerBack: 1.5,      // ~67 hours
    
    // Medium muscle groups - moderate recovery (36-56 hours)
    pecs: 1.8,           // ~56 hours
    lats: 1.8,           // ~56 hours
    upperBack: 2.0,      // ~50 hours
    core: 2.2,           // ~45 hours
    
    // Small muscle groups - faster recovery (24-40 hours)
    anteriorDeltoids: 2.5,    // ~40 hours
    medialDeltoids: 2.5,      // ~40 hours
    posteriorDeltoids: 2.5,   // ~40 hours
    triceps: 2.8,             // ~36 hours
    biceps: 2.8,              // ~36 hours
    calves: 3.0,              // ~33 hours
    forearms: 3.5,            // ~29 hours
};