import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const Plate = ({ height, color }: { height: number, color: string }) => (
  <View style={[styles.plate, { height, backgroundColor: color }]} />
);

const Kettlebell = () => (
  <View style={styles.kbContainer}>
    <View style={styles.kbHandle} />
    <View style={styles.kbBall} />
  </View>
);

const Dumbbell = () => (
  <View style={styles.dbContainer}>
    <View style={styles.dbWeight} />
    <View style={styles.dbBar} />
    <View style={styles.dbWeight} />
  </View>
);

export default function LoginHero() {
  const liftAnim = useRef(new Animated.Value(0)).current;
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      // Barbell Lift
      Animated.loop(
        Animated.sequence([
          Animated.timing(liftAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(600),
          Animated.timing(liftAnim, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(400),
        ])
      ).start();

      // Kettlebell Float
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim1, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim1, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Dumbbell Float
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim2, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim2, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate();
  }, [liftAnim, floatAnim1, floatAnim2]);

  // Barbell Movement (Vertical)
  const barTranslateY = liftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -90], // Start to Overhead
  });

  // Kettlebell Movement
  const kbTranslateY = floatAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  // Dumbbell Movement
  const dbTranslateY = floatAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const dbRotate = floatAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '10deg'],
  });

  return (
    <View style={styles.container}>
      {/* Floating Kettlebell (Left) */}
      <Animated.View style={[styles.floatingItem, { left: '50%', marginLeft: -110, bottom: 80, transform: [{ translateY: kbTranslateY }] }]}>
        <Kettlebell />
      </Animated.View>

      {/* Moving Barbell (Center) */}
      <Animated.View style={[styles.barbellContainer, { transform: [{ translateY: barTranslateY }] }]}>
        <View style={styles.plateGroup}>
          <Plate height={50} color="#000000" />
          <Plate height={35} color="#48484A" />
        </View>
        <View style={styles.bar} />
        <View style={styles.plateGroup}>
          <Plate height={35} color="#48484A" />
          <Plate height={50} color="#000000" />
        </View>
      </Animated.View>

      {/* Floating Dumbbell (Right) */}
      <Animated.View style={[styles.floatingItem, { left: '50%', marginLeft: 70, bottom: 100, transform: [{ translateY: dbTranslateY }, { rotate: dbRotate }] }]}>
        <Dumbbell />
      </Animated.View>

      {/* Floor */}
      <View style={styles.floor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  floor: {
    width: 140,
    height: 2,
    backgroundColor: '#E5E5EA',
    borderRadius: 1,
    marginBottom: 40, // Ground level
  },
  // Barbell
  barbellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    marginBottom: 80, // Start height relative to floor
  },
  plateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  plate: {
    width: 8,
    borderRadius: 3,
  },
  bar: {
    width: 120,
    height: 8,
    backgroundColor: '#8E8E93',
    borderRadius: 4,
    marginHorizontal: -4,
    zIndex: -1,
  },
  // Floating Items
  floatingItem: {
    position: 'absolute',
    zIndex: 5,
  },
  // Kettlebell
  kbContainer: {
    alignItems: 'center',
  },
  kbHandle: {
    width: 24,
    height: 16,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: '#48484A',
    marginBottom: -6,
  },
  kbBall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
  },
  // Dumbbell
  dbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dbWeight: {
    width: 10,
    height: 24,
    backgroundColor: '#000000',
    borderRadius: 4,
  },
  dbBar: {
    width: 20,
    height: 6,
    backgroundColor: '#8E8E93',
  },
});