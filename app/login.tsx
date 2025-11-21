// import { useAuth } from '@/context/AuthContext'; // OLD: Custom OAuth
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'; // NEW: Supabase Auth
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import React from 'react';
import { ActivityIndicator, Dimensions, Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
  // const authContext = useAuth(); // OLD
  const authContext = useSupabaseAuth(); // NEW
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={require('@/assets/images/onboarding.webp')} style={styles.image} resizeMode="cover" />
        <Text style={styles.title}>SideTrack</Text>
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>Weaponized against you</Text>
          <Text style={styles.subtitle}>To bring out the best in you</Text>
        </View>
        
        {/* Google Sign In */}
        <TouchableOpacity style={styles.socialButton} onPress={authContext?.signInWithGoogle} disabled={authContext?.loading}>
          <Ionicons name="logo-google" size={24} color="#fff" />
          {authContext?.loading ? (
            <ActivityIndicator color="#fff" />
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
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={24}
              style={styles.appleButton}
              onPress={authContext?.signInWithApple}
            />
          )
        ) : Platform.OS === 'web' ? (
          <TouchableOpacity style={styles.socialButton} onPress={authContext?.signInWithApple}>
            <Ionicons name="logo-apple" size={24} color="#fff" />
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
    backgroundColor: '#181C20',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 16,
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: 16,
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 18,
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
    backgroundColor: '#888',
  },
  orText: {
    color: '#888',
    marginHorizontal: 12,
  },
  signupText: {
    color: '#B6F533',
    textAlign: 'center',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  image: {
    width: width - 48,
    height: width - 48,
    borderRadius: 16,
    marginBottom: 32,
    marginHorizontal: 'auto',
  },
  subtitleContainer: {
    marginBottom: 32
  }
  ,
  errorText: {
    color: '#FF5A5F',
    textAlign: 'center',
    marginTop: 8,
  }
});

export default LoginScreen;