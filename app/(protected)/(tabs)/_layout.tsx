import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#181C20',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            height: hp('9%'),
            paddingTop: hp('1%'),
          },
          default: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: 'rgba(0, 0, 0, 0.1)',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            height: hp('9%'),
            paddingTop: hp('1%'),
          },
        }),
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabContainer}>
              {focused ? (
                <LinearGradient
                  colors={['#c3e5ecff', '#d9f1f6ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeTab}
                >
                  <IconSymbol size={wp('6%')} name="house.fill" color="#181C20" />
                  <Text style={styles.activeLabel}>Home</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <IconSymbol size={wp('6%')} name="house.fill" color="#999" />
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabContainer}>
              {focused ? (
                <LinearGradient
                  colors={['#c3e5ecff', '#d9f1f6ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeTab}
                >
                  <IconSymbol size={wp('6%')} name="chart.bar.fill" color="#181C20" />
                  <Text style={styles.activeLabel}>Stats</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <IconSymbol size={wp('6%')} name="chart.bar.fill" color="#999" />
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabContainer}>
              {focused ? (
                <LinearGradient
                  colors={['#c3e5ecff', '#d9f1f6ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeTab}
                >
                  <IconSymbol size={wp('6%')} name="trophy.fill" color="#181C20" />
                  <Text style={styles.activeLabel}>Rankings</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <IconSymbol size={wp('6%')} name="trophy.fill" color="#999" />
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="preferences"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabContainer}>
              {focused ? (
                <LinearGradient
                  colors={['#c3e5ecff', '#d9f1f6ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeTab}
                >
                  <IconSymbol size={wp('6%')} name="gearshape.fill" color="#181C20" />
                  <Text style={styles.activeLabel}>Settings</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <IconSymbol size={wp('6%')} name="gearshape.fill" color="#999" />
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1.2%'),
    borderRadius: 24,
    minWidth: wp('24%'),
    shadowColor: '#E6B3B3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  activeLabel: {
    color: '#181C20',
    fontWeight: '700',
    fontSize: wp('3.5%'),
    marginLeft: wp('1.5%'),
  },
  inactiveTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('1.2%'),
  },
});
