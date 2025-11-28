-- ============================================================================
-- USER STRENGTH LEADERBOARD TABLE
-- ============================================================================
-- This table stores aggregated strength metrics for each user to enable
-- ranking and leaderboard functionality. It's automatically synced from
-- the app when users update their exercise capacity limits.
--
-- To create this table in Supabase:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute
-- ============================================================================

-- Create the user_strength table
CREATE TABLE IF NOT EXISTS user_strength (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- User display name
  username TEXT,                                    -- Generated username for leaderboard display
  
  -- Primary strength metrics
  total_score INTEGER NOT NULL DEFAULT 0,           -- Sum of all compound lifts
  wilks_score REAL,                                 -- Bodyweight-adjusted score (optional)
  
  -- User profile data for Wilks calculation
  bodyweight_lbs REAL,                              -- Bodyweight in pounds
  gender TEXT CHECK (gender IN ('male', 'female')), -- Gender for Wilks formula
  
  -- Individual compound lift 1RM records (for detailed leaderboard display)
  squat_1rm INTEGER,
  deadlift_1rm INTEGER,
  bench_press_1rm INTEGER,
  overhead_press_1rm INTEGER,
  pull_up_1rm INTEGER,
  barbell_row_1rm INTEGER,
  dumbbell_lunge_1rm INTEGER,
  push_up_1rm INTEGER,
  triceps_dip_1rm INTEGER,
  
  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Create indexes for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_strength_total_score 
  ON user_strength(total_score DESC);

CREATE INDEX IF NOT EXISTS idx_user_strength_wilks_score 
  ON user_strength(wilks_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_user_strength_user_id 
  ON user_strength(user_id);

-- Index for username uniqueness checks (important for performance)
CREATE INDEX IF NOT EXISTS idx_user_strength_username 
  ON user_strength(username) 
  WHERE username IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE user_strength ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view the leaderboard (all strength records)
-- This allows users to see rankings without authentication barriers
CREATE POLICY "Public read access for leaderboard"
  ON user_strength
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own strength record
CREATE POLICY "Users can insert own strength record"
  ON user_strength
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update only their own strength record
CREATE POLICY "Users can update own strength record"
  ON user_strength
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete only their own strength record
CREATE POLICY "Users can delete own strength record"
  ON user_strength
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS (Optional but recommended)
-- ============================================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_strength_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before any update
CREATE TRIGGER update_user_strength_timestamp
  BEFORE UPDATE ON user_strength
  FOR EACH ROW
  EXECUTE FUNCTION update_user_strength_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the table was created successfully:

-- Check table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_strength';

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'user_strength';

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'user_strength';

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- Get top 10 strongest users by total weight
-- SELECT user_id, total_score, squat_1rm, deadlift_1rm, bench_press_1rm, overhead_press_1rm, 
--        pull_up_1rm, barbell_row_1rm, dumbbell_lunge_1rm, push_up_1rm, triceps_dip_1rm
-- FROM user_strength
-- ORDER BY total_score DESC
-- LIMIT 10;

-- Get top 10 by Wilks score (bodyweight-adjusted)
-- SELECT user_id, wilks_score, total_score, bodyweight_lbs, gender
-- FROM user_strength
-- WHERE wilks_score IS NOT NULL
-- ORDER BY wilks_score DESC
-- LIMIT 10;

-- Get a specific user's rank
-- WITH ranked AS (
--   SELECT user_id, total_score,
--          ROW_NUMBER() OVER (ORDER BY total_score DESC) as rank
--   FROM user_strength
-- )
-- SELECT rank, total_score
-- FROM ranked
-- WHERE user_id = 'YOUR_USER_ID_HERE';
