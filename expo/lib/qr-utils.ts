export type QRCodeType = 
  | 'customer_qr'
  | 'hairdresser_qr' 
  | 'customer_referral'
  | 'hairdresser_referral'
  | 'assistant_bt_transfer';

export interface BaseQRData {
  version: string;
  type: QRCodeType;
  timestamp: string;
  expiresAt: string;
  signature?: string;
}

export interface CustomerQRData extends BaseQRData {
  type: 'customer_qr';
  userId: string;
  userName: string;
  userRole: 'customer';
  customerId: string;
  customerName: string;
  customerEmail?: string;
}

export interface HairdresserQRData extends BaseQRData {
  type: 'hairdresser_qr';
  userId: string;
  userName: string;
  userRole: 'hairdresser';
  hairdresserId: string;
  workplaceName?: string;
}

export interface CustomerReferralQRData extends BaseQRData {
  type: 'customer_referral';
  userId: string;
  userName: string;
  userRole: 'customer';
  customerId: string;
  referralCode: string;
}

export interface HairdresserReferralQRData extends BaseQRData {
  type: 'hairdresser_referral';
  userId: string;
  userName: string;
  userRole: 'hairdresser';
  hairdresserId: string;
  referralCode: string;
}

export interface AssistantBTTransferQRData extends BaseQRData {
  type: 'assistant_bt_transfer';
  userId: string;
  userName: string;
  userRole: 'hairdresser';
  hairdresserId: string;
  isAssistant: boolean;
}

export type QRData = 
  | CustomerQRData 
  | HairdresserQRData 
  | CustomerReferralQRData
  | HairdresserReferralQRData
  | AssistantBTTransferQRData;

const QR_VERSION = '1.0.0';
const QR_EXPIRY_HOURS = 24;

function generateSignature(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function createCustomerQR(user: {
  id: string;
  name: string;
  email?: string;
}): CustomerQRData {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + QR_EXPIRY_HOURS * 60 * 60 * 1000);
  
  const data: CustomerQRData = {
    version: QR_VERSION,
    type: 'customer_qr',
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: 'customer',
    customerId: user.id,
    customerName: user.name,
    customerEmail: user.email,
  };
  
  const dataString = JSON.stringify({
    ...data,
    signature: undefined
  });
  data.signature = generateSignature(dataString);
  
  return data;
}

export function createHairdresserQR(user: {
  id: string;
  name: string;
  hairdresserId?: string;
  workplaceName?: string;
}): HairdresserQRData {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + QR_EXPIRY_HOURS * 60 * 60 * 1000);
  
  const data: HairdresserQRData = {
    version: QR_VERSION,
    type: 'hairdresser_qr',
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: 'hairdresser',
    hairdresserId: user.hairdresserId || user.id,
    workplaceName: user.workplaceName,
  };
  
  const dataString = JSON.stringify({
    ...data,
    signature: undefined
  });
  data.signature = generateSignature(dataString);
  
  return data;
}

export function createCustomerReferralQR(user: {
  id: string;
  name: string;
}): CustomerReferralQRData {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + QR_EXPIRY_HOURS * 60 * 60 * 1000);
  
  const referralCode = `CREF_${user.id.slice(0, 8)}_${Date.now().toString(36)}`;
  
  const data: CustomerReferralQRData = {
    version: QR_VERSION,
    type: 'customer_referral',
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: 'customer',
    customerId: user.id,
    referralCode,
  };
  
  const dataString = JSON.stringify({
    ...data,
    signature: undefined
  });
  data.signature = generateSignature(dataString);
  
  return data;
}

export function createHairdresserReferralQR(user: {
  id: string;
  name: string;
  hairdresserId?: string;
}): HairdresserReferralQRData {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + QR_EXPIRY_HOURS * 60 * 60 * 1000);
  
  const referralCode = `HREF_${user.id.slice(0, 8)}_${Date.now().toString(36)}`;
  
  const data: HairdresserReferralQRData = {
    version: QR_VERSION,
    type: 'hairdresser_referral',
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: 'hairdresser',
    hairdresserId: user.hairdresserId || user.id,
    referralCode,
  };
  
  const dataString = JSON.stringify({
    ...data,
    signature: undefined
  });
  data.signature = generateSignature(dataString);
  
  return data;
}

export function createAssistantBTTransferQR(user: {
  id: string;
  name: string;
  hairdresserId?: string;
}): AssistantBTTransferQRData {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + QR_EXPIRY_HOURS * 60 * 60 * 1000);
  
  const data: AssistantBTTransferQRData = {
    version: QR_VERSION,
    type: 'assistant_bt_transfer',
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: 'hairdresser',
    hairdresserId: user.hairdresserId || user.id,
    isAssistant: true,
  };
  
  const dataString = JSON.stringify({
    ...data,
    signature: undefined
  });
  data.signature = generateSignature(dataString);
  
  return data;
}

export interface QRValidationResult {
  isValid: boolean;
  error?: string;
  data?: QRData;
}

export function validateQRCode(qrString: string): QRValidationResult {
  try {
    const data = JSON.parse(qrString) as QRData;
    
    if (!data.version) {
      return {
        isValid: false,
        error: 'QRコードのバージョンが指定されていません',
      };
    }
    
    if (!data.type) {
      return {
        isValid: false,
        error: 'QRコードのタイプが指定されていません',
      };
    }
    
    if (!data.timestamp) {
      return {
        isValid: false,
        error: 'QRコードのタイムスタンプが指定されていません',
      };
    }
    
    if (data.expiresAt) {
      const expiryDate = new Date(data.expiresAt);
      const now = new Date();
      
      if (expiryDate < now) {
        return {
          isValid: false,
          error: 'QRコードの有効期限が切れています',
        };
      }
    }
    
    if (data.signature) {
      const originalSignature = data.signature;
      const dataWithoutSignature = { ...data, signature: undefined };
      const dataString = JSON.stringify(dataWithoutSignature);
      const expectedSignature = generateSignature(dataString);
    }
    
    const validTypes: QRCodeType[] = [
      'customer_qr',
      'hairdresser_qr',
      'customer_referral',
      'hairdresser_referral',
      'assistant_bt_transfer',
    ];
    
    if (!validTypes.includes(data.type)) {
      return {
        isValid: false,
        error: '無効なQRコードタイプです',
      };
    }
    
    if (!data.userId || !data.userName || !data.userRole) {
      return {
        isValid: false,
        error: 'QRコードに必須情報が含まれていません',
      };
    }
    
    return {
      isValid: true,
      data,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'QRコードの形式が正しくありません',
    };
  }
}

export function getQRCodeInfo(data: QRData): string {
  const createdDate = new Date(data.timestamp).toLocaleString('ja-JP');
  const expiryDate = new Date(data.expiresAt).toLocaleString('ja-JP');
  
  let info = `【QRコード情報】\n`;
  info += `バージョン: ${data.version}\n`;
  info += `作成日時: ${createdDate}\n`;
  info += `有効期限: ${expiryDate}\n`;
  info += `ユーザー: ${data.userName}\n`;
  info += `役割: ${data.userRole === 'customer' ? '顧客' : '美容師'}\n`;
  
  switch (data.type) {
    case 'customer_qr':
      info += `\n【カルテ記入用QRコード】\n`;
      info += `顧客ID: ${data.customerId}\n`;
      if (data.customerEmail) {
        info += `メール: ${data.customerEmail}\n`;
      }
      break;
      
    case 'hairdresser_qr':
      info += `\n【美容師QRコード】\n`;
      info += `美容師ID: ${data.hairdresserId}\n`;
      if (data.workplaceName) {
        info += `勤務先: ${data.workplaceName}\n`;
      }
      break;
      
    case 'customer_referral':
      info += `\n【顧客紹介QRコード】\n`;
      info += `顧客ID: ${data.customerId}\n`;
      info += `紹介コード: ${data.referralCode}\n`;
      break;
      
    case 'hairdresser_referral':
      info += `\n【美容師紹介QRコード】\n`;
      info += `美容師ID: ${data.hairdresserId}\n`;
      info += `紹介コード: ${data.referralCode}\n`;
      break;
      
    case 'assistant_bt_transfer':
      info += `\n【アシスタントBT付与QRコード】\n`;
      info += `美容師ID: ${data.hairdresserId}\n`;
      info += `アシスタント: ${data.isAssistant ? 'はい' : 'いいえ'}\n`;
      break;
  }
  
  return info;
}

export function serializeQRData(data: QRData): string {
  return JSON.stringify(data);
}
