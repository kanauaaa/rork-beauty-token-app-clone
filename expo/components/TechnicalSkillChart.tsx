import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Minus, Plus, Info } from 'lucide-react-native';

export interface SkillItem {
  id: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  label: string;
  value: number;
  pending?: number;
  infoText?: string;
}

interface TechnicalSkillChartProps {
  items: SkillItem[];
  total: number;
  interactive?: boolean;
  onAdjust?: (id: string, delta: number) => void;
  canIncrease?: (id: string) => boolean;
  canDecrease?: (id: string) => boolean;
  onInfoPress?: (label: string, infoText: string) => void;
}

export default function TechnicalSkillChart({
  items,
  total,
  interactive = false,
  onAdjust,
  canIncrease,
  canDecrease,
  onInfoPress,
}: TechnicalSkillChartProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const chartHeight = 140;

  return (
    <View style={styles.container}>
      {/* Vertical bar chart */}
      <View style={styles.chartArea}>
        {items.map((item) => {
          const IconComponent = item.icon;
          const displayValue = item.value + (item.pending || 0);
          const barHeight = Math.max((item.value / maxValue) * chartHeight, 4);
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
          const canInc = canIncrease ? canIncrease(item.id) : false;
          const canDec = canDecrease ? canDecrease(item.id) : false;

          return (
            <View key={item.id} style={styles.barColumn}>
              <IconComponent size={18} color={item.color} />
              <View style={styles.valueRow}>
                <Text style={[styles.valueText, { color: item.color }]}>{displayValue}</Text>
                {item.pending ? <Text style={[styles.pendingText, { color: item.color }]}>+{item.pending}</Text> : null}
              </View>
              <Text style={styles.unitText}>BP</Text>
              <View style={[styles.barTrack, { height: chartHeight }]}>
                <View style={[styles.barFill, { height: barHeight, backgroundColor: item.color }]} />
              </View>
              <Text style={[styles.percentText, { color: item.color }]}>{percentage}%</Text>
              <View style={styles.labelRow}>
                <Text style={styles.labelText}>{item.label}</Text>
                {item.infoText && onInfoPress && (
                  <TouchableOpacity
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    onPress={() => onInfoPress(item.label, item.infoText!)}
                  >
                    <Info size={12} color="#95A5A6" />
                  </TouchableOpacity>
                )}
              </View>
              {interactive && onAdjust && (
                <View style={styles.controlsRow}>
                  <TouchableOpacity
                    style={[styles.controlButton, !canDec && styles.controlButtonDisabled]}
                    onPress={() => onAdjust(item.id, -1)}
                    disabled={!canDec}
                  >
                    <Minus size={12} color={canDec ? '#2C3E50' : '#BDC3C7'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.controlButton, !canInc && styles.controlButtonDisabled]}
                    onPress={() => onAdjust(item.id, 1)}
                    disabled={!canInc}
                  >
                    <Plus size={12} color={canInc ? '#2C3E50' : '#BDC3C7'} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Horizontal list below chart */}
      <View style={styles.listArea}>
        {items.map((item) => {
          const IconComponent = item.icon;
          const displayValue = item.value + (item.pending || 0);
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';

          return (
            <View key={`list-${item.id}`} style={styles.listRow}>
              <View style={styles.listLeft}>
                <IconComponent size={18} color={item.color} />
                <Text style={styles.listLabel}>{item.label}</Text>
                {item.infoText && onInfoPress && (
                  <TouchableOpacity
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    onPress={() => onInfoPress(item.label, item.infoText!)}
                  >
                    <Info size={14} color="#95A5A6" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.listRight}>
                <Text style={[styles.listValue, { color: item.color }]}>
                  {displayValue}<Text style={styles.listUnit}> BP</Text>
                </Text>
                <View style={styles.percentBadge}>
                  <Text style={[styles.percentBadgeText, { color: item.color }]}>{percentage}%</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    minHeight: 220,
    paddingBottom: 8,
  },
  barColumn: {
    alignItems: 'center',
    width: 52,
    gap: 3,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  valueText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  pendingText: {
    fontSize: 9,
    fontWeight: '600',
  },
  unitText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#7F8C8D',
    marginTop: -2,
  },
  barTrack: {
    width: 28,
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    minHeight: 4,
  },
  percentText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7F8C8D',
    textAlign: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  controlButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
  listArea: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listLabel: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  listRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  listUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  percentBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  percentBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
