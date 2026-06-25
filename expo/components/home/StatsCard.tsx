import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface StatsCardProps {
  icon?: LucideIcon;
  imageUrl?: string;
  value: number | string;
  label: string;
  pendingValue?: number;
}

export function StatsCard({ icon: Icon, imageUrl, value, label, pendingValue }: StatsCardProps) {
  return (
    <View style={styles.statCard}>
      {Icon && <Icon size={24} color="#FF69B4" />}
      {imageUrl && (
        <Image 
          source={{ uri: imageUrl }}
          style={styles.btIcon}
          resizeMode="contain"
        />
      )}
      <View style={styles.valueContainer}>
        <Text style={styles.statValue}>{value}</Text>
        {pendingValue !== undefined && pendingValue > 0 && (
          <Text style={styles.pendingValue}>+{pendingValue}（仮）</Text>
        )}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 120,
  },
  btIcon: {
    width: 32,
    height: 32,
    marginBottom: 8,
  },
  valueContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
  },
  pendingValue: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 4,
  },
});
