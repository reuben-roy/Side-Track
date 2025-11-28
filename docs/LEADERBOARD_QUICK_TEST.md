# Leaderboard Quick Test Guide

Quick reference for testing the leaderboard feature.

## 🚀 Quick Start

### Prerequisites (One-time setup)
1. **Supabase Setup**: Run `docs/SUPABASE_LEADERBOARD_SCHEMA.sql` in Supabase SQL Editor
2. **Test User**: Create account with profile data (weight, gender) and exercise limits

### 5-Minute Smoke Test

1. **Access Leaderboard**
   ```
   App → Preferences → Strength Leaderboard
   ```
   ✅ Should load and show rankings

2. **Verify Display**
   - Rankings show rank #, score, lift breakdowns
   - Your entry is highlighted
   - "Your Rank" badge appears at top
   ✅ All elements visible

3. **Test Sort Modes**
   - Click "Total Weight" tab → sorted by total lbs
   - Click "Wilks Score" tab → sorted by Wilks (if you have bodyweight/gender)
   ✅ Rankings change correctly

4. **Test Data Sync**
   - Note your current total_score
   - Go to Preferences → Exercise Limits
   - Update Squat (e.g., 205 → 225)
   - Return to leaderboard
   - Pull down to refresh
   ✅ Total score increased, rank may have changed

5. **Test Pull-to-Refresh**
   - Pull down on leaderboard
   ✅ Data refreshes

---

## 🔍 Common Test Scenarios

### Scenario 1: New User Joins Leaderboard
1. Create new account
2. Set exercise capacity limits (all 9 core lifts)
3. Check leaderboard → user appears
4. Verify "Your Rank" badge shows correct rank

### Scenario 2: User Updates Profile
1. User has exercise limits set
2. Update profile: weight 170 → 180 lbs
3. Check leaderboard → Wilks score recalculated
4. Rank may change in Wilks sort mode

### Scenario 3: User Sets PR in Workout
1. Current Squat 1RM: 200 lbs
2. Complete workout: 185 lbs × 8 reps (≈ 234 lbs 1RM)
3. PR notification appears
4. Check leaderboard → Squat updated to 234 lbs
5. Total score increased

### Scenario 4: Multiple Users
1. Create 3 test accounts with different strengths
2. Each sets exercise limits
3. Verify rankings: strongest = #1, weakest = #3
4. Each user sees their own rank correctly

---

## 🐛 Troubleshooting

### Leaderboard shows "No rankings yet"
- **Check**: Is `user_strength` table empty?
- **Fix**: Set exercise limits for at least one user

### Wilks score not showing
- **Check**: Does user have bodyweight AND gender in profile?
- **Fix**: Set both in Preferences → Profile

### Rankings not updating after changing limits
- **Check**: Console logs for sync errors
- **Fix**: Verify Supabase connection, check RLS policies

### Can't see other users' rankings
- **Check**: RLS policy allows public SELECT?
- **Fix**: Run SQL from schema file to create policies

### Sync errors in console
- **Check**: Supabase credentials in `lib/supabase.ts`
- **Check**: `user_strength` table exists
- **Check**: User is authenticated

---

## ✅ Pre-Release Checklist

- [ ] Database table created and has test data
- [ ] At least 2-3 users with different scores
- [ ] Users with/without Wilks scores (profile data)
- [ ] Rankings display correctly
- [ ] Sort modes work
- [ ] Data syncs after capacity updates
- [ ] Pull-to-refresh works
- [ ] Current user highlighting works
- [ ] No console errors
- [ ] Performance acceptable (< 2s load time)

---

## 📊 Test Data Examples

### User A (Strong)
- Squat: 300, Deadlift: 400, Bench: 250
- OHP: 150, Pull-Up: 200, Row: 200
- Lunge: 100, Push-Up: 50, Dip: 150
- **Total**: ~1800 lbs
- Bodyweight: 200 lbs, Gender: male
- **Wilks**: ~350

### User B (Moderate)
- Squat: 200, Deadlift: 300, Bench: 200
- OHP: 100, Pull-Up: 150, Row: 150
- Lunge: 60, Push-Up: 30, Dip: 100
- **Total**: ~1290 lbs
- Bodyweight: 170 lbs, Gender: male
- **Wilks**: ~320

### User C (Light)
- Squat: 150, Deadlift: 200, Bench: 150
- OHP: 80, Pull-Up: 100, Row: 100
- Lunge: 40, Push-Up: 20, Dip: 70
- **Total**: ~910 lbs
- Bodyweight: 140 lbs, Gender: female
- **Wilks**: ~280

---

## 🔗 Related Files

- **Leaderboard Screen**: `app/(protected)/leaderboard.tsx`
- **Data Sync**: `context/UserCapacityContext.tsx` (lines 94-139)
- **Calculations**: `constants/StrengthMetrics.ts`
- **Database Schema**: `docs/SUPABASE_LEADERBOARD_SCHEMA.sql`
- **Full Test Guide**: `docs/LEADERBOARD_TESTING.md`

