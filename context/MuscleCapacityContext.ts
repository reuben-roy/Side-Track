import { MuscleGroup, muscleGroups } from '../constants/MuscleGroups';

export const maxMuscleCapacity: Record<MuscleGroup, number> = Object.fromEntries(
  muscleGroups.map(muscle => [muscle, 100])
) as Record<MuscleGroup, number>;

export let currentMuscleCapacity: Record<MuscleGroup, number> = { ...maxMuscleCapacity };