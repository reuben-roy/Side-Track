import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
  const authContext = useAuth();
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={require('@/assets/images/onboarding.webp')} style={styles.image} resizeMode="cover" />
        <Text style={styles.title}>SideTrack</Text>
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>Weaponized against you</Text>
          <Text style={styles.subtitle}>To bring out the best in you</Text>
        </View>
        
        <TouchableOpacity style={styles.socialButton} onPress={authContext?.loginWithGoogle}>
          <Ionicons name="logo-google" size={24} color="#fff" />
          <Text style={styles.socialButtonText}>Login with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialButton} onPress={authContext?.loginWithApple}>
          <Ionicons name="logo-apple" size={24} color="#fff" />
          <Text style={styles.socialButtonText}>Login with Apple</Text>
        </TouchableOpacity>
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
});

export default LoginScreen;