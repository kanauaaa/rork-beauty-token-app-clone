import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Minus, Plus, Info } from 'lucide-react-native';

interface CategoryProgressBarProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  label: string;
  value: number;
  pending?: number;
  maxValue: number;
  interactive?: boolean;
  onAdjust?: (delta: number) => void;
  canIncrease?: boolean;
  canDecrease?: boolean;
  infoText?: string;
  onInfoPress?: (label: string, infoText: string) => void;
}

export default function CategoryProgressBar({
  icon: IconComponent,
  color,
  label,
  value,
  pending,
  maxValue,
  interactive = false,
  onAdjust,
  canIncrease,
  canDecrease,
  infoText,
  onInfoPress,
}: CategoryProgressBarProps) {
  const displayValue = value + (pending || 0);
  const ratio = maxValue > 0 ? value / maxValue : 0;
  const clampedRatio = Math.min(Math.max(ratio, 0), 1);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.leftSection}>
          <IconComponent size={22} color={color} />
          <Text style={styles.label}>{label}</Text>
          {infoText && onInfoPress && (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => onInfoPress(label, infoText)}
            >
              <Info size={16} color="#95A5A6" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.rightSection}>
          {interactive && onAdjust && (
            <TouchableOpacity
              style={[styles.controlButton, !canDecrease && styles.controlButtonDisabled]}
              onPress={() => onAdjust(-1)}
              disabled={!canDecrease}
            >
              <Minus size={14} color={canDecrease ? '#2C3E50' : '#BDC3C7'} />
            </TouchableOpacity>
          )}
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color }]}>{displayValue}</Text>
            <Text style={styles.unit}>BP</Text>
          </View>
          {interactive && onAdjust && (
            <TouchableOpacity
              style={[styles.controlButton, !canIncrease && styles.controlButtonDisabled]}
              onPress={() => onAdjust(1)}
              disabled={!canIncrease}
            >
              <Plus size={14} color={canIncrease ? '#2C3E50' : '#BDC3C7'} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clampedRatio * 100}%`, backgroundColor: color }]} />
      </View>
      {pending ? <Text style={[styles.pendingText, { color }]}>+{pending}（仮）</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  unit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  track: {
    height: 10,
    backgroundColor: '#F0F2F5',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    minWidth: 4,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'right',
  },
  controlButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
});
