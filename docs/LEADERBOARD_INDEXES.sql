-- ============================================================================
-- LEADERBOARD PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================
-- These composite indexes optimize common leaderboard query patterns
-- to reduce database load and improve query performance.
--
-- Run this after the main schema is created.
-- ============================================================================

-- Index for weekly + country + total_score queries
-- Used when filtering by location_country AND time='weekly' AND sort='total'
CREATE INDEX IF NOT EXISTS idx_user_strength_country_total_updated 
ON user_strength(location_country, total_score DESC, updated_at DESC)
WHERE location_country IS NOT NULL;

-- Index for weekly + country + wilks_score queries
-- Used when filtering by location_country AND time='weekly' AND sort='wilks'
CREATE INDEX IF NOT EXISTS idx_user_strength_country_wilks_updated 
ON user_strength(location_country, wilks_score DESC NULLS LAST, updated_at DESC)
WHERE location_country IS NOT NULL AND wilks_score IS NOT NULL;

-- Index for weekly + total_score queries (global, no location filter)
-- Used when time='weekly' AND sort='total' AND location='global'
CREATE INDEX IF NOT EXISTS idx_user_strength_total_updated 
ON user_strength(total_score DESC, updated_at DESC);

-- Index for weekly + wilks_score queries (global, no location filter)
-- Used when time='weekly' AND sort='wilks' AND location='global'
CREATE INDEX IF NOT EXISTS idx_user_strength_wilks_updated 
ON user_strength(wilks_score DESC NULLS LAST, updated_at DESC)
WHERE wilks_score IS NOT NULL;

-- Index for similar strength range queries (total_score)
-- Used when scoreFilter='similar' AND sort='total'
CREATE INDEX IF NOT EXISTS idx_user_strength_total_range 
ON user_strength(total_score DESC)
WHERE total_score > 0;

-- Index for similar strength range queries (wilks_score)
-- Used when scoreFilter='similar' AND sort='wilks'
CREATE INDEX IF NOT EXISTS idx_user_strength_wilks_range 
ON user_strength(wilks_score DESC NULLS LAST)
WHERE wilks_score IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify indexes were created:
-- 
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'user_strength' 
-- ORDER BY indexname;
--
-- You should see all the new indexes listed above.
-- ============================================================================

-- ============================================================================
-- PERFORMANCE TESTING
-- ============================================================================
-- Test query performance with EXPLAIN ANALYZE:
--
-- -- Test weekly + country + total_score query
-- EXPLAIN ANALYZE
-- SELECT * FROM user_strength
-- WHERE location_country = 'United States'
--   AND updated_at > NOW() - INTERVAL '7 days'
-- ORDER BY total_score DESC
-- LIMIT 100;
--
-- Look for "Index Scan" in the output - this means the index is being used.
-- ============================================================================

