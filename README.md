# Side-Track

> A React Native iOS weight-training app with a random workout picker, muscle-specific fatigue tracking, local leaderboard rankings, and Apple Health integration.

## What It Does

Side-Track removes decision fatigue from your gym routine. Instead of scrolling through plans, you hit **Randomize** and the app picks an exercise, weight, and rep target based on your goals and current muscle freshness.

### Core Features

- **Random Workout Generator** — Spin for a training-goal-aligned exercise (strength / hypertrophy / endurance). Filters out exercises targeting muscles below 30% capacity.
- **Muscle-Specific Fatigue Engine** — Tracks per-muscle capacity in SQLite with science-based recovery rates (e.g., quads recover ~1.2%/hour, biceps ~2.5%/hour).
- **1RM Auto-Estimation** — Uses multiple formulas (Epley, Brzycki, Lombardi, O'Conner) to estimate one-rep max from your workout history.
- **Local SQLite Database** — Per-user database files with full workout history, goals, capacity tracking, and settings.
- **Leaderboard** — Global and location-based rankings via Supabase, with smart filtering by time range, score type, and location.
- **Apple Health / HealthKit Sync** — Bi-directional workout and calorie sync (iOS). Android Health Connect support planned.
- **Apple Sign-In** — Native Apple authentication + Supabase session management.
- **Workout History & Stats** — Review past sessions, track volume progression, and visualize trends.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Expo](https://expo.dev/) SDK 53 + [React Native](https://reactnative.dev/) 0.79 |
| Language | TypeScript |
| Router | [Expo Router](https://docs.expo.dev/router/introduction/) v5 (file-based) |
| Styling | React Native StyleSheet (custom design system) |
| Animation | [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) v3 |
| Icons | [@expo/vector-icons](https://docs.expo.dev/guides/icons/) |
| Local DB | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) |
| Backend | [Supabase](https://supabase.com/) (Auth + Leaderboard) |
| Health | [react-native-healthkit](https://github.com/kingstinct/react-native-health) (iOS) / Health Connect (Android) |
| Charts | [react-native-gifted-charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) |

## Quick Start

```bash
# Install dependencies
npm install

# Start the Expo dev server
npx expo start

# Then press:
#   i  → open iOS simulator
#   a  → open Android emulator
```

> **Note:** The app uses Expo SDK 53 with the New Architecture enabled. Some native modules require `expo-dev-client` / EAS builds for full functionality.

## Project Structure

```
app/
  (protected)/           # Authenticated routes
    (tabs)/              # Main bottom-tabs navigation
      index.tsx          # Home / Randomize screen
      leaderboard.tsx    # Global & local rankings
      stats.tsx          # Workout history & analytics
      preferences.tsx    # User settings
    workout/             # Active workout screen
    settings/            # Deep settings pages
      fatigue.tsx        # Fatigue model configuration
      recovery.tsx       # Recovery rate settings
      health-data.tsx    # Apple Health / Health Connect
      backup.tsx         # Data export / import
      limits.tsx         # 1RM & capacity limits
    onboarding.tsx       # First-launch onboarding
  api/auth/              # API routes for Supabase + Apple auth
  _layout.tsx            # Root providers (auth, capacity, theme)
components/
  HumanMuscleMap.tsx     # SVG muscle map for fatigue visualization
  GoalsDisplay.tsx       # Current training goals UI
  SlotPicker.tsx         # iOS-style wheel picker
  MuscleCapacitySection.tsx
  MuscleInvolvementEditor.tsx
  ...
constants/
  Exercises.ts           # Exercise catalog with muscle maps, MET values
  MuscleGroups.ts        # Recovery rates & capacity definitions
  StrengthMetrics.ts     # 1RM formulas & constants
context/
  AuthContext.tsx
  SupabaseAuthContext.tsx
  UserCapacityContext.tsx
  ProfileContext.tsx
  MuscleCapacityContext.ts
lib/
  database.ts            # SQLite schema, CRUD, per-user DB files
  healthSync.ts          # HealthKit / Health Connect sync logic
  leaderboardCache.ts    # Supabase leaderboard with local caching
  onboarding.ts          # Onboarding flow state
  backup.ts              # Data export utilities
  supabase.ts            # Supabase client singleton
  unitConversions.ts     # lbs/kg, metric/imperial helpers
docs/
  1RM_FORMULA_COMPARISON.md
  AUTO_1RM_IMPLEMENTATION.md
  IMPROVED_FATIGUE_MODEL.md
  HEALTH_INTEGRATION_SETUP.md
  SUPABASE_LEADERBOARD_SCHEMA.sql
  ...
```

## How the Systems Work

### Fatigue & Recovery

Each muscle group has a `capacity` (0–100) and a recovery rate (%/hour). When you log a set:

1. Volume spike reduces the affected muscles’ capacity.
2. Recovery engine applies exponential decay based on time since last trained.
3. The randomizer skips exercises using muscles below the 30% threshold.

Recovery rates are tuned by muscle size:
- **Large muscles** (quads, hamstrings, glutes): ~1.2–1.5%/hour
- **Medium muscles** (chest, back, shoulders): ~1.8–2.2%/hour
- **Small muscles** (biceps, triceps, calves): ~2.5–3.5%/hour

### 1RM Estimation

Four estimation formulas run against your best recent sets. The app uses the average (or a configurable preferred formula) to set load targets for the randomizer.

### Leaderboard

- Supabase PostgreSQL backend with RLS policies.
- Smart ranking scopes: global, country, city.
- Time filters: all-time, weekly, monthly.
- Local caching with TTL to reduce API calls.

### Database

SQLite is initialized per-user (`sidetrack_{userId}.db`) with tables for:
- `workouts` & `workout_exercises` — session history
- `capacity_logs` — per-muscle fatigue snapshots
- `goals` — training targets
- `user_limits` — 1RM & custom capacity ceilings
- `settings` — app preferences

## Configuration

### Supabase

1. Create a Supabase project.
2. Run `docs/SUPABASE_LEADERBOARD_SCHEMA.sql` to create tables.
3. Add your Supabase URL + anon key to `lib/supabase.ts`.

### Apple Health (iOS)

The app already declares `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription` in `Info.plist` via `app.json` plugins. Ensure HealthKit capabilities are enabled in your Apple Developer account for EAS builds.

### Environment Variables

See `docs/ENVIRONMENT_VARIABLES.md` for optional environment overrides.

## EAS Build (Production)

```bash
# Configure EAS
npx eas build:configure

# Build for iOS
npx eas build --platform ios

# Build for Android
npx eas build --platform android
```

## License

No explicit LICENSE file. Assume all rights reserved unless otherwise stated.

---

Sweat and code by [Reuben Roy](https://github.com/reuben-roy).
