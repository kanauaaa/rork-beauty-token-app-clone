import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { ArrowLeft, Phone, Shield } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { getAuthInstance } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

export default function PhoneLoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();
  const { user } = useAuth();
  
  const sendCodeMutation = trpc.smsAuth.sendVerificationCode.useMutation();
  const verifyCodeMutation = trpc.smsAuth.verifyCode.useMutation();

  useEffect(() => {
    if (user) {

      router.replace('/(tabs)/home' as any);
    }
  }, [user]);

  const handleSendCode = async () => {
    if (!phoneNumber) {
      Alert.alert('エラー', '電話番号を入力してください');
      return;
    }

    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+81${phoneNumber.replace(/^0/, '')}`;
    
    setIsLoading(true);
    try {

      
      const result = await sendCodeMutation.mutateAsync({
        phoneNumber: formattedPhone,
      });


      setDevCode(result.devCode);
      
      if (result.devCode) {
        Alert.alert(
          '成功',
          `認証コードを${formattedPhone}に送信しました\n\n開発用コード: ${result.devCode}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('成功', result.message);
      }
      
      setStep('code');
    } catch (error: any) {

      Alert.alert('エラー', error.message || 'SMS送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      Alert.alert('エラー', '認証コードを入力してください');
      return;
    }

    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+81${phoneNumber.replace(/^0/, '')}`;
    
    setIsLoading(true);
    try {

      
      const result = await verifyCodeMutation.mutateAsync({
        phoneNumber: formattedPhone,
        code: verificationCode,
      });
      

      
      const auth = getAuthInstance();
      await signInWithCustomToken(auth, result.customToken);
      

      
      const db = (await import('@/lib/firebase')).getDb();
      const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
      
      const userDocRef = doc(db, 'users', result.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {

        await setDoc(userDocRef, {
          name: formattedPhone,
          email: '',
          phoneNumber: formattedPhone,
          role: 'customer',
          status: 'approved',
          profileImageUri: null,
          createdAt: serverTimestamp(),
        });
      }
      

    } catch (error: any) {

      Alert.alert('エラー', error.message || '認証に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === 'code') {
              setStep('phone');
              setVerificationCode('');
            } else {
              router.back();
            }
          }}
        >
          <ArrowLeft size={24} color="#2C3E50" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}>
              {step === 'phone' ? (
                <Phone size={48} color="#FF69B4" />
              ) : (
                <Shield size={48} color="#FF69B4" />
              )}
            </View>
          </View>

          {step === 'phone' ? (
            <>
              <Text style={styles.title}>電話番号でログイン</Text>
              <Text style={styles.subtitle}>
                電話番号を入力してください{devCode ? `\n\n開発用コード: ${devCode}` : ''}
              </Text>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Phone size={20} color="#7F8C8D" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="090-1234-5678"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.disabledButton]}
                  onPress={handleSendCode}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>認証コードを送信</Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.push('/(auth)/login' as any)}
              >
                <Text style={styles.linkText}>メールアドレスでログイン</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>認証コード入力</Text>
              <Text style={styles.subtitle}>
                {phoneNumber} に送信された{'\n'}
                6桁のコードを入力してください
              </Text>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Shield size={20} color="#7F8C8D" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoComplete="sms-otp"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.disabledButton]}
                  onPress={handleVerifyCode}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>ログイン</Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleSendCode}
                disabled={isLoading}
              >
                <Text style={styles.linkText}>コードを再送信</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    gap: 20,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    color: '#2C3E50',
  },
  button: {
    backgroundColor: '#FF69B4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    color: '#FF69B4',
    fontSize: 16,
    fontWeight: '500',
  },
});
