/**
 * Strength Metrics and Ranking System
 * Defines core compound exercises and calculations for user strength comparison
 */

export const CORE_LIFTS = [
  'Squat',
  'Deadlift',
  'Bench Press',
  'Overhead Press',
  'Pull-Up',
  'Barbell Row',
  'Dumbbell Lunge',
  'Push-Up',
  'Triceps Dip',
] as const;

export type CoreLift = typeof CORE_LIFTS[number];

/**
 * Calculate total strength score based on sum of all compound lift 1RMs
 * This is the primary metric for ranking users
 */
export function calculateStrengthScore(capacityLimits: Record<string, number>): number {
  return CORE_LIFTS.reduce((total, lift) => {
    return total + (capacityLimits[lift] || 0);
  }, 0);
}

/**
 * Wilks coefficient calculation for bodyweight-adjusted strength comparison
 * More accurate for comparing lifters of different bodyweights
 * 
 * @param totalWeight - Sum of core lifts in pounds
 * @param bodyweightLbs - User bodyweight in pounds
 * @param gender - 'male' or 'female'
 * @returns Wilks score (higher is better)
 */
export function calculateWilksScore(
  totalWeight: number,
  bodyweightLbs: number,
  gender: 'male' | 'female'
): number {
  if (bodyweightLbs <= 0) return 0;
  
  const bw = bodyweightLbs * 0.453592; // convert to kg
  const total = totalWeight * 0.453592;
  
  // Wilks coefficient formula constants
  const coefficients = gender === 'male' 
    ? {
        a: -216.0475144,
        b: 16.2606339,
        c: -0.002388645,
        d: -0.00113732,
        e: 7.01863E-06,
        f: -1.291E-08,
      }
    : {
        a: 594.31747775582,
        b: -27.23842536447,
        c: 0.82112226871,
        d: -0.00930733913,
        e: 4.731582E-05,
        f: -9.054E-08,
      };
  
  const denominator = coefficients.a 
    + coefficients.b * bw 
    + coefficients.c * Math.pow(bw, 2)
    + coefficients.d * Math.pow(bw, 3)
    + coefficients.e * Math.pow(bw, 4)
    + coefficients.f * Math.pow(bw, 5);
  
  const wilksCoeff = 500 / denominator;
  return Math.round(total * wilksCoeff * 100) / 100;
}

/**
 * Get individual lift PRs from capacity limits
 */
export function getCoreLiftPRs(capacityLimits: Record<string, number>) {
  return {
    squat_1rm: capacityLimits['Squat'] || null,
    deadlift_1rm: capacityLimits['Deadlift'] || null,
    bench_press_1rm: capacityLimits['Bench Press'] || null,
    overhead_press_1rm: capacityLimits['Overhead Press'] || null,
    pull_up_1rm: capacityLimits['Pull-Up'] || null,
    barbell_row_1rm: capacityLimits['Barbell Row'] || null,
    dumbbell_lunge_1rm: capacityLimits['Dumbbell Lunge'] || null,
    push_up_1rm: capacityLimits['Push-Up'] || null,
    triceps_dip_1rm: capacityLimits['Triceps Dip'] || null,
  };
}
