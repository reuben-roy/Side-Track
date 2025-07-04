import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const FIELDS = [
  { key: 'weight', label: 'Weight', default: '170 lb' },
  { key: 'height', label: 'Height', default: "5'9\"" },
  { key: 'calorieGoal', label: 'Calorie Goal', default: '2000 Cal' },
] as const;

type ProfileKeys = typeof FIELDS[number]['key'];
type Profile = Record<ProfileKeys, string>;

// BMI calculation function
const calculateBMI = (weight: string, height: string): string => {
  try {
    // Extract weight in pounds
    const weightMatch = weight.match(/(\d+(?:\.\d+)?)/);
    const weightLbs = weightMatch ? parseFloat(weightMatch[1]) : 0;
    
    // Extract height in feet and inches
    const heightMatch = height.match(/(\d+)'(\d+)?/);
    if (!heightMatch) return 'N/A';
    
    const feet = parseInt(heightMatch[1]);
    const inches = parseInt(heightMatch[2] || '0');
    const totalInches = feet * 12 + inches;
    const heightMeters = totalInches * 0.0254;
    const weightKg = weightLbs * 0.453592;
    
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

export default function ProfileButton({ top = 50, right = 20 }: ProfileButtonProps) {
  const auth = useAuth();
  const user = auth?.user;
  const logout = auth?.logout;
  const [modalVisible, setModalVisible] = useState(false);
  const [profile, setProfile] = useState<Profile>({ weight: '', height: '', calorieGoal: '' });
  const [editingField, setEditingField] = useState<ProfileKeys | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');

  React.useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('profile');
      if (stored) {
        setProfile(JSON.parse(stored));
      } else {
        setProfile({
          weight: FIELDS[0].default,
          height: FIELDS[1].default,
          calorieGoal: FIELDS[2].default,
        });
      }
    })();
  }, []);

  const openEdit = (fieldKey: ProfileKeys) => {
    setEditingField(fieldKey);
    if (fieldKey === 'height') {
      // Parse height like 5'9"
      const match = profile.height.match(/(\d+)'(\d+)?/);
      setHeightFeet(match ? match[1] : '');
      setHeightInches(match && match[2] ? match[2] : '');
    } else {
      setInputValue(profile[fieldKey] || '');
    }
  };

  const saveEdit = async () => {
    if (!editingField) return;
    let updated: Profile;
    if (editingField === 'height') {
      const feet = heightFeet.replace(/[^0-9]/g, '');
      const inches = heightInches.replace(/[^0-9]/g, '');
      const formatted = `${feet}'${inches}\"`;
      updated = { ...profile, height: formatted };
    } else {
      updated = { ...profile, [editingField]: inputValue };
    }
    setProfile(updated);
    await AsyncStorage.setItem('profile', JSON.stringify(updated));
    setEditingField(null);
    setInputValue('');
    setHeightFeet('');
    setHeightInches('');
  };

  const handleLogout = () => {
    setModalVisible(false);
    logout?.();
  };

  return (
    <>
      <TouchableOpacity style={[styles.profileButton, { top, right }]} onPress={() => setModalVisible(true)}>
        {user?.photoUrl ? (
          <Image source={{ uri: user.photoUrl }} style={styles.profileImage} />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Text style={styles.profilePlaceholderText}>
              {user?.name?.charAt(0) || 'U'}
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

            {editingField ? (
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>
                  Edit {FIELDS.find(f => f.key === editingField)?.label}
                </Text>
                {editingField === 'height' ? (
                  <View style={styles.heightInputs}>
                    <TextInput
                      style={[styles.input, { width: 60 }]}
                      value={heightFeet}
                      onChangeText={setHeightFeet}
                      keyboardType="numeric"
                      placeholder="ft"
                      maxLength={2}
                      autoFocus
                    />
                    <Text style={styles.inputLabel}>ft</Text>
                    <TextInput
                      style={[styles.input, { width: 60 }]}
                      value={heightInches}
                      onChangeText={setHeightInches}
                      keyboardType="numeric"
                      placeholder="in"
                      maxLength={2}
                    />
                    <Text style={styles.inputLabel}>inch</Text>
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={inputValue}
                    onChangeText={setInputValue}
                    autoFocus
                  />
                )}
                <View style={styles.editButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingField(null)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.profileSection}>
                <View style={styles.profileRow}>
                  <TouchableOpacity style={styles.profileCard} onPress={() => openEdit('weight')}>
                    <Text style={styles.profileLabel}>Weight</Text>
                    <View style={styles.profileValueRow}>
                      <Text style={styles.profileValue}>{profile.weight}</Text>
                      <Text style={styles.profileUnit}>lb</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.profileCard} onPress={() => openEdit('height')}>
                    <Text style={styles.profileLabel}>Height</Text>
                    <Text style={styles.profileValue}>{profile.height}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.profileRow}>
                  <TouchableOpacity style={styles.profileCard} onPress={() => openEdit('calorieGoal')}>
                    <Text style={styles.profileLabel}>Calorie Goal</Text>
                    <View style={styles.profileValueRow}>
                      <Text style={styles.profileValue}>{profile.calorieGoal}</Text>
                      <Text style={styles.profileUnit}>Cal</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.profileRow}>
                  <View style={styles.profileCard}>
                    <Text style={styles.profileLabel}>BMI</Text>
                    <View style={styles.profileValueRow}>
                      <Text style={styles.profileValue}>{calculateBMI(profile.weight, profile.height)}</Text>
                      <Text style={styles.profileUnit}>kg/m²</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    position: 'absolute',
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
    maxHeight: '80%',
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
  profileSection: {
    flex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  profileCard: {
    flex: 1,
    backgroundColor: '#FCFEFA',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
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
  editSection: {
    flex: 1,
  },
  editLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#181C20',
  },
  heightInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#181C20',
    backgroundColor: '#fff',
  },
  inputLabel: {
    fontSize: 16,
    color: '#888',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#B6F533',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#181C20',
    fontSize: 16,
    fontWeight: '600',
  },
}); 