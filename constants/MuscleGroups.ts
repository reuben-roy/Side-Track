export const muscleGroups = [
    "quads", "hamstrings", "glutes", "calves", "pecs", "anteriorDeltoids", "medialDeltoids", "posteriorDeltoids",
    "triceps", "biceps", "lats", "upperBack", "lowerBack", "core", "forearms"
] as const;
  
export type MuscleGroup = typeof muscleGroups[number]; 