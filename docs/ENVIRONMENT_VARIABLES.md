# Environment Variables

This document describes the environment variables used in the Side-Track app, particularly those related to Supabase API call optimization.

## Supabase Configuration

### Required Variables

- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

## API Call Optimization Variables

These variables help reduce Supabase API calls to stay within the free tier limits.

### `EXPO_PUBLIC_LEADERBOARD_CACHE_DURATION_MS`

**Purpose**: Controls how long leaderboard data is cached before fetching fresh data from Supabase.

**Default**: `300000` (5 minutes)

**Example Values**:
- `300000` (5 minutes) - Default, good balance
- `600000` (10 minutes) - More aggressive caching
- `900000` (15 minutes) - Maximum caching for minimal API calls
- `60000` (1 minute) - Less caching, more fresh data

**Usage**: Set this in your `.env` file:
```bash
EXPO_PUBLIC_LEADERBOARD_CACHE_DURATION_MS=600000
```

**Impact**: 
- Higher values = fewer API calls but potentially stale data
- Lower values = more API calls but fresher data
- The cache is automatically invalidated when the user updates their own strength data

### `EXPO_PUBLIC_SYNC_DEBOUNCE_MS`

**Purpose**: Controls how long to wait after the last exercise capacity update before syncing to Supabase. This batches multiple updates into a single API call.

**Default**: `10000` (10 seconds)

**Example Values**:
- `5000` (5 seconds) - Faster sync, more API calls
- `10000` (10 seconds) - Default, good balance
- `15000` (15 seconds) - More batching, fewer API calls
- `30000` (30 seconds) - Maximum batching for minimal API calls

**Usage**: Set this in your `.env` file:
```bash
EXPO_PUBLIC_SYNC_DEBOUNCE_MS=15000
```

**Impact**:
- Higher values = more updates batched together = fewer API calls
- Lower values = faster sync but potentially more API calls
- All updates within the debounce window are batched into a single sync operation

**Example Scenario**:
If a user updates 5 exercises within 10 seconds:
- With default (10s): All 5 updates batched → 1 API call
- With 5s debounce: Might result in 2-3 API calls if updates are spread out
- With 30s debounce: All updates batched → 1 API call

## Setting Up Environment Variables

1. Create a `.env` file in the project root (if it doesn't exist)
2. Add your variables:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   EXPO_PUBLIC_LEADERBOARD_CACHE_DURATION_MS=600000
   EXPO_PUBLIC_SYNC_DEBOUNCE_MS=15000
   ```
3. Restart your Expo development server for changes to take effect

**Note**: Make sure `.env` is in your `.gitignore` to avoid committing sensitive keys.

## Recommended Settings for Free Tier

To maximize your free tier usage:

```bash
# Cache leaderboard for 10 minutes
EXPO_PUBLIC_LEADERBOARD_CACHE_DURATION_MS=600000

# Batch updates for 15 seconds
EXPO_PUBLIC_SYNC_DEBOUNCE_MS=15000
```

These settings provide a good balance between data freshness and API call reduction.

