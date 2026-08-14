/**
 * LINE OAuth コールバック画面
 *
 * LINE認可サーバーからリダイレクトされてこのページに到達する。
 * URLパラメータ (?code=...&state=...) を解析し、バックエンドでトークン交換・
 * ユーザー判定を行う。
 *
 * Web環境: ブラウザがこのURLに直接遷移してくる
 * Native環境: openAuthSessionAsync がこの画面に遷移する（または in-app ブラウザを閉じる）
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertCircle, UserPlus } from 'lucide-react-native';
import { router } from 'expo-router';
import { LineAuthService, LineAuthResult } from '@/services/LineAuthService';
import { useAuth } from '@/providers/AuthProvider';

type CallbackState = 'loading' | 'login_success' | 'new_user' | 'linked' | 'error' | 'cancelled';

export default function LineCallbackScreen() {
  const insets = useSafeAreaInsets();
  const { linkLineAccount } = useAuth();
  const [displayState, setDisplayState] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const processedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const processCallback = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      try {
        // URLパラメータを取得
        let callbackUrl: string;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          callbackUrl = window.location.href;
        } else {
          // Native環境でこの画面に直接遷移してきた場合は何もできない
          // openAuthSessionAsync が結果を処理済みのはず
          if (!mounted) return;
          setDisplayState('error');
          setErrorMessage('認証結果が見つかりません。もう一度お試しください。');
          return;
        }

        console.log('[LineCallback] Processing URL:', callbackUrl);

        const url = new URL(callbackUrl);
        const params = url.searchParams;
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        // エラー応答
        if (error) {
          if (!mounted) return;
          setErrorMessage(errorDescription || error);
          setDisplayState('error');
          return;
        }

        // キャンセル（パラメータなし）
        if (!code && !state) {
          if (!mounted) return;
          setDisplayState('cancelled');
          return;
        }

        if (!code) {
          if (!mounted) return;
          setErrorMessage('認証コードが見つかりません');
          setDisplayState('error');
          return;
        }

        // バックエンドでトークン交換・ユーザー判定
        const result: LineAuthResult = await LineAuthService.processCallback(
          callbackUrl,
          undefined,
        );

        if (!mounted) return;

        switch (result.status) {
          case 'login':
            // カスタムトークンでサインイン
            await LineAuthService.signInWithCustomToken(result.customToken);
            setDisplayState('login_success');
            break;

          case 'linked':
            // 既存ユーザーへのLINE連携
            await linkLineAccount(result.lineUserInfo);
            setDisplayState('linked');
            break;

          case 'new_user':
            // 新規ユーザー情報を保存し、ロール選択画面へ
            await LineAuthService.clearPendingLineUser();
            await LineAuthService.savePendingLineUser(result.lineUserInfo);
            setDisplayState('new_user');
            break;

          case 'error':
            setErrorMessage(result.message);
            setDisplayState('error');
            break;

          case 'cancelled':
            setDisplayState('cancelled');
            break;
        }
      } catch (err) {
        console.error('[LineCallback] processCallback error:', err);
        if (!mounted) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'LINE認証の処理に失敗しました',
        );
        setDisplayState('error');
      }
    };

    processCallback();

    return () => {
      mounted = false;
    };
  }, [linkLineAccount]);

  // 2.5秒後に自動で次の画面へ遷移
  useEffect(() => {
    if (displayState === 'loading') return;

    const timer = setTimeout(() => {
      switch (displayState) {
        case 'login_success':
          router.replace('/(tabs)/home' as any);
          break;
        case 'new_user':
          router.replace('/(auth)/line-role' as any);
          break;
        case 'linked':
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/profile' as any);
          }
          break;
        case 'error':
        case 'cancelled':
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(auth)/welcome' as any);
          }
          break;
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [displayState]);

  const renderContent = () => {
    switch (displayState) {
      case 'loading':
        return (
          <>
            <Text style={styles.title}>LINE認証中...</Text>
            <Text style={styles.subtitle}>しばらくお待ちください</Text>
          </>
        );

      case 'login_success':
        return (
          <>
            <CheckCircle size={72} color="#06C755" />
            <Text style={styles.title}>ログインしました</Text>
            <Text style={styles.subtitle}>まもなくホーム画面に移動します</Text>
          </>
        );

      case 'new_user':
        return (
          <>
            <UserPlus size={72} color="#06C755" />
            <Text style={styles.title}>新規登録へ進みます</Text>
            <Text style={styles.subtitle}>アカウントの種類を選択してください</Text>
          </>
        );

      case 'linked':
        return (
          <>
            <CheckCircle size={72} color="#06C755" />
            <Text style={styles.title}>LINE連携が完了しました</Text>
            <Text style={styles.subtitle}>まもなく画面に戻ります</Text>
          </>
        );

      case 'error':
        return (
          <>
            <XCircle size={72} color="#E74C3C" />
            <Text style={styles.title}>LINE認証に失敗しました</Text>
            <Text style={styles.subtitle}>{errorMessage || 'もう一度お試しください'}</Text>
          </>
        );

      case 'cancelled':
        return (
          <>
            <AlertCircle size={72} color="#FF9800" />
            <Text style={styles.title}>LINE認証をキャンセルしました</Text>
            <Text style={styles.subtitle}>まもなく画面に戻ります</Text>
          </>
        );
    }
  };

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.content}>{renderContent()}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as const,
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  } as const,
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#2C3E50',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  } as const,
  subtitle: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
  } as const,
});
