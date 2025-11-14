import React, { useRef } from 'react';
import { Animated, Dimensions, FlatList, StyleSheet, Text, View, ViewStyle } from 'react-native';

const ITEM_HEIGHT = 34;
const ITEM_MARGIN = 8;
const ITEM_TOTAL_HEIGHT = ITEM_HEIGHT + ITEM_MARGIN;
const VISIBLE_ITEMS = 5;
const { width } = Dimensions.get('window');

export default function SlotPicker({
  data,
  selectedIndex,
  onSelect,
  style,
}: {
  data: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  style?: ViewStyle;
}) {
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastIndexRef = useRef(selectedIndex);

  React.useEffect(() => {
    flatListRef.current?.scrollToIndex({ index: selectedIndex, animated: true });
    scrollY.setValue(selectedIndex * ITEM_TOTAL_HEIGHT);
    lastIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  const getCurrentIndex = (offset: number) => {
    return Math.round(offset / ITEM_TOTAL_HEIGHT);
  };

  const handleScrollEnd = (e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const idx = getCurrentIndex(offsetY);
    if (idx >= 0 && idx < data.length) {
      lastIndexRef.current = idx;
      onSelect(idx);
    }
  };

  return (
    <View style={[styles.slotContainer, { height: ITEM_TOTAL_HEIGHT * VISIBLE_ITEMS }, style]}>
      <Animated.FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(item, index) => index.toString()}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingVertical: ITEM_TOTAL_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
        snapToInterval={ITEM_TOTAL_HEIGHT}
        decelerationRate="normal"
        bounces={false}
        getItemLayout={(_, index) => ({
          length: ITEM_TOTAL_HEIGHT,
          offset: ITEM_TOTAL_HEIGHT * index,
          index,
        })}
        onMomentumScrollEnd={handleScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 2) * ITEM_TOTAL_HEIGHT,
            (index - 1) * ITEM_TOTAL_HEIGHT,
            index * ITEM_TOTAL_HEIGHT,
            (index + 1) * ITEM_TOTAL_HEIGHT,
            (index + 2) * ITEM_TOTAL_HEIGHT,
          ];
          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.8, 0.9, 1, 0.9, 0.8],
            extrapolate: 'clamp',
          });
          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.3, 0.6, 1, 0.6, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View style={[styles.slotItem, { marginBottom: ITEM_MARGIN, transform: [{ scale }], opacity }]}>
              <Text style={styles.slotText}>{item}</Text>
            </Animated.View>
          );
        }}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <View
          style={{
            height: ITEM_HEIGHT,
            width: '100%',
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#E6B3B3',
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slotContainer: {
    position: 'relative',
    backgroundColor: '#F5F2F2',
    borderRadius: 32,
    overflow: 'hidden',
    width: '90%',
    alignSelf: 'center',
  },
  slotItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#181C20',
    textAlign: 'center',
  },
}); 