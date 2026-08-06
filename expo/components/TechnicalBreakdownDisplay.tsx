import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TechnicalBreakdown } from '@/providers/RatingProvider';
import { MenuType } from '@/providers/MedicalRecordProvider';
import { getMenuLabel, getMenuColor } from '@/lib/menu-utils';

const MENU_ORDER: MenuType[] = ['cut', 'color', 'perm', 'straightening', 'treatment', 'headspa', 'extension'];

interface TechnicalBreakdownDisplayProps {
  breakdown: TechnicalBreakdown;
  totalTechnicalBP: number;
  /** 美容師が登録時に選択した対応施術（未指定時は全メニュー表示） */
  availableMenus?: MenuType[];
}

/**
 * 技術項目の施術メニュー別BP内訳を縦棒グラフで表示するコンポーネント
 * availableMenusが指定された場合はそのメニューのみ表示
 */
export default function TechnicalBreakdownDisplay({
  breakdown,
  totalTechnicalBP,
  availableMenus,
}: TechnicalBreakdownDisplayProps) {
  // availableMenusが指定されていればそれでフィルタ、なければ全メニュー
  const menusToShow = availableMenus && availableMenus.length > 0
    ? MENU_ORDER.filter(m => availableMenus.includes(m))
    : MENU_ORDER;

  // 登録メニュー外の既存データも漏れなく表示（breakdownに値があるメニューは追加）
  const menusWithData = MENU_ORDER.filter(m => (breakdown[m] ?? 0) > 0 && !menusToShow.includes(m));

  const entries = [...menusToShow, ...menusWithData]
    .map(menu => ({ menu, bp: breakdown[menu] ?? 0 }))
    .filter(e => e.bp > 0);

  if (entries.length === 0) return null;

  // 割合の分母は内訳合計を優先（仮反映分を含むためtotalTechnicalBPと一致しない場合がある）
  const entriesSum = entries.reduce((s, e) => s + e.bp, 0);
  const percentBase = entriesSum > 0 ? entriesSum : totalTechnicalBP;

  const maxBP = Math.max(...entries.map(e => e.bp), 1);
  const chartHeight = 100;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>技術メニュー別BP</Text>
      <View style={styles.chartArea}>
        {entries.map(({ menu, bp }) => {
          const color = getMenuColor(menu);
          const barHeight = Math.max((bp / maxBP) * chartHeight, 6);
          const percent = percentBase > 0 ? Math.round((bp / percentBase) * 1000) / 10 : 0;
          return (
            <View key={menu} style={styles.barColumn}>
              <Text style={[styles.bpText, { color }]}>{bp.toFixed(2)}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: barHeight, backgroundColor: color }]} />
              </View>
              <Text style={styles.percentText}>{percent}%</Text>
              <Text style={styles.labelText}>{getMenuLabel(menu)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingHorizontal: 4,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 105, 180, 0.06)',
    borderRadius: 10,
  } as const,
  title: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#7F8C8D',
    marginBottom: 12,
  },
  chartArea: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    justifyContent: 'space-evenly' as const,
    height: 140,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center' as const,
    maxWidth: 52,
  },
  bpText: {
    fontSize: 11,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  barTrack: {
    width: 24,
    height: 100,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
  },
  barFill: {
    width: '100%' as const,
    borderRadius: 4,
  },
  percentText: {
    fontSize: 10,
    color: '#95A5A6',
    marginTop: 4,
  },
  labelText: {
    fontSize: 10,
    color: '#2C3E50',
    fontWeight: '500' as const,
    marginTop: 2,
    textAlign: 'center' as const,
  },
});
