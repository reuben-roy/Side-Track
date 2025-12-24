-- ============================================================================
-- FINAL LEADERBOARD SCHEMA & INDEXES
-- ============================================================================
-- Run this entire file in the Supabase SQL Editor to ensure your database
-- is correctly set up for the leaderboard feature.
-- ============================================================================

-- 1. Create the user_strength table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_strength (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- User display name
  username TEXT,
  
  -- Primary strength metrics
  total_score INTEGER NOT NULL DEFAULT 0,
  wilks_score REAL,
  weekly_calories INTEGER,              -- Total calories from Apple Health workouts (all types) in last 7 days
  
  -- User profile data
  bodyweight_lbs REAL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  
  -- Individual compound lift 1RM records
  squat_1rm INTEGER,
  deadlift_1rm INTEGER,
  bench_press_1rm INTEGER,
  overhead_press_1rm INTEGER,
  pull_up_1rm INTEGER,
  barbell_row_1rm INTEGER,
  dumbbell_lunge_1rm INTEGER,
  push_up_1rm INTEGER,
  triceps_dip_1rm INTEGER,
  
  -- Location Data (Added in update)
  location_city TEXT,
  location_region TEXT,
  location_country TEXT,
  location_iso_country_code TEXT,

  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure one record per user
  UNIQUE(user_id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE user_strength ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies (Drop existing to ensure latest version)
DROP POLICY IF EXISTS "Public read access for leaderboard" ON user_strength;
CREATE POLICY "Public read access for leaderboard" ON user_strength FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own strength record" ON user_strength;
CREATE POLICY "Users can insert own strength record" ON user_strength FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own strength record" ON user_strength;
CREATE POLICY "Users can update own strength record" ON user_strength FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own strength record" ON user_strength;
CREATE POLICY "Users can delete own strength record" ON user_strength FOR DELETE USING (auth.uid() = user_id);

-- 4. Create Indexes for Performance (Basic)
CREATE INDEX IF NOT EXISTS idx_user_strength_total_score ON user_strength(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_strength_wilks_score ON user_strength(wilks_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_user_strength_user_id ON user_strength(user_id);
CREATE INDEX IF NOT EXISTS idx_user_strength_username ON user_strength(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_strength_location_country ON user_strength(location_country);

-- 5. Create Composite Indexes for Advanced Filtering (NEW & CRITICAL)
-- These optimize the "Weekly + Location" and "Similar Strength" queries
-- preventing full table scans.

-- Weekly + Country + Total Score
CREATE INDEX IF NOT EXISTS idx_user_strength_country_total_updated 
ON user_strength(location_country, total_score DESC, updated_at DESC)
WHERE location_country IS NOT NULL;

-- Weekly + Country + Wilks Score
CREATE INDEX IF NOT EXISTS idx_user_strength_country_wilks_updated 
ON user_strength(location_country, wilks_score DESC NULLS LAST, updated_at DESC)
WHERE location_country IS NOT NULL AND wilks_score IS NOT NULL;

-- Weekly + Global + Total Score
CREATE INDEX IF NOT EXISTS idx_user_strength_total_updated 
ON user_strength(total_score DESC, updated_at DESC);

-- Weekly + Global + Wilks Score
CREATE INDEX IF NOT EXISTS idx_user_strength_wilks_updated 
ON user_strength(wilks_score DESC NULLS LAST, updated_at DESC)
WHERE wilks_score IS NOT NULL;

-- Similar Strength Range (Total Score)
CREATE INDEX IF NOT EXISTS idx_user_strength_total_range 
ON user_strength(total_score DESC)
WHERE total_score > 0;

-- Similar Strength Range (Wilks Score)
CREATE INDEX IF NOT EXISTS idx_user_strength_wilks_range 
ON user_strength(wilks_score DESC NULLS LAST)
WHERE wilks_score IS NOT NULL;

-- Weekly Calories Index (for calories leaderboard)
CREATE INDEX IF NOT EXISTS idx_user_strength_weekly_calories 
ON user_strength(weekly_calories DESC NULLS LAST);

-- Weekly + Global + Calories
CREATE INDEX IF NOT EXISTS idx_user_strength_calories_updated 
ON user_strength(weekly_calories DESC NULLS LAST, updated_at DESC)
WHERE weekly_calories IS NOT NULL;

-- Weekly + Country + Calories
CREATE INDEX IF NOT EXISTS idx_user_strength_country_calories_updated 
ON user_strength(location_country, weekly_calories DESC NULLS LAST, updated_at DESC)
WHERE location_country IS NOT NULL AND weekly_calories IS NOT NULL;

-- 6. Setup Auto-Update Trigger
CREATE OR REPLACE FUNCTION update_user_strength_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_strength_timestamp ON user_strength;
CREATE TRIGGER update_user_strength_timestamp
  BEFORE UPDATE ON user_strength
  FOR EACH ROW
  EXECUTE FUNCTION update_user_strength_updated_at();

