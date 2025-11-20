# Improved Fatigue Model Implementation

## Overview
This document describes the improved fatigue and recovery model implemented in `helper/utils.ts`.

## Key Improvements

### 1. **Exponential Fatigue Calculation**
The new model uses a more realistic exponential formula for fatigue:

```
cost = involvement × C0 × (%1RM^p) × (reps^q) × MET × metMultiplier
drain = 100 × (1 - exp(-cost))
```

**Parameters:**
- `C0 = 0.05`: Base fatigue magnitude
- `p = 2.0`: Sensitivity to %1RM (exponential scaling means heavier weights cause disproportionately more fatigue)
- `q = 1.0`: Sensitivity to reps (linear relationship)
- `metMultiplier = 0.15`: MET value contribution from exercise data

### 2. **Muscle-Specific 1RM Tracking**
- Each muscle now has its own 1RM value stored in AsyncStorage (`muscle1RMs`)
- Falls back to estimating from exercise sets using Epley formula
- More accurate than exercise-level 1RM tracking

### 3. **Exponential Recovery Model**
Recovery now uses an exponential approach to 100% capacity:

```
recovered = maxCap - (maxCap - currentCap) × exp(-lambda × hours)
where lambda = -ln(1 - recoveryRate/100)
```

This creates a realistic recovery curve where:
- Recovery is faster when you're more fatigued
- Recovery slows as you approach full capacity
- Asymptotically approaches 100% (never overshoots)

### 4. **New Feature: Rep Prediction**
The `predictRepsPossible()` function predicts how many reps you can do at a given weight based on:
- Current muscle fatigue levels
- Muscle-specific 1RMs
- Exercise muscle involvement patterns

## Customization

All parameters can be customized via AsyncStorage:

### Fatigue Parameters (`fatigueParams`)
```typescript
{
  C0: 0.05,           // Adjust overall fatigue magnitude
  p: 2.0,             // Adjust weight intensity sensitivity
  q: 1.0,             // Adjust rep count sensitivity
  metMultiplier: 0.15 // Adjust MET value influence
}
```

### Recovery Rates (`customRecoveryRates`)
```typescript
{
  chest: 3.0,         // percent per hour
  biceps: 2.5,
  // ... other muscles
}
```

### Muscle 1RMs (`muscle1RMs`)
```typescript
{
  chest: 200,         // pounds
  biceps: 80,
  // ... other muscles
}
```

## Benefits

1. **More Realistic Fatigue**: Exponential scaling with %1RM means lifting 90% of your max drains much more than lifting 50%
2. **Better Recovery Modeling**: Exponential recovery curve matches real-world muscle recovery patterns
3. **Muscle-Specific Tracking**: Different muscles can have different strengths and recover at different rates
4. **Leverages Exercise Data**: Uses the MET values already defined in `constants/Exercises.ts`
5. **Predictive Capabilities**: Can estimate rep capacity before attempting a set
6. **Fully Customizable**: All parameters can be tuned per user

## Migration Notes

The improved model is **backward compatible** with existing:
- User capacity limits (exercise-level 1RMs)
- Custom recovery rates
- Bodyweight settings

New features will automatically initialize with sensible defaults if not set.

## Example Usage

```typescript
// Calculate drain from a set
const drain = await calculateCapacityDrain('Bench Press', 135, 8);
// Returns: { chest: 15.2, anteriorDeltoids: 8.7, triceps: 12.1 }

// Apply recovery over 2 hours
const newCapacity = await applyRecovery(currentCapacity, 2);

// Predict reps at a weight
const reps = await predictRepsPossible('Bench Press', 145, currentCapacity);
// Returns: 6 (predicted reps possible at 145 lbs)
```

## Formula Comparison

### Old Model
```
drain = (MET × 0.5 + reps × 0.3 + intensity × 2.5) × involvement × 35
```
- Simple linear combination
- Fixed coefficients
- No exponential scaling

### New Model
```
cost = involvement × 0.05 × (%1RM^2.0) × (reps^1.0) × MET × 0.15
drain = 100 × (1 - exp(-cost))
```
- Exponential scaling with %1RM
- Uses MET values from exercise database
- More physiologically accurate
- Configurable parameters
