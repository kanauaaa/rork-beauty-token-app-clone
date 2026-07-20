import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, Modal, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth, Gender } from '@/providers/AuthProvider';
import { ArrowLeft, User, Mail, Lock, MapPin, Navigation, TestTube, Map, Camera, QrCode as QrCodeIcon, Scan, Phone } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { trpc } from '@/lib/trpc';

const MapPreviewComponent = ({ latitude, longitude, workplace, address }: {
  latitude: number;
  longitude: number;
  workplace: string;
  address: string;
}) => {
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`;
  
  return (
    <ScrollView style={styles.webMapPreviewContainer} contentContainerStyle={styles.webMapPreviewContent}>
      <View style={styles.webMapPreviewPlaceholder}>
        <MapPin size={80} color="#FF69B4" />
        <Text style={styles.webMapPreviewTitle}>位置情報プレビュー</Text>
        
        {Platform.OS === 'web' && (
          <View style={styles.mapIframeContainer}>
            <iframe
              width="100%"
              height="300"
              frameBorder="0"
              scrolling="no"
              src={mapUrl}
              style={{ border: 0, borderRadius: 12 }}
            />
          </View>
        )}
        
        <View style={styles.webMapPreviewInfo}>
          <Text style={styles.webMapPreviewLabel}>勤務地:</Text>
          <Text style={styles.webMapPreviewValue}>{workplace}</Text>
          
          <Text style={styles.webMapPreviewLabel}>住所:</Text>
          <Text style={styles.webMapPreviewValue}>{address}</Text>
          
          <Text style={styles.webMapPreviewLabel}>座標:</Text>
          <Text style={styles.webMapPreviewValue}>
            緯度: {latitude.toFixed(6)}
          </Text>
          <Text style={styles.webMapPreviewValue}>
            経度: {longitude.toFixed(6)}
          </Text>
          
          <TouchableOpacity
            style={styles.openMapButton}
            onPress={() => {
              const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
              if (Platform.OS === 'web') {
                window.open(googleMapsUrl, '_blank');
              } else {
                Alert.alert('地図アプリ', 'Google Mapsで開きますか？', [
                  { text: 'キャンセル', style: 'cancel' },
                  { text: '開く', onPress: () => {} }
                ]);
              }
            }}
          >
            <Navigation size={16} color="white" />
            <Text style={styles.openMapButtonText}>Google Mapsで開く</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.webMapPreviewSubtitle}>
          {Platform.OS === 'web' 
            ? '上記の地図で位置を確認してください。モバイルアプリではより詳細な地図が表示されます。'
            : 'この位置情報が美容師アプリに登録されます。'}
        </Text>
      </View>
    </ScrollView>
  );
};

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'customer' as 'hairdresser' | 'customer',
    gender: 'unspecified' as Gender,
    workplace: '',
    workplaceName: '',
    profileImageUri: '',
    selfIntroduction: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    address: '',
    referredBy: '' as string | undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [referrerName, setReferrerName] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const sendSMSMutation = trpc.smsAuth.sendVerificationCode.useMutation();
  const verifySMSMutation = trpc.smsAuth.verifyCode.useMutation();
  const { register } = useAuth();



  const handleRegister = async () => {

    
    if (!formData.name?.trim() || !formData.email?.trim() || !formData.password?.trim() || !formData.phoneNumber?.trim()) {
      Alert.alert('エラー', '必須項目を入力してください');
      return;
    }

    if (!phoneVerified) {
      Alert.alert('エラー', '電話番号の認証を完了してください');
      return;
    }

    if (formData.role === 'hairdresser' && (!formData.workplace?.trim() || !formData.workplaceName?.trim() || formData.latitude === undefined || formData.longitude === undefined)) {
      Alert.alert('エラー', '美容師の場合は勤務地名、住所、位置情報を設定してください');
      return;
    }

    if (formData.gender === 'unspecified') {
      Alert.alert('エラー', '性別を選択してください');
      return;
    }

    setIsLoading(true);
    try {

      await register(formData);

    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : '登録に失敗しました';
      Alert.alert('登録エラー', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (key: string, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('エラー', '位置情報の許可が必要です');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ja`
        );
        const data = await response.json();
        
        const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        
        updateFormData('latitude', latitude);
        updateFormData('longitude', longitude);
        updateFormData('address', address);
        updateFormData('workplace', data.address?.city || data.address?.town || data.address?.village || address);
        if (!formData.workplaceName) {
          updateFormData('workplaceName', data.address?.city || data.address?.town || data.address?.village || address);
        }
        
        Alert.alert('成功', '現在地を取得しました');
      } catch (geocodeError) {

        updateFormData('latitude', latitude);
        updateFormData('longitude', longitude);
        updateFormData('address', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        if (!formData.workplaceName) {
          updateFormData('workplaceName', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
        Alert.alert('位置情報を取得しました', '住所の詳細取得に失敗しましたが、座標は保存されました');
      }
    } catch (error) {

      Alert.alert('エラー', '位置情報の取得に失敗しました');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const searchLocation = async (query: string) => {
    if (!query.trim()) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=ja&countrycodes=jp`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const result = data[0];
        const latitude = parseFloat(result.lat);
        const longitude = parseFloat(result.lon);
        
        updateFormData('latitude', latitude);
        updateFormData('longitude', longitude);
        updateFormData('address', result.display_name);
        if (!formData.workplaceName) {
          updateFormData('workplaceName', result.display_name.split(',')[0]);
        }
        
        Alert.alert('成功', '住所から位置情報を取得しました');
      } else {
        Alert.alert('エラー', '住所が見つかりませんでした');
      }
    } catch (error) {

      Alert.alert('エラー', '住所検索に失敗しました');
    }
  };

  const handleSendVerification = async () => {
    if (!formData.phoneNumber) {
      Alert.alert('エラー', '電話番号を入力してください');
      return;
    }

    let phoneNumber = formData.phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+81' + phoneNumber.replace(/^0/, '');
    }

    setIsVerifying(true);
    try {

      const result = await sendSMSMutation.mutateAsync({ phoneNumber });
      
      setVerificationSent(true);
      
      const message = result.devCode 
        ? `${formData.phoneNumber}に認証コードを送信しました。\n\n開発モード: ${result.devCode}`
        : `${formData.phoneNumber}に認証コードを送信しました。`;
      
      Alert.alert('SMS送信完了', message, [{ text: 'OK' }]);
    } catch (error: any) {

      Alert.alert('SMS送信エラー', error.message || 'SMS送信に失敗しました');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('エラー', '6桁の認証コードを入力してください');
      return;
    }

    if (!verificationSent) {
      Alert.alert('エラー', '先にSMS認証コードを送信してください');
      return;
    }

    let phoneNumber = formData.phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+81' + phoneNumber.replace(/^0/, '');
    }

    setIsLoading(true);
    try {

      await verifySMSMutation.mutateAsync({ 
        phoneNumber,
        code: verificationCode 
      });
      

      setPhoneVerified(true);
      setVerificationSent(false);
      setVerificationCode('');
      Alert.alert('認証成功', '電話番号の認証が完了しました');
    } catch (error: any) {

      Alert.alert('エラー', error.message || '認証に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fillTestData = () => {
    const testData = {
      name: '美容師A',
      email: 'hairdresser-a@example.com',
      password: 'test123456',
      phoneNumber: '09012345678',
      role: 'hairdresser' as 'hairdresser' | 'customer',
      gender: 'unspecified' as Gender,
      workplace: '東京都渋谷区',
      workplaceName: '美容室A',
      profileImageUri: '',
      selfIntroduction: 'カット・カラーが得意です。お客様に似合うスタイルをご提案します！',
      latitude: 35.6628,
      longitude: 139.7038,
      address: '東京都渋谷区',
      referredBy: undefined,
    };
    
    setFormData(testData);
    setPhoneVerified(true);
    Alert.alert('テストデータ入力完了', '美容師の登録情報がセットされました');
  };

  const fillTestDataCustomer = () => {
    const testData = {
      name: '顧客A',
      email: 'customer-a@example.com',
      password: 'test123456',
      phoneNumber: '08098765432',
      role: 'customer' as 'hairdresser' | 'customer',
      gender: 'female' as Gender,
      workplace: '',
      workplaceName: '',
      profileImageUri: '',
      selfIntroduction: '',
      latitude: undefined,
      longitude: undefined,
      address: '',
      referredBy: undefined,
    };
    
    setFormData(testData);
    setPhoneVerified(true);
    Alert.alert('テストデータ入力完了', '顧客の登録情報がセットされました');
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('許可が必要です', 'プロフィール画像を選択するには、フォトライブラリへのアクセス許可が必要です。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        updateFormData('profileImageUri', imageUri);
      }
    } catch (error) {

      Alert.alert('エラー', '画像の選択に失敗しました');
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
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#2C3E50" />
        </TouchableOpacity>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>新規登録</Text>
            <Text style={styles.subtitle}>アカウントを作成してください</Text>

            {formData.role === 'customer' && (
              <TouchableOpacity
                style={styles.referralQRButton}
                onPress={() => setShowQRScanner(true)}
              >
                <Scan size={20} color="#FF69B4" />
                <Text style={styles.referralQRButtonText}>
                  {formData.referredBy ? `紹介者: ${referrerName} ✓` : '紹介コードを入力'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.testButtonContainer}>
              <TouchableOpacity
                style={styles.testButton}
                onPress={fillTestData}
              >
                <TestTube size={16} color="#FF69B4" />
                <Text style={styles.testButtonText}>美容師テストデータ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.testButton}
                onPress={fillTestDataCustomer}
              >
                <TestTube size={16} color="#3498DB" />
                <Text style={[styles.testButtonText, { color: '#3498DB' }]}>顧客テストデータ</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.imagePickerSection}>
              <Text style={styles.imagePickerLabel}>プロフィール画像（任意）</Text>
              <TouchableOpacity 
                style={styles.imagePickerButton}
                onPress={handlePickImage}
              >
                {formData.profileImageUri ? (
                  <Image source={{ uri: formData.profileImageUri }} style={styles.imagePickerImage} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Camera size={32} color="#7F8C8D" />
                    <Text style={styles.imagePickerText}>画像を選択</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'customer' && styles.roleButtonActive
                ]}
                onPress={() => updateFormData('role', 'customer')}
              >
                <Text style={[
                  styles.roleButtonText,
                  formData.role === 'customer' && styles.roleButtonTextActive
                ]}>
                  顧客
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'hairdresser' && styles.roleButtonActive
                ]}
                onPress={() => updateFormData('role', 'hairdresser')}
              >
                <Text style={[
                  styles.roleButtonText,
                  formData.role === 'hairdresser' && styles.roleButtonTextActive
                ]}>
                  美容師
                </Text>
              </TouchableOpacity>
            </View>

            {formData.referredBy && (
              <View style={styles.referralInfoCard}>
                <Text style={styles.referralInfoText}>
                  🎉 紹介リンクが設定されました！
                </Text>
                <Text style={styles.referralInfoSubtext}>
                  登録完了後、紹介したユーザーに特典が付与されます。
                </Text>
              </View>
            )}

            {formData.role === 'customer' && (
              <View style={styles.genderSection}>
                <Text style={styles.genderLabel}>性別 *</Text>
                <View style={styles.genderSelector}>
                  <TouchableOpacity
                    style={[styles.genderButton, formData.gender === 'male' && styles.genderButtonActive]}
                    onPress={() => updateFormData('gender', 'male')}
                  >
                    <Text style={[styles.genderButtonText, formData.gender === 'male' && styles.genderButtonTextActive]}>男性</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderButton, formData.gender === 'female' && styles.genderButtonActive]}
                    onPress={() => updateFormData('gender', 'female')}
                  >
                    <Text style={[styles.genderButtonText, formData.gender === 'female' && styles.genderButtonTextActive]}>女性</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <User size={20} color="#7F8C8D" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="お名前 *"
                  value={formData.name}
                  onChangeText={(value) => updateFormData('name', value)}
                />
              </View>

              <View style={styles.inputContainer}>
                <Phone size={20} color="#7F8C8D" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="電話番号 * (例: 09012345678)"
                  value={formData.phoneNumber}
                  onChangeText={(value) => updateFormData('phoneNumber', value)}
                  keyboardType="phone-pad"
                  editable={!phoneVerified}
                />
              </View>

              {!phoneVerified ? (
                <TouchableOpacity
                  style={[styles.verifyButton, isVerifying && styles.disabledButton]}
                  onPress={handleSendVerification}
                  disabled={isVerifying || !formData.phoneNumber}
                >
                  <Text style={styles.verifyButtonText}>
                    {isVerifying ? '送信中...' : verificationSent ? '再送信' : 'SMS認証コードを送信'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ 電話番号認証完了</Text>
                </View>
              )}

              {verificationSent && !phoneVerified && (
                <View style={styles.verificationSection}>
                  <View style={styles.inputContainer}>
                    <Lock size={20} color="#7F8C8D" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="認証コード (6桁)"
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.verifyButton, isLoading && styles.disabledButton]}
                    onPress={handleVerifyCode}
                    disabled={isLoading || verificationCode.length !== 6}
                  >
                    <Text style={styles.verifyButtonText}>
                      {isLoading ? '確認中...' : '認証コードを確認'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Mail size={20} color="#7F8C8D" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="メールアドレス *"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color="#7F8C8D" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="パスワード *"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  secureTextEntry
                />
              </View>

              {formData.role === 'hairdresser' && (
                <React.Fragment>
                  <View style={styles.inputContainer}>
                    <User size={20} color="#7F8C8D" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="勤務先名 *（例：〇〇美容室）"
                      value={formData.workplaceName}
                      onChangeText={(value) => updateFormData('workplaceName', value)}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <MapPin size={20} color="#7F8C8D" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="勤務地住所 *"
                      value={formData.workplace}
                      onChangeText={(value) => updateFormData('workplace', value)}
                      onSubmitEditing={() => searchLocation(formData.workplace)}
                      returnKeyType="search"
                    />
                  </View>

                  <View style={styles.locationContainer}>
                    <TouchableOpacity
                      style={[styles.locationButton, isGettingLocation && styles.disabledButton]}
                      onPress={getCurrentLocation}
                      disabled={isGettingLocation}
                    >
                      <Navigation size={20} color="white" />
                      <Text style={styles.locationButtonText}>
                        {isGettingLocation ? '取得中...' : '現在地を取得'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.searchButton}
                      onPress={() => searchLocation(formData.workplace)}
                    >
                      <MapPin size={20} color="#FF69B4" />
                      <Text style={styles.searchButtonText}>住所検索</Text>
                    </TouchableOpacity>
                  </View>

                  {formData.address && (
                    <View style={styles.addressContainer}>
                      <Text style={styles.addressLabel}>登録される位置情報:</Text>
                      <Text style={styles.addressText}>{formData.address}</Text>
                      {formData.latitude && formData.longitude && (
                        <View>
                          <Text style={styles.coordinatesText}>
                            座標: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                          </Text>
                          <TouchableOpacity
                            style={styles.mapPreviewButton}
                            onPress={() => setShowMapPreview(true)}
                          >
                            <Map size={16} color="#FF69B4" />
                            <Text style={styles.mapPreviewButtonText}>地図で確認</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="自己紹介（50文字以内）"
                      value={formData.selfIntroduction}
                      onChangeText={(value) => updateFormData('selfIntroduction', value.slice(0, 50))}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </React.Fragment>
              )}

              <TouchableOpacity
                style={[styles.registerButton, isLoading && styles.disabledButton]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? '登録中...' : '登録する'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <Modal
        visible={showMapPreview}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowMapPreview(false)}
      >
        <View style={styles.mapPreviewContainer}>
          <View style={styles.mapPreviewHeader}>
            <TouchableOpacity
              style={styles.mapPreviewCloseButton}
              onPress={() => setShowMapPreview(false)}
            >
              <ArrowLeft size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.mapPreviewTitle}>勤務地の位置確認</Text>
            <View style={styles.mapPreviewHeaderSpacer} />
          </View>
          
          {formData.latitude && formData.longitude ? (
            <MapPreviewComponent
              latitude={formData.latitude}
              longitude={formData.longitude}
              workplace={formData.workplace}
              address={formData.address}
            />
          ) : (
            <View style={styles.webMapPreviewPlaceholder}>
              <MapPin size={80} color="#FF69B4" />
              <Text style={styles.webMapPreviewTitle}>位置情報が未設定</Text>
              <Text style={styles.webMapPreviewText}>
                現在地を取得するか、住所検索で位置情報を設定してください。
              </Text>
            </View>
          )}
          
          <View style={styles.mapPreviewFooter}>
            <Text style={styles.mapPreviewFooterText}>
              この位置情報が美容師アプリに登録され、顧客が検索できるようになります。
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showQRScanner}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowQRScanner(false)}
      >
        <View style={styles.container}>
          <View style={styles.qrScannerHeader}>
            <TouchableOpacity
              style={styles.qrScannerCloseButton}
              onPress={() => setShowQRScanner(false)}
            >
              <ArrowLeft size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.qrScannerTitle}>紹介QRコードスキャン</Text>
            <View style={styles.qrScannerHeaderSpacer} />
          </View>
          
          <View style={styles.qrScannerContent}>
            <View style={styles.qrScannerPlaceholder}>
              <QrCodeIcon size={100} color="#FF69B4" />
              <Text style={styles.qrScannerText}>
                紹介者から受け取った紹介コードを入力してください
              </Text>
              
              <View style={styles.referralInputContainer}>
                <TextInput
                  style={styles.referralInput}
                  placeholder="紹介コード（例: CREF_abc123）"
                  value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
              
              <View style={styles.referralButtonsRow}>
                <TouchableOpacity
                  style={[styles.mockReferralButton, { flex: 1 }]}
                  onPress={() => {
                    if (!referralCode.trim()) {
                      Alert.alert('エラー', '紹介コードを入力してください');
                      return;
                    }
                    
                    updateFormData('referredBy', referralCode);
                    setReferrerName(referralCode);
                    setShowQRScanner(false);
                    setReferralCode('');
                    Alert.alert('成功', '紹介コードが設定されました！');
                  }}
                >
                  <Text style={styles.mockReferralButtonText}>設定</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.cancelReferralButton, { flex: 1 }]}
                  onPress={() => {
                    setReferralCode('');
                    setShowQRScanner(false);
                  }}
                >
                  <Text style={styles.cancelReferralButtonText}>キャンセル</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.referralHintText}>
                💡 紹介者のプロフィール画面でQRコードまたは紹介コードを確認できます
              </Text>
            </View>
          </View>
        </View>
      </Modal>
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
  scrollView: {
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
    paddingHorizontal: 32,
    paddingTop: 100,
    paddingBottom: 40,
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
    marginBottom: 30,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 30,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleButtonActive: {
    backgroundColor: '#FF69B4',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7F8C8D',
  },
  roleButtonTextActive: {
    color: 'white',
  },
  genderSection: {
    marginBottom: 20,
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 8,
  },
  genderSelector: {
    flexDirection: 'row' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 4,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center' as const,
    borderRadius: 8,
  },
  genderButtonActive: {
    backgroundColor: '#FF69B4',
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#7F8C8D',
  },
  genderButtonTextActive: {
    color: 'white',
  },
  form: {
    gap: 20,
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
  textArea: {
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  imagePickerSection: {
    marginBottom: 20,
  },
  imagePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  imagePickerButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignSelf: 'center',
    width: 120,
    height: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imagePickerImage: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  locationButton: {
    flex: 1,
    backgroundColor: '#FF69B4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  locationButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  searchButton: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FF69B4',
  },
  searchButtonText: {
    color: '#FF69B4',
    fontSize: 14,
    fontWeight: '500',
  },
  addressContainer: {
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.3)',
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF69B4',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  testButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  testButton: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF69B4',
  },
  mapPreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.3)',
  },
  mapPreviewButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF69B4',
  },
  mapPreviewContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  mapPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  mapPreviewCloseButton: {
    padding: 8,
  },
  mapPreviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  mapPreviewHeaderSpacer: {
    width: 40,
  },
  mapPreview: {
    flex: 1,
  },
  mapPreviewFooter: {
    padding: 20,
    backgroundColor: 'rgba(255, 105, 180, 0.05)',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  mapPreviewFooterText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
  webMapPreviewContainer: {
    flex: 1,
  },
  webMapPreviewContent: {
    flexGrow: 1,
  },
  webMapPreviewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
  },
  mapIframeContainer: {
    width: '100%',
    maxWidth: 600,
    height: 300,
    marginVertical: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  openMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF69B4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  openMapButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  webMapPreviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  webMapPreviewText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  webMapPreviewInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  webMapPreviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF69B4',
    marginTop: 8,
    marginBottom: 4,
  },
  webMapPreviewValue: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 4,
  },
  webMapPreviewSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  referralQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
    borderWidth: 2,
    borderColor: '#FF69B4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  referralQRButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF69B4',
  },
  referralInfoCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  referralInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 6,
    textAlign: 'center',
  },
  referralInfoSubtext: {
    fontSize: 13,
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 18,
  },
  qrScannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  qrScannerCloseButton: {
    padding: 8,
  },
  qrScannerTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  qrScannerHeaderSpacer: {
    width: 40,
  },
  qrScannerContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  qrScannerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  qrScannerText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
  },
  mockReferralButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mockReferralButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  referralInputContainer: {
    width: '100%',
    marginVertical: 10,
  },
  referralInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 2,
    borderColor: '#FF69B4',
    textAlign: 'center' as const,
  },
  referralButtonsRow: {
    flexDirection: 'row' as const,
    gap: 12,
    width: '100%',
  },
  cancelReferralButton: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelReferralButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#7F8C8D',
    textAlign: 'center' as const,
  },
  referralHintText: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginTop: 12,
    paddingHorizontal: 20,
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: 0,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  verifiedText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  verificationSection: {
    gap: 12,
  },
});