# Automatic 1RM Estimation Feature

## Overview
The app now automatically estimates and updates your one-rep max (1RM) based on your actual workout performance! Every time you complete a set, the system checks if you've achieved a new personal record and updates your capacity limits accordingly.

## How It Works

### 1. **Automatic PR Detection**
When you log a workout set, the app:
1. Calculates your estimated 1RM using the **Epley Formula**: `1RM = Weight × (1 + Reps/30)`
2. Compares it to your current 1RM estimate for that exercise
3. If it's higher → **NEW PERSONAL RECORD!** 🎉
4. Automatically updates your capacity limit
5. Shows you a celebration notification

### 2. **The Epley Formula**
This widely-used formula estimates your 1RM based on:
- **Weight lifted**: The actual weight you used
- **Reps completed**: How many repetitions you performed

**Examples:**
- Bench Press 135 lbs × 8 reps = `135 × (1 + 8/30)` = **171 lbs** estimated 1RM
- Squat 225 lbs × 5 reps = `225 × (1 + 5/30)` = **263 lbs** estimated 1RM
- Deadlift 315 lbs × 1 rep = `315 × (1 + 1/30)` = **326 lbs** estimated 1RM

### 3. **Smart Updates**
The system only updates when you improve:
- ✅ New estimate > Current limit → **UPDATE & CELEBRATE**
- ❌ New estimate ≤ Current limit → No change (you've done better before)

## Features

### 🎯 Real-Time PR Tracking
Every workout is a chance to break your record!
- Log a set as usual
- If it's a PR, you'll see: **"🎉 NEW PERSONAL RECORD! 🎉"**
- Your 1RM is automatically updated
- No manual input needed!

### 📊 Bulk Estimation from History
Want to analyze all your past workouts at once?

1. Go to **Preferences** → **Exercise Capacity Limits**
2. Tap **"Auto-Estimate from Workout History"**
3. Confirm in the dialog that appears
4. The app analyzes every workout you've logged
5. Finds your best performance for each exercise
6. Updates all your 1RM estimates automatically
7. **Shows a success dialog** with the count of updated exercises

**Example Results:**
- "Updated 7 exercise limits based on your workout history" ✅
- "Your current limits are already at or above your workout performances" (if no updates needed)

**Perfect for:**
- First-time setup (if you've already logged workouts)
- Recovering from a reset
- Getting accurate estimates without manual entry
- Syncing your limits after manually changing some values

### 🔄 Continuous Improvement Tracking
Your capacity limits now reflect your **actual** strength, not guesses:
- Start with conservative defaults
- Each workout refines your estimates
- Limits grow as you get stronger
- Always based on real performance data

## User Guide

### Setting Up

#### Option 1: Let It Build Naturally (Recommended)
1. Start working out and logging sets normally
2. The app learns your strength over time
3. Each PR automatically updates your limits
4. After a few workouts, you'll have accurate estimates

#### Option 2: Quick Setup from History
1. If you already have workout logs:
   - Go to Preferences → Exercise Capacity Limits
   - Tap "Auto-Estimate from Workout History"
   - All limits updated instantly based on your best performances

#### Option 3: Manual Entry
- Still available in Preferences if you prefer
- Useful for exercises you haven't logged yet
- Can override auto-estimates if needed

### Understanding PRs

**What counts as a PR?**
- Any performance that results in a higher estimated 1RM
- This could be:
  - ✅ More weight at same reps
  - ✅ Same weight at more reps
  - ✅ Any combo that increases estimated 1RM

**Examples:**
```
Current 1RM: 200 lbs

Scenario A: 175 lbs × 10 reps
  Estimated: 175 × (1 + 10/30) = 233 lbs ✅ NEW PR!

Scenario B: 150 lbs × 8 reps  
  Estimated: 150 × (1 + 8/30) = 190 lbs ❌ Not a PR

Scenario C: 205 lbs × 1 rep
  Estimated: 205 × (1 + 1/30) = 212 lbs ✅ NEW PR!
```

### Viewing Your Progress

Your current 1RM estimates are always visible in:
- **Preferences** → **Exercise Capacity Limits**
- Shows estimated 1RM for all 27 exercises
- **Updates in real-time** as you hit PRs (the input values refresh automatically)
- Scroll through the list to see all your current limits

### Best Practices

1. **Log Every Set**
   - Even "easy" sets help refine estimates
   - The more data, the more accurate

2. **Don't Fake PRs**
   - Only log actual completed sets
   - Estimates are only as good as your data

3. **Use Auto-Estimate Periodically**
   - If you manually change limits, run auto-estimate to sync
   - Helps catch any missed PRs

4. **Trust the Process**
   - Estimates improve over time
   - A few workouts = rough estimate
   - Months of data = very accurate

## Technical Details

### Epley Formula Accuracy
The Epley formula is most accurate when:
- **Reps are between 1-10**
- **Intensity is high** (80%+ of 1RM)
- **Proper form is maintained**

Less accurate for:
- Very high rep sets (15+)
- Low intensity endurance work
- Exercises with form breakdown

### Storage & Persistence
- Estimates saved per logged-in user
- Survives app restarts
- Independent of workout logs
- Backed up with other preferences
- One set of limits per user account

### Calculation Example
```typescript
// User benches 135 lbs for 8 reps
const weight = 135;
const reps = 8;

// Epley formula
const estimated1RM = Math.round(weight * (1 + reps / 30));
// = Math.round(135 * (1 + 8/30))
// = Math.round(135 * 1.267)
// = Math.round(171)
// = 171 lbs

// Compare to current limit
const currentLimit = 145; // lbs

if (estimated1RM > currentLimit) {
  // 171 > 145 ✅ NEW PR!
  updateCapacityLimit('Bench Press', 171);
  showPRNotification();
}
```

## Benefits

### 1. **Zero Manual Effort**
- No need to calculate or enter 1RM values
- Happens automatically as you train
- One less thing to think about

### 2. **Always Accurate**
- Based on actual performance, not estimates
- Updates as you get stronger
- Reflects current ability, not past or aspirational

### 3. **Motivation Boost**
- Immediate feedback when you hit PRs
- See progress in real-time
- Encourages progressive overload

### 4. **Better Muscle Fatigue Tracking**
- More accurate intensity calculations
- Better recovery recommendations
- Personalized to YOUR strength level

### 5. **User-Specific Tracking**
- Each logged-in user has their own capacity limits
- Data persists across sessions
- Limits reflect YOUR individual strength

## Comparison: Before vs After

### Before (Manual System)
❌ Had to estimate your own 1RM  
❌ Easy to forget to update  
❌ Often inaccurate or outdated  
❌ Same default values for everyone  
❌ Required math and manual entry  

### After (Auto-Estimation)
✅ Automatic calculation from workouts  
✅ Always up-to-date  
✅ Based on real performance data  
✅ Personalized to each user  
✅ Zero manual work required  

## FAQ

**Q: What if I don't want auto-updates?**  
A: You can still manually set limits in Preferences. Auto-updates only happen if the new estimate is higher.

**Q: Can I override an auto-estimate?**  
A: Yes! Manually set any value in Preferences. It won't be auto-lowered, only increased by PRs.

**Q: What if I test my actual 1RM?**  
A: Log it as a 1-rep set! The app will recognize it as a PR and update accordingly.

**Q: Does this work for bodyweight exercises?**  
A: Yes! The app accounts for your bodyweight and any added weight (like weighted pull-ups).

**Q: What happens if I take a break and get weaker?**  
A: Limits stay at your peak unless you manually lower them. This lets you see what you were capable of and work back to it.

**Q: Can I see my PR history?**  
A: Currently PRs update limits but aren't tracked separately. This could be a future enhancement!

**Q: How accurate is the Epley formula?**  
A: Very accurate for 1-10 reps at high intensity. Less accurate for high-rep endurance work (15+ reps).

## Future Enhancements

Potential improvements for future versions:

1. **PR History Log**
   - Track when each PR was achieved
   - Show progress graphs over time
   - Celebrate milestones

2. **Multiple Formula Options**
   - Brzycki formula
   - Lombardi formula
   - User-selectable preference

3. **Rep Range Optimization**
   - Different formulas for different rep ranges
   - More accurate across all intensities

4. **Smart Suggestions**
   - "You're close to a PR! Try X weight for Y reps"
   - Progressive overload recommendations

5. **PR Streaks & Badges**
   - Gamification of progress
   - Weekly/monthly PR goals
   - Achievement system

## Summary

The automatic 1RM estimation feature transforms your fitness tracking from static to dynamic. Your capacity limits now grow with you, automatically reflecting your improving strength. Every workout is a chance to set a new record, and when you do, you'll know it immediately!

No more guessing, no more manual updates, just pure data-driven progress tracking that celebrates your achievements. 💪

**Happy lifting, and may you break many PRs!** 🎉
