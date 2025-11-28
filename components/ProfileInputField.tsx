import { usePreferences } from '@/hooks/usePreferences';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export type InputType = 'text' | 'height' | 'gender';

interface ProfileInputFieldProps {
  label: string;
  value: string;
  inputType: InputType;
  onSave: (value: string) => Promise<void>;
  onCancel: () => void;
}

export default function ProfileInputField({ 
  label, 
  value, 
  inputType, 
  onSave, 
  onCancel 
}: ProfileInputFieldProps) {
  const { preferences } = usePreferences();
  const units = preferences.units || 'imperial';
  const [inputValue, setInputValue] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [genderDropdownVisible, setGenderDropdownVisible] = useState(false);

  useEffect(() => {
    if (inputType === 'height') {
      if (units === 'metric') {
        // Metric: just a number in cm
        const match = value.match(/(\d+(?:\.\d+)?)/);
        setHeightCm(match ? match[1] : '');
      } else {
        // Imperial: feet'inches"
        const match = value.match(/(\d+)'(\d+)?/);
        setHeightFeet(match ? match[1] : '');
        setHeightInches(match && match[2] ? match[2] : '');
      }
    } else if (inputType === 'gender') {
      setGenderDropdownVisible(true);
    } else {
      setInputValue(value);
    }
  }, [value, inputType, units]);

  const handleGenderSelect = async (gender: string) => {
    await onSave(gender);
    setGenderDropdownVisible(false);
  };

  const handleSave = async () => {
    if (inputType === 'height') {
      if (units === 'metric') {
        // Metric: save as cm
        const cm = heightCm.replace(/[^0-9.]/g, '');
        await onSave(cm || '175');
      } else {
        // Imperial: save as feet'inches"
        const feet = heightFeet.replace(/[^0-9]/g, '');
        const inches = heightInches.replace(/[^0-9]/g, '');
        const formatted = `${feet}'${inches}\"`;
        await onSave(formatted);
      }
    } else {
      await onSave(inputValue);
    }
  };

  const renderInput = () => {
    switch (inputType) {
      case 'height':
        if (units === 'metric') {
          return (
            <View style={styles.heightInputs}>
              <TextInput
                style={styles.input}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                placeholder="175"
                autoFocus
              />
              <Text style={styles.inputLabel}>cm</Text>
            </View>
          );
        } else {
          return (
            <View style={styles.heightInputs}>
              <TextInput
                style={[styles.input, { width: 60 }]}
                value={heightFeet}
                onChangeText={setHeightFeet}
                keyboardType="numeric"
                placeholder="5"
                maxLength={2}
                autoFocus
              />
              <Text style={styles.inputLabel}>ft</Text>
              <TextInput
                style={[styles.input, { width: 60 }]}
                value={heightInches}
                onChangeText={setHeightInches}
                keyboardType="numeric"
                placeholder="9"
                maxLength={2}
              />
              <Text style={styles.inputLabel}>in</Text>
            </View>
          );
        }
      case 'gender':
        return genderDropdownVisible ? (
          <View style={styles.genderOptions}>
            {['Male', 'Female', 'Other'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.genderOption,
                  value === option && styles.selectedGenderOption
                ]}
                onPress={() => handleGenderSelect(option)}
              >
                <Text style={[
                  styles.genderOptionText,
                  value === option && styles.selectedGenderOptionText
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null;
      default:
        return (
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            autoFocus
          />
        );
    }
  };

  return (
    <View style={styles.editSection}>
      <Text style={styles.editLabel}>Edit {label}</Text>
      {renderInput()}
      {inputType !== 'gender' && (
        <View style={styles.editButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
