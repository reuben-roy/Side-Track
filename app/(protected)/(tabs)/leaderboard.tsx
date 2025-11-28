import ProfileButton from '@/components/ProfileButton';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { generateUsernameFromProfile } from '@/helper/username';
import { usePreferences } from '@/hooks/usePreferences';
import { getCachedLeaderboard, getCacheDurationMs, LEADERBOARD_SELECT_COLUMNS, LeaderboardEntry, LocationFilter, ScoreFilter, setCachedLeaderboard, SortMode, TimeFilter } from '@/lib/leaderboardCache';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter States
  const [sortMode, setSortMode] = useState<SortMode>('total');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all_time');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('global');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  
  const [showCacheToast, setShowCacheToast] = useState(false);
  const [userLocation, setUserLocation] = useState<{country: string | null, city: string | null, region: string | null} | null>(null);
  
  const [expanded, setExpanded] = useState(false);
  const [smartRanking, setSmartRanking] = useState<{
    title: string;
    data: LeaderboardEntry[];
    scope: string; // description for subtitle
  }>({ title: 'Rankings', data: [], scope: '' });
  const [simpleLoading, setSimpleLoading] = useState(true);

  const { user } = useSupabaseAuth();
  const { preferences, updatePreference } = usePreferences();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    // Initialize location and load leaderboard
    initializeLocationAndLeaderboard();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reload when filters change (only in expanded mode)
  useEffect(() => {
    if (!loading && expanded) { // Prevent double load on initial mount
      loadExpandedData(false);
    }
  }, [sortMode, timeFilter, locationFilter, scoreFilter, expanded]);

  // Watch for shareLocation preference changes
  useEffect(() => {
    if (user) {
      updateUserLocation();
    }
  }, [preferences.shareLocation]);

  const initializeLocationAndLeaderboard = async () => {
    // First try to get location to enable local features
    await updateUserLocation();
    // Then load data based on view mode
    if (expanded) {
      await loadExpandedData(false);
    } else {
      await loadSmartData(false);
    }
  };

  const updateUserLocation = async () => {
    if (!user) return;

    // If user has opted out of location sharing
    if (!preferences.shareLocation) {
      try {
        if (isMountedRef.current) {
            setUserLocation(null);
            // If we were filtering by country, switch back to global
            if (locationFilter === 'country') {
                setLocationFilter('global');
            }
        }

        // Clear location in Supabase
        await supabase
          .from('user_strength')
          .update({
            location_country: null,
            location_city: null,
            location_region: null,
            location_iso_country_code: null,
          })
          .eq('user_id', user.id);
      } catch (error) {
        console.log('Error clearing location:', error);
      }
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Permission denied
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        const country = address.country || null;
        const city = address.city || null;
        const region = address.region || null;
        const isoCountryCode = address.isoCountryCode || null;

        if (isMountedRef.current) {
          setUserLocation({ country, city, region });
        }

        // Update Supabase silently
        // Only update if we have a country (minimum requirement for location rank)
        if (country) {
          await supabase
            .from('user_strength')
            .update({
              location_country: country,
              location_city: city,
              location_region: region,
              location_iso_country_code: isoCountryCode,
              // We don't update 'updated_at' here to avoid messing with 'weekly' rank if they haven't worked out
            })
            .eq('user_id', user.id);
        }
      }
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  const fetchLeaderboardData = async (
    sort: SortMode,
    time: TimeFilter,
    location: LocationFilter,
    score: ScoreFilter,
    forceRefresh: boolean,
    customUserLocation?: string,
    rowLimit: number = 100 // Default to 100 for expanded view, 30 for smart view
  ): Promise<LeaderboardEntry[]> => {
    const loc = customUserLocation || userLocation?.country;
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedData = getCachedLeaderboard(sort, time, location, score, loc || undefined);
      if (cachedData) return cachedData;
    }

    try {
      const orderBy = sort === 'wilks' ? 'wilks_score' : 'total_score';
      
      // Select only needed columns to reduce data transfer
      let query = supabase
        .from('user_strength')
        .select(LEADERBOARD_SELECT_COLUMNS)
        .order(orderBy, { ascending: false, nullsFirst: false });

      // Apply Location Filter
      if (location === 'country' && loc) {
        query = query.eq('location_country', loc);
      }

      // Apply Time Filter (Weekly)
      if (time === 'weekly') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        query = query.gt('updated_at', oneWeekAgo.toISOString());
      }

      // Apply Score Filter (Similar Strength)
      if (score === 'similar' && user) {
        let userScore = 0;
        
        const { data: currentUserData } = await supabase
          .from('user_strength')
          .select(orderBy)
          .eq('user_id', user.id)
          .single();

        if (currentUserData) {
          userScore = (currentUserData as any)[orderBy] as number;
        }

        if (userScore > 0) {
          const minScore = Math.round(userScore * 0.8);
          const maxScore = Math.round(userScore * 1.2);
          query = query.gte(orderBy, minScore).lte(orderBy, maxScore);
        }
      }
      
      const { data, error } = await query.limit(rowLimit);

      if (error) {
        console.error('Failed to load leaderboard:', error);
        // Fallback to cache
        const cachedData = getCachedLeaderboard(sort, time, location, score, loc || undefined);
        return cachedData || [];
      } else {
        const leaderboardData = (data || []) as unknown as LeaderboardEntry[];
        // Update cache
        setCachedLeaderboard(
          leaderboardData, 
          sort, 
          time, 
          location, 
          score, 
          loc || undefined
        );
        return leaderboardData;
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      const cachedData = getCachedLeaderboard(sort, time, location, score, loc || undefined);
      return cachedData || [];
    }
  };

  const loadExpandedData = async (forceRefresh: boolean = false) => {
    if (isMountedRef.current && !forceRefresh) setLoading(true);
    
    const data = await fetchLeaderboardData(
      sortMode,
      timeFilter,
      locationFilter,
      scoreFilter,
      forceRefresh
    );
    
    if (isMountedRef.current) {
      setLeaderboard(data);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSmartData = async (forceRefresh: boolean = false) => {
    if (isMountedRef.current && !forceRefresh) setSimpleLoading(true);

    // OPTIMIZED: Fetch smarter - start with cheapest query, only run more if needed
    // Row limit of 30 since we only display 30 anyway
    const SMART_ROW_LIMIT = 30;
    const minUsersThreshold = 5;
    let selectedData: LeaderboardEntry[] = [];
    let title = 'Weekly Rankings';
    let scope = 'Global';

    try {
      // Start with the most common case: Weekly + Global + All
      // This is the cheapest query (no user-specific filtering)
      const globalAll = await fetchLeaderboardData(
        'total', 'weekly', 'global', 'all', forceRefresh, undefined, SMART_ROW_LIMIT
      );

      // If we have enough users in weekly global, use it and skip other queries
      if (globalAll.length >= minUsersThreshold) {
        // Only try more specific queries if user is logged in
        if (user) {
          // Try global similar (one extra query)
          const globalSimilar = await fetchLeaderboardData(
            'total', 'weekly', 'global', 'similar', forceRefresh, undefined, SMART_ROW_LIMIT
          );

          if (globalSimilar.length >= minUsersThreshold) {
            // Check local similar only if user has location and opted in
            if (userLocation?.country && preferences.shareLocation) {
              const localSimilar = await fetchLeaderboardData(
                'total', 'weekly', 'country', 'similar', forceRefresh, userLocation.country, SMART_ROW_LIMIT
              );

              if (localSimilar.length >= minUsersThreshold) {
                selectedData = localSimilar;
                title = `${userLocation.country} League`;
                scope = 'Similar Strength • Weekly';
              } else {
                selectedData = globalSimilar;
                title = 'Similar Strength League';
                scope = 'Global • Weekly';
              }
            } else {
              selectedData = globalSimilar;
              title = 'Similar Strength League';
              scope = 'Global • Weekly';
            }
          } else {
            // Not enough similar users, use global all
            selectedData = globalAll;
            title = 'Weekly Leaderboard';
            scope = 'Global';
          }
        } else {
          // User not logged in, just show global weekly
          selectedData = globalAll;
          title = 'Weekly Leaderboard';
          scope = 'Global';
        }
      } else if (globalAll.length > 0) {
        // Some users but less than threshold
        selectedData = globalAll;
        title = 'Weekly Leaderboard';
        scope = 'Global';
      } else {
        // No weekly data, fall back to all time
        const allTime = await fetchLeaderboardData(
          'total', 'all_time', 'global', 'all', forceRefresh, undefined, SMART_ROW_LIMIT
        );
        selectedData = allTime;
        title = 'All-Time Leaderboard';
        scope = 'Global';
      }

      if (isMountedRef.current) {
        setSmartRanking({ title, data: selectedData, scope });
        setSimpleLoading(false);
        setRefreshing(false);
      }
    } catch (e) {
      console.error("Error in smart load:", e);
      if (isMountedRef.current) setSimpleLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    
    if (expanded) {
      await loadExpandedData(true);
    } else {
      await loadSmartData(true);
    }
  };

  // Invalidate cache when component mounts if user just updated their data
  // This ensures fresh data after returning from settings/exercise limits
  useEffect(() => {
    // Small delay to allow any pending syncs to complete
    const timeoutId = setTimeout(() => {
      // Cache will be checked in loadLeaderboard, so we don't need to force refresh here
      // The 5-minute cache is sufficient for most cases
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [user]);

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

  const getDisplayUsername = (entry: LeaderboardEntry): string => {
    // If username exists, use it
    if (entry.username) {
      return entry.username;
    }
    
    // Generate fallback username from profile data
    return generateUsernameFromProfile(
      entry.gender,
      entry.bodyweight_lbs,
      entry.user_id
    );
  };

  if (expanded ? loading : simpleLoading) {
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

  const renderSimpleSection = (title: string, data: LeaderboardEntry[], emptyText: string) => (
    <View style={styles.simpleSection}>
      {/* Title Header */}
      <View style={styles.simpleHeaderContainer}>
        <Text style={styles.simpleSectionTitle}>{smartRanking.title}</Text>
        <Text style={styles.simpleSectionSubtitle}>{smartRanking.scope}</Text>
      </View>
      
      {data.length === 0 ? (
        <View style={styles.simpleEmptyState}>
          <Text style={styles.simpleEmptyText}>{emptyText}</Text>
        </View>
      ) : (
        data.map((entry, index) => {
          const isCurrentUser = user?.id === entry.user_id;
          const rank = index + 1;
          
          // Highlighting Top 3
          const isTop3 = rank <= 3;
          
          return (
            <View 
              key={entry.user_id} 
              style={[
                styles.simpleRow, 
                isCurrentUser && styles.simpleRowHighlight,
                isTop3 && styles.simpleRowTop3
              ]}
            >
              <View style={[styles.simpleRankBadge, isTop3 && styles.simpleRankBadgeTop3]}>
                <Text style={[styles.simpleRankText, isTop3 && styles.simpleRankTextTop3]}>#{rank}</Text>
              </View>
              
              <View style={styles.simpleUserCol}>
                <Text style={styles.simpleUsername} numberOfLines={1}>
                  {getDisplayUsername(entry)}
                  {isCurrentUser && <Text style={styles.youText}> (You)</Text>}
                </Text>
                {/* Small detail line */}
                <Text style={styles.simpleUserDetail}>
                  {entry.location_country || 'Global'} • {formatDate(entry.updated_at)}
                </Text>
              </View>
              
              <Text style={styles.simpleScore}>{entry.total_score} lbs</Text>
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
           {expanded && (
            <TouchableOpacity onPress={() => setExpanded(false)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
          )} 
          <Text style={styles.title}>Rankings</Text>
        </View>
        <ProfileButton />
      </View>

      {!expanded ? (
        // Simple View
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.simpleContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderSimpleSection(
            smartRanking.title, 
            smartRanking.data, 
            'No rankings found for this category yet.'
          )}
        </ScrollView>
      ) : (
        // Expanded View
        <>
          {/* Current User Rank Badge */}
          {currentUserRank && (
            <View style={styles.userRankBadge}>
              <View style={styles.userRankContent}>
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

          {/* Filter Tabs */}
          <View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.filterScrollContent}
              style={styles.filterScrollView}
            >
              {/* Time Filter */}
              <View style={styles.filterGroup}>
                <TouchableOpacity 
                  style={[styles.filterChip, timeFilter === 'all_time' && styles.filterChipActive]}
                  onPress={() => setTimeFilter('all_time')}
                >
                  <Text style={[styles.filterText, timeFilter === 'all_time' && styles.filterTextActive]}>All Time</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, timeFilter === 'weekly' && styles.filterChipActive]}
                  onPress={() => setTimeFilter('weekly')}
                >
                  <Text style={[styles.filterText, timeFilter === 'weekly' && styles.filterTextActive]}>Weekly</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.filterDivider} />

              {/* Location Filter */}
              <View style={styles.filterGroup}>
                <TouchableOpacity 
                  style={[styles.filterChip, locationFilter === 'global' && styles.filterChipActive]}
                  onPress={() => setLocationFilter('global')}
                >
                  <Ionicons name="planet-outline" size={14} color={locationFilter === 'global' ? '#FFF' : '#8E8E93'} style={{ marginRight: 4 }} />
                  <Text style={[styles.filterText, locationFilter === 'global' && styles.filterTextActive]}>Global</Text>
                </TouchableOpacity>
                
                {/* Only show location button if not opted out */}
                <TouchableOpacity 
                  style={[
                      styles.filterChip, 
                      locationFilter === 'country' && styles.filterChipActive,
                      !preferences.shareLocation && styles.filterChipDisabled
                  ]}
                  onPress={async () => {
                    if (!preferences.shareLocation) {
                        Alert.alert(
                            'Location Sharing Disabled',
                            'Please enable location sharing to see local rankings.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { 
                                    text: 'Enable', 
                                    onPress: () => updatePreference('shareLocation', true)
                                }
                            ]
                        );
                        return;
                    }

                    // If we already have location set, just filter
                    if (userLocation?.country) {
                      setLocationFilter('country');
                      return;
                    }
                    
                    // Check permission status
                    const { status } = await Location.getForegroundPermissionsAsync();
                    
                    if (status === 'granted') {
                      // Permission granted but no location data yet? Try fetching again.
                      await updateUserLocation();
                      // If we have it now, set filter
                      if (userLocation?.country) setLocationFilter('country');
                    } else if (status === 'denied') {
                      // Permission denied, ask to open settings
                      Alert.alert(
                        'Location Permission Required',
                        'To see local rankings, please enable location access in your settings.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Open Settings', onPress: () => Linking.openSettings() }
                        ]
                      );
                    } else {
                      // Undetermined, request permission
                      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
                      if (newStatus === 'granted') {
                        await updateUserLocation();
                      }
                    }
                  }}
                >
                  <Ionicons name="location-outline" size={14} color={locationFilter === 'country' ? '#FFF' : '#8E8E93'} style={{ marginRight: 4 }} />
                  <Text style={[styles.filterText, locationFilter === 'country' && styles.filterTextActive]}>
                    {preferences.shareLocation ? (userLocation?.country ? userLocation.country : 'Local') : 'Local'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.filterDivider} />

              {/* Score Filter */}
              <View style={styles.filterGroup}>
                <TouchableOpacity 
                  style={[styles.filterChip, scoreFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setScoreFilter('all')}
                >
                  <Text style={[styles.filterText, scoreFilter === 'all' && styles.filterTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, scoreFilter === 'similar' && styles.filterChipActive]}
                  onPress={() => {
                    if (!user) {
                      Alert.alert('Sign In Required', 'Please sign in to see rankings for your strength level.');
                      return;
                    }
                    setScoreFilter('similar');
                  }}
                >
                  <Text style={[styles.filterText, scoreFilter === 'similar' && styles.filterTextActive]}>Similar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Location Sharing Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Share Location on Leaderboard</Text>
            <Switch
                value={preferences.shareLocation}
                onValueChange={(value) => updatePreference('shareLocation', value)}
                trackColor={{ false: '#E5E5EA', true: '#181C20' }}
                thumbColor="#FFFFFF"
            />
          </View>

          {/* Subtitle */}
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>
              {timeFilter === 'weekly' ? 'Active in last 7 days' : 'All-time'}
              {locationFilter === 'country' ? ` • ${userLocation?.country || 'Local'}` : ' • Global'}
              {scoreFilter === 'similar' ? ' • Similar Strength' : ''}
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
                        {user?.id === leaderboard[1].user_id && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>YOU</Text>
                          </View>
                        )}
                        <View style={styles.podiumRankBadge}>
                          <Text style={styles.podiumRankText}>2</Text>
                        </View>
                        <Ionicons name="medal" size={32} color="#8E8E93" style={styles.podiumIcon} />
                        <Text style={styles.podiumUsername} numberOfLines={1} ellipsizeMode="tail">
                          {getDisplayUsername(leaderboard[1])}
                        </Text>
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
                        {user?.id === leaderboard[0].user_id && (
                          <View style={[styles.youBadge, styles.youBadgeFirst]}>
                            <Text style={[styles.youBadgeText, styles.youBadgeTextFirst]}>YOU</Text>
                          </View>
                        )}
                        <Ionicons name="trophy" size={40} color="#FFFFFF" style={styles.podiumIcon} />
                        <View style={[styles.podiumRankBadge, styles.podiumRankBadgeFirst]}>
                          <Text style={[styles.podiumRankText, styles.podiumRankTextFirst]}>1</Text>
                        </View>
                        <Text style={[styles.podiumUsername, styles.podiumUsernameFirst]} numberOfLines={1} ellipsizeMode="tail">
                          {getDisplayUsername(leaderboard[0])}
                        </Text>
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
                        {user?.id === leaderboard[2].user_id && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>YOU</Text>
                          </View>
                        )}
                        <View style={styles.podiumRankBadge}>
                          <Text style={styles.podiumRankText}>3</Text>
                        </View>
                        <Ionicons name="medal" size={32} color="#AEAEB2" style={styles.podiumIcon} />
                        <Text style={styles.podiumUsername} numberOfLines={1} ellipsizeMode="tail">
                          {getDisplayUsername(leaderboard[2])}
                        </Text>
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
                          <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">
                            {getDisplayUsername(entry)}
                          </Text>
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
                          {entry.location_country && (
                            <Text style={styles.metaText}>• {entry.location_city ? `${entry.location_city}, ` : ''}{entry.location_country}</Text>
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
        </>
      )}

      {/* Cache Info Toast - shown when user refreshes */}
      {showCacheToast && (
        <View style={styles.cacheToast}>
          <Ionicons name="information-circle" size={18} color="#FFFFFF" />
          <Text style={styles.cacheToastText}>
            Rankings refresh every {Math.floor(getCacheDurationMs() / 60000)} minutes. 
            Changes may take time to appear.
          </Text>
        </View>
      )}
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
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
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userRankContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRankText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#181C20',
    flex: 1,
    marginRight: 8,
  },
  userRankScore: {
    fontSize: 16,
    fontWeight: '800',
    color: '#181C20',
    flexShrink: 0,
  },
  sortTabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sortTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 7,
  },
  sortTabActive: {
    backgroundColor: '#000000',
  },
  sortTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  sortTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterScrollView: {
    maxHeight: 44,
    marginBottom: 4,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    alignItems: 'center',
    gap: 8,
  },
  filterGroup: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
    padding: 2,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#D1D1D6',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  filterChipDisabled: {
    opacity: 0.5,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#181C20',
  },
  subtitleContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  cacheToast: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#181C20',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  cacheToastText: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 8,
    lineHeight: 18,
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
    backgroundColor: '#F2F2F7', // Subtle grey background
    borderWidth: 1.5,
    borderColor: '#D1D1D6',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    marginRight: 12,
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
    height: 160,
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
  youBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    position: 'absolute',
    top: -12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  youBadgeFirst: {
    backgroundColor: '#FFFFFF',
    top: -14,
  },
  youBadgeTextFirst: {
    color: '#000000',
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
  podiumUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
    maxWidth: '100%',
  },
  podiumUsernameFirst: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  simpleContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  simpleSection: {
    marginBottom: 24,
  },
  simpleHeaderContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  simpleSectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 4,
  },
  simpleSectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  simpleEmptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  simpleEmptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  simpleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  simpleRowHighlight: {
    backgroundColor: '#F2F2F7',
    borderColor: '#D1D1D6',
  },
  simpleRowTop3: {
    borderColor: '#000000', // Or gold/silver/bronze colors if preferred
    borderWidth: 1.5,
  },
  simpleRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  simpleRankBadgeTop3: {
    backgroundColor: '#000000',
  },
  simpleRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#181C20',
  },
  simpleRankTextTop3: {
    color: '#FFFFFF',
  },
  simpleUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  simpleUserCol: {
    flex: 1,
    marginRight: 8,
  },
  simpleUserDetail: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  youText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '400',
  },
  simpleScore: {
    fontSize: 15,
    fontWeight: '700',
    color: '#181C20',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181C20',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  expandButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
});
