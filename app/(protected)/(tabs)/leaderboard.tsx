import ProfileButton from '@/components/ProfileButton';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LeaderboardEntry {
  user_id: string;
  total_score: number;
  wilks_score: number | null;
  bodyweight_lbs: number | null;
  gender: string | null;
  squat_1rm: number | null;
  deadlift_1rm: number | null;
  bench_press_1rm: number | null;
  overhead_press_1rm: number | null;
  pull_up_1rm: number | null;
  barbell_row_1rm: number | null;
  dumbbell_lunge_1rm: number | null;
  push_up_1rm: number | null;
  triceps_dip_1rm: number | null;
  updated_at: string;
}

type SortMode = 'total' | 'wilks';

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('total');
  const { user } = useSupabaseAuth();

  useEffect(() => {
    loadLeaderboard();
  }, [sortMode]);

  const loadLeaderboard = async () => {
    try {
      const orderBy = sortMode === 'wilks' ? 'wilks_score' : 'total_score';
      
      const { data, error } = await supabase
        .from('user_strength')
        .select('*')
        .order(orderBy, { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) {
        console.error('Failed to load leaderboard:', error);
      } else {
        setLeaderboard(data || []);
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const getCurrentUserRank = () => {
    if (!user) return null;
    const index = leaderboard.findIndex(entry => entry.user_id === user.id);
    return index >= 0 ? index + 1 : null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading Rankings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentUserRank = getCurrentUserRank();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Rankings</Text>
        <ProfileButton />
      </View>

      {/* Current User Rank Badge */}
      {currentUserRank && (
        <View style={styles.userRankBadge}>
          <Text style={styles.userRankText} numberOfLines={1} ellipsizeMode="tail">
            Your Rank: #{currentUserRank}
          </Text>
          <Text style={styles.userRankScore} numberOfLines={1}>
            {sortMode === 'total' 
              ? `${leaderboard[currentUserRank - 1].total_score} lbs`
              : `${leaderboard[currentUserRank - 1].wilks_score?.toFixed(1) || 'N/A'} Wilks`
            }
          </Text>
        </View>
      )}

      {/* Sort Tabs */}
      <View style={styles.sortTabs}>
        <TouchableOpacity 
          style={[styles.sortTab, sortMode === 'total' && styles.sortTabActive]}
          onPress={() => setSortMode('total')}
        >
          <Text style={[styles.sortTabText, sortMode === 'total' && styles.sortTabTextActive]}>
            Total Weight
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sortTab, sortMode === 'wilks' && styles.sortTabActive]}
          onPress={() => setSortMode('wilks')}
        >
          <Text style={[styles.sortTabText, sortMode === 'wilks' && styles.sortTabTextActive]}>
            Wilks Score
          </Text>
        </TouchableOpacity>
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>
          {sortMode === 'total' 
            ? 'Total: All 9 Compound Lifts Combined'
            : 'Bodyweight-adjusted strength comparison'
          }
        </Text>
      </View>

      {/* Leaderboard */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {leaderboard.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color="#D1D1D6" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyStateText}>No rankings yet</Text>
            <Text style={styles.emptyStateSubtext}>Complete some workouts to get ranked!</Text>
          </View>
        ) : (
          <>
            {/* Podium for Top 3 */}
            {leaderboard.length > 0 && (
              <View style={styles.podiumContainer}>
                {/* 2nd Place */}
                {leaderboard[1] && (
                  <View style={[styles.podiumStep, styles.podiumStepSecond]}>
                    <View style={styles.podiumRankBadge}>
                      <Text style={styles.podiumRankText}>2</Text>
                    </View>
                    <Ionicons name="medal" size={32} color="#8E8E93" style={styles.podiumIcon} />
                    <Text style={styles.podiumScore}>
                      {sortMode === 'wilks' 
                        ? leaderboard[1].wilks_score?.toFixed(1)
                        : leaderboard[1].total_score
                      }
                    </Text>
                    <Text style={styles.podiumLabel}>{sortMode === 'wilks' ? 'Wilks' : 'lbs'}</Text>
                  </View>
                )}

                {/* 1st Place */}
                {leaderboard[0] && (
                  <View style={[styles.podiumStep, styles.podiumStepFirst]}>
                    <Ionicons name="trophy" size={40} color="#FFFFFF" style={styles.podiumIcon} />
                    <View style={[styles.podiumRankBadge, styles.podiumRankBadgeFirst]}>
                      <Text style={[styles.podiumRankText, styles.podiumRankTextFirst]}>1</Text>
                    </View>
                    <Text style={[styles.podiumScore, styles.podiumScoreFirst]}>
                      {sortMode === 'wilks' 
                        ? leaderboard[0].wilks_score?.toFixed(1)
                        : leaderboard[0].total_score
                      }
                    </Text>
                    <Text style={styles.podiumLabel}>{sortMode === 'wilks' ? 'Wilks' : 'lbs'}</Text>
                  </View>
                )}

                {/* 3rd Place */}
                {leaderboard[2] && (
                  <View style={[styles.podiumStep, styles.podiumStepThird]}>
                    <View style={styles.podiumRankBadge}>
                      <Text style={styles.podiumRankText}>3</Text>
                    </View>
                    <Ionicons name="medal" size={32} color="#AEAEB2" style={styles.podiumIcon} />
                    <Text style={styles.podiumScore}>
                      {sortMode === 'wilks' 
                        ? leaderboard[2].wilks_score?.toFixed(1)
                        : leaderboard[2].total_score
                      }
                    </Text>
                    <Text style={styles.podiumLabel}>{sortMode === 'wilks' ? 'Wilks' : 'lbs'}</Text>
                  </View>
                )}
              </View>
            )}

            {/* List for the rest */}
            {leaderboard.slice(3).map((entry, index) => {
              const actualRank = index + 4;
              const isCurrentUser = user?.id === entry.user_id;
              const score = sortMode === 'wilks' ? entry.wilks_score : entry.total_score;
              const maxScore = sortMode === 'wilks' 
                ? leaderboard[0]?.wilks_score || 1 
                : leaderboard[0]?.total_score || 1;
              const relativeStrength = ((score || 0) / maxScore) * 100;
              
              // Skip entries with null Wilks score when sorting by Wilks
              if (sortMode === 'wilks' && !entry.wilks_score) return null;

              return (
                <View 
                  key={entry.user_id} 
                  style={[styles.rowBase, styles.row, isCurrentUser && styles.rowHighlight]}
                >
                  {/* Rank */}
                  <View style={styles.rankContainer}>
                    <Text style={styles.rank}>
                      #{actualRank}
                    </Text>
                  </View>

                  {/* Stats */}
                  <View style={styles.stats}>
                    <View style={styles.scoreRow}>
                      <Text style={styles.total}>
                        {sortMode === 'wilks' 
                          ? `${entry.wilks_score?.toFixed(1)}`
                          : `${entry.total_score}`
                        }
                        <Text style={styles.unitText}> {sortMode === 'wilks' ? 'Wilks' : 'lbs'}</Text>
                      </Text>
                    </View>
                    
                    {/* Strength Bar */}
                    <View style={styles.strengthBarContainer}>
                      <View style={[styles.strengthBar, { width: `${relativeStrength}%` }]} />
                    </View>

                    {/* Show breakdown */}
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdown} numberOfLines={1} ellipsizeMode="tail">
                        SQ: {entry.squat_1rm || '-'} | DL: {entry.deadlift_1rm || '-'} | BP: {entry.bench_press_1rm || '-'} | OHP: {entry.overhead_press_1rm || '-'}
                      </Text>
                    </View>

                    {/* Additional info */}
                    <View style={styles.metaRow}>
                      {entry.bodyweight_lbs && (
                        <Text style={styles.metaText}>{entry.bodyweight_lbs} lbs</Text>
                      )}
                      {entry.gender && (
                        <Text style={styles.metaText}>• {entry.gender}</Text>
                      )}
                      <Text style={styles.metaText}>• {formatDate(entry.updated_at)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  userRankBadge: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  userRankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#181C20',
    flex: 1,
    marginRight: 8,
  },
  userRankScore: {
    fontSize: 18,
    fontWeight: '800',
    color: '#181C20',
    flexShrink: 0,
  },
  sortTabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sortTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  sortTabActive: {
    backgroundColor: '#000000',
  },
  sortTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  sortTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subtitleContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
  },
  rowBase: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  rowTopThree: {
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: '#D1D1D6',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  rowHighlight: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2.5,
    borderColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  rankContainer: {
    minWidth: 50,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankContainerTopThree: {
    width: 64,
    minWidth: 64,
  },
  rank: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8E8E93',
  },
  rankTopThree: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
  },
  stats: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  total: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.3,
  },
  breakdownRow: {
    marginBottom: 6,
  },
  breakdown: {
    fontSize: 12,
    color: '#3A3A3C',
    fontWeight: '600',
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  strengthBar: {
    height: '100%',
    backgroundColor: '#181C20',
    borderRadius: 2,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 32,
    marginTop: 16,
    height: 180,
  },
  podiumStep: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingBottom: 16,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    width: '30%',
  },
  podiumStepFirst: {
    height: '100%',
    backgroundColor: '#181C20', // Dark theme for #1
    zIndex: 2,
    transform: [{ scale: 1.05 }],
    borderWidth: 0,
  },
  podiumStepSecond: {
    height: '85%',
  },
  podiumStepThird: {
    height: '75%',
  },
  podiumRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  podiumRankBadgeFirst: {
    backgroundColor: '#FFFFFF',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  podiumRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
  },
  podiumRankTextFirst: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  podiumIcon: {
    marginBottom: 8,
  },
  podiumScore: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
  },
  podiumScoreFirst: {
    color: '#FFFFFF',
    fontSize: 22,
  },
  podiumLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 2,
  },
});

