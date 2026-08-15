import { MenuType } from '@/providers/MedicalRecordProvider';
import { ServiceId } from '@/providers/AuthProvider';

export const getMenuLabel = (menu: MenuType): string => {
  const labels: Record<MenuType, string> = {
    cut: 'カット',
    color: 'カラー',
    perm: 'パーマ',
    straightening: '縮毛矯正',
    treatment: 'トリートメント',
    headspa: 'ヘッドスパ',
    extension: 'エクステ'
  };
  return labels[menu];
};

export const getMenuColor = (menu: MenuType): string => {
  const colors: Record<MenuType, string> = {
    cut: '#FF69B4',
    color: '#87CEEB',
    perm: '#DDA0DD',
    straightening: '#F0E68C',
    treatment: '#98FB98',
    headspa: '#FFB6C1',
    extension: '#FFD700'
  };
  return colors[menu];
};

/**
 * 美容師の登録時availableServices（ServiceId[]）をMenuType[]に変換する
 * oneColor/wColor → color、hairSet/shampooはMenuTypeに該当なし（除外）
 */
export const serviceIdsToMenuTypes = (services: ServiceId[] | undefined): MenuType[] => {
  if (!services || services.length === 0) return [];
  const mapping: Partial<Record<ServiceId, MenuType>> = {
    cut: 'cut',
    oneColor: 'color',
    wColor: 'color',
    perm: 'perm',
    straightening: 'straightening',
    treatment: 'treatment',
    headSpa: 'headspa',
    extensions: 'extension',
  };
  const result = new Set<MenuType>();
  services.forEach(s => {
    const menu = mapping[s];
    if (menu) result.add(menu);
  });
  return Array.from(result);
};
