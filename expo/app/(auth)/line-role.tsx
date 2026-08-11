/**
 * LINE ロール選択画面 (新規LINEユーザー用)
 *
 * LINEで新規ログイン時、ユーザーが「顧客」か「美容師」かを選択。
 * 選択後、register.tsx のLINE登録フローへ遷移。
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Scissors, CheckCircle } from 'lucide-react-native';
import { LineAuthService, LineUserInfo } from '@/services/LineAuthService';

export default function LineRoleSelectionScreen() {
  const insets = useSafeAreaInsets();
  const [lineUser, setLineUser] = useState<LineUserInfo | null>(null);
  const [selectedRole, setSelectedRole] = useState<'customer' | 'hairdresser' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPendingUser = async () => {
      const pending = await LineAuthService.getPendingLineUser();
      if (!pending) {
        // 保留中のLINE情報がない場合はウェルカム画面へ
        router.replace('/(auth)/welcome' as any);
        return;
      }
      setLineUser(pending);
      setIsLoading(false);
    };
    loadPendingUser();
  }, []);

  const handleNext = () => {
    if (!selectedRole) return;
    // 選択したロールをクエリパラメータでregister画面に渡す
    // register.tsx側でLINE登録フローを判定
    router.replace({
      pathname: '/(auth)/register',
      params: {
        lineRole: selectedRole,
        lineUserId: lineUser?.lineUserId ?? '',
        lineDisplayName: lineUser?.displayName ?? '',
        linePictureUrl: lineUser?.pictureUrl ?? '',
      },
    } as any);
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06C755" />
          <Text style={styles.loadingText}>LINE情報を確認中...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={[styles.container, { paddingTop: insets.top + 20 }]}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          LineAuthService.clearPendingLineUser();
          router.replace('/(auth)/welcome' as any);
        }}
      >
        <ArrowLeft size={24} color="#2C3E50" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* LINE プロフィール表示 */}
        <View style={styles.lineProfileContainer}>
          {lineUser?.pictureUrl ? (
            <Image
              source={{ uri: lineUser.pictureUrl }}
              style={styles.lineAvatar}
            />
          ) : (
            <View style={styles.lineAvatarPlaceholder}>
              <User size={36} color="#06C755" />
            </View>
          )}
          <Text style={styles.lineDisplayName}>
            {lineUser?.displayName ?? 'LINE ユーザー'}
          </Text>
          <Text style={styles.lineSubtext}>LINE アカウントで新規登録</Text>
        </View>

        <Text style={styles.title}>アカウントの種類を選択</Text>
        <Text style={styles.subtitle}>
          あなたはどちらでご利用しますか？
        </Text>

        {/* ロール選択カード */}
        <View style={styles.roleCards}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'customer' && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole('customer')}
            activeOpacity={0.85}
          >
            <View style={styles.roleCardIcon}>
              <User size={32} color={selectedRole === 'customer' ? '#FF69B4' : '#7F8C8D'} />
            </View>
            <Text
              style={[
                styles.roleCardTitle,
                selectedRole === 'customer' && styles.roleCardTitleSelected,
              ]}
            >
              顧客
            </Text>
            <Text style={styles.roleCardDesc}>
              美容師を評価してBPを贈呈
            </Text>
            {selectedRole === 'customer' && (
              <CheckCircle
                size={22}
                color="#FF69B4"
                style={styles.roleCheckIcon}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'hairdresser' && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole('hairdresser')}
            activeOpacity={0.85}
          >
            <View style={styles.roleCardIcon}>
              <Scissors
                size={32}
                color={selectedRole === 'hairdresser' ? '#FF69B4' : '#7F8C8D'}
              />
            </View>
            <Text
              style={[
                styles.roleCardTitle,
                selectedRole === 'hairdresser' && styles.roleCardTitleSelected,
              ]}
            >
              美容師
            </Text>
            <Text style={styles.roleCardDesc}>
              評価を受けてBPを獲得
            </Text>
            {selectedRole === 'hairdresser' && (
              <CheckCircle
                size={22}
                color="#FF69B4"
                style={styles.roleCheckIcon}
              />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          ※ 後からプロフィールで変更できないため、慎重に選択してください。
        </Text>

        <TouchableOpacity
          style={[styles.nextButton, !selectedRole && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selectedRole}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>次へ</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as const,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  } as const,
  loadingText: {
    fontSize: 16,
    color: '#7F8C8D',
  } as const,
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
    padding: 8,
  } as const,
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  } as const,
  lineProfileContainer: {
    alignItems: 'center',
    marginBottom: 40,
  } as const,
  lineAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#06C755',
  } as const,
  lineAvatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
    backgroundColor: 'rgba(6, 199, 85, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#06C755',
  } as const,
  lineDisplayName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#2C3E50',
  } as const,
  lineSubtext: {
    fontSize: 14,
    color: '#06C755',
    marginTop: 4,
  } as const,
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  } as const,
  subtitle: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 32,
  } as const,
  roleCards: {
    gap: 16,
  } as const,
  roleCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  } as const,
  roleCardSelected: {
    borderColor: '#FF69B4',
    backgroundColor: 'rgba(255, 105, 180, 0.05)',
  } as const,
  roleCardIcon: {
    marginBottom: 12,
  } as const,
  roleCardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#2C3E50',
    marginBottom: 6,
  } as const,
  roleCardTitleSelected: {
    color: '#FF69B4',
  } as const,
  roleCardDesc: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
  } as const,
  roleCheckIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  } as const,
  note: {
    fontSize: 12,
    color: '#95A5A6',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 24,
    lineHeight: 18,
  } as const,
  nextButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  } as const,
  nextButtonDisabled: {
    opacity: 0.4,
  } as const,
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  } as const,
});
