export const menuOptions = ['カット', 'カラー', 'パーマ', '縮毛矯正', 'トリートメント', 'ヘッドスパ', 'エクステ'];

export const timeOptions = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00'
];

export const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push({
      label: date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }),
      value: date.toISOString().split('T')[0]
    });
  }
  return dates;
};

export const getStatusStyle = (status: string) => {
  switch (status) {
    case 'pending':
      return { backgroundColor: 'rgba(241, 196, 15, 0.1)' };
    case 'matched':
      return { backgroundColor: 'rgba(52, 152, 219, 0.1)' };
    case 'completed':
      return { backgroundColor: 'rgba(46, 204, 113, 0.1)' };
    default:
      return { backgroundColor: 'rgba(149, 165, 166, 0.1)' };
  }
};

export const getStatusTextStyle = (status: string) => {
  switch (status) {
    case 'pending':
      return { color: '#F1C40F' };
    case 'matched':
      return { color: '#3498DB' };
    case 'completed':
      return { color: '#2ECC71' };
    default:
      return { color: '#95A5A6' };
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return '募集中';
    case 'matched':
      return 'マッチング済';
    case 'completed':
      return '完了';
    case 'cancelled':
      return 'キャンセル';
    default:
      return '不明';
  }
};

export const generateMenuCombinations = (selectedMenus: string[]): string[][] => {
  const combinations: string[][] = [];
  const n = selectedMenus.length;
  
  for (let i = 1; i <= (1 << n) - 1; i++) {
    const combination: string[] = [];
    for (let j = 0; j < n; j++) {
      if (i & (1 << j)) {
        combination.push(selectedMenus[j]);
      }
    }
    combinations.push(combination);
  }
  
  return combinations.sort((a, b) => a.length - b.length || a.join('').localeCompare(b.join('')));
};
