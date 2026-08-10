/**
 * IdentityVerificationButton
 *
 * 「マイナンバーカードで本人確認」ボタンコンポーネント
 * 認証中はローディングを表示し、結果に応じてメッセージを表示する。
 *
 * 3画面で使用: 新規登録画面、プロフィール画面、設定画面
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { ShieldCheck, CreditCard } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { AuthService } from '@/services/AuthService';
import { useAuth } from '@/providers/AuthProvider';

interface IdentityVerificationButtonProps {
  /** 既に本人確認済みかどうか（trueの場合は完了状態を表示） */
  isVerified?: boolean;
  /** 認証成功時に呼ばれる（上位で画面遷移等を行う場合） */
  onVerified?: () => void;
  /** ボタンのスタイルバリエーション */
  variant?: 'default' | 'compact';
}

export default function IdentityVerificationButton({
  isVerified: initialVerified = false,
  onVerified,
  variant = 'default',
}: IdentityVerificationButtonProps) {
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(initialVerified || user?.isVerified === true);

  const handleVerify = useCallback(async () => {
    if (isLoading || isVerified) return;

    setIsLoading(true);

    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const result = await AuthService.startAuthentication();

      switch (result.status) {
        case 'success':
          // 認証成功 — verified=true に更新
          if (user?.id) {
            try {
              await AuthService.setVerified(user.id);
              await updateProfile({ isVerified: true });
            } catch (e) {
              // Firestore更新エラーはユーザー表示には影響させない（仮実装）
              console.warn('[IdentityVerification] setVerified error:', e);
            }
          }

          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }

          setIsVerified(true);
          Alert.alert('本人確認が完了しました', 'マイナンバーカードによる本人確認が完了しました。');
          onVerified?.();
          break;

        case 'error':
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          Alert.alert('本人確認に失敗しました', result.message || 'もう一度お試しください。');
          break;

        case 'cancelled':
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          Alert.alert('本人確認をキャンセルしました', '本人確認がキャンセルされました。');
          break;
      }
    } catch (error) {
      Alert.alert('本人確認に失敗しました', 'エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isVerified, user?.id, updateProfile, onVerified]);

  // 本人確認済みの場合
  if (isVerified) {
    return (
      <View style={[styles.verifiedContainer, variant === 'compact' && styles.verifiedCompact]}>
        <ShieldCheck size={variant === 'compact' ? 18 : 22} color="#4CAF50" />
        <Text style={[styles.verifiedText, variant === 'compact' && styles.verifiedTextCompact]}>
          本人確認済み
        </Text>
      </View>
    );
  }

  // 認証中
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, variant === 'compact' && styles.loadingCompact]}>
        <ActivityIndicator size="small" color="#FF69B4" />
        <Text style={[styles.loadingText, variant === 'compact' && styles.loadingTextCompact]}>
          本人確認中...
        </Text>
      </View>
    );
  }

  // 未認証 — ボタン表示
  return (
    <TouchableOpacity
      style={[styles.button, variant === 'compact' && styles.buttonCompact]}
      onPress={handleVerify}
      disabled={isLoading}
      activeOpacity={0.8}
    >
      <CreditCard size={variant === 'compact' ? 18 : 22} color="white" />
      <Text style={[styles.buttonText, variant === 'compact' && styles.buttonTextCompact]}>
        マイナンバーカードで本人確認
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
    backgroundColor: '#FF69B4',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  } as const,
  buttonCompact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 8,
  } as const,
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700' as const,
  } as const,
  buttonTextCompact: {
    fontSize: 13,
  } as const,
  loadingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
  } as const,
  loadingCompact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 8,
  } as const,
  loadingText: {
    color: '#FF69B4',
    fontSize: 15,
    fontWeight: '600' as const,
  } as const,
  loadingTextCompact: {
    fontSize: 13,
  } as const,
  verifiedContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
  } as const,
  verifiedCompact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 8,
  } as const,
  verifiedText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '700' as const,
  } as const,
  verifiedTextCompact: {
    fontSize: 13,
  } as const,
});
