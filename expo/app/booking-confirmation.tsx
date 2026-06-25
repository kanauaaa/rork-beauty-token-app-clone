import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { useMatching } from '@/providers/MatchingProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, MapPin, Calendar, Clock, FileText, QrCode, X, User, Camera } from 'lucide-react-native';
import { router } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import QRCodeComponent from '@/components/QRCode';

export default function BookingConfirmationScreen() {
  const { user } = useAuth();
  const { matches, confirmBooking } = useMatching();
  const insets = useSafeAreaInsets();
  const [showQRCode, setShowQRCode] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const isCustomer = user?.role === 'customer';
  const confirmedBookings = matches.filter(m => 
    m.status === 'booking_confirmed' && 
    (isCustomer ? m.customerId === user?.id : m.hairdresserId === user?.id)
  );

  const handleShowQR = (matchId: string) => {
    setSelectedMatch(matchId);
    setShowQRCode(true);
  };

  const handleScanQR = async (matchId: string) => {

    if (!cameraPermission) {

      return;
    }

    if (!cameraPermission.granted) {

      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('エラー', 'カメラの使用許可が必要です');
        return;
      }
    }


    setSelectedMatch(matchId);
    setIsScanning(true);
    setShowQRScanner(true);
  };

  const handleQRCodeScanned = async (data: string) => {
    if (!isScanning || !selectedMatch) {

      return;
    }
    

    setIsScanning(false);
    setShowQRScanner(false);
    
    try {
      const customerData = JSON.parse(data);
      const match = matches.find(m => m.id === selectedMatch);
      
      if (!match) {
        Alert.alert('エラー', 'マッチング情報が見つかりません');
        return;
      }

      if (customerData.type === 'customer_qr' && customerData.customerId === match.customerId) {

        
        await confirmBooking(selectedMatch, true);
        
        Alert.alert(
          '予約確定完了',
          `${match.customerName}さんとの予約が確定しました。\n\nカルテ記入画面に移動します。`,
          [
            {
              text: 'OK',
              onPress: () => {
                router.push('/(tabs)/requests' as any);
              }
            }
          ]
        );
      } else {
        Alert.alert('エラー', '無効なQRコードまたは異なる顧客のQRコードです');
      }
    } catch (error) {

      Alert.alert('エラー', 'QRコードの読み取りに失敗しました');
    }
  };

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View>
          <Text style={styles.title}>予約確定</Text>
          <Text style={styles.subtitle}>
            {isCustomer ? '美容師とマッチング成立' : '顧客とマッチング成立'}
          </Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {confirmedBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircle size={64} color="#BDC3C7" />
            <Text style={styles.emptyStateTitle}>確定済みの予約はありません</Text>
            <Text style={styles.emptyStateText}>
              マッチングが成立すると、ここに表示されます
            </Text>
          </View>
        ) : (
          confirmedBookings.map((match) => (
            <View key={match.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={styles.successBadge}>
                  <CheckCircle size={20} color="#2ECC71" />
                  <Text style={styles.successBadgeText}>マッチング成立</Text>
                </View>
                <Text style={styles.bookingDate}>
                  {new Date(match.matchedAt).toLocaleDateString('ja-JP')}
                </Text>
              </View>

              <View style={styles.bookingBody}>
                <View style={styles.partnerInfo}>
                  <User size={24} color="#FF69B4" />
                  <View style={styles.partnerInfoText}>
                    <Text style={styles.partnerLabel}>
                      {isCustomer ? '担当美容師' : '顧客'}
                    </Text>
                    <Text style={styles.partnerName}>
                      {isCustomer ? match.hairdresserName : match.customerName}
                    </Text>
                  </View>
                </View>

                {isCustomer ? (
                  <View style={styles.instructionsSection}>
                    <Text style={styles.instructionTitle}>📱 次のステップ</Text>
                    <Text style={styles.instructionStep}>1. サロンに向かう</Text>
                    <Text style={styles.instructionStep}>2. 下のボタンからマイQRコードを表示</Text>
                    <Text style={styles.instructionStep}>3. 美容師にQRコードを読み取ってもらう</Text>
                    <Text style={styles.instructionStep}>4. 施術開始</Text>
                  </View>
                ) : (
                  <View style={styles.instructionsSection}>
                    <Text style={styles.instructionTitle}>📱 次のステップ</Text>
                    <Text style={styles.instructionStep}>1. 顧客の来店を待つ</Text>
                    <Text style={styles.instructionStep}>2. 顧客が到着したら下のボタンからQRスキャン</Text>
                    <Text style={styles.instructionStep}>3. 顧客のマイQRコードを読み取る</Text>
                    <Text style={styles.instructionStep}>4. 予約確定して施術開始</Text>
                  </View>
                )}
              </View>

              <View style={styles.bookingActions}>
                {isCustomer ? (
                  <TouchableOpacity
                    style={styles.showQRButton}
                    onPress={() => handleShowQR(match.id)}
                  >
                    <QrCode size={20} color="white" />
                    <Text style={styles.showQRButtonText}>マイQRコードを表示</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.scanQRButton}
                    onPress={() => handleScanQR(match.id)}
                  >
                    <Camera size={20} color="white" />
                    <Text style={styles.scanQRButtonText}>顧客のQRコードをスキャン</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showQRCode}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowQRCode(false)}
      >
        <View style={styles.qrModalContainer}>
          <View style={[styles.qrModalHeader, { paddingTop: insets.top + 20 }]}>
            <TouchableOpacity
              style={styles.qrModalCloseButton}
              onPress={() => setShowQRCode(false)}
            >
              <X size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.qrModalTitle}>マイQRコード</Text>
            <View style={styles.qrModalHeaderSpacer} />
          </View>

          <View style={styles.qrModalContent}>
            <View style={styles.qrCodeWrapper}>
              {user && <QRCodeComponent 
                value={JSON.stringify({
                  type: 'customer_qr',
                  userId: user.id,
                  userName: user.name,
                  customerId: user.id,
                  customerName: user.name,
                  timestamp: new Date().toISOString(),
                })} 
                size={250} 
              />}
            </View>
            <Text style={styles.qrInstructions}>
              美容師にこのQRコードを読み取ってもらってください
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
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.scannerCloseButton}
              onPress={() => setShowQRScanner(false)}
            >
              <X size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>顧客QRコードをスキャン</Text>
          </View>
          
          {Platform.OS !== 'web' ? (
            <CameraView
              style={styles.camera}
              facing={'back' as CameraType}
              onBarcodeScanned={(result) => {

                if (result.data && isScanning) {
                  handleQRCodeScanned(result.data);
                }
              }}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
                <Text style={styles.scannerInstructions}>
                  顧客のQRコードをフレーム内に合わせてください
                </Text>
              </View>
            </CameraView>
          ) : (
            <View style={styles.webCameraPlaceholder}>
              <QrCode size={100} color="#7F8C8D" />
              <Text style={styles.webCameraText}>
                Webではカメラ機能は利用できません
              </Text>
              <TouchableOpacity
                style={styles.mockScanButton}
                onPress={() => {
                  const match = matches.find(m => m.id === selectedMatch);
                  if (match) {
                    const mockCustomerData = {
                      type: 'customer_qr',
                      customerId: match.customerId,
                      customerName: match.customerName,
                      timestamp: new Date().toISOString()
                    };
                    handleQRCodeScanned(JSON.stringify(mockCustomerData));
                  }
                }}
              >
                <Text style={styles.mockScanButtonText}>テストスキャン</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#2ECC71',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  successBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2ECC71',
  },
  bookingDate: {
    fontSize: 12,
    color: '#95A5A6',
  },
  bookingBody: {
    gap: 20,
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  partnerInfoText: {
    flex: 1,
  },
  partnerLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  partnerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  instructionsSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  instructionStep: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 22,
    paddingLeft: 4,
  },
  bookingActions: {
    marginTop: 8,
  },
  showQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF69B4',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  showQRButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  scanQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF69B4',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanQRButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  qrModalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  qrModalCloseButton: {
    padding: 8,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  qrModalHeaderSpacer: {
    width: 40,
  },
  qrModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrCodeWrapper: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 32,
  },
  qrInstructions: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  scannerCloseButton: {
    marginRight: 16,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FF69B4',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scannerInstructions: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 40,
  },
  webCameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    gap: 20,
  },
  webCameraText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  mockScanButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  mockScanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
