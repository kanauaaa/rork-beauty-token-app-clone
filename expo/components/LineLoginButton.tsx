/**
 * LineLoginButton
 *
 * LINEブランドガイドライン準拠のログインボタン
 * LINE公式カラー (#06C755) とLINEロゴを使用
 *
 * 使用画面: ログイン画面、新規登録画面
 * 新規ユーザーの場合はロール選択→登録フローへ遷移
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LineAuthService, LineAuthResult } from '@/services/LineAuthService';
import { useAuth } from '@/providers/AuthProvider';

interface LineLoginButtonProps {
  /** ボタンのスタイルバリエーション */
  variant?: 'default' | 'compact';
  /** 既存ユーザーのLINE連携用（trueの場合は連携モード） */
  linkMode?: boolean;
}

export default function LineLoginButton({
  variant = 'default',
  linkMode = false,
}: LineLoginButtonProps) {
  const { user, linkLineAccount } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLineLogin = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      let result: LineAuthResult;

      if (linkMode) {
        // 既存ユーザーのLINE連携
        try {
          await linkLineAccount();
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          Alert.alert('LINE連携完了', 'LINEアカウントとの連携が完了しました。');
        } catch (error) {
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          const msg = error instanceof Error ? error.message : 'LINE連携に失敗しました';
          // キャンセルはAlertを出さない
          if (!msg.includes('キャンセル') && !msg.includes('cancel')) {
            Alert.alert('LINE連携エラー', msg);
          }
        }
        return;
      }

      // 新規ログイン / LINEログイン
      const currentUid = user?.id;
      result = await LineAuthService.startLineLogin(currentUid);

      switch (result.status) {
        case 'login': {
          // 既存ユーザー → カスタムトークンでサインイン
          await LineAuthService.signInWithCustomToken(result.customToken);
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          router.replace('/(tabs)/home' as any);
          break;
        }

        case 'new_user': {
          // 新規ユーザー → ロール選択画面へ遷移
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          router.push('/(auth)/line-role' as any);
          break;
        }

        case 'linked': {
          // LINE連携完了（linkMode以外では到達しない想定）
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          Alert.alert('LINE連携完了', 'LINEアカウントとの連携が完了しました。');
          break;
        }

        case 'error': {
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          Alert.alert('LINE認証エラー', result.message || 'もう一度お試しください。');
          break;
        }

        case 'cancelled': {
          // キャンセルは何もしない
          break;
        }
      }
    } catch (error) {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      const msg =
        error instanceof Error ? error.message : 'LINE認証に失敗しました';
      Alert.alert('エラー', msg);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, linkMode, linkLineAccount, user?.id]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          variant === 'compact' && styles.compact,
        ]}
      >
        <ActivityIndicator size="small" color="#06C755" />
        <Text style={styles.loadingText}>
          {linkMode ? 'LINE連携中...' : 'LINE認証中...'}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, variant === 'compact' && styles.compact]}
      onPress={handleLineLogin}
      disabled={isLoading}
      activeOpacity={0.85}
    >
      {/* LINE Logo (simplified SVG-like icon) */}
      <View style={styles.logoContainer}>
        <Text style={styles.lineLogo}>LINE</Text>
      </View>
      <Text style={styles.buttonText}>
        {linkMode ? 'LINEを連携' : 'LINEでログイン'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    backgroundColor: '#06C755',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
    shadowColor: '#06C755',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  } as const,
  compact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 8,
  } as const,
  logoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  } as const,
  lineLogo: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900' as const,
    letterSpacing: 0.5,
  } as const,
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700' as const,
  } as const,
  loadingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    backgroundColor: 'rgba(6, 199, 85, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
  } as const,
  loadingText: {
    color: '#06C755',
    fontSize: 15,
    fontWeight: '600' as const,
  } as const,
});
