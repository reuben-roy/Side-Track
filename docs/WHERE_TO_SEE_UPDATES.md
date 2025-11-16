# Where to See Your Updated 1RM Values

## Real-Time Updates in Preferences

### Location
**Preferences Tab** → **Exercise Capacity Limits** → **Show**

### What You'll See

When you expand the Exercise Capacity Limits section, you'll see:
- A list of all 27 exercises
- Each exercise has:
  - Exercise name (e.g., "Bench Press")
  - Current 1RM estimate in pounds
  - "Estimated 1RM" label

### Real-Time Behavior

**Scenario 1: Hit a PR During Workout**
```
1. You're in the Workout screen
2. Log: Bench Press 155 lbs × 6 reps
3. App calculates: 186 lbs estimated 1RM
4. This beats your current 145 lbs limit
5. ✅ PR toast appears: "🎉 NEW PERSONAL RECORD! 🎉"
6. Navigate to Preferences → Exercise Capacity Limits
7. Bench Press now shows: 186 lbs (updated automatically!)
```

**Scenario 2: Already in Preferences When PR Hits**
```
1. Open Preferences → Exercise Capacity Limits
2. See Bench Press: 145 lbs
3. Go log a PR workout (155 lbs × 6 reps)
4. Return to Preferences
5. The input field automatically shows: 186 lbs
   (No need to refresh or reload!)
```

## Bulk Estimation Results

### How to Access
1. Preferences → Exercise Capacity Limits → **Show**
2. Scroll to bottom
3. Tap green button: **"Auto-Estimate from Workout History"**

### What Happens

**Step 1: Confirmation Dialog**
```
┌─────────────────────────────────────┐
│  Estimate from Workouts             │
├─────────────────────────────────────┤
│  Analyze all your workout logs and  │
│  automatically update your 1RM      │
│  estimates based on your best       │
│  performances?                      │
│                                     │
│         [Cancel]    [Estimate]      │
└─────────────────────────────────────┘
```

**Step 2: Processing**
- App analyzes all workout logs
- Finds best performance for each exercise
- Compares to current limits
- Updates where improvements found

**Step 3: Results Dialog**

**If Updates Were Made:**
```
┌─────────────────────────────────────┐
│  Success!                           │
├─────────────────────────────────────┤
│  Updated 7 exercise limits based    │
│  on your workout history.           │
│                                     │
│                  [OK]               │
└─────────────────────────────────────┘
```

**If No Updates Needed:**
```
┌─────────────────────────────────────┐
│  No Updates                         │
├─────────────────────────────────────┤
│  Your current limits are already    │
│  at or above your workout           │
│  performances.                      │
│                                     │
│                  [OK]               │
└─────────────────────────────────────┘
```

**Step 4: See Updated Values**
- Scroll through the exercise list
- Updated exercises now show higher values
- Changes are saved automatically

## Understanding the Numbers

### Input Field Display
```
┌────────────────────────────────────────┐
│  Bench Press                           │
│  Estimated 1RM                         │
│                          [  185  ] lbs │
└────────────────────────────────────────┘
```

**This number means:**
- Based on your workout logs
- You can lift approximately 185 lbs for 1 rep
- Used to calculate workout intensity
- Updated automatically when you hit PRs

### How It Updates

**Automatic (During Workouts):**
- You log: 155 lbs × 8 reps
- App calculates: 196 lbs estimated 1RM
- Compares to current: 185 lbs
- 196 > 185 → UPDATE!
- Field now shows: 196 lbs

**Manual (You Can Edit):**
- Tap the number field
- Enter a new value (e.g., 200)
- Tap away or submit
- Value updates immediately
- Won't be auto-lowered, only increased by PRs

## Visual Flow

### PR During Workout
```
Workout Screen                    Preferences Screen
     ↓                                   ↓
Log 155×8 reps          →      Exercise Capacity Limits
     ↓                                   ↓
Estimate: 196 lbs              Bench Press: 185 → 196
     ↓                                   ↓
196 > 185 = PR!                  (Updates automatically)
     ↓
Show PR Toast 🎉
```

### Bulk Estimation
```
Preferences Screen
     ↓
Tap "Auto-Estimate"
     ↓
Confirmation Dialog → [Estimate]
     ↓
Processing...
     ↓
Results Dialog: "Updated 7 exercises"
     ↓
[OK] → Return to list
     ↓
See updated values in exercise list
```

## Tips for Viewing Updates

1. **After a PR:**
   - Check Preferences immediately to see the new value
   - The update is instant (powered by React Context)

2. **Bulk Estimation:**
   - Look at the count in the success dialog
   - Then scroll through to find which exercises updated
   - Updated ones will have higher numbers than you remember

3. **Tracking Progress:**
   - Take screenshots of your limits periodically
   - Compare after a few weeks of training
   - See which exercises improved the most!

4. **Troubleshooting:**
   - If a value doesn't seem to update, check the console logs
   - PR detection logs show: "🎉 NEW PR for [exercise]!"
   - Bulk estimation logs show each update

## Summary

**Where to see updated counts after bulk estimation:**
→ In the **Alert dialog** that pops up after clicking "Estimate"

**Where to see individual updated values:**
→ In the **Exercise Capacity Limits list** in Preferences (updates in real-time)

**When updates happen:**
- **Instantly** after hitting a PR during workout
- **After confirmation** when using bulk estimation
- **No refresh needed** - Context handles propagation automatically
