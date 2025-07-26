import { useAuth } from '@/context/AuthContext';
import { FIELDS, ProfileKeys, useProfile } from '@/context/ProfileContext';
import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  const { profile, updateProfile } = useProfile();
  const { user, logout } = auth || {};
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<ProfileKeys | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [genderDropdownVisible, setGenderDropdownVisible] = useState(false);

  const openEdit = (fieldKey: ProfileKeys) => {
    setEditingField(fieldKey);
    if (fieldKey === 'height') {
      // Parse height like 5'9"
      const match = profile.height.match(/(\d+)'(\d+)?/);
      setHeightFeet(match ? match[1] : '');
      setHeightInches(match && match[2] ? match[2] : '');
    } else if (fieldKey === 'gender') {
      setGenderDropdownVisible(true);
    } else {
      setInputValue(profile[fieldKey] || '');
    }
  };

  const selectGender = async (gender: string) => {
    await updateProfile('gender', gender);
    setGenderDropdownVisible(false);
    setEditingField(null);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    if (editingField === 'height') {
      const feet = heightFeet.replace(/[^0-9]/g, '');
      const inches = heightInches.replace(/[^0-9]/g, '');
      const formatted = `${feet}'${inches}\"`;
      await updateProfile('height', formatted);
    } else {
      await updateProfile(editingField, inputValue);
    }
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
        {user?.picture ? (
          <Image source={{ uri: user.picture }} style={styles.profileImage} />
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

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
                  ) : editingField === 'gender' && genderDropdownVisible ? (
                    <View style={styles.genderOptions}>
                      {['Male', 'Female', 'Other'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.genderOption,
                            profile.gender === option && styles.selectedGenderOption
                          ]}
                          onPress={() => selectGender(option)}
                        >
                          <Text style={[
                            styles.genderOptionText,
                            profile.gender === option && styles.selectedGenderOptionText
                          ]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
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
            </ScrollView>
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
  editSection: {
    paddingBottom: 20,
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
    marginBottom: 24,
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
    marginTop: 8,
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
  genderOptions: {
    marginBottom: 24,
  },
  genderOption: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  selectedGenderOption: {
    backgroundColor: '#B6F533',
    borderColor: '#B6F533',
  },
  genderOptionText: {
    fontSize: 16,
    color: '#181C20',
    textAlign: 'center',
  },
  selectedGenderOptionText: {
    fontWeight: '600',
  },
});