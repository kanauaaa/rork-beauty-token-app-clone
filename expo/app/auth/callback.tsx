/**
 * デジタル認証アプリ コールバック画面
 *
 * Web環境: ブラウザがリダイレクトしてこのページに到達する。
 *   URLパラメータ (?code=...&state=... または ?error=...) を処理する。
 * Native環境: openAuthSessionAsync がリダイレクトを捕捉し、
 *   IdentityVerificationButton 側で処理が完結する。この画面は到達しない。
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { AuthService } from '@/services/AuthService';
import { useAuth } from '@/providers/AuthProvider';
import { Platform } from 'react-native';

type DisplayState = 'loading' | 'success' | 'error' | 'cancelled';

export default function AuthCallbackScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const [displayState, setDisplayState] = useState<DisplayState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const processedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const processWebCallback = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      try {
        // Web環境: URLパラメータから認証結果を取得
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const url = window.location.href;
          console.log('[AuthCallback] Web callback URL:', url);

          const params = new URLSearchParams(window.location.search);
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

          // 認証コードがある場合 → state検証 + verified設定
          if (code) {
            const result = await AuthService.processCallbackFromUrl(url);

            if (!mounted) return;

            if (result.status === 'success') {
              // verified=true に更新
              if (user?.id) {
                try {
                  await AuthService.setVerified(user.id);
                  await updateProfile({ isVerified: true });
                } catch (e) {
                  console.warn('[AuthCallback] setVerified error:', e);
                }
              }
              setDisplayState('success');
            } else if (result.status === 'error') {
              setErrorMessage(result.message);
              setDisplayState('error');
            } else {
              setDisplayState('cancelled');
            }
            return;
          }

          // stateのみ（キャンセル等）
          if (!mounted) return;
          setDisplayState('cancelled');
          return;
        }

        // Native環境: この画面には到達しない（openAuthSessionAsyncが処理済み）
        // 到達した場合は前の画面に戻る
        if (!mounted) return;
        setDisplayState('loading');
      } catch (error) {
        if (!mounted) return;
        console.error('[AuthCallback] processWebCallback error:', error);
        setErrorMessage(
          error instanceof Error ? error.message : '不明なエラーが発生しました',
        );
        setDisplayState('error');
      }
    };

    processWebCallback();

    return () => {
      mounted = false;
    };
  }, [user?.id, updateProfile]);

  // 2.5秒後に自動で前の画面に戻る
  useEffect(() => {
    if (displayState === 'loading') return;

    const timer = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home' as any);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [displayState]);

  const renderContent = () => {
    switch (displayState) {
      case 'loading':
        return (
          <>
            <Text style={styles.title}>本人確認フローを完了しています...</Text>
            <Text style={styles.subtitle}>まもなく画面に戻ります</Text>
          </>
        );

      case 'success':
        return (
          <>
            <CheckCircle size={72} color="#4CAF50" />
            <Text style={styles.title}>本人確認が完了しました</Text>
            <Text style={styles.subtitle}>まもなく画面に戻ります</Text>
          </>
        );

      case 'error':
        return (
          <>
            <XCircle size={72} color="#E74C3C" />
            <Text style={styles.title}>本人確認に失敗しました</Text>
            <Text style={styles.subtitle}>{errorMessage || 'もう一度お試しください'}</Text>
          </>
        );

      case 'cancelled':
        return (
          <>
            <AlertCircle size={72} color="#FF9800" />
            <Text style={styles.title}>本人確認をキャンセルしました</Text>
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
