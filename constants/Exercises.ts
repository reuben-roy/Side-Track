export const exercises = [
  { name: 'Barbell Bicep Curl', weights: [15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 3.5, muscles: { biceps: 1.0 } },
  { name: 'Barbell Row', weights: [15, 25, 35, 45, 50, 55, 60, 65, 70, 75, 80, 85, 95, 105, 115, 125, 135, 145, 155, 165, 175, 185, 205, 225, 245, 275, 315], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 6.5, muscles: { lats: 0.4, upperBack: 0.4, biceps: 0.1, rearDeltoids: 0.1 } },
  { name: 'Bench Press', weights: [15, 25, 35, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 115, 125, 135, 145, 155, 165, 185, 205, 225, 245, 265, 285, 315, 365, 405], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 6, muscles: { pecs: 0.6, triceps: 0.2, anteriorDeltoids: 0.2 } },
  { name: 'Cable Fly', weights: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 4, muscles: { pecs: 0.9, anteriorDeltoids: 0.1 } },
  { name: 'Calf Raise', weights: [0, 5, 7.5, 10, 12.5, 15, 17.5, 20, 25, 30, 35, 40, 50, 60, 70, 80, 100, 120, 140, 160, 180, 200, 250, 300, 350, 400, 450, 500], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 4, muscles: { calves: 1.0 } },
  { name: 'Deadlift', weights: [45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165, 185, 205, 225, 245, 275, 315, 365, 405, 455, 495, 545, 585, 635], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 8, muscles: { hamstrings: 0.3, glutes: 0.3, lowerBack: 0.2, quads: 0.1, upperBack: 0.1 } },
  { name: 'Dumbbell Curl', weights: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 3.5, muscles: { biceps: 0.8, forearms: 0.2 } },
  { name: 'Dumbbell Lateral Raise', weights: [2, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 60], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 3, muscles: { medialDeltoids: 0.9, anteriorDeltoids: 0.1 } },
  { name: 'Dumbbell Press', weights: [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100, 110, 120, 130, 140, 150], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 5.5, muscles: { pecs: 0.6, triceps: 0.2, anteriorDeltoids: 0.2 } },
  { name: 'Face Pull', weights: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 150], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 4.5, muscles: { rearDeltoids: 0.5, upperBack: 0.5 } },
  { name: 'Hip Thrust', weights: [0, 25, 45, 65, 85, 105, 115, 135, 155, 185, 205, 225, 275, 315, 365, 405, 455, 505, 555, 605, 655, 705, 755], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 6.5, muscles: { glutes: 0.7, hamstrings: 0.2, quads: 0.1 } },
  { name: 'Incline Bench Press', weights: [15, 25, 35, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 105, 115, 125, 135, 145, 155, 165, 185, 205, 225, 245, 275, 315], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 6, muscles: { pecs: 0.6, anteriorDeltoids: 0.2, triceps: 0.2 } },
  { name: 'Lat Pulldown', weights: [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 170, 190, 210, 230, 250, 275, 300], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 6, muscles: { lats: 0.6, biceps: 0.2, upperBack: 0.2 } },
  { name: 'Leg Extension', weights: [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 95, 110, 125, 140, 155, 170, 185, 200, 220, 240, 260], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 4, muscles: { quads: 1.0 } },
  { name: 'Leg Press', weights: [45, 90, 115, 135, 160, 180, 205, 225, 270, 315, 360, 405, 450, 495, 540, 585, 630, 720, 810, 900, 990, 1080, 1170, 1260], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 7, muscles: { quads: 0.6, glutes: 0.2, hamstrings: 0.1, calves: 0.1 } },
  { name: 'Machine Chest Press', weights: [10, 15, 17.5, 20, 22.5, 25, 30, 32.5, 35, 37.5, 40, 45, 50, 60, 70, 80, 90, 100, 115, 130, 145, 160, 180, 205, 230, 255, 280, 305, 330, 355], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 5.5, muscles: { pecs: 0.7, triceps: 0.2, anteriorDeltoids: 0.1 } },
  { name: 'Overhead Press', weights: [15, 25, 35, 45, 50, 55, 60, 65, 70, 75, 80, 85, 95, 105, 115, 125, 135, 145, 155, 165, 175, 185, 205], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 5.5, muscles: { anteriorDeltoids: 0.5, medialDeltoids: 0.2, triceps: 0.2, core: 0.1 } },
  { name: 'Overhead Rope Extension', weights: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 4.5, muscles: { triceps: 1.0 } },
  { name: 'Pec Deck (Machine Fly)', weights: [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 115, 130, 145, 160, 180, 200, 225, 250], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 5, muscles: { pecs: 1.0 } },
  { name: 'Pull-Up', weights: ['-100', '-90', '-80', '-70', '-60', '-50', '-40', '-30', '-20', '-10', 'Bodyweight', '+10', '+20', '+30', '+40', '+50', '+60', '+70', '+80', '+90', '+100', '+110', '+120', '+150'], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 7, muscles: { lats: 0.5, biceps: 0.3, upperBack: 0.2 } },
  { name: 'Romanian Deadlift', weights: [15, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 155, 185, 205, 225, 245, 275, 315, 365, 405, 455], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 6, muscles: { hamstrings: 0.6, glutes: 0.3, lowerBack: 0.1 } },
  { name: 'Rope Cable Crunch', weights: [10, 15, 17.5, 20, 22.5, 25, 30, 32.5, 35, 37.5, 40, 45, 50, 55, 60, 65, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200, 220, 240, 260], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 4, muscles: { core: 1.0 } },
  { name: 'Rope Triceps Pushdown', weights: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 4.5, muscles: { triceps: 1.0 } },
  { name: 'Seated Leg Curl', weights: [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 95, 110, 125, 140, 155, 170, 185, 200, 220], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 4, muscles: { hamstrings: 1.0 } },
  { name: 'Seated Row', weights: [5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 225, 250, 275, 300], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 5.5, muscles: { upperBack: 0.5, lats: 0.3, biceps: 0.2 } },
  { name: 'Single Arm DB Row', weights: [5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 5, muscles: { lats: 0.5, upperBack: 0.3, biceps: 0.2 } },
  { name: 'Squat', weights: [0, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 155, 175, 195, 215, 235, 255, 275, 315, 365, 405, 455, 495, 545, 585], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 7.5, muscles: { quads: 0.5, glutes: 0.3, hamstrings: 0.1, core: 0.1 } },
  { name: 'Sumo Deadlift', weights: [45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165, 185, 205, 225, 245, 275, 315, 365, 405, 455, 495, 545, 585, 635], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 8, muscles: { glutes: 0.4, hamstrings: 0.3, quads: 0.2, lowerBack: 0.1 } },
  { name: 'Weighted Plank', weights: [0, 5, 10, 15, 20, 25, 35, 45, 55, 70, 90, 115, 135], reps: Array.from({ length: 30 }, (_, i) => i + 1), met: 4, muscles: { core: 1.0 } },
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
