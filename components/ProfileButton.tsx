// import { useAuth } from '@/context/AuthContext'; // OLD: Custom OAuth
import { FIELDS, ProfileKeys, useProfile } from '@/context/ProfileContext';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'; // NEW: Supabase Auth
import { usePreferences } from '@/hooks/usePreferences';
import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ProfileInputField, { InputType } from './ProfileInputField';

// BMI calculation function - handles both metric and imperial with gender-specific defaults
const calculateBMI = (
  weight: string, 
  height: string, 
  units: 'metric' | 'imperial',
  gender?: string | null
): string => {
  try {
    let weightKg: number;
    let heightMeters: number;

    if (units === 'metric') {
      // Metric: weight in kg, height in cm
      const weightMatch = weight.match(/(\d+(?:\.\d+)?)/);
      weightKg = weightMatch ? parseFloat(weightMatch[1]) : 0;
      
      // Height in cm - use default if missing
      const heightMatch = height.match(/(\d+(?:\.\d+)?)/);
      let heightCm: number;
      if (!heightMatch || !heightMatch[1]) {
        // Use gender-specific default
        heightCm = gender === 'female' ? 162 : 175;
      } else {
        heightCm = parseFloat(heightMatch[1]);
      }
      heightMeters = heightCm / 100;
    } else {
      // Imperial: weight in lbs, height in feet'inches"
      const weightMatch = weight.match(/(\d+(?:\.\d+)?)/);
      const weightLbs = weightMatch ? parseFloat(weightMatch[1]) : 0;
      weightKg = weightLbs * 0.453592;
      
      // Extract height in feet and inches - use default if missing
      const heightMatch = height.match(/(\d+)'(\d+)?/);
      let totalInches: number;
      if (!heightMatch) {
        // Use gender-specific default
        totalInches = gender === 'female' ? 64 : 69; // 5'4" = 64", 5'9" = 69"
      } else {
        const feet = parseInt(heightMatch[1]);
        const inches = parseInt(heightMatch[2] || '0');
        totalInches = feet * 12 + inches;
      }
      heightMeters = totalInches * 0.0254;
    }
    
    if (heightMeters <= 0 || weightKg <= 0) return 'N/A';
    
    const bmi = weightKg / (heightMeters * heightMeters);
    return bmi.toFixed(1);
  } catch (error) {
    return 'N/A';
  }
};

interface ProfileButtonProps {
  top?: number;
  right?: number;
}

export default function ProfileButton({ top, right }: ProfileButtonProps) {
  // const auth = useAuth(); // OLD
  const auth = useSupabaseAuth(); // NEW
  const { profile, updateProfile } = useProfile();
  const { preferences } = usePreferences();
  // const { user, logout } = auth || {}; // OLD
  const { user, signOut } = auth || {}; // NEW: signOut instead of logout
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<ProfileKeys | null>(null);
  
  const units = preferences.units || 'imperial';

  const getInputType = (fieldKey: ProfileKeys): InputType => {
    switch (fieldKey) {
      case 'height':
        return 'height';
      case 'gender':
        return 'gender';
      default:
        return 'text';
    }
  };

  const openEdit = (fieldKey: ProfileKeys) => {
    setEditingField(fieldKey);
  };

  const handleSave = async (value: string) => {
    if (!editingField) return;
    await updateProfile(editingField, value);
    setEditingField(null);
  };

  const handleCancel = () => {
    setEditingField(null);
  };

  const handleLogout = () => {
    setModalVisible(false);
    // logout?.(); // OLD
    signOut?.(); // NEW
  };

  return (
    <>
      <TouchableOpacity 
        style={[
          styles.profileButton, 
          top !== undefined && right !== undefined && { position: 'absolute', top, right }
        ]} 
        onPress={() => setModalVisible(true)}
      >
        {user?.user_metadata?.picture || user?.user_metadata?.avatar_url ? (
          <Image source={{ uri: user.user_metadata.picture || user.user_metadata.avatar_url }} style={styles.profileImage} />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Text style={styles.profilePlaceholderText}>
              {user?.user_metadata?.name?.charAt(0) || user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
              {editingField ? (
                <ProfileInputField
                  label={FIELDS.find(f => f.key === editingField)?.label || ''}
                  value={profile[editingField] || ''}
                  inputType={getInputType(editingField)}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              ) : (
                <View style={styles.profileSection}>
                  <View style={styles.profileRow}>
                    <TouchableOpacity style={styles.profileCard} onPress={() => openEdit('weight')}>
                      <Text style={styles.profileLabel}>Weight</Text>
                      <View style={styles.profileValueRow}>
                        <Text style={styles.profileValue}>{profile.weight}</Text>
                        <Text style={styles.profileUnit}>{units === 'metric' ? 'kg' : 'lb'}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.profileCard} onPress={() => openEdit('height')}>
                      <Text style={styles.profileLabel}>Height</Text>
                      <View style={styles.profileValueRow}>
                        <Text style={styles.profileValue}>{profile.height}</Text>
                        {units === 'metric' && <Text style={styles.profileUnit}>cm</Text>}
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.profileRow}>
                    <TouchableOpacity style={styles.profileCard} onPress={() => openEdit('calorieGoal')}>
                      <Text style={styles.profileLabel}>Daily Calorie Goal</Text>
                      <View style={styles.profileValueRow}>
                        <Text style={styles.profileValue}>{profile.calorieGoal}</Text>
                        <Text style={styles.profileUnit}>Cal</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.profileCard} onPress={() => openEdit('gender')}>
                      <Text style={styles.profileLabel}>Gender</Text>
                      <Text style={styles.profileValue}>{profile.gender}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.profileRow}>
                    <View style={styles.profileCard}>
                      <Text style={styles.profileLabel}>BMI</Text>
                      <View style={styles.profileValueRow}>
                        <Text style={styles.profileValue}>
                          {calculateBMI(profile.weight, profile.height, units, profile.gender)}
                        </Text>
                        <Text style={styles.profileUnit}>kg/m²</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    zIndex: 1000,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#B6F533',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderText: {
    color: '#181C20',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FAFAFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#181C20',
  },
  closeButton: {
    fontSize: 24,
    color: '#888',
    fontWeight: 'bold',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  profileSection: {
    paddingBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  profileCard: {
    flex: 1,
    backgroundColor: '#FCFEFA',
    borderRadius: 12,
    padding: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
    minHeight: 80,
  },
  profileLabel: {
    color: '#A0A0A0',
    fontSize: 14,
    marginBottom: 8,
  },
  profileValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#181C20',
  },
  profileValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  profileUnit: {
    fontSize: 14,
    marginLeft: 4,
    color: '#888',
  },
  logoutButton: {
    backgroundColor: '#181C20',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});