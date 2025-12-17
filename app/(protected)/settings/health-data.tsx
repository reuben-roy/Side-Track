import { getHealthSyncStatus, readActiveCaloriesFromHealth, readBodyMetricsFromHealth, readWorkoutsFromHealth } from '@/lib/healthSync';
import type { HealthActiveCaloriesSample, HealthBodyMetrics, HealthSyncStatus, HealthWorkout } from '@/types/health';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

type Period = '7d' | '30d';

function startDateForPeriod(period: Period) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (period === '7d' ? 7 : 30));
  return { start, end };
}

function toISODateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatShortDayLabel(dateKey: string) {
  const d = new Date(dateKey + 'T00:00:00.000Z');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatMonthDayLabel(dateKey: string) {
  const d = new Date(dateKey + 'T00:00:00.000Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function aggregateCaloriesPerDay(samples: HealthActiveCaloriesSample[], start: Date, end: Date) {
  const totals = new Map<string, number>();
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cur <= endDay) {
    totals.set(toISODateKey(cur), 0);
    cur.setDate(cur.getDate() + 1);
  }

  for (const s of samples) {
    const key = toISODateKey(new Date(s.date));
    totals.set(key, (totals.get(key) || 0) + (s.calories || 0));
  }

  return Array.from(totals.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, calories]) => ({ dateKey, calories: Math.round(calories) }));
}

function latestMetrics(metrics: HealthBodyMetrics[]) {
  const sorted = [...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sorted[0] || null;
}

function formatWorkoutLine(w: HealthWorkout) {
  const d = new Date(w.date);
  const when = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const details = [w.exercise, `${w.weight} × ${w.reps}`].join(' • ');
  return `${when} • ${details}`;
}

export default function HealthDataScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<HealthSyncStatus>({ isAvailable: false, isAuthorized: false, platform: 'none' });
  const [workouts, setWorkouts] = useState<HealthWorkout[]>([]);
  const [metrics, setMetrics] = useState<HealthBodyMetrics[]>([]);
  const [calorieSamples, setCalorieSamples] = useState<HealthActiveCaloriesSample[]>([]);

  const { start, end } = useMemo(() => startDateForPeriod(period), [period]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const status = await getHealthSyncStatus();
        if (cancelled) return;
        setSyncStatus(status);

        // Even if not authorized, try to load – implementations should return empty.
        const [ws, ms, cs] = await Promise.all([
          readWorkoutsFromHealth(start, end),
          readBodyMetricsFromHealth(start, end),
          readActiveCaloriesFromHealth(start, end),
        ]);

        if (cancelled) return;
        setWorkouts(ws);
        setMetrics(ms);
        setCalorieSamples(cs);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [start, end]);

  const caloriesByDay = useMemo(() => aggregateCaloriesPerDay(calorieSamples, start, end), [calorieSamples, start, end]);
  const latest = useMemo(() => latestMetrics(metrics), [metrics]);

  const barData = useMemo(() => {
    const maxPoints = period === '7d' ? 7 : 10; // keep chart readable
    const points =
      caloriesByDay.length <= maxPoints
        ? caloriesByDay
        : caloriesByDay.filter((_, idx) => idx % Math.ceil(caloriesByDay.length / maxPoints) === 0);

    return points.map((p) => ({
      value: p.calories,
      label: period === '7d' ? formatShortDayLabel(p.dateKey) : formatMonthDayLabel(p.dateKey),
      frontColor: '#000000',
      gradientColor: '#F2F2F7',
    }));
  }, [caloriesByDay, period]);

  const maxValue = Math.max(...barData.map((b) => b.value), 100);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      </View>
    );
  }

  const platformName = syncStatus.platform === 'ios' ? 'Apple Health' : syncStatus.platform === 'android' ? 'Health Connect' : 'Not Available';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.header}>Health Data</Text>
          <Text style={styles.subHeader}>From {platformName}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.periodSelectorRow}>
            {(['7d', '30d'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodButton, period === p && styles.periodButtonSelected]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextSelected]}>{p === '7d' ? '7 Days' : '30 Days'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Available:</Text>
              <Text style={[styles.statusValue, syncStatus.isAvailable && styles.statusSuccess]}>{syncStatus.isAvailable ? 'Yes' : 'No'}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Authorized:</Text>
              <Text style={[styles.statusValue, syncStatus.isAuthorized && styles.statusSuccess]}>{syncStatus.isAuthorized ? 'Yes' : 'No'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Calories</Text>
          <View style={styles.card}>
            {barData.length === 0 ? (
              <Text style={styles.muted}>No calorie samples found for this period.</Text>
            ) : (
              <BarChart
                data={barData}
                barWidth={22}
                barBorderRadius={8}
                yAxisThickness={0}
                xAxisType={'dashed'}
                xAxisColor={'#E5E5EA'}
                yAxisTextStyle={{ color: '#8E8E93' }}
                maxValue={maxValue}
                noOfSections={4}
                xAxisLabelTextStyle={{ color: '#8E8E93', textAlign: 'center', fontWeight: '700', fontSize: 11 }}
                height={180}
                disableScroll
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Body Metrics</Text>
          <View style={styles.card}>
            {!latest ? (
              <Text style={styles.muted}>No body metrics found.</Text>
            ) : (
              <>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Weight:</Text>
                  <Text style={styles.statusValue}>{latest.weight !== undefined ? `${latest.weight.toFixed(1)} kg` : '—'}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Height:</Text>
                  <Text style={styles.statusValue}>{latest.height !== undefined ? `${latest.height.toFixed(2)} m` : '—'}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Date:</Text>
                  <Text style={styles.statusValue}>{new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workouts</Text>
          <View style={styles.card}>
            {workouts.length === 0 ? (
              <Text style={styles.muted}>No workouts found for this period.</Text>
            ) : (
              workouts
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 12)
                .map((w) => (
                  <View key={w.id || `${w.exercise}-${w.date}`} style={styles.workoutRow}>
                    <Text style={styles.workoutText}>{formatWorkoutLine(w)}</Text>
                  </View>
                ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerRow: { paddingTop: 60, marginBottom: 16 },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: -8 },
  closeButtonText: { fontSize: 32, color: '#181C20' },

  headerContainer: { marginBottom: 24 },
  header: { fontSize: 34, fontWeight: '800', color: '#000000', letterSpacing: -0.5 },
  subHeader: { marginTop: 6, fontSize: 15, fontWeight: '600', color: '#8E8E93' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#000000', marginBottom: 12, letterSpacing: -0.4 },

  periodSelectorRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  periodButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F2F2F7' },
  periodButtonSelected: { backgroundColor: '#000000' },
  periodButtonText: { color: '#8E8E93', fontWeight: '700', fontSize: 13 },
  periodButtonTextSelected: { color: '#FFFFFF' },

  card: { backgroundColor: '#F2F2F7', borderRadius: 16, padding: 16 },

  statusCard: { backgroundColor: '#F2F2F7', borderRadius: 16, padding: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusLabel: { fontSize: 14, color: '#8E8E93', fontWeight: '600' },
  statusValue: { fontSize: 14, color: '#000000', fontWeight: '700' },
  statusSuccess: { color: '#10B981' },

  muted: { color: '#8E8E93', fontWeight: '600', fontSize: 14 },

  workoutRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  workoutText: { color: '#000000', fontWeight: '600', fontSize: 14 },
});


