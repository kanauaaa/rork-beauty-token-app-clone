import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useWeb3 } from '@/providers/Web3Provider';
import { useAuth } from '@/providers/AuthProvider';
import { useRatings } from '@/providers/RatingProvider';

export default function WalletBalanceHeader() {
  const { user } = useAuth();
  const { isConnected, jpycBalance } = useWeb3();
  const { getBTDistribution, getPendingBTDistribution } = useRatings();
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (!user) return null;

  const isHairdresser = user.role === 'hairdresser';
  const confirmedTotal = isHairdresser && user.id ? getBTDistribution(user.id).total : 0;
  const pendingTotal = isHairdresser && user.id ? getPendingBTDistribution(user.id).total : 0;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {isHairdresser && (
        <View style={[styles.tokenPill, { borderColor: '#FF980040' }]}>
          <View style={[styles.tokenDot, { backgroundColor: '#FF9800' }]}>
            <Text style={styles.tokenDotText}>B</Text>
          </View>
          <Text style={styles.tokenValue}>{confirmedTotal}</Text>
          {pendingTotal > 0 && (
            <Text style={styles.pendingText}>+{pendingTotal}</Text>
          )}
          <Text style={styles.tokenUnit}>BP</Text>
        </View>
      )}

      <View style={[styles.tokenPill, { borderColor: '#1E5BA830' }]}>
        <View style={styles.jpycDot}>
          <Text style={styles.jpycDotText}>¥</Text>
        </View>
        <Text style={styles.tokenValue}>
          {isConnected ? parseFloat(jpycBalance).toFixed(0) : '0'}
        </Text>
        <Text style={styles.tokenUnit}>JPYC</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 5,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tokenDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenDotText: {
    fontSize: 11,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  jpycDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1E5BA8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jpycDotText: {
    fontSize: 12,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  tokenValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#2C3E50',
  },
  tokenUnit: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#95A5A6',
    letterSpacing: 0.3,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF9800',
  },
});
