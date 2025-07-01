import { Tabs } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

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
          left: wp('4%'),
          right: wp('4%'),
          borderRadius: 40,
          height: hp('10%'),
          backgroundColor: '#181C20',
          borderTopWidth: 0,
          elevation: 0,
          marginBottom: hp('2%'),
          padding: wp('2%'),
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ flexDirection: 'row', backgroundColor: focused ? '#B6F533' : 'transparent', borderRadius: 20, paddingHorizontal: focused ? wp('2%') : 0, paddingVertical: focused ? hp('1%') : 0, alignItems: 'center' }}>
              <IconSymbol size={wp('6%')} name="house.fill" color={focused ? '#181C20' : '#fff'} />
              {focused && <Text style={{ color: '#181C20', fontWeight: '600', fontSize: wp('4%'), marginLeft: wp('1%') }}>Home</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ flexDirection: 'row', backgroundColor: focused ? '#B6F533' : 'transparent', borderRadius: 20, paddingHorizontal: focused ? wp('2%') : 0, paddingVertical: focused ? hp('1%') : 0, alignItems: 'center' }}>
              <IconSymbol size={wp('6%')} name="paperplane.fill" color={focused ? '#181C20' : '#fff'} />
              {focused && <Text style={{ color: '#181C20', fontWeight: '600', fontSize: wp('4%'), marginLeft: wp('1%') }}>Explore</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ flexDirection: 'row', backgroundColor: focused ? '#B6F533' : 'transparent', borderRadius: 20, paddingHorizontal: focused ? wp('2%') : 0, paddingVertical: focused ? hp('1%') : 0, alignItems: 'center' }}>
              <IconSymbol size={wp('6%')} name="rectangle.3.offgrid.fill" color={focused ? '#181C20' : '#fff'} />
              {focused && <Text style={{ color: '#181C20', fontWeight: '600', fontSize: wp('4%'), marginLeft: wp('1%') }}>Stats</Text>}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
