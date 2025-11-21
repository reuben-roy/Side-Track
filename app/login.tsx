// import { useAuth } from '@/context/AuthContext'; // OLD: Custom OAuth
import LoginHero from '@/components/LoginHero';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'; // NEW: Supabase Auth
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import React from 'react';
import { ActivityIndicator, Dimensions, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
  // const authContext = useAuth(); // OLD
  const authContext = useSupabaseAuth(); // NEW
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <LoginHero />
        <Text style={styles.title}>SideTrack</Text>
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>Weaponized against you</Text>
          <Text style={styles.subtitle}>To bring out the best in you</Text>
        </View>
        
        {/* Google Sign In */}
        <TouchableOpacity style={styles.socialButton} onPress={authContext?.signInWithGoogle} disabled={authContext?.loading}>
          <Ionicons name="logo-google" size={24} color="#000" />
          {authContext?.loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.socialButtonText}>Login with Google</Text>
          )}
        </TouchableOpacity>
        {authContext?.error ? <Text style={styles.errorText}>{authContext.error}</Text> : null}

        {Platform.OS === 'ios' ? (
          authContext?.loading ? (
            <View style={[styles.appleButton, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator />
            </View>
          ) : (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={24}
              style={styles.appleButton}
              onPress={authContext?.signInWithApple}
            />
          )
        ) : Platform.OS === 'web' ? (
          <TouchableOpacity style={styles.socialButton} onPress={authContext?.signInWithApple}>
            <Ionicons name="logo-apple" size={24} color="#000" />
            <Text style={styles.socialButtonText}>Sign in with Apple</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -1,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appleButton: {
    width: '100%',
    height: 54,
    marginBottom: 16,
  },
  socialButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 12,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  orText: {
    color: '#8E8E93',
    marginHorizontal: 12,
  },
  signupText: {
    color: '#000000',
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
  subtitleContainer: {
    marginBottom: 48,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 8,
  }
});

export default LoginScreen;