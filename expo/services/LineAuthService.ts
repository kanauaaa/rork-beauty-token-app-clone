/**
 * LineAuthService — LINE OAuth 2.0 認証サービス
 *
 * Authorization Code Flow を実装:
 * - 認可URL生成（state生成・保存）
 * - ブラウザ起動（expo-web-browser）
 * - コールバック処理（state検証、code取得）
 * - バックエンド経由でトークン交換・プロフィール取得
 *
 * LINEログインと本人確認（デジタル認証）は完全分離:
 * - LINEログインは認証手段のみ（verified=trueにはしない）
 * - verified=trueはIdentityVerificationButton経由でのみ設定
 */

import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthInstance } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

// 認証モード（コールバック画面で処理分岐するため）
export type LineAuthMode = 'login' | 'register' | 'link';
const STORAGE_MODE = '@line_auth_mode';

// ─── 環境変数 ───
const CHANNEL_ID = process.env.EXPO_PUBLIC_LINE_CHANNEL_ID ?? '';
const CALLBACK_URL =
  process.env.EXPO_PUBLIC_LINE_CALLBACK_URL ??
  'https://beauty-token-app-clone.rork.app/auth/line/callback';
const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize';

// ─── ストレージキー ───
const STORAGE_STATE = '@line_auth_state';
const STORAGE_PENDING_LINE_USER = '@line_pending_line_user';

// ─── 型定義 ───
export interface LineUserInfo {
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
}

export type LineAuthResult =
  | { status: 'login'; customToken: string; lineUserInfo: LineUserInfo }
  | { status: 'new_user'; lineUserInfo: LineUserInfo }
  | { status: 'linked'; lineUserInfo: LineUserInfo }
  | { status: 'error'; message: string }
  | { status: 'cancelled' };

// ─── ユーティリティ ───

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_RORK_API_BASE_URL is not set');
  }
  return url;
}

// ─── メインサービス ───

export class LineAuthService {
  /** 32byte のランダム16進数文字列を生成 */
  static async generateState(): Promise<string> {
    const bytes = Crypto.getRandomBytes(32);
    return bytesToHex(bytes);
  }

  /**
   * LINE認可URLを生成し、stateをストレージに保存
   */
  static async buildAuthUrl(): Promise<{ url: string; state: string }> {
    const state = await this.generateState();
    await AsyncStorage.setItem(STORAGE_STATE, state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CHANNEL_ID,
      redirect_uri: CALLBACK_URL,
      state,
      scope: 'profile',
    });

    const url = `${LINE_AUTH_URL}?${params.toString()}`;
    return { url, state };
  }

  /**
   * LINEログインを開始: ブラウザを開き、コールバックを待機
   * @param mode 認証モード（login / register / link）
   * @param currentUid ログイン中のFirebase UID（LINE連携時）
   * @returns 認証結果
   */
  static async startLineLogin(
    mode: LineAuthMode = 'login',
    currentUid?: string,
  ): Promise<LineAuthResult> {
    if (!CHANNEL_ID) {
      return { status: 'error', message: 'LINE_CHANNEL_IDが設定されていません' };
    }

    try {
      const { url } = await this.buildAuthUrl();

      // 認証モードを保存（コールバック画面で処理分岐するため）
      await AsyncStorage.setItem(STORAGE_MODE, mode);

      // Web環境では新しいタブで認可ページを開く（iframe内では外部サイトがX-Frame-Optionsで拒否されるため）
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        console.log('[LineAuthService] Web環境: 新しいタブでLINE認可URLを開きます');
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened) {
          console.warn('[LineAuthService] ポップアップブロックで開けませんでした。フォールバックとして同じウィンドウで遷移します');
          // フォールバック: 同じウィンドウで遷移（X-Frame-Options対象になる可能性あり）
          if (window.top) {
            try {
              window.top.location.href = url;
            } catch {
              window.location.href = url;
            }
          } else {
            window.location.href = url;
          }
        }
        return { status: 'cancelled' };
      }

      // ネイティブ環境では openAuthSessionAsync を使用
      console.log('[LineAuthService] Native環境: openAuthSessionAsync を使用');
      const result = await WebBrowser.openAuthSessionAsync(url, CALLBACK_URL);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { status: 'cancelled' };
      }

      if (result.type === 'success' && result.url) {
        return await this.processCallback(result.url, currentUid);
      }

      return { status: 'error', message: '不明なエラーが発生しました' };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'LINE認証の開始に失敗しました';
      return { status: 'error', message };
    }
  }

  /**
   * 認証モードを取得（コールバック画面用）
   */
  static async getAuthMode(): Promise<LineAuthMode | null> {
    const mode = await AsyncStorage.getItem(STORAGE_MODE);
    if (mode === 'login' || mode === 'register' || mode === 'link') {
      return mode;
    }
    return null;
  }

  /**
   * 認証モードをクリア
   */
  static async clearAuthMode(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_MODE);
  }

  /**
   * コールバックURLを処理: code/state抽出 → バックエンドでトークン交換
   */
  static async processCallback(
    callbackUrl: string,
    currentUid?: string,
  ): Promise<LineAuthResult> {
    try {
      const url = new URL(callbackUrl);
      const params = url.searchParams;

      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      // state検証
      const storedState = await AsyncStorage.getItem(STORAGE_STATE);
      if (!state || !storedState || state !== storedState) {
        await this.cleanup();
        return { status: 'error', message: 'state検証に失敗しました' };
      }

      // エラー応答
      if (error) {
        await this.cleanup();
        return { status: 'error', message: errorDescription || error };
      }

      if (!code) {
        await this.cleanup();
        return { status: 'error', message: '認証コードが見つかりません' };
      }

      // バックエンドでトークン交換
      const exchangeResult = await this.exchangeCode(code, currentUid);

      await AsyncStorage.removeItem(STORAGE_STATE);

      return exchangeResult;
    } catch {
      await this.cleanup();
      return { status: 'error', message: 'コールバック処理に失敗しました' };
    }
  }

  /**
   * バックエンド経由で認可コードをアクセストークンと交換し、
   * LINE プロフィールを取得してユーザー状態を判定
   */
  static async exchangeCode(
    code: string,
    currentUid?: string,
  ): Promise<LineAuthResult> {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/line/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirectUri: CALLBACK_URL,
          currentUid: currentUid ?? null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return {
          status: 'error',
          message: errData.error || 'LINE認証に失敗しました',
        };
      }

      const data = await response.json();
      const lineUserInfo: LineUserInfo = {
        lineUserId: data.lineUserId,
        displayName: data.displayName,
        pictureUrl: data.pictureUrl ?? null,
      };

      switch (data.status) {
        case 'login':
          return { status: 'login', customToken: data.customToken, lineUserInfo };

        case 'linked':
          return { status: 'linked', lineUserInfo };

        case 'new_user':
          // 新規ユーザー情報をストレージに保存（登録画面で使用）
          await AsyncStorage.setItem(
            STORAGE_PENDING_LINE_USER,
            JSON.stringify(lineUserInfo),
          );
          return { status: 'new_user', lineUserInfo };

        default:
          return { status: 'error', message: '不明なレスポンスです' };
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'トークン交換に失敗しました';
      return { status: 'error', message };
    }
  }

  /**
   * 新規LINE登録: バックエンドでFirebaseユーザー作成 → カスタムトークン取得 → サインイン
   */
  static async registerWithLine(registrationData: {
    lineUserId: string;
    lineDisplayName: string;
    linePictureUrl: string | null;
    name: string;
    role: 'hairdresser' | 'customer';
    gender: string;
    workplace?: string;
    workplaceName?: string;
    selfIntroduction?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    availableServices?: string[];
    referredBy?: string;
  }): Promise<void> {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/line/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'LINE登録に失敗しました');
    }

    const data = await response.json();
    const customToken = data.customToken;

    // カスタムトークンでサインイン
    const auth = getAuthInstance();
    await signInWithCustomToken(auth, customToken);

    // 登録完了後、保留中のLINE情報をクリア
    await AsyncStorage.removeItem(STORAGE_PENDING_LINE_USER);
  }

  /**
   * 既存ユーザーとしてLINE ログイン完了（カスタムトークンでサインイン）
   */
  static async signInWithCustomToken(customToken: string): Promise<void> {
    const auth = getAuthInstance();
    await signInWithCustomToken(auth, customToken);
  }

  /**
   * 保留中のLINE新規ユーザー情報を保存（登録画面で使用）
   */
  static async savePendingLineUser(lineUserInfo: LineUserInfo): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_PENDING_LINE_USER,
      JSON.stringify(lineUserInfo),
    );
  }

  /**
   * 保留中のLINE新規ユーザー情報を取得（登録画面で使用）
   */
  static async getPendingLineUser(): Promise<LineUserInfo | null> {
    const stored = await AsyncStorage.getItem(STORAGE_PENDING_LINE_USER);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as LineUserInfo;
    } catch {
      return null;
    }
  }

  /**
   * 保留中のLINE新規ユーザー情報をクリア
   */
  static async clearPendingLineUser(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_PENDING_LINE_USER);
  }

  /**
   * 認証セッションのストレージをクリア
   */
  static async cleanup(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_STATE);
    await AsyncStorage.removeItem(STORAGE_MODE);
  }

  /**
   * コールバックURLを取得（外部参照用）
   */
  static getCallbackUrl(): string {
    return CALLBACK_URL;
  }
}

// WebBrowserの認証セッション完了を処理
WebBrowser.maybeCompleteAuthSession();
