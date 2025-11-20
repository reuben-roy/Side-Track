# Muscle Engagement Display Feature

## Overview
Added a swipeable tab interface to the workout screen with two pages: "Log Set" and "Muscle Info". The Muscle Info page displays comprehensive muscle engagement data showing which muscles are being engaged during each exercise, their current fatigue levels, and predicted drain from the selected set.

## Implementation Date
November 15, 2025

## Location
`app/(protected)/workout/WorkoutScreen.tsx`

## UI Design

### Tab Interface
The workout screen now features two tabs accessible via tab buttons:
- **Tab buttons**: Tap "Log Set" or "Exercise Info" to switch
- **Visual feedback**: Active tab is highlighted with a white background and red text
- **Instant switching**: No animations, immediate content change

### Tab 1: Log Set (Default)
The streamlined workout logging interface with:
- Completed sets list (if any)
- Weight and rep pickers
- Log Set button

### Tab 2: Exercise Info
A comprehensive page showing:
- **Exercise Statistics**:
  - Estimated 1RM
  - PR Weight
  - PR Reps
  - Total Sets (all-time)
  - Last Workout date
- **Muscle Engagement**:
  - Title: "Muscles Engaged"
  - Subtitle: Current weight/rep selection (e.g., "Based on 135 lbs × 8 reps")
  - Detailed muscle engagement cards (see features below)

## Features

### 1. **Tab Navigation**
- Two-page interface: "Log Set" and "Exercise Info"
- Tab buttons for direct navigation
- Active tab highlighted visually
- Conditional rendering for performance

### 2. **Muscle Engagement Card**
Displayed on the "Muscle Info" tab showing:
- All muscles involved in the exercise
- Sorted by involvement percentage (highest to lowest)
- Clean, card-based UI with rounded corners
- Dynamic subtitle showing current weight/rep selection

### 3. **Muscle Information Display**
For each engaged muscle, the display shows:

#### Muscle Name & Involvement
- Formatted muscle name (e.g., "Chest" instead of "pecs")
- Involvement percentage from exercise definition
- Example: "Chest - 60% involvement"

#### Current Capacity Bar
- Visual progress bar showing current muscle capacity (0-100%)
- Color-coded based on fatigue level:
  - **Green (≥70%)**: Fresh, ready to work
  - **Orange (40-69%)**: Moderate fatigue
  - **Red (<40%)**: High fatigue, needs recovery

#### Predicted Drain Indicator
- Semi-transparent red overlay showing how much the current set will drain
- Updates in real-time as user changes weight or reps
- Border indicator showing where capacity will be after the set

#### Capacity Numbers
- Current capacity percentage (color-coded)
- Predicted drain amount (e.g., "-5.2")

### 4. **Real-Time Updates**
The display automatically updates when:
- User switches tabs
- Weight selection changes (updates predicted drain in Exercise Info)
- Rep selection changes (updates predicted drain in Exercise Info)
- A set is logged (shows immediate capacity decrease)
- Tab indicator updates on tap

### 5. **Integration with Fatigue Model**
Leverages the improved fatigue model from `helper/utils.ts`:
- Uses `calculateCapacityDrain()` for predictions
- Accounts for muscle-specific 1RMs
- Uses exponential fatigue calculation
- Considers exercise MET values

## Example Display

### Tab Navigation
```
┌─────────────────────────────────┐
│        [Log Set] [Muscle Info]  │ ← Swipeable tabs
└─────────────────────────────────┘
```

### Muscle Info Tab
```
┌─ Muscles Engaged ────────────────┐
│  Based on 135 lbs × 8 reps       │
│                                   │
│  ┌─ Chest ────────────────────┐  │
│  │ 60% involvement            │  │
│  │ ████████████░░░░░ 75%  -5.2│  │
│  └────────────────────────────┘  │
│                                   │
│  ┌─ Front Delts ──────────────┐  │
│  │ 20% involvement            │  │
│  │ ██████████████░░░ 85%  -2.1│  │
│  └────────────────────────────┘  │
│                                   │
│  ┌─ Triceps ──────────────────┐  │
│  │ 20% involvement            │  │
│  │ ████████░░░░░░░░░ 45%  -3.8│  │
│  └────────────────────────────┘  │
│                                   │
└───────────────────────────────────┘
     ← Swipe left/right →
```

## Technical Details

### State Management
```typescript
const [muscleCapacity, setMuscleCapacity] = useState<Record<string, number>>({});
const [predictedDrain, setPredictedDrain] = useState<Record<string, number>>({});
const [currentTab, setCurrentTab] = useState<'workout' | 'muscles'>('workout');
const scrollX = useRef(new Animated.Value(0)).current;
const scrollViewRef = useRef<ScrollView>(null);
```

### Key Functions

#### `switchToTab(tab: 'workout' | 'muscles')`
- Switches between Log Set and Muscle Info tabs
- Animates scroll to correct page
- Updates tab indicator

#### `loadMuscleCapacity()`
- Loads current muscle capacity from AsyncStorage
- Falls back to `maxMuscleCapacity` if not found

#### `updatePredictedDrain()`
- Calculates predicted drain for current weight/rep selection
- Handles bodyweight exercises (+/-N format)
- Updates whenever weight or reps change

#### `formatMuscleName()`
- Converts technical muscle names to user-friendly labels
- Example: 'anteriorDeltoids' → 'Front Delts'

#### `getCapacityColor()`
- Returns color based on capacity level
- Green (≥70%), Orange (40-69%), Red (<40%)

#### `getMusclesEngaged()`
- Extracts muscles from exercise definition
- Sorts by involvement percentage
- Combines with current capacity and predicted drain

### Styling
New styles added for:
- **Tab Navigation**:
  - `tabContainer`: Container for tab buttons
  - `tab`: Individual tab button
  - `activeTab`: Active tab styling with shadow
  - `tabText`: Tab button text
  - `activeTabText`: Active tab text color
- **Swipe Interface**:
  - `swipeContainer`: Horizontal scroll container
  - `page`: Individual page wrapper
  - `pageScroll`: Scrollable content within each page
- **Muscle Engagement**:
  - `muscleEngagementContainer`: Main container with card styling
  - `muscleEngagementSubtitle`: Dynamic subtitle showing weight/reps
  - `muscleRow`: Individual muscle card
  - `capacityBarContainer`: Progress bar container
  - `capacityBar`: Filled portion showing current capacity
  - `drainIndicator`: Overlay showing predicted drain
  - Plus additional text and layout styles

## User Benefits

1. **Clean Interface**: Muscle info and exercise stats on separate tab keeps Log Set screen focused
2. **Easy Access**: Simple swipe gesture or tap to view comprehensive exercise information
3. **Informed Decision Making**: See exactly which muscles will be worked and view your PRs before logging a set
4. **Fatigue Awareness**: Visual feedback on current muscle capacity helps prevent overtraining
5. **Strategic Planning**: Can decide to reduce weight if a muscle is too fatigued
6. **Educational**: Learn which muscles each exercise targets and by how much
7. **Real-Time Feedback**: See capacity decrease immediately after logging sets
8. **Intuitive Navigation**: Familiar tab-based interface with smooth animations
9. **Progress Tracking**: All your exercise stats (1RM, PRs, total sets) in one convenient location

## Future Enhancements

Potential improvements:
1. Add muscle group icons/illustrations on Muscle Info tab
2. Show recovery time estimates for fatigued muscles
3. Add recommendations ("Chest is fatigued, try lighter weight")
4. Historical trend graph of muscle capacity over workout session
5. Suggested rest time between sets based on fatigue levels
6. Alternative exercise suggestions if target muscle too fatigued
7. Swipe gesture tutorial on first use
8. Haptic feedback on tab switch
9. Badge indicator on "Muscle Info" tab when muscles are highly fatigued

## Related Files
- `helper/utils.ts` - Fatigue calculation logic
- `constants/Exercises.ts` - Exercise definitions with muscle involvement
- `constants/MuscleGroups.ts` - Muscle group definitions
- `context/UserCapacityContext.tsx` - User capacity management
- `docs/IMPROVED_FATIGUE_MODEL.md` - Fatigue model documentation
