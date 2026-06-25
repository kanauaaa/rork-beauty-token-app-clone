import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface AdBannerProps {
  style?: any;
}

export default function AdBanner({ style }: AdBannerProps) {
  return (
    <TouchableOpacity style={[styles.container, style]} activeOpacity={0.7}>
      <View style={styles.adContent}>
        <Text style={styles.adLabel}>広告用</Text>
        <View style={styles.adPlaceholder}>
          <Text style={styles.adPlaceholderText}>広告スペース</Text>
          <Text style={styles.adDimensions}>320 x 50</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  adContent: {
    alignItems: 'center',
  },
  adLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#95A5A6',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  adPlaceholder: {
    width: '100%',
    height: 50,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  adPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BDC3C7',
    marginBottom: 2,
  },
  adDimensions: {
    fontSize: 10,
    color: '#95A5A6',
  },
});
