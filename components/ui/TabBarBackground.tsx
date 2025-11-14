import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

// Enhanced tab bar background for web and Android
export default function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.98)', 'rgba(248, 248, 255, 0.95)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
    </View>
  );
}

export function useBottomTabOverflow() {
  return 0;
}
