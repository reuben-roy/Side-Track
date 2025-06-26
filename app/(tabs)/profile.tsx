import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Button, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const FIELDS = [
  { key: 'weight', label: 'Weight', default: '170 lb' },
  { key: 'height', label: 'Height', default: "5'9\"" },
  { key: 'calorieGoal', label: 'Calorie Goal', default: '2000 Cal' },
] as const;

type ProfileKeys = typeof FIELDS[number]['key'];
type Profile = Record<ProfileKeys, string>;

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile>({ weight: '', height: '', calorieGoal: '' });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<ProfileKeys | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');

  useEffect(() => {
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
    setModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    let updated: Profile;
    if (editingField === 'height') {
      const feet = heightFeet.replace(/[^0-9]/g, '');
      const inches = heightInches.replace(/[^0-9]/g, '');
      const formatted = `${feet}'${inches}"`;
      updated = { ...profile, height: formatted };
    } else {
      updated = { ...profile, [editingField]: inputValue };
    }
    setProfile(updated);
    await AsyncStorage.setItem('profile', JSON.stringify(updated));
    setModalVisible(false);
    setEditingField(null);
    setInputValue('');
    setHeightFeet('');
    setHeightInches('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Profile</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.card} onPress={() => openEdit('weight')}>
          <Text style={styles.label}>Weight</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={styles.value}>{profile.weight}</Text>
            <Text style={[styles.value, { fontSize: 16, marginLeft: 4, color: '#888' }]}>lb</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => openEdit('height')}>
          <Text style={styles.label}>Height</Text>
          <Text style={styles.value}>{profile.height}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={styles.card} onPress={() => openEdit('calorieGoal')}>
          <Text style={styles.label}>Calorie Goal</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={styles.value}>{profile.calorieGoal}</Text>
            <Text style={[styles.value, { fontSize: 16, marginLeft: 4, color: '#888' }]}>Cal</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>
              Edit {FIELDS.find(f => f.key === editingField)?.label}
            </Text>
            {editingField === 'height' ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  style={[styles.input, { width: 60 }]}
                  value={heightFeet}
                  onChangeText={setHeightFeet}
                  keyboardType="numeric"
                  placeholder="ft"
                  maxLength={2}
                  autoFocus
                />
                <Text style={{ fontSize: 22, alignSelf: 'center', paddingBottom: 20 }}>ft</Text>
                <TextInput
                  style={[styles.input, { width: 60 }]}
                  value={heightInches}
                  onChangeText={setHeightInches}
                  keyboardType="numeric"
                  placeholder="in"
                  maxLength={2}
                />
                <Text style={{ fontSize: 22, alignSelf: 'center', paddingBottom: 20 }}>
                  inch
                </Text>
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                autoFocus
              />
            )}
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} />
              <Button title="Save" onPress={saveEdit} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFF',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#181C20',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: '#FCFEFA',
    borderRadius: 16,
    padding: 24,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    color: '#A0A0A0',
    fontSize: 16,
    marginBottom: 8,
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#181C20',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: 300,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
    marginBottom: 20,
    color: '#181C20',
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
  },
}); 