# User-Specific Exercise Capacity Limits Feature

## Overview
This feature allows each user to set personalized capacity limits (estimated 1-rep max) for each exercise. This ensures that workout intensity calculations are tailored to the individual user's strength levels, making the muscle capacity drain system more accurate and personalized.

## Why This Matters
Previously, the app used hardcoded 1RM estimates that were the same for all users. For example:
- Deadlift: 185 lbs
- Bench Press: 145 lbs
- Squat: 205 lbs

This meant that a beginner lifting 95 lbs on bench press and an advanced lifter lifting 225 lbs would have different intensity levels calculated incorrectly, as they'd both be compared against the same 145 lb baseline.

With this feature, each user can set their own personal bests, ensuring accurate intensity calculations that reflect their actual strength levels.

## How It Works

### 1. User-Specific Storage
- Each user's capacity limits are stored separately in AsyncStorage
- For logged-in users: `userCapacityLimits_{userId}`
- For guest users: `userCapacityLimits_guest`
- This ensures that different users can have different settings

### 2. Setting Exercise Limits
Users can customize their limits in the Preferences screen:

1. Navigate to the **Preferences** tab
2. Find the **Exercise Capacity Limits** section
3. Tap "Show" to expand the section
4. Set your estimated 1-rep max for each exercise
5. Values are saved automatically when you finish editing

### 3. How Limits Are Used
When you log a workout:

1. The system retrieves your personal 1RM for that exercise
2. Calculates intensity as: `(weight lifted) / (your 1RM) × 100%`
3. Uses this intensity percentage to determine muscle fatigue
4. Higher intensity = more muscle capacity drain

**Example:**
- User A's Bench Press 1RM: 145 lbs
  - Lifting 115 lbs = 79% intensity
- User B's Bench Press 1RM: 225 lbs  
  - Lifting 115 lbs = 51% intensity
  
User A experiences more fatigue from the same weight, which is physiologically accurate!

### 4. Default Values
If you haven't set custom values, the app uses conservative defaults that work for intermediate lifters. You can reset to these defaults at any time.

## Implementation Details

### Files Modified/Created

#### 1. `/context/UserCapacityContext.tsx` (NEW)
- Manages user-specific capacity limits
- Provides hooks for accessing and updating limits
- Handles user-specific storage keys
- Exports `useUserCapacity()` hook

#### 2. `/app/(protected)/(tabs)/preferences.tsx`
- Added new "Exercise Capacity Limits" section
- Allows users to view and edit their 1RM for each exercise
- Added reset functionality
- Integrated with UserCapacityContext

#### 3. `/helper/utils.ts`
- Modified `calculateCapacityDrain()` to use user-specific limits
- Added `getUserCapacityLimit()` function to retrieve user limits
- Falls back to default values if user hasn't set custom limits

#### 4. `/app/_layout.tsx`
- Wrapped app with `UserCapacityProvider` to make context available globally
- Placed within AuthProvider and ProfileProvider for proper user context

## API Reference

### UserCapacityContext

```typescript
interface UserCapacityContextType {
  capacityLimits: UserCapacityLimits;       // Current user's limits
  updateCapacityLimit: (exerciseName: string, value: number) => Promise<void>;
  resetToDefaults: () => Promise<void>;      // Reset all to defaults
  isLoading: boolean;                        // Loading state
}

// Usage
const { capacityLimits, updateCapacityLimit, resetToDefaults } = useUserCapacity();

// Update a limit
await updateCapacityLimit('Bench Press', 185);

// Reset all limits
await resetToDefaults();
```

### Utility Functions

```typescript
// Gets user-specific 1RM or falls back to default
async function getUserCapacityLimit(exerciseName: string): Promise<number>

// Uses user-specific limits in drain calculation
async function calculateCapacityDrain(
  exerciseName: string,
  weightUsed: Weight,
  repsCompleted: number
): Promise<MuscleCapacity>
```

## User Guide

### Setting Your Exercise Limits

1. **First Time Setup:**
   - Go to Preferences → Exercise Capacity Limits
   - Tap "Show" to expand the section
   - Set your estimated 1-rep max for exercises you regularly perform
   - Leave others at default if unsure

2. **Estimating Your 1RM:**
   - If you know your 1RM from testing: use that value
   - If you regularly do 5 reps at 200 lbs: your 1RM is approximately 225 lbs
   - Use the Epley formula: `1RM = Weight × (1 + Reps/30)`
   - Be conservative - it's better to underestimate than overestimate

3. **Updating Over Time:**
   - As you get stronger, update your limits
   - The app will automatically use new values for future workouts
   - Past workouts remain unchanged

### Best Practices

1. **Start Conservative:** It's better to underestimate your limits initially
2. **Update Regularly:** As you progress, update your limits every 4-6 weeks
3. **Be Honest:** Accurate limits = accurate fatigue tracking = better results
4. **Use Actual Data:** Base limits on actual performance, not aspirations
5. **Test Safely:** Never max out without proper warmup and spotters

## Benefits

1. **Personalized Tracking:** Each user gets accurate muscle fatigue calculations
2. **Multi-User Support:** Different family members can use the same device
3. **Progressive Overload:** Track strength gains by updating your limits
4. **Better Recovery:** More accurate fatigue = better rest recommendations
5. **Motivation:** See your limits increase over time as you get stronger

## Technical Notes

### Storage Strategy
- User limits stored per-user in AsyncStorage
- Survives app restarts
- Independent of workout logs
- Can be backed up/restored separately

### Performance
- Async operations don't block UI
- Limits cached in context after initial load
- Only updates when user explicitly changes values

### Future Enhancements
Potential improvements for future versions:

1. **Auto-estimation:** Automatically update 1RM estimates based on workout logs
2. **Export/Import:** Share limits between devices
3. **History Tracking:** See how your limits have improved over time
4. **Smart Recommendations:** Suggest limit adjustments based on performance
5. **Exercise Variations:** Link related exercises (e.g., flat vs incline bench)

## Troubleshooting

**Q: My muscle capacity drains too quickly/slowly**  
A: Check if your 1RM values are accurate. If they're too high, the app thinks you're lifting lighter weights than you actually are.

**Q: I reset my limits but they're still showing old values**  
A: Make sure to close and reopen the Preferences screen to see updated values.

**Q: Can I use different units (kg vs lbs)?**  
A: Currently, all values are in pounds. Metric support may be added in a future update.

**Q: What happens if I don't set custom limits?**  
A: The app uses conservative default values suitable for intermediate lifters.

## Summary

This feature transforms Side-Track from a one-size-fits-all approach to truly personalized fitness tracking. By allowing each user to define their own strength levels, the app can now provide accurate, individualized muscle fatigue tracking that adapts as you grow stronger.

Happy lifting! 💪
