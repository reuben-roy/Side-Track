import { useProfile } from '@/context/ProfileContext';
import { useUserCapacity } from '@/context/UserCapacityContext';
import { setOnboardingComplete } from '@/lib/onboarding';
import { saveProfile, setPreference } from '@/lib/database';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | null;

// Experience-based capacity multipliers
const EXPERIENCE_MULTIPLIERS = {
  beginner: 0.7,   // 30% lower than defaults
  intermediate: 1.0, // Default values
  advanced: 1.3,  // 30% higher than defaults
};

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(null);
  const [loading, setLoading] = useState(false);

  const { updateFullProfile } = useProfile();
  const { capacityLimits, updateCapacityLimit } = useUserCapacity();

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Save units preference
      await setPreference('units', units);

      // Format height based on units
      let heightValue = '';
      if (units === 'imperial') {
        const feet = heightFeet || '5';
        const inches = heightInches || '9';
        heightValue = `${feet}'${inches}"`;
      } else {
        heightValue = heightCm || '175';
      }

      // Save profile
      const profile = {
        weight: weight || (units === 'imperial' ? '170' : '77'),
        height: heightValue,
        calorieGoal: '360',
        gender: gender || 'male',
      };
      await saveProfile(profile);
      await updateFullProfile(profile);

      // Adjust capacity limits based on experience level
      if (experienceLevel && experienceLevel !== 'intermediate') {
        const multiplier = EXPERIENCE_MULTIPLIERS[experienceLevel];
        const coreLifts = ['Squat', 'Deadlift', 'Bench Press', 'Overhead Press', 'Pull-Up', 'Barbell Row', 'Dumbbell Lunge', 'Push-Up', 'Triceps Dip'];
        
        // Use default values and apply multiplier
        const DEFAULT_VALUES: Record<string, number> = {
          'Squat': 205,
          'Deadlift': 185,
          'Bench Press': 145,
          'Overhead Press': 95,
          'Pull-Up': 175,
          'Barbell Row': 145,
          'Dumbbell Lunge': 60,
          'Push-Up': 0, // Bodyweight exercise
          'Triceps Dip': 160,
        };
        
        for (const lift of coreLifts) {
          const defaultValue = DEFAULT_VALUES[lift] || 0;
          const adjustedValue = Math.round(defaultValue * multiplier);
          if (adjustedValue > 0) {
            await updateCapacityLimit(lift, adjustedValue);
          }
        }
      }

      // Mark onboarding as complete - ensure this completes before navigation
      await setOnboardingComplete();
      
      // Delay to ensure database write is fully committed and readable
      await new Promise(resolve => setTimeout(resolve, 300));

      // Navigate to main app - the layout will verify onboarding is complete
      router.replace('/(protected)/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return true; // Units - always can proceed
      case 2: return weight.trim() !== '' && gender !== null; // Weight & Gender required
      case 3: return true; // Height optional
      case 4: return true; // Experience optional
      case 5: return true; // Review
      default: return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose Your Units</Text>
            <Text style={styles.stepDescription}>
              Select your preferred measurement system
            </Text>
            <View style={styles.unitsContainer}>
              <TouchableOpacity
                style={[styles.unitOption, units === 'imperial' && styles.unitOptionActive]}
                onPress={() => setUnits('imperial')}
              >
                <Text style={[styles.unitOptionText, units === 'imperial' && styles.unitOptionTextActive]}>
                  Imperial
                </Text>
                <Text style={styles.unitOptionSubtext}>lbs, feet/inches</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitOption, units === 'metric' && styles.unitOptionActive]}
                onPress={() => setUnits('metric')}
              >
                <Text style={[styles.unitOptionText, units === 'metric' && styles.unitOptionTextActive]}>
                  Metric
                </Text>
                <Text style={styles.unitOptionSubtext}>kg, cm</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Basic Information</Text>
            <Text style={styles.stepDescription}>
              We need this for accurate strength rankings
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight ({units === 'imperial' ? 'lbs' : 'kg'})</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder={units === 'imperial' ? '170' : '77'}
                keyboardType="numeric"
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[styles.genderOption, gender === 'male' && styles.genderOptionActive]}
                  onPress={() => setGender('male')}
                >
                  <Text style={[styles.genderOptionText, gender === 'male' && styles.genderOptionTextActive]}>
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderOption, gender === 'female' && styles.genderOptionActive]}
                  onPress={() => setGender('female')}
                >
                  <Text style={[styles.genderOptionText, gender === 'female' && styles.genderOptionTextActive]}>
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Height (Optional)</Text>
            <Text style={styles.stepDescription}>
              Help us calculate your BMI and calorie needs
            </Text>
            
            {units === 'imperial' ? (
              <View style={styles.heightRow}>
                <View style={styles.heightInputGroup}>
                  <Text style={styles.inputLabel}>Feet</Text>
                  <TextInput
                    style={styles.input}
                    value={heightFeet}
                    onChangeText={setHeightFeet}
                    placeholder="5"
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
                <View style={styles.heightInputGroup}>
                  <Text style={styles.inputLabel}>Inches</Text>
                  <TextInput
                    style={styles.input}
                    value={heightInches}
                    onChangeText={setHeightInches}
                    placeholder="9"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="175"
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
            )}
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Fitness Experience</Text>
            <Text style={styles.stepDescription}>
              This helps us set appropriate strength levels
            </Text>
            
            <View style={styles.experienceContainer}>
              <TouchableOpacity
                style={[styles.experienceOption, experienceLevel === 'beginner' && styles.experienceOptionActive]}
                onPress={() => setExperienceLevel('beginner')}
              >
                <Text style={[styles.experienceOptionTitle, experienceLevel === 'beginner' && styles.experienceOptionTitleActive]}>
                  Beginner
                </Text>
                <Text style={styles.experienceOptionDescription}>
                  New to strength training
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.experienceOption, experienceLevel === 'intermediate' && styles.experienceOptionActive]}
                onPress={() => setExperienceLevel('intermediate')}
              >
                <Text style={[styles.experienceOptionTitle, experienceLevel === 'intermediate' && styles.experienceOptionTitleActive]}>
                  Intermediate
                </Text>
                <Text style={styles.experienceOptionDescription}>
                  Regular training for 1+ years
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.experienceOption, experienceLevel === 'advanced' && styles.experienceOptionActive]}
                onPress={() => setExperienceLevel('advanced')}
              >
                <Text style={[styles.experienceOptionTitle, experienceLevel === 'advanced' && styles.experienceOptionTitleActive]}>
                  Advanced
                </Text>
                <Text style={styles.experienceOptionDescription}>
                  Experienced lifter, competitive
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>You're All Set!</Text>
            <Text style={styles.stepDescription}>
              Review your information and let's get started
            </Text>
            
            <View style={styles.reviewContainer}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Units:</Text>
                <Text style={styles.reviewValue}>{units === 'imperial' ? 'Imperial' : 'Metric'}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Weight:</Text>
                <Text style={styles.reviewValue}>{weight || 'Not set'} {units === 'imperial' ? 'lbs' : 'kg'}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Gender:</Text>
                <Text style={styles.reviewValue}>{gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : 'Not set'}</Text>
              </View>
              {heightFeet || heightCm ? (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Height:</Text>
                  <Text style={styles.reviewValue}>
                    {units === 'imperial' 
                      ? `${heightFeet || '5'}'${heightInches || '9'}"`
                      : `${heightCm || '175'} cm`
                    }
                  </Text>
                </View>
              ) : null}
              {experienceLevel && (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Experience:</Text>
                  <Text style={styles.reviewValue}>
                    {experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 5) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{step} of 5</Text>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {step > 1 && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleBack}
              disabled={loading}
            >
              <Text style={styles.buttonSecondaryText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, !canProceed() && styles.buttonDisabled]}
            onPress={step === 5 ? handleComplete : handleNext}
            disabled={!canProceed() || loading}
          >
            <Text style={styles.buttonPrimaryText}>
              {loading ? 'Setting up...' : step === 5 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: 17,
    color: '#8E8E93',
    marginBottom: 40,
    lineHeight: 24,
  },
  unitsContainer: {
    gap: 16,
  },
  unitOption: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  unitOptionActive: {
    borderColor: '#000000',
    backgroundColor: '#F2F2F7',
  },
  unitOptionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 4,
  },
  unitOptionTextActive: {
    color: '#000000',
  },
  unitOptionSubtext: {
    fontSize: 15,
    color: '#8E8E93',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    fontSize: 17,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  genderOptionActive: {
    borderColor: '#000000',
    backgroundColor: '#F2F2F7',
  },
  genderOptionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8E8E93',
  },
  genderOptionTextActive: {
    color: '#000000',
  },
  heightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heightInputGroup: {
    flex: 1,
  },
  experienceContainer: {
    gap: 16,
  },
  experienceOption: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  experienceOptionActive: {
    borderColor: '#000000',
    backgroundColor: '#F2F2F7',
  },
  experienceOptionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 4,
  },
  experienceOptionTitleActive: {
    color: '#000000',
  },
  experienceOptionDescription: {
    fontSize: 15,
    color: '#8E8E93',
  },
  reviewContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8E8E93',
  },
  reviewValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#000000',
  },
  buttonSecondary: {
    backgroundColor: '#F2F2F7',
  },
  buttonDisabled: {
    backgroundColor: '#E5E5EA',
    opacity: 0.5,
  },
  buttonPrimaryText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonSecondaryText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
});

