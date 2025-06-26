import React, { useRef } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: 'slide1',
    image: require('@/assets/images/react-logo.png'),
    headline: 'Wherever You Are, Health Is Number One',
    subtitle: 'There is no instant way to a healthy life',
  },
  {
    key: 'slide2',
    image: require('@/assets/images/onboarding-bg.jpg'),
    headline: 'Track Your Progress',
    subtitle: 'Monitor your workouts and achievements',
  },
  {
    key: 'slide3',
    image: require('@/assets/images/onboarding-bg.jpg'),
    headline: 'Join the Community',
    subtitle: 'Connect with others on your fitness journey',
  },
];

export default function OnboardingCarousel({ onGetStarted }: { onGetStarted: () => void }) {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={item.image} style={styles.image} resizeMode="cover" />
            <Text style={styles.headline}>{item.headline}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
            <TouchableOpacity style={styles.button} onPress={onGetStarted}>
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={item => item.key}
      />
      <View style={styles.pagination}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, currentIndex === i && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  image: {
    width: width - 48,
    height: 320,
    borderRadius: 16,
    marginBottom: 32,
  },
  headline: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#181C20',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    margin: 4,
  },
  activeDot: {
    backgroundColor: '#B6F533',
    width: 24,
  },
}); 