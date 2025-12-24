-- ============================================================================
-- ADD WEEKLY CALORIES COLUMN TO LEADERBOARD
-- ============================================================================
-- Run this in the Supabase SQL Editor to add the weekly_calories column
-- which stores total calories from Apple Health workouts (all types) in the last 7 days.
-- This enables ranking users by workout activity/calories burned.
-- ============================================================================

-- 1. Add the weekly_calories column
ALTER TABLE user_strength 
ADD COLUMN IF NOT EXISTS weekly_calories INTEGER DEFAULT NULL;

-- 2. Create index for sorting by calories
CREATE INDEX IF NOT EXISTS idx_user_strength_weekly_calories 
ON user_strength(weekly_calories DESC NULLS LAST);

-- 3. Create composite index for weekly + calories
CREATE INDEX IF NOT EXISTS idx_user_strength_calories_updated 
ON user_strength(weekly_calories DESC NULLS LAST, updated_at DESC)
WHERE weekly_calories IS NOT NULL;

-- 4. Create composite index for country + calories
CREATE INDEX IF NOT EXISTS idx_user_strength_country_calories_updated 
ON user_strength(location_country, weekly_calories DESC NULLS LAST, updated_at DESC)
WHERE location_country IS NOT NULL AND weekly_calories IS NOT NULL;

-- Done! The leaderboard will now support sorting by weekly calories.
-- Users will need to have Apple Health connected for their calories to appear.


