# Workout Page Navigation Guide

## Overview
The workout page now features a dual-tab interface for a cleaner, more organized experience.

## How to Navigate

### Tab Buttons
Tap either tab at the top to switch views:
- **Log Set**: Main workout logging interface
- **Exercise Info**: Detailed exercise statistics and muscle engagement data

The active tab is highlighted with a white background and red text.

## Tab 1: Log Set

**Purpose**: Log your workout sets quickly and efficiently

**Content**:
- **Completed Sets** (if any)
  - Shows sets logged in current session
  - Displays weight, reps, and timestamp
  - Scrollable list
- **Weight & Rep Pickers**
  - Slot picker wheels for easy selection
  - Supports bodyweight, +/- weight variations
- **Log Set Button**
  - Big red button to log your set
  - Shows "Logging..." feedback

## Tab 2: Exercise Info

**Purpose**: View exercise statistics and understand muscle engagement

**Content**:
- **Exercise Stats**
  - Estimated 1RM
  - PR Weight
  - PR Reps
- **Secondary Stats**
  - Total Sets completed all-time
  - Last Workout date
- **Muscle Engagement Section**
  - **Header**
    - Title: "Muscles Engaged"
    - Subtitle: Shows current weight/rep selection
      - Example: "Based on 135 lbs × 8 reps"
  - **Muscle Cards** (sorted by involvement)
    - **Muscle Name**: User-friendly format (e.g., "Chest", "Front Delts")
    - **Involvement**: Percentage of muscle engagement
    - **Capacity Bar**: Visual gauge with color coding
      - 🟢 Green (70-100%): Fresh and ready
      - 🟠 Orange (40-69%): Moderate fatigue
      - 🔴 Red (0-39%): High fatigue, needs recovery
    - **Current Capacity**: Percentage value
    - **Predicted Drain**: How much this set will reduce capacity
      - Shown as a red overlay on the bar
      - Numeric value (e.g., "-5.2")

## Dynamic Updates

### When changing weight or reps:
- Exercise Info tab automatically recalculates predicted drain
- Subtitle updates to show new selection
- Capacity bars show new drain predictions

### When logging a set:
- Set appears in "Completed Sets" on Log Set tab
- Exercise Info tab updates capacity bars immediately
- New capacity reflects the drain from the logged set
- Toast notification confirms set was logged

### When switching tabs:
- Instant transition between pages
- Tab indicator updates immediately
- Content resets to top of scroll

## Tips for Best Use

1. **Before Starting**: Check Exercise Info tab to see which muscles are fresh and view your PRs
2. **During Workout**: Stay on Log Set tab for quick set logging
3. **Between Sets**: Switch to Exercise Info to see muscle recovery and stats
4. **Planning Next Set**: Use predicted drain to gauge if you can handle the weight
5. **Track Progress**: View your 1RM estimates and PRs on Exercise Info tab

## Color Guide

### Tab Colors
- **Inactive Tab**: Gray text on light gray background
- **Active Tab**: Red text on white background with subtle shadow

### Capacity Colors
- **Green**: Muscle is fresh, go heavy if you want
- **Orange**: Muscle is working hard, be mindful
- **Red**: Muscle is fatigued, consider lighter weight or rest

### Drain Indicator
- **Light Red Overlay**: Shows where capacity will be after the set
- **Dark Red Border**: Marks the exact endpoint of predicted capacity

## Example Workflow

1. Open workout screen for "Bench Press"
2. **Tap** Exercise Info tab
3. See your stats: 1RM 145 lbs, PR Weight 135 lbs, PR Reps 10
4. Check muscles: chest (60%), front delts (20%), triceps (20%)
5. Notice chest at 75%, will drop to ~70% with current selection
6. **Tap** Log Set tab
7. Select 135 lbs × 8 reps
8. Hit the red "Log Set" button
9. Set appears in "Completed Sets" list
10. **Tap** Exercise Info to see updated muscle capacity
11. Repeat for next set

## Accessibility

- Large touch targets for tab buttons
- Instant tab switching (no animations to wait for)
- Color coding supplemented with numeric values
- Scrollable content in both tabs
- Clear visual hierarchy

## Technical Notes

- Tab state persists during workout session
- Muscle capacity loads from AsyncStorage on mount
- Predicted drain recalculates on every weight/rep change
- Uses conditional rendering for tab content (no nested ScrollViews)
- Simple and performant tab switching
