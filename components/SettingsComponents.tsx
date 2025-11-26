import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export const PreferenceRow = ({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => (
  <View style={styles.preferenceRow}>
    <View style={styles.preferenceTextContainer}>
      <Text style={styles.preferenceLabel}>{label}</Text>
      {description && <Text style={styles.preferenceDescription}>{description}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
    />
  </View>
);

export const SegmentedControl = ({
  label,
  options,
  selectedValue,
  onValueChange,
}: {
  label: string;
  options: { label: string; value: string }[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}) => (
  <View style={styles.segmentedContainer}>
    <Text style={styles.segmentedLabel}>{label}</Text>
    <View style={styles.segmentedControl}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.segmentedButton,
            selectedValue === option.value && styles.segmentedButtonActive,
          ]}
          onPress={() => onValueChange(option.value)}
        >
          <Text
            style={[
              styles.segmentedButtonText,
              selectedValue === option.value && styles.segmentedButtonTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  preferenceTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  preferenceLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  segmentedContainer: {
    marginBottom: 24,
  },
  segmentedLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 4,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  segmentedButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentedButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },
  segmentedButtonTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
});
