import { router } from 'expo-router';
import React, { useRef } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: 'slide1',
    image: require('@/assets/images/react-logo.png'),
    headline: 'Wherever You Are, Health Is Number One',
    subtitle: 'There is no instant way to a healthy life',
    isLastSlide: false,
  },
  {
    key: 'slide2',
    image: require('@/assets/images/onboarding-bg.jpg'),
    headline: 'Track Your Progress',
    subtitle: 'Monitor your workouts and achievements',
    isLastSlide: false,
  },
  {
    key: 'slide3',
    image: require('@/assets/images/onboarding-bg.jpg'),
    headline: 'Join the Community',
    subtitle: 'Connect with others on your fitness journey',
    isLastSlide: true,
  },
];

interface OnboardingCarouselProps {
  onComplete?: () => void;
}

export default function OnboardingCarousel({ onComplete }: OnboardingCarouselProps) {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleLoginPress = () => {
    router.push('/login');
  };

  const handleGetStartedPress = async () => {
    if (onComplete) {
      onComplete();
    } else {
      // If no onComplete prop, navigate to main app
      router.replace('/(tabs)');
    }
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
            {item.isLastSlide ? (
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={handleGetStartedPress}>
                  <Text style={styles.buttonText}>Get Started</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleLoginPress}>
                  <Text style={styles.secondaryButtonText}>Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleLoginPress}>
                <Text style={styles.buttonText}>Login</Text>
              </TouchableOpacity>
            )}
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
  buttonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#181C20',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  secondaryButtonText: {
    color: '#181C20',
    fontSize: 18,
    fontWeight: '600',
  },
}); 