/**
 * デジタル認証アプリ コールバック画面
 *
 * OIDC Authorization Code Flow のコールバックを処理する。
 * AuthService.startAuthentication() がブラウザセッションを管理し、
 * リダイレクト後にこのページが結果を表示する。
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { AuthService, AuthResult } from '@/services/AuthService';
import { router } from 'expo-router';

type DisplayState = 'loading' | 'success' | 'error' | 'cancelled';

export default function AuthCallbackScreen() {
  const insets = useSafeAreaInsets();
  const [displayState, setDisplayState] = useState<DisplayState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const processCallback = async () => {
      try {
        // AuthServiceがブラウザセッションの結果を処理
        const result: AuthResult = await AuthService.startAuthentication();

        if (!mounted) return;

        switch (result.status) {
          case 'success':
            // 認証成功 — verified=true に更新（仮実装: ログイン中ユーザー）
            // TODO: トークン取得・UserInfo取得を実装後に本格運用
            setDisplayState('success');
            break;

          case 'error':
            setErrorMessage(result.message || 'エラーが発生しました');
            setDisplayState('error');
            break;

          case 'cancelled':
            setDisplayState('cancelled');
            break;
        }
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(
          error instanceof Error ? error.message : '不明なエラーが発生しました',
        );
        setDisplayState('error');
      }
    };

    processCallback();

    return () => {
      mounted = false;
    };
  }, []);

  // 3秒後に自動で前の画面に戻る
  useEffect(() => {
    if (displayState === 'loading') return;

    const timer = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home' as any);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [displayState]);

  const renderContent = () => {
    switch (displayState) {
      case 'loading':
        return (
          <>
            <Text style={styles.title}>本人確認中...</Text>
            <Text style={styles.subtitle}>デジタル認証アプリと通信しています</Text>
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
