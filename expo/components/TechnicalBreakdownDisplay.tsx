import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TechnicalBreakdown } from '@/providers/RatingProvider';
import { getMenuLabel } from '@/lib/menu-utils';

const MENU_ORDER = ['cut', 'color', 'perm', 'straightening', 'treatment', 'headspa', 'extension'];

const MENU_COLORS: Record<string, string> = {
  cut: '#FF69B4',
  color: '#87CEEB',
  perm: '#DDA0DD',
  straightening: '#F0E68C',
  treatment: '#98FB98',
  headspa: '#FFB6C1',
  extension: '#FFD700',
};

interface TechnicalBreakdownDisplayProps {
  breakdown: TechnicalBreakdown;
  totalTechnicalBP: number;
}

/**
 * 技術項目の施術メニュー別BP内訳を表示するコンポーネント
 * 小数第2位まで表示、各メニューのBP割合をバーで可視化
 */
export default function TechnicalBreakdownDisplay({
  breakdown,
  totalTechnicalBP,
}: TechnicalBreakdownDisplayProps) {
  const entries = MENU_ORDER
    .filter(menu => breakdown[menu] !== undefined && breakdown[menu] > 0)
    .map(menu => ({ menu, bp: breakdown[menu] }));

  if (entries.length === 0 || totalTechnicalBP <= 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>技術メニュー別BP</Text>
      {entries.map(({ menu, bp }) => {
        const percent = totalTechnicalBP > 0 ? Math.round((bp / totalTechnicalBP) * 1000) / 10 : 0;
        const color = MENU_COLORS[menu] || '#BDC3C7';
        return (
          <View key={menu} style={styles.row}>
            <View style={styles.labelContainer}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.label}>{getMenuLabel(menu as any)}</Text>
            </View>
            <View style={styles.barContainer}>
              <View style={styles.barBackground}>
                <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: color }]} />
              </View>
            </View>
            <Text style={styles.bpValue}>{bp.toFixed(2)} BP</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 105, 180, 0.05)',
    borderRadius: 10,
  } as const,
  title: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  labelContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    width: 90,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500' as const,
  },
  barContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  barBackground: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  barFill: {
    height: '100%' as const,
    borderRadius: 3,
  },
  bpValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#2C3E50',
    width: 70,
    textAlign: 'right' as const,
  },
});
