import { MenuType } from '@/providers/MedicalRecordProvider';

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
