/**
 * Geocoding utilities using GSI (国土地理院) API.
 * - Forward: 住所 → 緯度経度 (https://msearch.gsi.go.jp/address-search/AddressSearch)
 * - Reverse: 緯度経度 → 住所 (https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress)
 *
 * GSI API is free, requires no API key, has CORS enabled (access-control-allow-origin: *),
 * and has far better accuracy for Japanese addresses than Nominatim.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface ReverseGeocodeResult {
  address: string;
  prefecture: string;
  lv01Nm: string;
}

/** 都道府県コード(2桁) → 都道府県名 */
const PREFECTURE_CODES: Record<string, string> = {
  '01': '北海道', '02': '青森県', '03': '岩手県', '04': '宮城県',
  '05': '秋田県', '06': '山形県', '07': '福島県', '08': '茨城県',
  '09': '栃木県', '10': '群馬県', '11': '埼玉県', '12': '千葉県',
  '13': '東京都', '14': '神奈川県', '15': '新潟県', '16': '富山県',
  '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
  '21': '岐阜県', '22': '静岡県', '23': '愛知県', '24': '三重県',
  '25': '滋賀県', '26': '京都府', '27': '大阪府', '28': '兵庫県',
  '29': '奈良県', '30': '和歌山県', '31': '鳥取県', '32': '島根県',
  '33': '岡山県', '34': '広島県', '35': '山口県', '36': '徳島県',
  '37': '香川県', '38': '愛媛県', '39': '高知県', '40': '福岡県',
  '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県',
  '45': '宮崎県', '46': '鹿児島県', '47': '沖縄県',
};

/**
 * 全角数字を半角に変換
 */
const toHalfWidth = (str: string): string => {
  return str
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/[－―‐－]/g, '-')
    .replace(/[　]/g, ' ');
};

/**
 * 住所検索クエリをクリーンアップ:
 * - 全角→半角変換
 * - 階数情報の除去 (「2F」「2階」「2F」等)
 * - 建物名の除去 (住所部分以降のスペース区切りテキスト)
 * - 番地の正規化
 */
export const cleanAddressQuery = (rawQuery: string): string => {
  let q = toHalfWidth(rawQuery.trim());

  // 階数・号室情報を除去: "2F", "2f", "2階", "2号室", "第2階"
  q = q.replace(/\d+\s*[Ff]/g, '');
  q = q.replace(/\d+\s*階/g, '');
  q = q.replace(/\d+\s*号室/g, '');

  // 括弧内の情報を除去 (建物名が括弧内にある場合)
  q = q.replace(/[（(][^）)]*[）)]/g, '');

  // スペースで分割し、住所らしい部分のみを抽出
  // 住所は通常、都道府県名で始まるか、数字+丁目/番/号を含む
  const parts = q.split(/\s+/).filter(Boolean);
  const addressParts: string[] = [];
  let foundAddress = false;

  for (const part of parts) {
    // 都道府県名で始まる場合は住所の開始
    const prefs = PREFECTURE_CODES;
    const isPrefStart = Object.values(prefs).some(
      (p) => part.startsWith(p) || part.includes(p)
    );
    // 丁目/番/号/大字/字/町/村 を含む場合は住所の一部
    const hasAddressKeyword = /[丁目番号大字町村条西東南北]/.test(part);
    // 数字+ハイフン のパターン (例: "3-4", "1-2-3")
    const isBlockNumber = /^\d+-\d+/.test(part);
    // 数字のみ + 末尾に「丁目」等がないが数字の並び
    const isNumber = /^\d+$/.test(part);

    if (isPrefStart || hasAddressKeyword || isBlockNumber || isNumber || foundAddress) {
      addressParts.push(part);
      foundAddress = true;
    } else if (!foundAddress) {
      // 住所の前の部分 (建物名等) はスキップ
      // ただし、最初の部分が都道府県で始まらない場合は、そのまま試す
      if (addressParts.length === 0 && parts.indexOf(part) === 0) {
        // 最初のパートが住所でない可能性が高いのでスキップ
      }
    }
  }

  // クリーンアップ結果が空なら、スペースを削除した元のクエリを返す
  const cleaned = addressParts.join(' ').trim();
  if (cleaned.length === 0) {
    // フォールバック: 元のクエリから階数のみ除去
    return toHalfWidth(rawQuery.trim())
      .replace(/\d+\s*[Ff]/g, '')
      .replace(/\d+\s*階/g, '')
      .replace(/\d+\s*号室/g, '')
      .split(/\s+/)[0] || toHalfWidth(rawQuery.trim());
  }

  return cleaned;
};

/**
 * 住所から緯度経度を検索 (GSI AddressSearch API)
 * ブラウザから直接呼び出し可能 (CORS対応済み)
 */
export const forwardGeocode = async (query: string): Promise<GeocodeResult[]> => {
  const cleanQuery = cleanAddressQuery(query);
  if (!cleanQuery) return [];

  const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(cleanQuery)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GSI AddressSearch error: ${response.status}`);
  }

  const data = (await response.json()) as Array<{
    geometry: {
      coordinates: [number, number]; // [longitude, latitude]
      type: string;
    };
    type: string;
    properties: {
      addressCode: string;
      title: string;
    };
  }>;

  return data.map((item) => ({
    longitude: item.geometry.coordinates[0],
    latitude: item.geometry.coordinates[1],
    displayName: item.properties.title,
  }));
};

/**
 * 緯度経度から住所を検索 (GSI LonLatToAddress API)
 * ブラウザから直接呼び出し可能
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> => {
  const url = `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${latitude}&lon=${longitude}`;

  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    results?: {
      muniCd?: string;
      lv01Nm?: string;
    };
  };

  if (!data.results || !data.results.muniCd) {
    return null;
  }

  const muniCd = data.results.muniCd;
  const prefCode = muniCd.substring(0, 2);
  const prefecture = PREFECTURE_CODES[prefCode] || '';
  const lv01Nm = data.results.lv01Nm || '';

  // GSI reverse API は市区町村名を返さないため、
  // 逆ジオコード後にフォワード検索で正式住所を取得
  if (prefecture && lv01Nm) {
    try {
      const forwardResults = await forwardGeocode(`${prefecture}${lv01Nm}`);
      if (forwardResults.length > 0) {
        return {
          address: forwardResults[0].displayName,
          prefecture,
          lv01Nm,
        };
      }
    } catch {
      // フォワード検索失敗時はフォールバック
    }
  }

  const address = [prefecture, lv01Nm].filter(Boolean).join('') || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  return { address, prefecture, lv01Nm };
};
