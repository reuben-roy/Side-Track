# Health Integration Setup Guide

This document explains how to complete the setup for Apple HealthKit and Android Health Connect integration.

## Overview

The health integration feature allows Side-Track to sync workout data, calories, and body metrics with:
- **iOS**: Apple HealthKit
- **Android**: Health Connect (replacing deprecated Google Fit)

## Current Status

The integration code is complete, but requires native module installation to function. The current implementation includes:
- ✅ Platform-agnostic health sync service
- ✅ iOS HealthKit placeholder implementation
- ✅ Android Health Connect placeholder implementation
- ✅ Health sync helper functions
- ✅ Settings UI for health integration
- ✅ Automatic sync on workout log and profile update
- ✅ Manual export/import functionality

## Required Native Modules

### iOS - Apple HealthKit

You need to install a React Native HealthKit library. Recommended options:

1. **@kingstinct/react-native-health** (Recommended)
   ```bash
   npm install @kingstinct/react-native-health
   npx pod-install
   ```

2. **react-native-health** (Alternative)
   ```bash
   npm install react-native-health
   npx pod-install
   ```

### Android - Health Connect

For Android, you need to install a Health Connect library:

1. **react-native-health-connect** (Recommended for Android 14+)
   ```bash
   npm install react-native-health-connect
   ```

2. **@react-native-community/google-fit** (Legacy, deprecated but works on older Android)
   ```bash
   npm install @react-native-community/google-fit
   ```

**Note**: Google Fit APIs are deprecated and will end support in June 2025. Health Connect is the recommended approach for Android 14+.

## Configuration Steps

### iOS Configuration

1. **Enable HealthKit in Xcode**:
   - Open `ios/SideTrack.xcworkspace` in Xcode
   - Select your target → Signing & Capabilities
   - Click "+ Capability" → Add "HealthKit"
   - Ensure HealthKit is enabled

2. **Info.plist is already configured** in `app.json`:
   - `NSHealthShareUsageDescription` - For reading health data
   - `NSHealthUpdateUsageDescription` - For writing health data

3. **Update the iOS implementation**:
   - Open `lib/healthSyncIOS.ts`
   - Replace placeholder imports with actual library imports
   - Implement the TODO sections using the library's API

### Android Configuration

1. **Add Health Connect permissions** to `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.health.READ_EXERCISE" />
   <uses-permission android:name="android.permission.health.WRITE_EXERCISE" />
   <uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
   <uses-permission android:name="android.permission.health.WRITE_ACTIVE_CALORIES_BURNED" />
   <uses-permission android:name="android.permission.health.READ_WEIGHT" />
   <uses-permission android:name="android.permission.health.WRITE_WEIGHT" />
   <uses-permission android:name="android.permission.health.READ_HEIGHT" />
   <uses-permission android:name="android.permission.health.WRITE_HEIGHT" />
   ```

2. **Add Health Connect package declaration**:
   ```xml
   <queries>
     <package android:name="com.google.android.apps.healthdata" />
   </queries>
   ```

3. **Update the Android implementation**:
   - Open `lib/healthSyncAndroid.ts`
   - Replace placeholder imports with actual library imports
   - Implement the TODO sections using the library's API

## Implementation Guide

### iOS HealthKit Implementation Example

Here's an example of how to implement the `writeWorkout` function using `@kingstinct/react-native-health`:

```typescript
import AppleHealthKit from '@kingstinct/react-native-health';

writeWorkout: async (workout: HealthWorkout): Promise<boolean> => {
  return new Promise((resolve) => {
    const workoutData = {
      type: 'TraditionalStrengthTraining',
      startDate: new Date(workout.date).toISOString(),
      endDate: new Date(new Date(workout.date).getTime() + (workout.duration || 120) * 1000).toISOString(),
      energy: workout.calories ? { unit: 'kilocalorie', value: workout.calories } : undefined,
      metadata: {
        exercise: workout.exercise,
        weight: workout.weight.toString(),
        reps: workout.reps.toString(),
      },
    };

    AppleHealthKit.saveWorkout(workoutData, (error: any) => {
      if (error) {
        console.error('Error saving workout:', error);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
},
```

### Android Health Connect Implementation Example

Here's an example for Health Connect (requires Android 14+):

```typescript
import { HealthConnect } from 'react-native-health-connect';

writeWorkout: async (workout: HealthWorkout): Promise<boolean> => {
  try {
    const exerciseSession = {
      exerciseType: 'STRENGTH_TRAINING',
      startTime: workout.date,
      endTime: new Date(new Date(workout.date).getTime() + (workout.duration || 120) * 1000).toISOString(),
      metadata: {
        exercise: workout.exercise,
        weight: workout.weight,
        reps: workout.reps,
      },
    };

    if (workout.calories) {
      exerciseSession.activeCalories = {
        energy: { kilocalories: workout.calories },
      };
    }

    await HealthConnect.insertRecords([exerciseSession]);
    return true;
  } catch (error) {
    console.error('Error writing workout:', error);
    return false;
  }
},
```

## Testing

1. **Build and run the app**:
   ```bash
   # iOS
   npx expo run:ios

   # Android
   npx expo run:android
   ```

2. **Test permissions**:
   - Navigate to Settings → Health Integration
   - Tap "Request Permissions"
   - Grant permissions in the system dialog

3. **Test sync**:
   - Log a workout
   - Check Apple Health app (iOS) or Health Connect app (Android)
   - Verify the workout appears

4. **Test import**:
   - Create a workout in Health app/Health Connect
   - Use "Import Workouts" in Side-Track settings
   - Verify workouts are imported

## Troubleshooting

### iOS Issues

- **HealthKit not available**: Ensure you're testing on a physical device (HealthKit doesn't work in simulator)
- **Permissions denied**: Check Info.plist usage descriptions are correct
- **Build errors**: Run `npx pod-install` after installing native modules

### Android Issues

- **Health Connect not found**: Ensure Health Connect app is installed (Android 14+) or use Google Fit for older devices
- **Permission errors**: Check AndroidManifest.xml permissions are correct
- **Build errors**: Clean and rebuild: `cd android && ./gradlew clean && cd ..`

## Features

### Automatic Sync
- **On Workout Log**: Automatically syncs when you log a workout (if enabled)
- **On Profile Update**: Automatically syncs body metrics when profile is updated (if enabled)

### Manual Sync
- **Export All Workouts**: Bulk export all workouts to health platform
- **Import Workouts**: Import workouts from health platform (last 30 days)

### Data Synced
- **Workouts**: Exercise name, weight, reps, date, duration, calories
- **Body Metrics**: Weight, height
- **Calories**: Daily active calories burned

## Notes

- Health sync failures are silent and don't interrupt the user flow
- Duplicate detection prevents importing workouts that already exist
- Side-Track data takes precedence in conflict resolution
- Last sync date is tracked and displayed in settings

