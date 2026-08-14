/**
 * AuthService — デジタル庁「デジタル認証アプリ」OIDC認証サービス
 *
 * OpenID Connect Authorization Code Flow + PKCE を実装。
 *
 * 現在の実装状態:
 * - 認証開始（state/nonce/code_verifier/code_challenge生成、ブラウザ起動）: 実装済み
 * - Callback処理（state検証、code取得）: 実装済み
 * - トークン取得（/token）: サービスクラスのみ（未呼び出し）
 * - UserInfo取得（/userinfo）: サービスクラスのみ（未呼び出し）
 *
 * 今後追加予定:
 * - private_key_jwt クライアント認証
 * - JWKS エンドポイント対応
 * - 秘密鍵設定
 * - 本番環境への切り替え
 */

import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// ─── 環境変数 ───
const CLIENT_ID = process.env.EXPO_PUBLIC_DIGITAL_AUTH_CLIENT_ID ?? '';
const AUTH_BASE_URL = process.env.EXPO_PUBLIC_DIGITAL_AUTH_BASE_URL ?? 'https://sb-auth-and-sign.go.jp/api';

/**
 * リダイレクトURIを取得
 *
 * Web環境: 常に現在のオリジンを使用（プレビュー環境でもコールバックを捕捉できるように）
 *   ※ 環境変数のREDIRECT_URIは本番ドメインを想定しているため、
 *   プレビュー環境では不一致になる。Webでは実際のURLを使用する。
 * Native環境: 環境変数を使用（カスタムスキームでOSが処理）
 */
function getRedirectUri(): string {
  // Web環境では常に現在のオリジンを使用
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/auth/callback`;
  }
  // Native環境では環境変数を使用
  const envUri = process.env.EXPO_PUBLIC_DIGITAL_AUTH_REDIRECT_URI;
  if (envUri && envUri.length > 0) {
    return envUri;
  }
  return 'https://beautyproof.jp/auth/callback';
}

// ─── ストレージキー ───
const STORAGE_STATE = '@digital_auth_state';
const STORAGE_NONCE = '@digital_auth_nonce';
const STORAGE_CODE_VERIFIER = '@digital_auth_code_verifier';

// ─── 型定義 ───
export type AuthResult =
  | { status: 'success'; code: string; state: string }
  | { status: 'error'; message: string }
  | { status: 'cancelled' };

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

export interface UserInfoResponse {
  sub?: string;
  name?: string;
  address?: string;
  birthdate?: string;
  gender?: string;
  [key: string]: unknown;
}

export interface AuthSessionData {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

// ─── ユーティリティ ───

/** Uint8Array → 16進数文字列 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** base64 → base64url 変換 */
function base64ToBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── メインサービス ───

export class AuthService {
  /**
   * 256bit (32byte) のランダム文字列を生成
   */
  static async generateRandomString(byteLength = 32): Promise<string> {
    const bytes = Crypto.getRandomBytes(byteLength);
    return bytesToHex(bytes);
  }

  /**
   * PKCE code_verifier を生成（43〜128文字のランダム文字列）
   * 32byte → 64文字のhex文字列
   */
  static async generateCodeVerifier(): Promise<string> {
    const bytes = Crypto.getRandomBytes(32);
    return bytesToHex(bytes);
  }

  /**
   * PKCE code_challenge (S256) を生成
   * code_challenge = base64url(SHA-256(code_verifier))
   */
  static async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const base64Digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64 },
    );
    return base64ToBase64Url(base64Digest);
  }

  /**
   * 認証URLとPKCE値を生成し、ストレージに保存
   * @returns 認証URL、state、nonce、code_verifier
   */
  static async buildAuthSession(): Promise<AuthSessionData> {
    const redirectUri = getRedirectUri();
    const state = await this.generateRandomString(32);
    const nonce = await this.generateRandomString(32);
    const codeVerifier = await this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // 認可エンドポイント
    const authEndpoint = `${AUTH_BASE_URL}/realms/main/protocol/openid-connect/auth`;

    // 送信パラメータ
    const params = new URLSearchParams({
      response_type: 'code',
      scope: 'openid name address birthdate gender',
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      acr_values: 'aal3 crl',
    });

    const url = `${authEndpoint}?${params.toString()}`;

    console.log('[AuthService] buildAuthSession:', {
      redirectUri,
      clientId: CLIENT_ID ? `${CLIENT_ID.slice(0, 6)}...` : '(empty)',
      authEndpoint,
    });

    // state/nonce/code_verifier をストレージに保存（Callback検証用）
    await AsyncStorage.setItem(STORAGE_STATE, state);
    await AsyncStorage.setItem(STORAGE_NONCE, nonce);
    await AsyncStorage.setItem(STORAGE_CODE_VERIFIER, codeVerifier);

    return { url, state, nonce, codeVerifier };
  }

  /**
   * 認証フローを開始: ブラウザを開き、コールバックを待機
   * @returns 認証結果（success / error / cancelled）
   */
  static async startAuthentication(): Promise<AuthResult> {
    if (!CLIENT_ID) {
      console.warn('[AuthService] CLIENT_IDが未設定です');
      return { status: 'error', message: 'CLIENT_IDが設定されていません。環境変数 EXPO_PUBLIC_DIGITAL_AUTH_CLIENT_ID を確認してください。' };
    }

    try {
      const session = await this.buildAuthSession();
      const redirectUri = getRedirectUri();

      // Web環境では新しいタブで認可ページを開く（iframe内では外部サイトがX-Frame-Optionsで拒否されるため）
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        console.log('[AuthService] Web環境: 新しいタブで認可URLを開きます');
        const opened = window.open(session.url, '_blank', 'noopener,noreferrer');
        if (!opened) {
          console.warn('[AuthService] ポップアップブロックで開けませんでした。フォールバックとして同じウィンドウで遷移します');
          if (window.top) {
            try {
              window.top.location.href = session.url;
            } catch {
              window.location.href = session.url;
            }
          } else {
            window.location.href = session.url;
          }
        }
        return { status: 'cancelled' };
      }

      // ネイティブ環境では openAuthSessionAsync を使用
      console.log('[AuthService] Native環境: openAuthSessionAsync を使用');
      const result = await WebBrowser.openAuthSessionAsync(
        session.url,
        redirectUri,
      );

      // ユーザーがブラウザを閉じた/キャンセル
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { status: 'cancelled' };
      }

      // 認証成功 — リダイレクトURLからパラメータを抽出
      if (result.type === 'success' && result.url) {
        return await this.handleCallbackUrl(result.url);
      }

      return { status: 'error', message: '不明なエラーが発生しました' };
    } catch (error) {
      const message = error instanceof Error ? error.message : '認証開始に失敗しました';
      console.error('[AuthService] startAuthentication error:', message);
      return { status: 'error', message };
    }
  }

  /**
   * コールバックURLを処理: state検証、code/error抽出
   * @param callbackUrl リダイレクト先のURL（クエリパラメータ付き）
   */
  static async handleCallbackUrl(callbackUrl: string): Promise<AuthResult> {
    try {
      const url = new URL(callbackUrl);
      const params = url.searchParams;

      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      // ─── state検証（必須）───
      const storedState = await AsyncStorage.getItem(STORAGE_STATE);
      if (!state || !storedState || state !== storedState) {
        await this.cleanupAuthSession();
        return { status: 'error', message: 'state検証に失敗しました' };
      }

      // ─── エラー応答 ───
      if (error) {
        await this.cleanupAuthSession();
        return { status: 'error', message: errorDescription || error };
      }

      // ─── 認証成功 ───
      if (code) {
        // code_verifierはトークン交換時に必要なので保持
        await AsyncStorage.removeItem(STORAGE_STATE);
        await AsyncStorage.removeItem(STORAGE_NONCE);
        return { status: 'success', code, state };
      }

      await this.cleanupAuthSession();
      return { status: 'error', message: '認証コードが見つかりません' };
    } catch {
      await this.cleanupAuthSession();
      return { status: 'error', message: 'コールバック処理に失敗しました' };
    }
  }

  /**
   * 認証セッションのストレージをクリア
   */
  static async cleanupAuthSession(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_STATE);
    await AsyncStorage.removeItem(STORAGE_NONCE);
    await AsyncStorage.removeItem(STORAGE_CODE_VERIFIER);
  }

  /**
   * 保存済みのcode_verifierを取得（トークン交換用）
   */
  static async getStoredCodeVerifier(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_CODE_VERIFIER);
  }

  // ──────────────────────────────────────────────
  //  トークン取得（/token）— サービスクラスのみ
  //  ⚠️ まだ呼び出さないでください
  //  private_key_jwt用の秘密鍵設定を後から追加するため
  // ──────────────────────────────────────────────

  /**
   * 認可コードをアクセストークンと交換
   *
   * TODO: private_key_jwt クライアント認証を追加後に有効化
   * - client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
   * - client_assertion=（秘密鍵で署名したJWT）
   * - JWKS エンドポイントの公開鍵設定
   */
  static async exchangeToken(code: string, codeVerifier: string): Promise<TokenResponse> {
    // TODO: private_key_jwt設定完了後に実装
    // const tokenEndpoint = `${AUTH_BASE_URL}/realms/main/protocol/openid-connect/token`;
    //
    // const body = new URLSearchParams({
    //   grant_type: 'authorization_code',
    //   code,
    //   redirect_uri: REDIRECT_URI,
    //   client_id: CLIENT_ID,
    //   client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    //   client_assertion: await this.generateClientAssertion(),
    //   code_verifier: codeVerifier,
    // });
    //
    // const response = await fetch(tokenEndpoint, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //   body: body.toString(),
    // });
    //
    // if (!response.ok) throw new Error('トークン取得に失敗しました');
    // return response.json();

    throw new Error(
      'トークン取得は未実装です。private_key_jwt用の秘密鍵設定を追加後に有効化してください。',
    );
  }

  /**
   * UserInfoエンドポイントからユーザー情報を取得
   *
   * TODO: トークン取得機能完成后に有効化
   */
  static async getUserInfo(accessToken: string): Promise<UserInfoResponse> {
    // TODO: トークン取得機能完成后に実装
    // const userInfoEndpoint = `${AUTH_BASE_URL}/realms/main/protocol/openid-connect/userinfo`;
    //
    // const response = await fetch(userInfoEndpoint, {
    //   headers: { Authorization: `Bearer ${accessToken}` },
    // });
    //
    // if (!response.ok) throw new Error('UserInfo取得に失敗しました');
    // return response.json();

    throw new Error(
      'UserInfo取得は未実装です。トークン取得機能完成后に有効化してください。',
    );
  }

  // ──────────────────────────────────────────────
  //  private_key_jwt用（将来実装）
  // ──────────────────────────────────────────────

  /**
   * client_assertion用のJWTを生成
   * TODO: 秘密鍵設定後に実装
   */
  static async generateClientAssertion(): Promise<string> {
    // TODO: 秘密鍵（RSA/EC）で署名したJWTを生成
    // - header: { alg: 'RS256', typ: 'JWT', kid: '...' }
    // - payload: { iss: CLIENT_ID, sub: CLIENT_ID, aud: token_endpoint, jti, exp, iat }
    // - signature: 秘密鍵で署名
    throw new Error('client_assertion生成は未実装です。秘密鍵設定を追加してください。');
  }

  // ──────────────────────────────────────────────
  //  データ保存
  // ──────────────────────────────────────────────

  /**
   * ユーザーの本人確認状態を verified=true に更新
   * @param userId Firebase UID
   */
  static async setVerified(userId: string): Promise<void> {
    const db = getDb();
    await updateDoc(doc(db, 'users', userId), {
      isVerified: true,
    });
  }

  /**
   * コールバックURLから認証結果を処理（Web環境用）
   * コールバック画面のURLパラメータから直接結果を取得する
   */
  static async processCallbackFromUrl(callbackUrl: string): Promise<AuthResult> {
    return this.handleCallbackUrl(callbackUrl);
  }

  /**
   * 現在のリダイレクトURIを取得（外部参照用）
   */
  static getRedirectUri(): string {
    return getRedirectUri();
  }
}

// WebBrowserの認証セッション完了を処理（ネイティブ環境用）
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}
