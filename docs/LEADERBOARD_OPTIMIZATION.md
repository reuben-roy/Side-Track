# Leaderboard Optimization & Security Analysis

## Current Implementation Analysis

### Data Fetching
- **Current**: Uses `.select('*')` to fetch all columns
- **Limit**: 100 rows per query (good)
- **Caching**: 5-minute cache (good)
- **Issue**: Smart view loads up to 3 queries in parallel

### Security Concerns

#### ⚠️ Public Data Exposure
The leaderboard exposes the following data publicly (via RLS policy `USING (true)`):
- `user_id` (UUID) - Can be used to correlate with other data
- Location data (city, region, country, ISO code)
- Bodyweight and gender
- All strength metrics (1RM values for all exercises)
- `updated_at` timestamp

**Considerations:**
1. **User ID Exposure**: UUIDs can be used to track users across sessions
2. **Location Privacy**: City-level location may be too granular for some users
3. **Bodyweight/Gender**: Some users may consider this sensitive

**Recommendations:**
- Consider using a display ID instead of exposing `user_id` directly
- Add option for users to opt-out of location sharing
- Consider making city-level location optional (country-only)

### Cost & Performance Concerns

#### 🔴 Missing Composite Indexes
The current queries filter by multiple columns but lack composite indexes:

**Common Query Patterns:**
1. `location_country + total_score + updated_at` (weekly + country filter)
2. `location_country + wilks_score + updated_at` (weekly + country + wilks)
3. `total_score + updated_at` (weekly global)
4. `wilks_score + updated_at` (weekly global + wilks)

**Current Indexes:**
- ✅ `idx_user_strength_total_score` (single column)
- ✅ `idx_user_strength_wilks_score` (single column)
- ✅ `idx_user_strength_location_country` (single column)
- ❌ **Missing**: Composite indexes for common filter combinations

#### 🔴 Weekly Filter Performance
The weekly filter uses `updated_at > oneWeekAgo`, which:
- May require a full table scan if not properly indexed
- Could be expensive as the table grows

#### 🟡 Similar Strength Filter
- Requires an extra query to fetch current user's score first
- Then filters by score range (80%-120%)
- Could be optimized with a single query using window functions

#### 🟡 Multiple Parallel Queries
Smart view loads 3 queries in parallel:
- Weekly + Local + Similar
- Weekly + Global + Similar  
- Weekly + Global + All

This is acceptable but increases database load.

---

## Recommended Optimizations

### 1. Add Composite Indexes

Create these indexes to optimize common query patterns:

```sql
-- For weekly + country + total_score queries
CREATE INDEX IF NOT EXISTS idx_user_strength_country_total_updated 
ON user_strength(location_country, total_score DESC, updated_at DESC)
WHERE location_country IS NOT NULL;

-- For weekly + country + wilks_score queries
CREATE INDEX IF NOT EXISTS idx_user_strength_country_wilks_updated 
ON user_strength(location_country, wilks_score DESC NULLS LAST, updated_at DESC)
WHERE location_country IS NOT NULL AND wilks_score IS NOT NULL;

-- For weekly + total_score queries (global)
CREATE INDEX IF NOT EXISTS idx_user_strength_total_updated 
ON user_strength(total_score DESC, updated_at DESC);

-- For weekly + wilks_score queries (global)
CREATE INDEX IF NOT EXISTS idx_user_strength_wilks_updated 
ON user_strength(wilks_score DESC NULLS LAST, updated_at DESC)
WHERE wilks_score IS NOT NULL;

-- For similar strength range queries
CREATE INDEX IF NOT EXISTS idx_user_strength_total_range 
ON user_strength(total_score DESC)
WHERE total_score > 0;

CREATE INDEX IF NOT EXISTS idx_user_strength_wilks_range 
ON user_strength(wilks_score DESC NULLS LAST)
WHERE wilks_score IS NOT NULL;
```

### 2. Optimize Column Selection

Instead of `.select('*')`, select only needed columns:

```typescript
// Current (line 132)
.select('*')

// Optimized
.select(`
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
  pull_up_1rm,
  barbell_row_1rm,
  dumbbell_lunge_1rm,
  push_up_1rm,
  triceps_dip_1rm,
  location_city,
  location_region,
  location_country,
  location_iso_country_code,
  updated_at
`)
```

**Note**: This is a minor optimization since you're already using all columns. But it's more explicit and future-proof.

### 3. Optimize Similar Strength Query

Instead of two queries, use a single query with a subquery:

```typescript
// Current approach (lines 148-166)
// 1. Query user's score
// 2. Query leaderboard with range filter

// Optimized approach (single query)
const { data: currentUserData } = await supabase
  .from('user_strength')
  .select(orderBy)
  .eq('user_id', user.id)
  .single();

if (currentUserData) {
  const userScore = (currentUserData as any)[orderBy] as number;
  if (userScore > 0) {
    const minScore = userScore * 0.8;
    const maxScore = userScore * 1.2;
    query = query.gte(orderBy, minScore).lte(orderBy, maxScore);
  }
}
```

**Alternative**: Use a database function or view to calculate this server-side.

### 4. Consider Pagination

For very large leaderboards, consider implementing pagination instead of always fetching top 100:

```typescript
// Add pagination support
const { data, error } = await query
  .range(page * pageSize, (page + 1) * pageSize - 1)
  .limit(pageSize);
```

### 5. Add Query Timeout

Add a timeout to prevent long-running queries:

```typescript
const { data, error } = await query
  .limit(100)
  .abortSignal(AbortSignal.timeout(5000)); // 5 second timeout
```

---

## Security Recommendations

### 1. Consider Privacy Options

Add user preferences for:
- **Location granularity**: Country-only vs City-level
- **Opt-out**: Allow users to hide from leaderboard entirely
- **Display name**: Use display ID instead of exposing UUID

### 2. Rate Limiting

Consider adding rate limiting on the Supabase side to prevent abuse:
- Limit queries per user/IP
- Prevent rapid-fire refreshes

### 3. Audit Logging

Consider logging leaderboard queries for:
- Security monitoring
- Performance analysis
- Abuse detection

---

## Cost Estimation

### Current Costs (Supabase Free Tier)
- **Database Size**: ~1GB free
- **API Requests**: 50,000/month free
- **Database Egress**: 5GB/month free

### Potential Issues:
1. **Multiple Parallel Queries**: Smart view loads 3 queries = 3x API calls
2. **Cache Misses**: Every cache miss = full query
3. **Table Growth**: As users grow, queries become more expensive

### Mitigation:
- ✅ 5-minute cache reduces API calls significantly
- ✅ 100-row limit prevents large data transfers
- ⚠️ Consider increasing cache duration to 10-15 minutes
- ⚠️ Monitor API usage in Supabase dashboard

---

## Monitoring Recommendations

1. **Track Query Performance**:
   ```sql
   -- Check slow queries
   SELECT * FROM pg_stat_statements 
   WHERE query LIKE '%user_strength%' 
   ORDER BY mean_exec_time DESC;
   ```

2. **Monitor API Usage**:
   - Check Supabase dashboard regularly
   - Set up alerts for approaching limits

3. **Track Cache Hit Rate**:
   - Log cache hits vs misses
   - Adjust cache duration based on usage

---

## Implementation Priority

### High Priority (Do First)
1. ✅ Add composite indexes for common query patterns
2. ✅ Monitor API usage and costs
3. ⚠️ Consider privacy options for location data

### Medium Priority
1. Optimize similar strength query (single query)
2. Add query timeouts
3. Consider pagination for large datasets

### Low Priority
1. Optimize column selection (minor benefit)
2. Add audit logging
3. Implement rate limiting

---

## Testing Checklist

After implementing optimizations:

- [ ] Verify indexes are created and used (check `EXPLAIN ANALYZE`)
- [ ] Test query performance with 1000+ users
- [ ] Monitor Supabase API usage
- [ ] Test cache hit rates
- [ ] Verify leaderboard still works correctly
- [ ] Check that filters still work (weekly, country, similar)
- [ ] Test with users who have/without location data
- [ ] Test with users who have/without Wilks scores

