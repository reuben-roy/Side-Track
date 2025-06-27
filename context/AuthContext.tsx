import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for a stored user session
    // For now, we'll just simulate a check
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const login = (userData: any) => {
    setUser(userData);
    router.replace('/(tabs)');
  };

  const logout = () => {
    setUser(null);
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
