/**
 * Leaderboard Cache Manager
 * 
 * Simple cache system to reduce Supabase API calls and stay within free tier limits.
 * Cache duration is configurable via EXPO_PUBLIC_LEADERBOARD_CACHE_DURATION_MS env variable.
 * Default: 10 minutes (600000 ms)
 */

export interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  total_score: number;
  wilks_score: number | null;
  bodyweight_lbs: number | null;
  gender: string | null;
  squat_1rm: number | null;
  deadlift_1rm: number | null;
  bench_press_1rm: number | null;
  overhead_press_1rm: number | null;
  location_city: string | null;
  location_country: string | null;
  updated_at: string;
}

/**
 * Columns to select from user_strength table
 * Only fetch what we need to reduce data transfer
 */
export const LEADERBOARD_SELECT_COLUMNS = `
  user_id,
  username,
  total_score,
  wilks_score,
  bodyweight_lbs,
  gender,
  squat_1rm,
  deadlift_1rm,
  bench_press_1rm,
  overhead_press_1rm,
  location_city,
  location_country,
  updated_at
`.trim();

export type SortMode = 'total' | 'wilks';
export type TimeFilter = 'all_time' | 'weekly';
export type LocationFilter = 'global' | 'country';
export type ScoreFilter = 'all' | 'similar';

interface CacheKey {
  sortMode: SortMode;
  timeFilter: TimeFilter;
  locationFilter: LocationFilter;
  scoreFilter: ScoreFilter;
  filterValue?: string; // e.g. country code
}

interface CacheEntry {
  data: LeaderboardEntry[];
  timestamp: number;
  key: string;
}

// Cache duration: configurable via env variable, default 10 minutes (600000 ms)
// Set EXPO_PUBLIC_LEADERBOARD_CACHE_DURATION_MS in your .env file to customize
// Example: EXPO_PUBLIC_LEADERBOARD_CACHE_DURATION_MS=300000 (5 minutes)
const CACHE_DURATION_MS = process.env.EXPO_PUBLIC_LEADERBOARD_CACHE_DURATION_MS 
  ? parseInt(process.env.EXPO_PUBLIC_LEADERBOARD_CACHE_DURATION_MS, 10)
  : 10 * 60 * 1000; // Default: 10 minutes

let leaderboardCache: Map<string, CacheEntry> = new Map();

const generateCacheKey = (
  sortMode: SortMode, 
  timeFilter: TimeFilter, 
  locationFilter: LocationFilter,
  scoreFilter: ScoreFilter,
  filterValue?: string
): string => {
  return `${sortMode}:${timeFilter}:${locationFilter}:${scoreFilter}:${filterValue || ''}`;
};

/**
 * Get cached leaderboard data if it exists and is still valid
 */
export function getCachedLeaderboard(
  sortMode: SortMode,
  timeFilter: TimeFilter = 'all_time',
  locationFilter: LocationFilter = 'global',
  scoreFilter: ScoreFilter = 'all',
  filterValue?: string
): LeaderboardEntry[] | null {
  const key = generateCacheKey(sortMode, timeFilter, locationFilter, scoreFilter, filterValue);
  const entry = leaderboardCache.get(key);

  if (!entry) {
    return null;
  }

  const cacheAge = Date.now() - entry.timestamp;
  const isCacheValid = cacheAge < CACHE_DURATION_MS;

  if (isCacheValid) {
    return entry.data;
  }

  leaderboardCache.delete(key);
  return null;
}

/**
 * Set cached leaderboard data
 */
export function setCachedLeaderboard(
  data: LeaderboardEntry[], 
  sortMode: SortMode,
  timeFilter: TimeFilter = 'all_time',
  locationFilter: LocationFilter = 'global',
  scoreFilter: ScoreFilter = 'all',
  filterValue?: string
): void {
  const key = generateCacheKey(sortMode, timeFilter, locationFilter, scoreFilter, filterValue);
  leaderboardCache.set(key, {
    data,
    timestamp: Date.now(),
    key,
  });
}

/**
 * Invalidate the cache (call this when user updates their own data)
 */
export function invalidateCache(): void {
  leaderboardCache.clear();
}

/**
 * Check if cache exists and is valid
 */
export function isCacheValid(
  sortMode: SortMode,
  timeFilter: TimeFilter = 'all_time',
  locationFilter: LocationFilter = 'global',
  scoreFilter: ScoreFilter = 'all',
  filterValue?: string
): boolean {
  const key = generateCacheKey(sortMode, timeFilter, locationFilter, scoreFilter, filterValue);
  const entry = leaderboardCache.get(key);
  
  if (!entry) {
    return false;
  }

  const cacheAge = Date.now() - entry.timestamp;
  return cacheAge < CACHE_DURATION_MS;
}

/**
 * Get the cache timestamp (when data was last fetched)
 */
export function getCacheTimestamp(
  sortMode: SortMode,
  timeFilter: TimeFilter = 'all_time',
  locationFilter: LocationFilter = 'global',
  scoreFilter: ScoreFilter = 'all',
  filterValue?: string
): number | null {
  const key = generateCacheKey(sortMode, timeFilter, locationFilter, scoreFilter, filterValue);
  return leaderboardCache.get(key)?.timestamp || null;
}

/**
 * Get the cache duration in milliseconds
 */
export function getCacheDurationMs(): number {
  return CACHE_DURATION_MS;
}

