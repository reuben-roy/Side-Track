# Leaderboard Feature Testing Guide

This guide covers how to test the new strength leaderboard feature in Side-Track.

## Prerequisites

### 1. Database Setup
Before testing, ensure the Supabase `user_strength` table is created:

1. Open Supabase Dashboard → SQL Editor
2. Run the SQL script from `docs/SUPABASE_LEADERBOARD_SCHEMA.sql`
3. Verify the table exists:
   ```sql
   SELECT * FROM user_strength LIMIT 1;
   ```

### 2. Test Data Requirements
- At least 2-3 test user accounts
- Each user should have exercise capacity limits set
- For Wilks score testing: users need bodyweight and gender in their profile

---

## Manual Testing Checklist

### ✅ Basic Functionality

#### Test 1: Access Leaderboard
- [ ] Navigate to **Preferences** → **Strength Leaderboard**
- [ ] Leaderboard screen loads without errors
- [ ] Loading indicator appears initially
- [ ] Screen displays properly on different device sizes

#### Test 2: Display Rankings
- [ ] Rankings are displayed in descending order (highest first)
- [ ] **Top 3 Podium Display**:
  - [ ] 1st place centered, largest, dark background
  - [ ] 2nd place left, smaller
  - [ ] 3rd place right, smaller
  - [ ] Correct icons (Trophy/Medal)
  - [ ] Scores match data
- [ ] **List Display (Rank 4+)**:
  - [ ] Rank number (#4, #5, etc.)
  - [ ] Total score (in lbs) or Wilks score
  - [ ] **Strength Bar**: Visual progress bar showing score relative to leader
  - [ ] Individual lift breakdowns
  - [ ] Meta info (Bodyweight, Gender, Date)
- [ ] Current user's entry is highlighted (different background/border)

#### Test 3: Current User Rank Badge
- [ ] "Your Rank" badge appears at the top when logged in
- [ ] Shows correct rank number
- [ ] Shows correct score (matches the highlighted entry)
- [ ] Badge updates when switching sort modes

#### Test 4: Sort Modes
- [ ] **Total Weight** tab is selected by default
- [ ] Rankings sorted by total_score (descending)
- [ ] Click **Wilks Score** tab
- [ ] Rankings sorted by wilks_score (descending)
- [ ] Subtitle updates to reflect current sort mode
- [ ] Entries without Wilks score are hidden when sorting by Wilks
- [ ] Switching between tabs updates rankings immediately

#### Test 5: Pull-to-Refresh
- [ ] Pull down on the leaderboard list
- [ ] Refresh indicator appears
- [ ] Data reloads from Supabase
- [ ] Rankings update if data changed

---

### ✅ Data Sync Testing

#### Test 6: Automatic Sync on Capacity Update
1. **Setup**: Note your current total_score in the leaderboard
2. **Action**: Update an exercise capacity limit (e.g., increase Squat from 205 to 225)
   - Go to Preferences → Exercise Limits
   - Update a core lift (Squat, Deadlift, Bench Press, etc.)
3. **Verify**:
   - [ ] Wait 1-2 seconds for sync
   - [ ] Check console logs for "✅ Strength score synced"
   - [ ] Navigate to leaderboard
   - [ ] Your total_score has increased
   - [ ] Your rank may have changed
   - [ ] Individual lift values updated correctly

#### Test 7: Sync After Workout PR
1. **Setup**: Note current 1RM for an exercise
2. **Action**: Complete a workout that sets a new PR
   - Log a set with weight/reps that calculates to higher 1RM
   - Example: If current Squat 1RM is 200, do 185 lbs × 8 reps (≈ 234 lbs 1RM)
3. **Verify**:
   - [ ] PR notification appears
   - [ ] Capacity limit auto-updates
   - [ ] Leaderboard syncs automatically
   - [ ] New 1RM appears in leaderboard breakdown

#### Test 8: Wilks Score Calculation
1. **Setup**: Ensure profile has bodyweight and gender set
2. **Action**: Update exercise limits to change total_score
3. **Verify**:
   - [ ] Wilks score appears in leaderboard (when sorting by Wilks)
   - [ ] Wilks score is calculated correctly
   - [ ] Users without bodyweight/gender don't show Wilks score
   - [ ] Switching to Wilks sort mode filters out null scores

---

### ✅ Edge Cases & Error Handling

#### Test 9: Empty Leaderboard
- [ ] Delete all records from `user_strength` table (or use fresh database)
- [ ] Navigate to leaderboard
- [ ] Empty state message appears: "No rankings yet"
- [ ] Subtitle: "Complete some workouts to get ranked!"

#### Test 10: Single User
- [ ] With only one user in database
- [ ] Leaderboard shows that user at rank #1
- [ ] "Your Rank" badge shows #1
- [ ] No errors or crashes

#### Test 11: Missing Profile Data
- [ ] User with no bodyweight/gender in profile
- [ ] Verify:
  - [ ] Total score still calculated and displayed
  - [ ] Wilks score is null (not shown)
  - [ ] User appears in "Total Weight" sort
  - [ ] User hidden in "Wilks Score" sort

#### Test 12: Network Errors
- [ ] Disable network/internet
- [ ] Navigate to leaderboard
- [ ] Error handled gracefully (check console for error logs)
- [ ] Re-enable network
- [ ] Pull to refresh
- [ ] Data loads successfully

#### Test 13: Large Dataset
- [ ] Create 100+ test users with varying scores
- [ ] Verify:
  - [ ] Leaderboard loads efficiently
  - [ ] Only top 100 shown (per `.limit(100)` in query)
  - [ ] Scrolling is smooth
  - [ ] Performance is acceptable

---

### ✅ Integration Testing

#### Test 14: Multiple Users Competition
1. **Setup**: Create 3 test accounts (User A, B, C)
2. **Action**: Set different capacity limits for each:
   - User A: Squat 300, Deadlift 400, Bench 250 (Total: 950+)
   - User B: Squat 200, Deadlift 300, Bench 200 (Total: 700+)
   - User C: Squat 150, Deadlift 200, Bench 150 (Total: 500+)
3. **Verify**:
   - [ ] Rankings: A (#1), B (#2), C (#3)
   - [ ] Each user sees their own rank correctly
   - [ ] Rankings update when any user changes limits

#### Test 15: Profile Updates Affect Wilks
1. **Setup**: User with exercise limits set
2. **Action**: Update profile bodyweight (e.g., 170 → 180 lbs)
3. **Verify**:
   - [ ] Wilks score recalculates automatically
   - [ ] New Wilks score appears in leaderboard
   - [ ] Rank may change in Wilks sort mode

#### Test 16: Navigation Flow
- [ ] From Home → Preferences → Leaderboard
- [ ] Back button (×) returns to Preferences
- [ ] Deep linking to `/leaderboard` works
- [ ] Navigation doesn't break app state

---

## Automated Testing (Future)

### Unit Tests to Add
```typescript
// constants/StrengthMetrics.test.ts
- calculateStrengthScore() with various inputs
- calculateWilksScore() with edge cases (zero bodyweight, etc.)
- getCoreLiftPRs() extraction logic
```

### Integration Tests to Add
```typescript
// context/UserCapacityContext.test.ts
- syncStrengthToSupabase() called on capacity update
- Wilks calculation with/without profile data
- Error handling for Supabase failures
```

### E2E Tests to Add
```typescript
// e2e/leaderboard.test.ts
- Navigate to leaderboard
- Verify rankings display
- Switch sort modes
- Update capacity and verify sync
```

---

## Responsiveness Testing

### Screen Size Compatibility
Test on various device sizes to ensure proper display:

#### Small Screens (iPhone SE, small Android phones)
- [ ] All text fits without overflow
- [ ] Breakdown lines truncate with ellipsis if too long
- [ ] User rank badge text doesn't overflow
- [ ] Rank numbers display correctly (even #100+)
- [ ] Touch targets are large enough (min 44x44pt)

#### Medium Screens (iPhone 12/13/14, standard Android)
- [ ] Layout looks balanced
- [ ] Text is readable
- [ ] Spacing is appropriate

#### Large Screens (iPhone Pro Max, tablets)
- [ ] Content doesn't stretch too wide
- [ ] Maintains readable line lengths
- [ ] Proper use of horizontal space

#### Landscape Orientation
- [ ] Layout adapts appropriately
- [ ] Text remains readable
- [ ] No horizontal scrolling needed

### Responsiveness Features Implemented
- ✅ Text truncation with ellipsis for long breakdown lines
- ✅ Flexible layout that adapts to screen width
- ✅ Minimum heights to prevent cramped layouts
- ✅ Flex properties to handle varying content lengths
- ✅ Wrapping for meta information (bodyweight, gender, date)

### Test Scenarios
1. **Long Text Handling**:
   - Set very high 1RM values (e.g., 999 lbs for all lifts)
   - Verify breakdown text truncates with "..." instead of overflowing
   
2. **High Rank Numbers**:
   - Create 100+ test users
   - Verify rank #100+ displays correctly
   - Check rank container doesn't overflow

3. **Long User Rank Badge**:
   - User with rank #999
   - Verify "Your Rank: #999" and score both fit
   - Check text truncates if needed

## Performance Testing

### Metrics to Monitor
- [ ] Leaderboard load time < 2 seconds
- [ ] Smooth scrolling with 100+ entries
- [ ] Sync operation completes < 1 second
- [ ] No memory leaks during navigation

### Tools
- React Native Debugger for performance profiling
- Supabase Dashboard for query performance
- Device logs for error monitoring

---

## Security Testing

### Verify RLS Policies
1. **As authenticated user**:
   - [ ] Can read all leaderboard entries
   - [ ] Can insert/update own record only
   - [ ] Cannot update other users' records

2. **As unauthenticated user**:
   - [ ] Can read leaderboard (public read policy)
   - [ ] Cannot insert/update records

### Test in Supabase SQL Editor:
```sql
-- Test as different user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'OTHER_USER_ID';
-- Try to update another user's record (should fail)
UPDATE user_strength SET total_score = 9999 WHERE user_id != 'OTHER_USER_ID';
```

---

## Regression Testing

After any changes, verify:
- [ ] Existing users' rankings still display correctly
- [ ] New users can appear on leaderboard
- [ ] Capacity limit updates still sync
- [ ] Profile changes still update Wilks score
- [ ] No console errors or warnings

---

## Quick Test Script

For rapid testing, use this script:

```bash
# 1. Ensure Supabase table exists
# Run: docs/SUPABASE_LEADERBOARD_SCHEMA.sql

# 2. Set up test user with profile data
# - Weight: 170 lbs
# - Gender: male
# - Exercise limits: Set all 9 core lifts

# 3. Navigate to leaderboard
# Preferences → Strength Leaderboard

# 4. Verify display
# - Rankings show
# - Your rank badge appears
# - Can switch sort modes

# 5. Update a capacity limit
# Preferences → Exercise Limits → Update Squat

# 6. Check sync
# - Console shows sync success
# - Leaderboard updates on refresh
```

---

## Known Issues / Limitations

- [ ] Document any bugs found during testing
- [ ] Note performance issues
- [ ] List feature requests or improvements

---

## Test Results Template

```
Date: ___________
Tester: ___________
Environment: iOS/Android/Web
Supabase Project: ___________

Test Results:
- Basic Functionality: ✅ / ❌
- Data Sync: ✅ / ❌
- Edge Cases: ✅ / ❌
- Integration: ✅ / ❌
- Performance: ✅ / ❌
- Security: ✅ / ❌

Issues Found:
1. [Issue description]
2. [Issue description]

Notes:
[Additional observations]
```

