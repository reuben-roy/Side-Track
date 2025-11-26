import * as SQLite from 'expo-sqlite';
import { muscleGroups } from '../constants/MuscleGroups';

// ============================================================================
// DATABASE INSTANCE (User-Specific)
// ============================================================================

let dbInstance: SQLite.SQLiteDatabase | null = null;
let currentUserId: string | null = null;

/**
 * Get the database filename for a user
 * Each user gets their own isolated database file
 */
function getDatabaseName(userId: string | null): string {
  if (!userId) {
    // Fallback for unauthenticated state - should rarely be used
    return 'sidetrack_anonymous.db';
  }
  // Sanitize userId to be filesystem-safe (replace non-alphanumeric with underscore)
  const safeUserId = userId.replace(/[^a-zA-Z0-9]/g, '_');
  return `sidetrack_${safeUserId}.db`;
}

/**
 * Initialize database for a specific user
 * Call this when a user logs in
 */
export async function initializeDatabaseForUser(userId: string): Promise<void> {
  // If switching users, close the current database
  if (dbInstance && currentUserId !== userId) {
    await closeDatabase();
  }
  
  currentUserId = userId;
  await getDatabase();
}

/**
 * Close and clear the current database instance
 * Call this when a user logs out
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
    currentUserId = null;
  }
}

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    const dbName = getDatabaseName(currentUserId);
    console.log(`Opening database: ${dbName} for user: ${currentUserId || 'anonymous'}`);
    dbInstance = await SQLite.openDatabaseAsync(dbName);
    await initializeSchema();
    await migrateFromKeyValue();
  }
  return dbInstance;
}

/**
 * Check if database is initialized for a user
 */
export function isDatabaseInitialized(): boolean {
  return dbInstance !== null && currentUserId !== null;
}

/**
 * Get the current user ID associated with the database
 */
export function getCurrentDatabaseUserId(): string | null {
  return currentUserId;
}

// ============================================================================
// SCHEMA INITIALIZATION
// ============================================================================

async function initializeSchema(): Promise<void> {
  const db = dbInstance!;
  
  await db.execAsync(`
    -- User profile data
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      weight REAL,
      height TEXT,
      calorie_goal INTEGER,
      gender TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Exercise capacity limits (1RM per exercise)
    CREATE TABLE IF NOT EXISTS exercise_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_name TEXT UNIQUE NOT NULL,
      one_rm REAL NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Individual workout logs (each set is a row)
    CREATE TABLE IF NOT EXISTS workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_name TEXT NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Current muscle capacity state
    CREATE TABLE IF NOT EXISTS muscle_capacity (
      muscle_name TEXT PRIMARY KEY,
      capacity REAL NOT NULL DEFAULT 100,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- User preferences (key-value for flexibility)
    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Keep key_value table for Supabase auth tokens
    CREATE TABLE IF NOT EXISTS key_value (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise ON workout_logs(exercise_name);
    CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(created_at);
  `);

  // Initialize muscle capacity with defaults if empty
  const capacityCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM muscle_capacity'
  );
  
  if (capacityCount?.count === 0) {
    const insertStmt = await db.prepareAsync(
      'INSERT OR IGNORE INTO muscle_capacity (muscle_name, capacity) VALUES (?, 100)'
    );
    try {
      for (const muscle of muscleGroups) {
        await insertStmt.executeAsync([muscle]);
      }
    } finally {
      await insertStmt.finalizeAsync();
    }
  }
}

// ============================================================================
// MIGRATION FROM OLD KEY-VALUE STORE
// ============================================================================

async function migrateFromKeyValue(): Promise<void> {
  const db = dbInstance!;
  
  // Check if migration is needed
  const migrated = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM key_value WHERE key = 'migration_completed_v2'"
  );
  
  if (migrated) return;
  
  console.log('Starting migration from key-value store...');
  
  try {
    // Migrate profile
    const profileStr = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM key_value WHERE key = 'profile'"
    );
    if (profileStr?.value) {
      const profile = JSON.parse(profileStr.value);
      await db.runAsync(
        `INSERT OR REPLACE INTO profile (id, weight, height, calorie_goal, gender)
         VALUES (1, ?, ?, ?, ?)`,
        [
          parseFloat(profile.weight) || null,
          profile.height || null,
          parseInt(profile.calorieGoal) || null,
          profile.gender || null
        ]
      );
      console.log('Migrated profile');
    }

    // Migrate exercise limits (find any userCapacityLimits_* key)
    const limitsRows = await db.getAllAsync<{ key: string; value: string }>(
      "SELECT key, value FROM key_value WHERE key LIKE 'userCapacityLimits_%'"
    );
    if (limitsRows.length > 0) {
      // Use the first non-default one, or default
      const limitsRow = limitsRows.find(r => !r.key.includes('default')) || limitsRows[0];
      const limits = JSON.parse(limitsRow.value);
      
      const insertStmt = await db.prepareAsync(
        'INSERT OR REPLACE INTO exercise_limits (exercise_name, one_rm) VALUES (?, ?)'
      );
      try {
        for (const [exercise, oneRm] of Object.entries(limits)) {
          await insertStmt.executeAsync([exercise, oneRm as number]);
        }
      } finally {
        await insertStmt.finalizeAsync();
      }
      console.log('Migrated exercise limits');
    }

    // Migrate workout logs
    const logsStr = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM key_value WHERE key = 'workoutLogs'"
    );
    if (logsStr?.value) {
      const logs = JSON.parse(logsStr.value);
      if (Array.isArray(logs) && logs.length > 0) {
        const insertStmt = await db.prepareAsync(
          'INSERT INTO workout_logs (exercise_name, weight, reps, created_at) VALUES (?, ?, ?, ?)'
        );
        try {
          for (const log of logs) {
            await insertStmt.executeAsync([
              log.exercise,
              log.weight,
              log.reps,
              log.date
            ]);
          }
        } finally {
          await insertStmt.finalizeAsync();
        }
        console.log(`Migrated ${logs.length} workout logs`);
      }
    }

    // Migrate muscle capacity
    const capacityStr = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM key_value WHERE key = 'muscleCapacity'"
    );
    if (capacityStr?.value) {
      const capacity = JSON.parse(capacityStr.value);
      const updateStmt = await db.prepareAsync(
        'UPDATE muscle_capacity SET capacity = ?, updated_at = CURRENT_TIMESTAMP WHERE muscle_name = ?'
      );
      try {
        for (const [muscle, cap] of Object.entries(capacity)) {
          await updateStmt.executeAsync([cap as number, muscle]);
        }
      } finally {
        await updateStmt.finalizeAsync();
      }
      console.log('Migrated muscle capacity');
    }

    // Migrate user preferences
    const prefsStr = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM key_value WHERE key = 'userPreferences'"
    );
    if (prefsStr?.value) {
      const prefs = JSON.parse(prefsStr.value);
      const insertStmt = await db.prepareAsync(
        'INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)'
      );
      try {
        for (const [key, val] of Object.entries(prefs)) {
          await insertStmt.executeAsync([key, JSON.stringify(val)]);
        }
      } finally {
        await insertStmt.finalizeAsync();
      }
      console.log('Migrated user preferences');
    }

    // Mark migration as complete
    await db.runAsync(
      "INSERT OR REPLACE INTO key_value (key, value) VALUES ('migration_completed_v2', ?)",
      [new Date().toISOString()]
    );
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface Profile {
  weight: string;
  height: string;
  calorieGoal: string;
  gender: string;
}

export interface WorkoutLog {
  id: number;
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

export interface ExerciseLimit {
  exerciseName: string;
  oneRm: number;
}

export interface MuscleCapacityState {
  [muscle: string]: number;
}

// ============================================================================
// PROFILE OPERATIONS
// ============================================================================

export async function getProfile(): Promise<Profile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    weight: number | null;
    height: string | null;
    calorie_goal: number | null;
    gender: string | null;
  }>('SELECT weight, height, calorie_goal, gender FROM profile WHERE id = 1');
  
  if (!row) return null;
  
  return {
    weight: row.weight?.toString() || '',
    height: row.height || '',
    calorieGoal: row.calorie_goal?.toString() || '',
    gender: row.gender || '',
  };
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO profile (id, weight, height, calorie_goal, gender, updated_at)
     VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      parseFloat(profile.weight) || null,
      profile.height || null,
      parseInt(profile.calorieGoal) || null,
      profile.gender || null
    ]
  );
}

// ============================================================================
// WORKOUT LOGS OPERATIONS
// ============================================================================

export async function addWorkoutLog(
  exercise: string,
  weight: number,
  reps: number
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO workout_logs (exercise_name, weight, reps) VALUES (?, ?, ?)',
    [exercise, weight, reps]
  );
  return result.lastInsertRowId;
}

export async function getWorkoutLogs(limit?: number): Promise<WorkoutLog[]> {
  const db = await getDatabase();
  const query = limit
    ? 'SELECT id, exercise_name, weight, reps, created_at FROM workout_logs ORDER BY created_at DESC LIMIT ?'
    : 'SELECT id, exercise_name, weight, reps, created_at FROM workout_logs ORDER BY created_at DESC';
  
  const rows = await db.getAllAsync<{
    id: number;
    exercise_name: string;
    weight: number;
    reps: number;
    created_at: string;
  }>(query, limit ? [limit] : []);
  
  return rows.map(row => ({
    id: row.id,
    exercise: row.exercise_name,
    weight: row.weight,
    reps: row.reps,
    date: row.created_at,
  }));
}

export async function getWorkoutLogsByExercise(exercise: string): Promise<WorkoutLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    exercise_name: string;
    weight: number;
    reps: number;
    created_at: string;
  }>(
    'SELECT id, exercise_name, weight, reps, created_at FROM workout_logs WHERE exercise_name = ? ORDER BY created_at DESC',
    [exercise]
  );
  
  return rows.map(row => ({
    id: row.id,
    exercise: row.exercise_name,
    weight: row.weight,
    reps: row.reps,
    date: row.created_at,
  }));
}

export async function deleteWorkoutLog(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM workout_logs WHERE id = ?', [id]);
}

export async function getExerciseStats(exercise: string): Promise<{
  maxWeight: number;
  maxReps: number;
  totalSets: number;
  lastWorkoutDate: string | null;
}> {
  const db = await getDatabase();
  
  const stats = await db.getFirstAsync<{
    max_weight: number | null;
    max_reps: number | null;
    total_sets: number;
    last_date: string | null;
  }>(
    `SELECT 
      MAX(weight) as max_weight,
      MAX(reps) as max_reps,
      COUNT(*) as total_sets,
      MAX(created_at) as last_date
     FROM workout_logs 
     WHERE exercise_name = ?`,
    [exercise]
  );
  
  return {
    maxWeight: stats?.max_weight || 0,
    maxReps: stats?.max_reps || 0,
    totalSets: stats?.total_sets || 0,
    lastWorkoutDate: stats?.last_date || null,
  };
}

export async function getWorkoutLogsInRange(
  startDate: Date,
  endDate: Date
): Promise<WorkoutLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    exercise_name: string;
    weight: number;
    reps: number;
    created_at: string;
  }>(
    `SELECT id, exercise_name, weight, reps, created_at 
     FROM workout_logs 
     WHERE created_at >= ? AND created_at <= ?
     ORDER BY created_at DESC`,
    [startDate.toISOString(), endDate.toISOString()]
  );
  
  return rows.map(row => ({
    id: row.id,
    exercise: row.exercise_name,
    weight: row.weight,
    reps: row.reps,
    date: row.created_at,
  }));
}

// ============================================================================
// EXERCISE LIMITS (1RM) OPERATIONS
// ============================================================================

export async function getExerciseLimit(exercise: string): Promise<number | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ one_rm: number }>(
    'SELECT one_rm FROM exercise_limits WHERE exercise_name = ?',
    [exercise]
  );
  return row?.one_rm ?? null;
}

export async function getAllExerciseLimits(): Promise<Record<string, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ exercise_name: string; one_rm: number }>(
    'SELECT exercise_name, one_rm FROM exercise_limits'
  );
  
  const limits: Record<string, number> = {};
  for (const row of rows) {
    limits[row.exercise_name] = row.one_rm;
  }
  return limits;
}

export async function saveExerciseLimit(exercise: string, oneRm: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO exercise_limits (exercise_name, one_rm, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [exercise, oneRm]
  );
}

export async function saveAllExerciseLimits(limits: Record<string, number>): Promise<void> {
  const db = await getDatabase();
  const stmt = await db.prepareAsync(
    'INSERT OR REPLACE INTO exercise_limits (exercise_name, one_rm, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
  );
  try {
    for (const [exercise, oneRm] of Object.entries(limits)) {
      await stmt.executeAsync([exercise, oneRm]);
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

// ============================================================================
// MUSCLE CAPACITY OPERATIONS
// ============================================================================

export async function getMuscleCapacity(): Promise<MuscleCapacityState> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ muscle_name: string; capacity: number }>(
    'SELECT muscle_name, capacity FROM muscle_capacity'
  );
  
  const capacity: MuscleCapacityState = {};
  for (const row of rows) {
    capacity[row.muscle_name] = row.capacity;
  }
  
  // Ensure all muscle groups have a value
  for (const muscle of muscleGroups) {
    if (capacity[muscle] === undefined) {
      capacity[muscle] = 100;
    }
  }
  
  return capacity;
}

export async function updateMuscleCapacity(
  muscle: string,
  capacity: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO muscle_capacity (muscle_name, capacity, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [muscle, Math.max(0, Math.min(100, capacity))]
  );
}

export async function updateAllMuscleCapacity(
  capacities: MuscleCapacityState
): Promise<void> {
  const db = await getDatabase();
  const stmt = await db.prepareAsync(
    'INSERT OR REPLACE INTO muscle_capacity (muscle_name, capacity, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
  );
  try {
    for (const [muscle, capacity] of Object.entries(capacities)) {
      await stmt.executeAsync([muscle, Math.max(0, Math.min(100, capacity))]);
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

export async function resetMuscleCapacity(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE muscle_capacity SET capacity = 100, updated_at = CURRENT_TIMESTAMP');
}

// ============================================================================
// USER PREFERENCES OPERATIONS
// ============================================================================

export async function getPreference<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM user_preferences WHERE key = ?',
    [key]
  );
  
  if (!row) return defaultValue;
  
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return defaultValue;
  }
}

export async function setPreference<T>(key: string, value: T): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)',
    [key, JSON.stringify(value)]
  );
}

export async function getAllPreferences(): Promise<Record<string, unknown>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM user_preferences'
  );
  
  const prefs: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      prefs[row.key] = JSON.parse(row.value);
    } catch {
      prefs[row.key] = row.value;
    }
  }
  return prefs;
}

// ============================================================================
// KEY-VALUE STORE (for auth tokens only)
// ============================================================================

export async function getKeyValue(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM key_value WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setKeyValue(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO key_value (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function removeKeyValue(key: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM key_value WHERE key = ?', [key]);
}

export async function getAllKeyValueKeys(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string }>('SELECT key FROM key_value');
  return rows.map(r => r.key);
}

// ============================================================================
// DATABASE UTILITIES
// ============================================================================

export async function initializeDatabase(): Promise<void> {
  await getDatabase();
}

export async function clearAllData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM profile;
    DELETE FROM workout_logs;
    DELETE FROM exercise_limits;
    UPDATE muscle_capacity SET capacity = 100;
    DELETE FROM user_preferences;
  `);
}
