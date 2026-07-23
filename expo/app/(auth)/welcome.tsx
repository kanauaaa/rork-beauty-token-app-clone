import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)/home' as any);
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/bp-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Beauty Proof</Text>
          <Text style={styles.subtitle}>美容師と顧客をつなぐ評価プラットフォーム</Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Users size={24} color="#FF69B4" />
            <Text style={styles.featureText}>美容師と顧客のマッチング</Text>
          </View>
          <View style={styles.feature}>
            <Image 
              source={require('@/assets/images/bp-logo.png')}
              style={styles.featureIcon}
              resizeMode="contain"
            />
            <Text style={styles.featureText}>評価でプルーフを獲得</Text>
          </View>
          <View style={styles.feature}>
            <Image 
              source={require('@/assets/images/bp-logo.png')}
              style={styles.featureIcon}
              resizeMode="contain"
            />
            <Text style={styles.featureText}>技術向上をサポート</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login' as any)}
          >
            <Text style={styles.loginButtonText}>ログイン</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/(auth)/register' as any)}
          >
            <Text style={styles.registerButtonText}>新規登録</Text>
          </TouchableOpacity>

        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  featureIcon: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 60,
    gap: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#34495E',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  loginButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF69B4',
  },
  registerButtonText: {
    color: '#FF69B4',
    fontSize: 18,
    fontWeight: '600',
  },
});