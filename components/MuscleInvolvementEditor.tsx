import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, TextInput, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { getPreference, setPreference } from '@/lib/database';
import { exercises } from '@/constants/Exercises';

interface MuscleInvolvement {
  [muscleName: string]: number; // 0-1 scale
}

interface MuscleInvolvementEditorProps {
  exerciseName: string;
  visible: boolean;
  onClose: () => void;
  onSave: (involvement: MuscleInvolvement) => void;
}

export default function MuscleInvolvementEditor({
  exerciseName,
  visible,
  onClose,
  onSave,
}: MuscleInvolvementEditorProps) {
  const exercise = exercises.find(e => e.name === exerciseName);
  const defaultInvolvement = exercise?.muscles || {};
  
  const [involvement, setInvolvement] = useState<MuscleInvolvement>({});
  const [total, setTotal] = useState(0);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, TextInput>>({});

  useEffect(() => {
    if (visible) {
      loadInvolvement();
    }
  }, [visible, exerciseName]);

  const loadInvolvement = async () => {
    try {
      // Try to load custom involvement, fallback to default
      const custom = await getPreference<MuscleInvolvement>(
        `exerciseMuscleInvolvement_${exerciseName}`,
        defaultInvolvement
      );
      setInvolvement(custom);
      setTotal(Object.values(custom).reduce((sum, val) => sum + val, 0));
      
      // Initialize input values with formatted percentages
      const inputVals: Record<string, string> = {};
      Object.entries(custom).forEach(([muscle, value]) => {
        inputVals[muscle] = (value * 100).toFixed(1);
      });
      setInputValues(inputVals);
    } catch (error) {
      setInvolvement(defaultInvolvement);
      setTotal(Object.values(defaultInvolvement).reduce((sum, val) => sum + val, 0));
      
      // Initialize input values with formatted percentages
      const inputVals: Record<string, string> = {};
      Object.entries(defaultInvolvement).forEach(([muscle, value]) => {
        inputVals[muscle] = (value * 100).toFixed(1);
      });
      setInputValues(inputVals);
    }
  };

  // Update the input text value (doesn't update involvement yet)
  const updateInputValue = (muscle: string, text: string) => {
    setInputValues(prev => ({
      ...prev,
      [muscle]: text,
    }));
  };

  // Apply the input value to involvement (called on blur or submit)
  const applyInputValue = (muscle: string) => {
    const textValue = inputValues[muscle] || '0';
    const numValue = parseFloat(textValue) || 0;
    const decimalValue = Math.max(0, Math.min(100, numValue)) / 100;
    
    const newInvolvement = { ...involvement };
    newInvolvement[muscle] = decimalValue;
    
    setInvolvement(newInvolvement);
    
    // Update input value to formatted version
    setInputValues(prev => ({
      ...prev,
      [muscle]: (decimalValue * 100).toFixed(1),
    }));
    
    // Calculate total
    const newTotal = Object.values(newInvolvement).reduce((sum, val) => sum + val, 0);
    setTotal(newTotal);
    
    // Clear focus
    setFocusedInput(null);
  };

  // Dismiss keyboard and apply any focused input
  const dismissKeyboard = () => {
    if (focusedInput) {
      applyInputValue(focusedInput);
    }
    Keyboard.dismiss();
  };

  const normalizeInvolvement = () => {
    const newInvolvement = { ...involvement };
    const currentTotal = Object.values(newInvolvement).reduce((sum, val) => sum + val, 0);
    
    if (currentTotal > 0) {
      // Scale all values proportionally to total 1.0
      Object.keys(newInvolvement).forEach(key => {
        newInvolvement[key] = newInvolvement[key] / currentTotal;
      });
      setInvolvement(newInvolvement);
      setTotal(1.0);
    }
  };

  const handleSave = async () => {
    // Apply all pending input values first
    const finalInvolvement = { ...involvement };
    Object.entries(inputValues).forEach(([muscle, textValue]) => {
      const numValue = parseFloat(textValue) || 0;
      finalInvolvement[muscle] = Math.max(0, Math.min(100, numValue)) / 100;
    });
    
    const total = Object.values(finalInvolvement).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 1.0) > 0.01) {
      Alert.alert(
        'Invalid Total',
        `Total must equal 100%. Current total: ${(total * 100).toFixed(1)}%.\n\nWould you like to normalize the values?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Normalize',
            onPress: () => {
              // Normalize the final involvement
              const normalized: MuscleInvolvement = {};
              Object.keys(finalInvolvement).forEach(key => {
                normalized[key] = finalInvolvement[key] / total;
              });
              setInvolvement(normalized);
              setTotal(1.0);
              
              // Update input values
              const inputVals: Record<string, string> = {};
              Object.entries(normalized).forEach(([muscle, value]) => {
                inputVals[muscle] = (value * 100).toFixed(1);
              });
              setInputValues(inputVals);
              
              // Save normalized values
              setPreference(`exerciseMuscleInvolvement_${exerciseName}`, normalized).then(() => {
                onSave(normalized);
                onClose();
              }).catch((error) => {
                Alert.alert('Error', 'Failed to save muscle involvement');
              });
            },
          },
        ]
      );
      return;
    }

    // All good, save it
    setInvolvement(finalInvolvement);
    setTotal(1.0);
    
    // Update input values to formatted versions
    const inputVals: Record<string, string> = {};
    Object.entries(finalInvolvement).forEach(([muscle, value]) => {
      inputVals[muscle] = (value * 100).toFixed(1);
    });
    setInputValues(inputVals);
    
    try {
      await setPreference(`exerciseMuscleInvolvement_${exerciseName}`, finalInvolvement);
      onSave(finalInvolvement);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save muscle involvement');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Default',
      'Are you sure you want to reset to the default muscle involvement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setInvolvement(defaultInvolvement);
            setTotal(1.0);
            
            // Reset input values
            const inputVals: Record<string, string> = {};
            Object.entries(defaultInvolvement).forEach(([muscle, value]) => {
              inputVals[muscle] = (value * 100).toFixed(1);
            });
            setInputValues(inputVals);
            
            await setPreference(`exerciseMuscleInvolvement_${exerciseName}`, defaultInvolvement);
            onSave(defaultInvolvement);
          },
        },
      ]
    );
  };

  const muscles = Object.entries(involvement).sort(([_, a], [__, b]) => b - a);
  const totalPercent = total * 100;
  const isValid = Math.abs(total - 1.0) < 0.01;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Muscle Involvement</Text>
            <Text style={styles.exerciseName}>{exerciseName}</Text>
          </View>

          <ScrollView 
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={dismissKeyboard}
          >
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              Enter the percentage involvement for each muscle. Total must equal 100%.
            </Text>
            <View style={[styles.totalContainer, !isValid && styles.totalContainerError]}>
              <Text style={[styles.totalLabel, !isValid && styles.totalLabelError]}>
                Total:
              </Text>
              <Text style={[styles.totalValue, !isValid && styles.totalValueError]}>
                {totalPercent.toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.muscleList}>
            {muscles.map(([muscle, value]) => (
              <View key={muscle} style={styles.muscleRow}>
                <View style={styles.muscleInfo}>
                  <Text style={styles.muscleName}>
                    {muscle.replace(/([A-Z])/g, ' $1').trim()}
                  </Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={(ref) => {
                      if (ref) inputRefs.current[muscle] = ref;
                    }}
                    style={styles.input}
                    value={inputValues[muscle] || (value * 100).toFixed(1)}
                    onChangeText={(text) => updateInputValue(muscle, text)}
                    onFocus={() => setFocusedInput(muscle)}
                    onBlur={() => applyInputValue(muscle)}
                    onSubmitEditing={() => applyInputValue(muscle)}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    selectTextOnFocus
                  />
                  <Text style={styles.percentSymbol}>%</Text>
                </View>
              </View>
            ))}
          </View>
          </ScrollView>

          <View style={styles.footer}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset to Default</Text>
          </TouchableOpacity>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, !isValid && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={!isValid}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#181C20',
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  infoSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F9F9F9',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  totalContainerError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#181C20',
  },
  totalLabelError: {
    color: '#FF3B30',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#181C20',
  },
  totalValueError: {
    color: '#FF3B30',
  },
  muscleList: {
    padding: 20,
  },
  muscleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  muscleInfo: {
    flex: 1,
  },
  muscleName: {
    fontSize: 16,
    color: '#181C20',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  input: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#181C20',
    textAlign: 'right',
    backgroundColor: '#fff',
  },
  percentSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  resetButton: {
    paddingVertical: 12,
    marginBottom: 12,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#181C20',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
