import { Tabs } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#181C20',
        tabBarInactiveTintColor: '#fff',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          borderRadius: 40,
          height: 80,
          backgroundColor: '#181C20',
          borderTopWidth: 0,
          elevation: 0,
          marginBottom: 10,
          padding: 20,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ flexDirection: 'row', backgroundColor: focused ? '#B6F533' : 'transparent', borderRadius: 24, paddingHorizontal: focused ? 10 : 0, paddingVertical: focused ? 8 : 0 }}>
              <IconSymbol size={28} name="house.fill" color={focused ? '#181C20' : '#fff'} />
              {focused && <Text style={{ color: '#181C20', fontWeight: '600', fontSize: 18, marginLeft: 8 }}>Home</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ flexDirection: 'row', backgroundColor: focused ? '#B6F533' : 'transparent', borderRadius: 24, paddingHorizontal: focused ? 10 : 0, paddingVertical: focused ? 8 : 0 }}>
              <IconSymbol size={28} name="paperplane.fill" color={focused ? '#181C20' : '#fff'} />
              {focused && <Text style={{ color: '#181C20', fontWeight: '600', fontSize: 18, marginLeft: 8 }}>Explore</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ flexDirection: 'row', backgroundColor: focused ? '#B6F533' : 'transparent', borderRadius: 24, paddingHorizontal: focused ? 10 : 0, paddingVertical: focused ? 8 : 0 }}>
              <IconSymbol size={28} name="rectangle.3.offgrid.fill" color={focused ? '#181C20' : '#fff'} />
              {focused && <Text style={{ color: '#181C20', fontWeight: '600', fontSize: 18, marginLeft: 8 }}>Stats</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ flexDirection: 'row', backgroundColor: focused ? '#B6F533' : 'transparent', borderRadius: 24, paddingHorizontal: focused ? 10 : 0, paddingVertical: focused ? 8 : 0 }}>
              <IconSymbol size={28} name="person" color={focused ? '#181C20' : '#fff'} />
              {focused && <Text style={{ color: '#181C20', fontWeight: '600', fontSize: 18, marginLeft: 8 }}>Profile</Text>}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
