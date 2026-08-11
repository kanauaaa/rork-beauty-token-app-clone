/**
 * LINE OAuth コールバック画面
 *
 * LineAuthService.startLineLogin() がブラウザセッションを管理し、
 * リダイレクト後にこのページが結果を表示する。
 *
 * 成功時: 自動的にホームまたは次の画面へ遷移
 * 新規ユーザー: ロール選択画面へ遷移
 * エラー/キャンセル: 認証画面に戻る
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertCircle, UserPlus } from 'lucide-react-native';
import { router } from 'expo-router';

type CallbackState = 'loading' | 'login_success' | 'new_user' | 'linked' | 'error' | 'cancelled';

export default function LineCallbackScreen() {
  const insets = useSafeAreaInsets();
  const [displayState, setDisplayState] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 3秒後に自動で次の画面へ遷移
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
