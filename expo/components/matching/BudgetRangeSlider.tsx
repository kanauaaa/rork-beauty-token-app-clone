import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';

interface BudgetRangeSliderProps {
  minBudget: number;
  maxBudget: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}

export function BudgetRangeSlider({ minBudget, maxBudget, onMinChange, onMaxChange }: BudgetRangeSliderProps) {
  const sliderContainerRef = useRef<View>(null);
  const [sliderWidth, setSliderWidth] = useState(280);

  const calculateValue = (pageX: number, sliderLeft: number) => {
    const percentage = Math.max(0, Math.min(1, (pageX - sliderLeft) / sliderWidth));
    return Math.round(percentage * 100000 / 1000) * 1000;
  };

  const minPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (evt) => {
        sliderContainerRef.current?.measureInWindow((x) => {
          const newMin = calculateValue(evt.nativeEvent.pageX, x);
          if (newMin < maxBudget - 1000 && newMin >= 0) {
            onMinChange(newMin);
          }
        });
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const maxPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (evt) => {
        sliderContainerRef.current?.measureInWindow((x) => {
          const newMax = calculateValue(evt.nativeEvent.pageX, x);
          if (newMax > minBudget + 1000 && newMax <= 100000) {
            onMaxChange(newMax);
          }
        });
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <View style={styles.sliderSection}>
      <View style={styles.sliderLabelsRow}>
        <Text style={styles.sliderLabel}>最低: ¥{minBudget.toLocaleString()}</Text>
        <Text style={styles.sliderLabel}>最高: ¥{maxBudget.toLocaleString()}</Text>
      </View>
      <View
        ref={sliderContainerRef}
        style={styles.sliderContainer}
        onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.sliderTrack}>
          <View
            style={[
              styles.sliderFill,
              {
                left: `${(minBudget / 100000) * 100}%`,
                right: `${100 - (maxBudget / 100000) * 100}%`,
              },
            ]}
          />
        </View>
        <View
          {...minPanResponder.panHandlers}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={[
            styles.sliderThumb,
            { left: `${(minBudget / 100000) * 100}%` },
          ]}
        />
        <View
          {...maxPanResponder.panHandlers}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={[
            styles.sliderThumb,
            { left: `${(maxBudget / 100000) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderSection: {
    marginBottom: 20,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#FF69B4',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF69B4',
    marginLeft: -12,
    marginTop: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
