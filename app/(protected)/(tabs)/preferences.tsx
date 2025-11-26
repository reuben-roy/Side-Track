import ProfileButton from '@/components/ProfileButton';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PreferencesScreen() {
  const router = useRouter();

  const SettingsItem = ({ 
    label, 
    icon, 
    route, 
  }: { 
    label: string; 
    icon: keyof typeof Ionicons.glyphMap; 
    route: string;
  }) => (
    <TouchableOpacity 
      style={styles.item} 
      onPress={() => router.push(route as any)}
    >
      <Ionicons name={icon} size={24} color="#1C1C1E" style={styles.icon} />
      <Text style={styles.itemLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Preferences</Text>
        <ProfileButton />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <SettingsItem 
            label="General Settings" 
            icon="settings-outline" 
            route="/settings/general" 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Configuration</Text>
          <SettingsItem 
            label="Muscle Fatigue" 
            icon="battery-charging-outline" 
            route="/settings/fatigue" 
          />
          <SettingsItem 
            label="Recovery Rates" 
            icon="pulse-outline" 
            route="/settings/recovery" 
          />
          <SettingsItem 
            label="Exercise Limits" 
            icon="barbell-outline" 
            route="/settings/limits" 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>
          <SettingsItem 
            label="Cloud Backup" 
            icon="cloud-upload-outline" 
            route="/settings/backup" 
          />
          <SettingsItem 
            label="Data Management" 
            icon="trash-outline" 
            route="/settings/data" 
          />
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Side-Track v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', // System background color
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 24, // Add margin top for section title outside the white block
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  icon: {
    marginRight: 12,
  },
  itemLabel: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 20,
  },
  appInfoText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
});
