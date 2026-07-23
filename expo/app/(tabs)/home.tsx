import React, { useState, useCallback } from 'react';
import { Stack, router } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, FlatList, Platform, Image, TextInput, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, isTechCategoryAvailable } from '@/providers/AuthProvider';
import { Award, Users, QrCode, Search, Star, X, MapPin, Navigation, Camera, User, Gift, UserPlus, Zap, Heart, Clock, Sparkles, AlertCircle, Upload, CheckCircle, Send, Scissors, Palette, Waves, AlignJustify, Link, Hand, ChevronDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import QRCodeComponent from '@/components/QRCode';
import WalletBalanceHeader from '@/components/WalletBalanceHeader';
import TechnicalSkillChart, { SkillItem } from '@/components/TechnicalSkillChart';
import CategoryProgressBar from '@/components/CategoryProgressBar';

import { useMedicalRecords } from '@/providers/MedicalRecordProvider';
import { useReferral } from '@/providers/ReferralProvider';
import { useFavorites } from '@/providers/FavoriteProvider';
import { useRatingTasks } from '@/providers/RatingTaskProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useRatings } from '@/providers/RatingProvider';
import { useAssistantBT } from '@/providers/AssistantBTProvider';
import { useVisitSessionPolling } from '@/providers/VisitSessionPollingProvider';
import { useDisputes } from '@/providers/DisputeProvider';
import { createCustomerQR, createHairdresserQR, validateQRCode, serializeQRData, QRData } from '@/lib/qr-utils';


export default function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <HomeContent />
    </>
  );
}

function HomeContent() {
  const { user } = useAuth();
  const { addRecord, getTreatmentHistory } = useMedicalRecords();
  const { referralData } = useReferral();
  useFavorites();
  const { subscription, highlightStatus, activateHighlight, canUseHighlight } = useSubscription();
  const { getBTDistribution, getPendingBTDistribution, getRatingsByCustomer } = useRatings();
  useAssistantBT();
  const { mismatchSessions } = useVisitSessionPolling();
  const { disputes, createDispute, updateDispute, getDisputesByCustomer } = useDisputes();
  const { createRatingTask } = useRatingTasks();
  const insets = useSafeAreaInsets();
  const [showQRCode, setShowQRCode] = useState(false);
  const [showHairdresserSearch, setShowHairdresserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [nearbyHairdressers, setNearbyHairdressers] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannedCustomer, setScannedCustomer] = useState<any | null>(null);
  const [showCustomerMedicalRecord, setShowCustomerMedicalRecord] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [proposedAmount, setProposedAmount] = useState('');
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());
  const [technicalExpanded, setTechnicalExpanded] = useState(false);



  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'おはようございます';
    if (hour < 18) return 'こんにちは';
    return 'こんばんは';
  }, []);



  const handleQRCode = useCallback(() => {
    setShowQRCode(true);
  }, []);

  const handleQRScan = useCallback(async () => {
    if (!cameraPermission) return;

    if (!cameraPermission.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('エラー', 'カメラの使用許可が必要です');
        return;
      }
    }

    setShowQRScanner(true);
  }, [cameraPermission, requestCameraPermission]);

  if (!user) return null;

  const handleQRCodeScanned = async (data: string) => {
    if (isProcessingQR) {

      return;
    }
    





    setIsProcessingQR(true);
    setShowQRScanner(false);
    
    try {
      const validationResult = validateQRCode(data);
      
      if (!validationResult.isValid) {

        Alert.alert('エラー', validationResult.error || 'QRコードが無効です', [{
          text: 'OK',
          onPress: () => setIsProcessingQR(false)
        }]);
        return;
      }
      
      const qrData = validationResult.data as QRData;









      
      if (user?.role === 'hairdresser' && qrData.type === 'customer_qr') {


        
        const extractedCustomerData = {
          customerId: qrData.customerId || qrData.userId,
          customerName: qrData.customerName || qrData.userName,
          customerEmail: qrData.customerEmail,
        };
        




        
        if (!extractedCustomerData.customerName) {


          Alert.alert('エラー', '顧客名がQRコードに含まれていません', [{
            text: 'OK',
            onPress: () => setIsProcessingQR(false)
          }]);
          return;
        }
        

        setScannedCustomer(extractedCustomerData);
        setIsProcessingQR(false);
        

        setShowCustomerMedicalRecord(true);
      } else if (user?.role === 'customer' && qrData.type === 'hairdresser_qr') {


        
        const hairdresserData = {
          hairdresserId: qrData.hairdresserId || qrData.userId,
          hairdresserName: qrData.userName,
        };
        






        
        setIsProcessingQR(false);
        

        Alert.alert(
          '評価を送信',
          `${hairdresserData.hairdresserName}さんのサービスを評価しますか？`,
          [
            {
              text: 'キャンセル',
              style: 'cancel',
              onPress: () => {

              },
            },
            {
              text: '評価する',
              onPress: async () => {
                try {

                  
                  const taskId = await createRatingTask({
                    customerId: user.id,
                    customerName: user.name,
                    hairdresserId: hairdresserData.hairdresserId,
                    hairdresserName: hairdresserData.hairdresserName,
                    checkInDate: new Date().toISOString(),
                    status: 'pending',
                  });
                  


                  
                  router.push('/(tabs)/rating' as any);

                } catch (error) {



                  Alert.alert('エラー', '評価タスクの作成に失敗しました。もう一度お試しください。');
                }
              },
            },
          ]
        );
      } else {






        Alert.alert('エラー', `無効なQRコードです。\n\nQRタイプ: ${qrData.type}\nユーザー役割: ${user?.role}`, [{
          text: 'OK',
          onPress: () => setIsProcessingQR(false)
        }]);
      }
    } catch (error) {



      Alert.alert('エラー', 'QRコードの読み取りに失敗しました。形式が正しくありません。', [{
        text: 'OK',
        onPress: () => setIsProcessingQR(false)
      }]);
    }
  };

  const handleCheckIn = async () => {

    
    if (!user) {

      Alert.alert('エラー', 'ユーザー情報が取得できませんでした');
      return;
    }
    
    if (!scannedCustomer) {

      Alert.alert('エラー', '顧客情報が見つかりませんでした');
      return;
    }
    
    if (!scannedCustomer.customerId) {

      Alert.alert('エラー', '顧客IDが取得できませんでした');
      return;
    }
    
    if (!scannedCustomer.customerName) {

      Alert.alert('エラー', '顧客名が取得できませんでした');
      return;
    }
    
    try {
      const qrScanTime = new Date().toISOString();

      
      const newRecord = {
        customerId: scannedCustomer.customerId,
        customerName: scannedCustomer.customerName,
        customerEmail: scannedCustomer.customerEmail || undefined,
        hairdresserId: user.id,
        hairdresserName: user.name,
        status: 'unwritten' as const,
        notes: '来店処理により作成されました',
        qrScanTime: qrScanTime,
      };
      

      await addRecord(newRecord);

      
      const ratingTask = {
        customerId: scannedCustomer.customerId,
        customerName: scannedCustomer.customerName,
        hairdresserId: user.id,
        hairdresserName: user.name,
        checkInDate: new Date().toISOString(),
        status: 'pending' as const,
      };
      

      await createRatingTask(ratingTask);

      
      setShowCustomerMedicalRecord(false);
      setScannedCustomer(null);
      

      Alert.alert(
        '来店記録完了',
        'カルテ記入画面に移動します',
        [
          {
            text: 'OK',
            onPress: () => router.push('/(tabs)/requests' as any)
          }
        ]
      );
    } catch (error: any) {


      Alert.alert('エラー', `来店処理に失敗しました: ${error.message || '不明なエラー'}`);
    }
  };

  const filteredHairdressers = nearbyHairdressers.filter(hairdresser => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      hairdresser.name.toLowerCase().includes(query) ||
      hairdresser.workplace.toLowerCase().includes(query) ||
      hairdresser.specialties.some((specialty: string) => specialty.toLowerCase().includes(query)) ||
      hairdresser.selfIntroduction.toLowerCase().includes(query)
    );
  });

  const renderHairdresserItem = ({ item }: { item: any }) => (
    <View style={styles.hairdresserCard}>
      <View style={styles.hairdresserHeader}>
        <View style={styles.hairdresserInfo}>
          <Text style={styles.hairdresserName}>{item.name}</Text>
          <Text style={styles.hairdresserWorkplace}>{item.workplace}</Text>
          <View style={styles.ratingContainer}>
            <Star size={16} color="#D4AF37" fill="#D4AF37" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.distanceText}>• {item.distance}km</Text>
          </View>
          <Text style={styles.experienceText}>経験: {item.experience}</Text>
        </View>
        <View style={styles.locationIcon}>
          <MapPin size={24} color="#FF69B4" />
        </View>
      </View>
      
      <Text style={styles.hairdresserDescription}>{item.selfIntroduction}</Text>
      
      <View style={styles.specialtiesContainer}>
        {item.specialties.map((specialty: string, index: number) => (
          <View key={index} style={styles.specialtyTag}>
            <Text style={styles.specialtyText}>{specialty}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.availableSlotsContainer}>
        <Text style={styles.availableSlotsTitle}>空き時間:</Text>
        <View style={styles.slotsRow}>
          {item.availableSlots.map((slot: string, index: number) => (
            <View key={index} style={styles.slotTag}>
              <Text style={styles.slotText}>{slot}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.hairdresserActions}>
        <TouchableOpacity 
          style={styles.viewProfileButton}
          onPress={() => handleRequestMedicalRecord(item)}
        >
          <Text style={styles.viewProfileText}>カルテ申請</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookButton}>
          <Text style={styles.bookButtonText}>予約する</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleRequestMedicalRecord = (hairdresser: any) => {

    Alert.alert(
      'カルテ記入申請',
      `${hairdresser.name}さんにカルテ記入を申請しますか？\n\n申請が承認されると、施術後にカルテが共有され、評価とBTの受け渡しが行われます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '申請する', 
          onPress: () => {
            Alert.alert(
              '申請完了',
              `${hairdresser.name}さんにカルテ記入申請を送信しました。\n\n美容師が承認すると、施術後に以下が自動で行われます：\n• カルテ記入\n• 評価通知\n• BT受け渡し`,
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const handleRateService = () => {

    try {
      router.push('/(tabs)/rating' as any);
    } catch (error) {

      Alert.alert('エラー', '評価画面への移動に失敗しました');
    }
  };

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={styles.container}
    >
      <View style={[styles.balanceBar, { top: insets.top + 8 }]}>
        <WalletBalanceHeader />
      </View>
    <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop: insets.top + 60 }} showsVerticalScrollIndicator={false}>

        {user.role === 'hairdresser' && mismatchSessions.length > 0 && (() => {
          const firstMismatch = mismatchSessions[0];
          const dispute = disputes.find(d => 
            d.customerId === firstMismatch.customerId && 
            d.hairdresserId === firstMismatch.hairdresserId
          );
          
          if (dispute && (dispute.hairdresserSubmitted || dispute.status === 'resolved' || dispute.status === 'cancelled')) {
            return null;
          }
          
          return (
            <View style={styles.mismatchAlert}>
              <View style={styles.mismatchAlertHeader}>
                <AlertCircle size={24} color="#E74C3C" />
                <Text style={styles.mismatchAlertTitle}>金額不一致が{mismatchSessions.length}件あります</Text>
              </View>
              <Text style={styles.mismatchAlertText}>
                顧客との金額が一致していません。確認して対応してください。
              </Text>
              <View style={styles.mismatchAlertActions}>
                <TouchableOpacity
                  style={styles.mismatchAlertButtonSecondary}
                  onPress={async () => {
                    try {
                      let disputeId = dispute?.id;
                      
                      if (!disputeId || disputeId.startsWith('temp_')) {
                        disputeId = await createDispute({
                          visitSessionId: firstMismatch.id,
                          customerId: firstMismatch.customerId,
                          customerName: firstMismatch.customerName,
                          hairdresserId: firstMismatch.hairdresserId,
                          hairdresserName: firstMismatch.hairdresserName,
                          customerAmount: firstMismatch.customerAmount || 0,
                          hairdresserAmount: firstMismatch.hairdresserAmount || 0,
                        });
                      }
                      
                      if (disputeId) {
                        await updateDispute(disputeId, {
                          status: 'resolved',
                        });
                        Alert.alert('完了', '問題を解決済みにしました');
                      }
                    } catch (error) {

                      Alert.alert('エラー', '処理に失敗しました');
                    }
                  }}
                >
                  <Text style={styles.mismatchAlertButtonTextSecondary}>削除する</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mismatchAlertButton}
                  onPress={() => {
                    setSelectedDispute(dispute || {
                      ...firstMismatch,
                      id: 'temp_' + Date.now(),
                    });
                    setShowDisputeModal(true);
                  }}
                >
                  <Text style={styles.mismatchAlertButtonText}>確認する</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        {user.role === 'customer' && (() => {
          const customerDisputes = getDisputesByCustomer(user.id).filter(d => d.status === 'hairdresser_response');
          if (customerDisputes.length > 0) {
            const dispute = customerDisputes[0];
            return (
              <View style={styles.customerDisputeAlert}>
                <View style={styles.customerDisputeHeader}>
                  <AlertCircle size={24} color="#FF69B4" />
                  <Text style={styles.customerDisputeTitle}>取引金額の不一致</Text>
                </View>
                <Text style={styles.customerDisputeText}>
                  美容師が受領された金額は¥{dispute.hairdresserProposedAmount?.toLocaleString()}です。{"\n"}
                  この金額が正しければこのまま支払金額を変更し再評価できます。{"\n"}
                  支払金額が間違っている場合、運営に報告してください。
                </Text>
                <View style={styles.customerDisputeActions}>
                  <TouchableOpacity
                    style={styles.reportButton}
                    onPress={async () => {
                      try {
                        await updateDispute(dispute.id, {
                          status: 'customer_reported',
                          reportedBy: 'customer',
                        });
                        Alert.alert('報告完了', '運営に報告しました。運営が確認の上、対応いたします。');
                      } catch (error) {

                        Alert.alert('エラー', '報告に失敗しました');
                      }
                    }}
                  >
                    <Text style={styles.reportButtonText}>運営に報告</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => {
                      Alert.alert(
                        '金額を確認',
                        `美容師の提案金額 ¥${dispute.hairdresserProposedAmount?.toLocaleString()} を受け入れて再評価しますか？`,
                        [
                          { text: 'キャンセル', style: 'cancel' },
                          {
                            text: '再評価する',
                            onPress: () => {
                              router.push('/(tabs)/rating' as any);
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.acceptButtonText}>再評価</Text>
                  </TouchableOpacity>
                </View>

              </View>
            );
          }
          return null;
        })()}

        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user.name}さん</Text>
        </View>

        <View style={styles.statsContainer}>
          {user.role === 'hairdresser' ? (
            <React.Fragment>
              <View style={styles.statCard}>
                <Image 
                  source={require('@/assets/images/bp-logo.png')}
                  style={styles.btIcon}
                  resizeMode="contain"
                />
                <View style={styles.bpValueContainer}>
                  <Text style={styles.statValue}>{getBTDistribution(user.id).total}</Text>
                  {getPendingBTDistribution(user.id).total > 0 && (
                    <Text style={styles.pendingBPValue}>+{getPendingBTDistribution(user.id).total}（仮）</Text>
                  )}
                </View>
                <Text style={styles.statLabel}>総獲得BP</Text>
              </View>
              <View style={styles.statCard}>
                <Award size={24} color="#FF69B4" />
                <Text style={styles.statValue}>8</Text>
                <Text style={styles.statLabel}>評価数</Text>
              </View>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <View style={styles.statCard}>
                <Clock size={24} color="#D4AF37" />
                {(() => {
                  const history = getTreatmentHistory(user.id);
                  const latest = history[0];
                  if (!latest) {
                    return <Text style={styles.statValue}>-</Text>;
                  }
                  const d = new Date(latest.serviceDate);
                  const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
                  return <Text style={[styles.statValue, { fontSize: 14 }]}>{dateStr}</Text>;
                })()}
                <Text style={styles.statLabel}>最終来店日</Text>
              </View>
              <View style={styles.statCard}>
                <UserPlus size={24} color="#4CAF50" />
                <Text style={styles.statValue}>{referralData?.referredCustomers.length || 0}</Text>
                <Text style={styles.statLabel}>紹介した顧客</Text>
              </View>
              <View style={styles.statCard}>
                <Gift size={24} color="#FF69B4" />
                <Text style={styles.statValue}>{referralData?.hairdresserInviteCount || 0}</Text>
                <Text style={styles.statLabel}>美容師招待枠</Text>
              </View>
            </React.Fragment>
          )}
        </View>

        {user.role === 'hairdresser' && (() => {
          const btDistribution = getBTDistribution(user.id);
          const pendingBTDistribution = getPendingBTDistribution(user.id);
          
          
          const totalAssistantBT = btDistribution.assistant;
          
          return (
            <View style={styles.btBreakdownSection}>
              <View style={styles.btBreakdownTitleRow}>
                <Text style={styles.sectionTitle}>評価項目別獲得BP</Text>
                {subscription.tier === 'free' && (
                  <TouchableOpacity
                    style={styles.upgradeBadge}
                    onPress={() => router.push('/subscription' as any)}
                  >
                    <Sparkles size={14} color="#FFD700" />
                    <Text style={styles.upgradeBadgeText}>ハイライトを使う</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.btBreakdownCard}>
                {(() => {
                  const toBreakdown = (a: number, b: number, l1: string, l2: string) => {
                    const t = a + b;
                    if (t === 0) return undefined;
                    const p1 = Math.round((a / t) * 100);
                    return [{ label: l1, percent: p1 }, { label: l2, percent: 100 - p1 }];
                  };
                  const bd = btDistribution.breakdown;
                  const techItems: SkillItem[] = [
                    { id: 'cut', icon: Scissors, color: '#FF69B4', label: 'カット', value: btDistribution.cut, pending: pendingBTDistribution.cut, breakdown: toBreakdown(bd.cut.mens, bd.cut.ladies, 'メンズ', 'レディース') },
                    { id: 'color', icon: Palette, color: '#FF8C42', label: 'カラー', value: btDistribution.color, pending: pendingBTDistribution.color, breakdown: toBreakdown(bd.color.oneColor, bd.color.wColor, 'ワンカラー', 'Wカラー') },
                    { id: 'perm', icon: Waves, color: '#9B59B6', label: 'パーマ', value: btDistribution.perm, pending: pendingBTDistribution.perm, breakdown: toBreakdown(bd.perm.mens, bd.perm.ladies, 'メンズ', 'レディース') },
                    { id: 'straightening', icon: AlignJustify, color: '#3498DB', label: '縮毛矯正', value: btDistribution.straightening, pending: pendingBTDistribution.straightening },
                    { id: 'extensions', icon: Link, color: '#2ECC71', label: 'エクステ', value: btDistribution.extensions, pending: pendingBTDistribution.extensions },
                    { id: 'massage', icon: Hand, color: '#F1C40F', label: 'マッサージ', value: btDistribution.massage, pending: pendingBTDistribution.massage },
                  ].filter(item => isTechCategoryAvailable(item.id, user?.availableServices));
                  const techTotal = techItems.reduce((s, item) => s + item.value, 0);
                  const pendingTechTotal = techItems.reduce((s, item) => s + (item.pending || 0), 0);
                  const grandTotal = btDistribution.total;
                  return (
                    <>
                      <TouchableOpacity
                        style={[styles.btBreakdownItem, { borderLeftWidth: 3, borderLeftColor: '#FF69B4', paddingLeft: 12 }]}
                        onPress={() => setTechnicalExpanded(!technicalExpanded)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.btBreakdownHeader}>
                          <ChevronDown
                            size={16}
                            color="#FF69B4"
                            style={{ transform: [{ rotate: technicalExpanded ? '0deg' : '-90deg' }] }}
                          />
                          <Text style={[styles.btBreakdownLabel, { color: '#FF69B4', fontWeight: 'bold' as const }]}>技術力</Text>
                        </View>
                        <View style={styles.btBreakdownValueColumn}>
                          <View style={styles.btBreakdownValue}>
                            <Text style={[styles.btBreakdownAmount, { color: '#FF69B4' }]}>{techTotal}</Text>
                            <Text style={styles.btBreakdownUnit}>BP</Text>
                          </View>
                          {pendingTechTotal > 0 && (
                            <Text style={styles.pendingBPText}>+{pendingTechTotal}（仮）</Text>
                          )}
                        </View>
                      </TouchableOpacity>

                      {technicalExpanded && (
                        <View style={{ marginLeft: 8, marginBottom: 12 }}>
                          <TechnicalSkillChart items={techItems} total={techTotal} />
                        </View>
                      )}

                      <CategoryProgressBar
                        icon={Heart}
                        color="#FF69B4"
                        label="接客・カウンセリング"
                        value={btDistribution.service}
                        pending={pendingBTDistribution.service}
                        maxValue={grandTotal}
                      />

                      <CategoryProgressBar
                        icon={Clock}
                        color="#3498DB"
                        label="時間管理"
                        value={btDistribution.timeManagement}
                        pending={pendingBTDistribution.timeManagement}
                        maxValue={grandTotal}
                      />

                      <CategoryProgressBar
                        icon={Users}
                        color="#87CEEB"
                        label="アシスタント"
                        value={totalAssistantBT}
                        pending={pendingBTDistribution.assistant}
                        maxValue={grandTotal}
                      />
                    </>
                  );
                })()}

                <View style={styles.btTotalDivider} />

                <View style={styles.btTotalItem}>
                  <View style={styles.btTotalHeader}>
                    <Image source={require('@/assets/images/bp-logo.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
                    <Text style={styles.btTotalLabel}>全顧客から獲得</Text>
                  </View>
                  <View style={styles.btTotalValueColumn}>
                    <View style={styles.btTotalValue}>
                      <Text style={styles.btTotalAmount}>{btDistribution.total}</Text>
                      <Text style={styles.btTotalUnit}>BP</Text>
                    </View>
                    {pendingBTDistribution.total > 0 && (
                      <Text style={styles.pendingBPTotalText}>+{pendingBTDistribution.total}（仮）</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        })()}

        {user.role === 'hairdresser' && subscription.tier === 'premium' && (
          <View style={styles.highlightSection}>
            <Text style={styles.sectionTitle}>ハイライト機能</Text>
            
            <View style={styles.highlightCard}>
              <View style={styles.highlightHeader}>
                <Sparkles size={28} color="#FFD700" />
                <View style={styles.highlightInfo}>
                  <Text style={styles.highlightTitle}>おすすめ表示</Text>
                  <Text style={styles.highlightSubtitle}>月に1回6時間最上位表示</Text>
                </View>
              </View>

              {highlightStatus.isActive && highlightStatus.expiresAt ? (
                <View style={styles.highlightActive}>
                  <View style={styles.highlightActiveHeader}>
                    <Sparkles size={20} color="#FFD700" />
                    <Text style={styles.highlightActiveText}>ハイライト中</Text>
                  </View>
                  <Text style={styles.highlightActiveTime}>
                    終了時刻: {new Date(highlightStatus.expiresAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.highlightButton,
                      !canUseHighlight() && styles.highlightButtonDisabled
                    ]}
                    onPress={() => {
                      if (user?.id) {
                        activateHighlight(user.id);
                      }
                    }}
                    disabled={!canUseHighlight()}
                  >
                    <Sparkles size={20} color="white" />
                    <Text style={styles.highlightButtonText}>
                      {canUseHighlight() ? 'ハイライトを開始' : '本月使用済み'}
                    </Text>
                  </TouchableOpacity>
                  {highlightStatus.lastUsedDate && (
                    <Text style={styles.highlightLastUsed}>
                      最終使用日: {new Date(highlightStatus.lastUsedDate).toLocaleDateString('ja-JP')}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>クイックアクション</Text>
          
          {user.role === 'hairdresser' ? (
            <View style={styles.actionGrid}>
              <TouchableOpacity 
                style={styles.actionCard} 
                onPress={handleQRScan}
                testID="qr-scan-button"
              >
                <Camera size={32} color="#87CEEB" />
                <Text style={styles.actionTitle}>QRスキャン</Text>
                <Text style={styles.actionSubtitle}>顧客QRを読取</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard} 
                onPress={handleQRCode}
                testID="show-hairdresser-qr-button"
              >
                <User size={32} color="#4CAF50" />
                <Text style={styles.actionTitle}>マイQRコード</Text>
                <Text style={styles.actionSubtitle}>リファラルコード</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionGrid}>
              <TouchableOpacity 
                style={styles.actionCard} 
                onPress={handleQRCode}
                testID="show-qr-button"
              >
                <QrCode size={32} color="#87CEEB" />
                <Text style={styles.actionTitle}>マイQRコード</Text>
                <Text style={styles.actionSubtitle}>美容師に見せる</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard} 
                onPress={handleQRScan}
                testID="scan-hairdresser-qr-button"
              >
                <Camera size={32} color="#FF69B4" />
                <Text style={styles.actionTitle}>美容師を評価</Text>
                <Text style={styles.actionSubtitle}>QRで直接評価</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard} 
                onPress={() => {

                  router.push('/(tabs)/search' as any);
                }}
                testID="search-stylists-button"
              >
                <Search size={32} color="#4CAF50" />
                <Text style={styles.actionTitle}>美容師を探す</Text>
                <Text style={styles.actionSubtitle}>地図で検索</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard} 
                onPress={handleRateService}
                testID="rate-service-button"
              >
                <Star size={32} color="#D4AF37" />
                <Text style={styles.actionTitle}>評価を確認</Text>
                <Text style={styles.actionSubtitle}>評価タスク一覧</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>





        {user.role === 'customer' && (
          <View style={styles.referralSection}>
            <Text style={styles.sectionTitle}>紹介プログラム</Text>
            
            <View style={styles.referralCard}>
              <View style={styles.referralHeader}>
                <Gift size={32} color="#FF69B4" />
                <Text style={styles.referralTitle}>リファラルで特典獲得</Text>
              </View>

              <View style={styles.referralStats}>
                <View style={styles.referralStatItem}>
                  <Users size={20} color="#4CAF50" />
                  <Text style={styles.referralStatLabel}>紹介した顧客</Text>
                  <Text style={styles.referralStatValue}>{referralData?.referredCustomers.length || 0}人</Text>
                </View>

                <View style={styles.referralStatItem}>
                  <UserPlus size={20} color="#FF69B4" />
                  <Text style={styles.referralStatLabel}>招待した美容師</Text>
                  <Text style={styles.referralStatValue}>{referralData?.referredHairdressers.length || 0}人</Text>
                </View>

                <View style={styles.referralStatItem}>
                  <Award size={20} color="#D4AF37" />
                  <Text style={styles.referralStatLabel}>美容師招待枠</Text>
                  <Text style={styles.referralStatValue}>{referralData?.hairdresserInviteCount || 0}人</Text>
                </View>
              </View>

              <View style={styles.referralInfo}>
                <Text style={styles.referralInfoTitle}>💡 リファラルの特典</Text>
                <Text style={styles.referralInfoText}>
                  • 顧客を紹介すると美容師招待枠+1{"\n"}
                  • 招待した美容師のBT獲得でボーナス{"\n"}
                  • プレミアムプランで招待枠+3
                </Text>
              </View>

              <TouchableOpacity
                style={styles.referralButton}
                onPress={() => router.push('/(tabs)/referrals' as any)}
              >
                <Text style={styles.referralButtonText}>詳細を見る</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      <Modal
        visible={showQRCode}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRCode(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModal}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>
                {user.role === 'customer' ? 'マイQRコード' : '美容師QRコード'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowQRCode(false)}
              >
                <X size={24} color="#7F8C8D" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.qrCodeContainer}>
              <QRCodeComponent
                value={serializeQRData(
                  user.role === 'customer'
                    ? createCustomerQR({ id: user.id, name: user.name, email: user.email })
                    : createHairdresserQR({ id: user.id, name: user.name, hairdresserId: user.hairdresserId, workplaceName: user.workplaceName })
                )}
                size={250}
              />
            </View>
            
            <View style={styles.qrInfo}>
              <Text style={styles.qrInfoTitle}>
                QRコード情報
              </Text>
              <Text style={styles.qrInfoSubtitle}>
                {user.role === 'customer'
                  ? 'このQRコードを美容師にスキャンしてもらい、カルテ登録を行ってください'
                  : 'このQRコードは紹介（リファラル）登録や、アシスタント美容師のBT付与に使用します'
                }
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.shareQRButton}
              onPress={() => {

                setShowQRCode(false);
                const qrData = JSON.stringify({
                  type: user.role === 'customer' ? 'customer_qr' : 'hairdresser_qr',
                  customerId: user.role === 'customer' ? user.id : undefined,
                  hairdresserId: user.role === 'hairdresser' ? user.hairdresserId : undefined,
                  customerName: user.role === 'customer' ? user.name : undefined,
                  hairdresserName: user.role === 'hairdresser' ? user.name : undefined,
                  timestamp: new Date().toISOString()
                });

                Alert.alert(
                  '共有完了', 
                  user.role === 'customer' 
                    ? 'QRコードが準備されました。美容師にスキャンしてもらってください。'
                    : 'QRコードが顧客と共有されました。カルテ情報がクラウドで自動同期されます。',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.shareQRButtonText}>
                {user.role === 'customer' ? 'QRコードを表示' : 'QRコードを共有'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHairdresserSearch}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHairdresserSearch(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModal}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>美容師検索</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowHairdresserSearch(false);
                  setSearchQuery('');
                }}
              >
                <X size={24} color="#7F8C8D" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#7F8C8D" style={styles.searchInputIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="名前、地域、得意分野で検索"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#95A5A6"
              />
            </View>
            
            {userLocation && (
              <View style={styles.locationHeader}>
                <Navigation size={16} color="#FF69B4" />
                <Text style={styles.locationHeaderText}>
                  現在地から検索中... ({userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)})
                </Text>
              </View>
            )}
            
            <FlatList
              data={filteredHairdressers}
              renderItem={renderHairdresserItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.hairdresserList}
              ListEmptyComponent={
                <View style={styles.emptySearchResults}>
                  <Search size={48} color="#BDC3C7" />
                  <Text style={styles.emptySearchTitle}>検索結果がありません</Text>
                  <Text style={styles.emptySearchText}>
                    {searchQuery ? `"${searchQuery}"に一致する美容師が見つかりませんでした` : '美容師が見つかりませんでした'}
                  </Text>
                </View>
              }
            />
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
            <Text style={styles.scannerTitle}>
              {user?.role === 'hairdresser' ? '顧客QRコードをスキャン' : '美容師QRコードをスキャン'}
            </Text>
          </View>
          
          {Platform.OS !== 'web' ? (
            <CameraView
              style={styles.camera}
              facing={'back' as CameraType}
              onBarcodeScanned={(result) => {

                if (result.data && !isProcessingQR) {
                  handleQRCodeScanned(result.data);
                }
              }}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
                <Text style={styles.scannerInstructions}>
                  {user?.role === 'hairdresser'
                    ? '顧客のQRコードをフレーム内に合わせてください'
                    : '美容師のQRコードをフレーム内に合わせてください'}
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

                  if (user?.role === 'hairdresser') {

                    const mockCustomerData = createCustomerQR({
                      id: 'customer_test_' + Date.now(),
                      name: 'テスト顧客',
                      email: 'test.customer@example.com'
                    });

                    handleQRCodeScanned(serializeQRData(mockCustomerData));
                  } else {

                    const mockHairdresserData = createHairdresserQR({
                      id: 'hairdresser_test_' + Date.now(),
                      name: 'テスト美容師',
                      hairdresserId: 'hairdresser_test',
                      workplaceName: 'テスト美容室'
                    });

                    handleQRCodeScanned(serializeQRData(mockHairdresserData));
                  }
                }}
              >
                <Text style={styles.mockScanButtonText}>テストスキャン</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      <Modal
        visible={showCustomerMedicalRecord}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          setShowCustomerMedicalRecord(false);
          setScannedCustomer(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.customerRecordContainer}
        >
          <View style={styles.customerRecordHeader}>
            <TouchableOpacity
              style={styles.customerRecordCloseButton}
              onPress={() => {
                setShowCustomerMedicalRecord(false);
                setScannedCustomer(null);
              }}
            >
              <X size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.customerRecordTitle}>顧客カルテ</Text>
            <View style={styles.customerRecordHeaderSpacer} />
          </View>

          <ScrollView style={styles.customerRecordContent} showsVerticalScrollIndicator={false}>
            <View style={styles.customerInfoCard}>
              <View style={styles.customerInfoHeader}>
                <User size={32} color="#FF69B4" />
                <View style={styles.customerInfoText}>
                  <Text style={styles.customerName}>{scannedCustomer?.customerName || '顧客'}</Text>
                  <Text style={styles.customerId}>ID: {scannedCustomer?.customerId}</Text>
                  {scannedCustomer?.customerEmail && (
                    <Text style={styles.customerEmail}>{scannedCustomer.customerEmail}</Text>
                  )}
                </View>
              </View>
            </View>

            {scannedCustomer && getTreatmentHistory(scannedCustomer.customerId).length > 0 && (
              <View style={styles.medicalHistorySection}>
                <Text style={styles.medicalHistoryTitle}>📋 施術履歴</Text>
                {getTreatmentHistory(scannedCustomer.customerId).slice(0, 5).map((history) => {
                  const isExpanded = expandedHistoryIds.has(history.id);
                  const toggleExpand = () => {
                    const newSet = new Set(expandedHistoryIds);
                    if (isExpanded) {
                      newSet.delete(history.id);
                    } else {
                      newSet.add(history.id);
                    }
                    setExpandedHistoryIds(newSet);
                  };

                  const isOwnRecord = history.hairdresserId === user?.id;

                  const renderMenuDetails = (menuType: string, details: any) => {
                    if (!details) return null;

                    switch (menuType) {
                      case 'cut':
                        return (
                          <View style={styles.detailsSection}>
                            <Text style={styles.detailsLabel}>【カット詳細】</Text>
                            {details.type && <Text style={styles.detailsText}>タイプ: {details.type}</Text>}
                            {details.cmCut && <Text style={styles.detailsText}>カット長: {details.cmCut}</Text>}
                            {details.thinning && (
                              <Text style={styles.detailsText}>すきバサミ: あり{details.thinningDetails ? ` (${details.thinningDetails})` : ''}</Text>
                            )}
                            {details.hasNaturalCurl && (
                              <Text style={styles.detailsText}>天然パーマ: あり{details.curlDetails ? ` (${details.curlDetails})` : ''}</Text>
                            )}
                          </View>
                        );

                      case 'color':
                        return (
                          <View style={styles.detailsSection}>
                            <Text style={styles.detailsLabel}>【カラー詳細】</Text>
                            {details.applicationType && <Text style={styles.detailsText}>塗布タイプ: {details.applicationType}</Text>}
                            {details.retouchCm && <Text style={styles.detailsText}>リタッチ範囲: {details.retouchCm}</Text>}
                            {(isOwnRecord ? details.brand : details.publicBrand || details.brand) && (
                              <Text style={styles.detailsText}>ブランド: {isOwnRecord ? details.brand : details.publicBrand || details.brand}</Text>
                            )}
                            {(isOwnRecord ? details.selection : details.publicSelection || details.selection) && (
                              <Text style={styles.detailsText}>商材名: {isOwnRecord ? details.selection : details.publicSelection || details.selection}</Text>
                            )}
                            {(isOwnRecord ? details.secondLiquidConcentration : details.publicSecondLiquidConcentration || details.secondLiquidConcentration) && (
                              <Text style={styles.detailsText}>2剤濃度: {isOwnRecord ? details.secondLiquidConcentration : details.publicSecondLiquidConcentration || details.secondLiquidConcentration}</Text>
                            )}
                            {(isOwnRecord ? details.secondLiquidRatio : details.publicSecondLiquidRatio || details.secondLiquidRatio) && (
                              <Text style={styles.detailsText}>2剤比率: {isOwnRecord ? details.secondLiquidRatio : details.publicSecondLiquidRatio || details.secondLiquidRatio}</Text>
                            )}
                            {details.processingTime && <Text style={styles.detailsText}>放置時間: {details.processingTime}</Text>}
                            {details.hasBleach && (
                              <View style={styles.subDetailsSection}>
                                <Text style={styles.detailsText}>ブリーチ: あり</Text>
                                {(isOwnRecord ? details.bleachBrand : details.publicBleachBrand || details.bleachBrand) && (
                                  <Text style={styles.detailsText}>  ブランド: {isOwnRecord ? details.bleachBrand : details.publicBleachBrand || details.bleachBrand}</Text>
                                )}
                                {(isOwnRecord ? details.bleachSelection : details.publicBleachSelection || details.bleachSelection) && (
                                  <Text style={styles.detailsText}>  商材名: {isOwnRecord ? details.bleachSelection : details.publicBleachSelection || details.bleachSelection}</Text>
                                )}
                              </View>
                            )}
                            {details.hasTreatment && details.treatmentDetails && (
                              <Text style={styles.detailsText}>トリートメント: {details.treatmentDetails}</Text>
                            )}
                            {details.areas && details.areas.length > 0 && (
                              <View style={styles.subDetailsSection}>
                                <Text style={styles.detailsText}>部分塗布:</Text>
                                {details.areas.map((area: string, idx: number) => (
                                  <Text key={idx} style={styles.detailsText}>  • {area}</Text>
                                ))}
                              </View>
                            )}
                          </View>
                        );

                      case 'perm':
                        return (
                          <View style={styles.detailsSection}>
                            <Text style={styles.detailsLabel}>【パーマ詳細】</Text>
                            {details.type && <Text style={styles.detailsText}>タイプ: {details.type}</Text>}
                            {details.windingMethod && <Text style={styles.detailsText}>巻き方: {details.windingMethod}</Text>}
                            {(isOwnRecord ? details.brand : details.publicBrand || details.brand) && (
                              <Text style={styles.detailsText}>ブランド: {isOwnRecord ? details.brand : details.publicBrand || details.brand}</Text>
                            )}
                            {(isOwnRecord ? details.selection : details.publicSelection || details.selection) && (
                              <Text style={styles.detailsText}>商材名: {isOwnRecord ? details.selection : details.publicSelection || details.selection}</Text>
                            )}
                            {details.firstLiquidTime && <Text style={styles.detailsText}>1剤放置時間: {details.firstLiquidTime}</Text>}
                            {details.secondLiquidTime && <Text style={styles.detailsText}>2剤放置時間: {details.secondLiquidTime}</Text>}
                            {details.hasTreatment && details.treatmentDetails && (
                              <Text style={styles.detailsText}>トリートメント: {details.treatmentDetails}</Text>
                            )}
                          </View>
                        );

                      case 'straightening':
                        return (
                          <View style={styles.detailsSection}>
                            <Text style={styles.detailsLabel}>【縮毛矯正詳細】</Text>
                            {details.applicationType && <Text style={styles.detailsText}>塗布タイプ: {details.applicationType}</Text>}
                            {details.retouchCm && <Text style={styles.detailsText}>リタッチ範囲: {details.retouchCm}</Text>}
                            {(isOwnRecord ? details.brand : details.publicBrand || details.brand) && (
                              <Text style={styles.detailsText}>ブランド: {isOwnRecord ? details.brand : details.publicBrand || details.brand}</Text>
                            )}
                            {(isOwnRecord ? details.selection : details.publicSelection || details.selection) && (
                              <Text style={styles.detailsText}>商材名: {isOwnRecord ? details.selection : details.publicSelection || details.selection}</Text>
                            )}
                            {details.firstLiquidTime && <Text style={styles.detailsText}>1剤放置時間: {details.firstLiquidTime}</Text>}
                            {details.secondLiquidTime && <Text style={styles.detailsText}>2剤放置時間: {details.secondLiquidTime}</Text>}
                            {details.hasTreatment && details.treatmentDetails && (
                              <Text style={styles.detailsText}>トリートメント: {details.treatmentDetails}</Text>
                            )}
                            {details.areas && details.areas.length > 0 && (
                              <View style={styles.subDetailsSection}>
                                <Text style={styles.detailsText}>部分施術:</Text>
                                {details.areas.map((area: string, idx: number) => (
                                  <Text key={idx} style={styles.detailsText}>  • {area}</Text>
                                ))}
                              </View>
                            )}
                          </View>
                        );

                      case 'treatment':
                        return (
                          <View style={styles.detailsSection}>
                            <Text style={styles.detailsLabel}>【トリートメント詳細】</Text>
                            {details.type && <Text style={styles.detailsText}>タイプ: {details.type}</Text>}
                            {(isOwnRecord ? details.productName : details.publicProductName || details.productName) && (
                              <Text style={styles.detailsText}>商品名: {isOwnRecord ? details.productName : details.publicProductName || details.productName}</Text>
                            )}
                          </View>
                        );

                      case 'headspa':
                        return (
                          <View style={styles.detailsSection}>
                            <Text style={styles.detailsLabel}>【ヘッドスパ詳細】</Text>
                            {details.notes && <Text style={styles.detailsText}>{details.notes}</Text>}
                          </View>
                        );

                      case 'extension':
                        return (
                          <View style={styles.detailsSection}>
                            <Text style={styles.detailsLabel}>【エクステ詳細】</Text>
                            {details.type && <Text style={styles.detailsText}>タイプ: {details.type === 'braiding' ? '編み込み' : details.type === 'seal' ? 'シール' : details.type === 'feather' ? '羽' : details.type === 'pull' ? 'プル' : details.type}</Text>}
                            {details.otherType && <Text style={styles.detailsText}>その他タイプ: {details.otherType}</Text>}
                            {details.color && <Text style={styles.detailsText}>カラー: {details.color}</Text>}
                            {details.quantity && <Text style={styles.detailsText}>本数: {details.quantity}</Text>}
                            {details.quality && <Text style={styles.detailsText}>毛質: {details.quality}</Text>}
                            {details.details && <Text style={styles.detailsText}>詳細: {details.details}</Text>}
                          </View>
                        );

                      default:
                        return null;
                    }
                  };

                  return (
                    <View key={history.id} style={styles.historyItemCard}>
                      <View style={styles.historyItemHeader}>
                        <View style={styles.historyItemHeaderLeft}>
                          <Text style={styles.historyItemDate}>{history.serviceDate}</Text>
                          <Text style={styles.historyItemHairdresser}>施術者: {history.hairdresserName}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.expandButton}
                          onPress={toggleExpand}
                        >
                          <Text style={styles.expandButtonText}>{isExpanded ? '閉じる' : '詳細'}</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.historyItemMenus}>
                        {Array.isArray(history.menus) ? history.menus.map(m => {
                          const labels: Record<string, string> = {
                            cut: 'カット',
                            color: 'カラー',
                            perm: 'パーマ',
                            straightening: '縮毛矯正',
                            treatment: 'トリートメント',
                            headspa: 'ヘッドスパ',
                            extension: 'エクステ'
                          };
                          return labels[m] || m;
                        }).join(', ') : '-'}
                      </Text>
                      {!isExpanded && history.notes && (
                        <Text style={styles.historyItemNotes} numberOfLines={2}>{history.notes}</Text>
                      )}

                      {isExpanded && (
                        <View style={styles.expandedDetails}>
                          {history.menus.map((menu) => {
                            const details = history.menuDetails?.[menu as keyof typeof history.menuDetails];
                            return renderMenuDetails(menu, details);
                          })}
                          {history.notes && (
                            <View style={styles.detailsSection}>
                              <Text style={styles.detailsLabel}>【メモ】</Text>
                              <Text style={styles.detailsText}>{history.notes}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
                {getTreatmentHistory(scannedCustomer.customerId).length > 5 && (
                  <Text style={styles.moreHistoryText}>
                    ...他 {getTreatmentHistory(scannedCustomer.customerId).length - 5} 件
                  </Text>
                )}
              </View>
            )}
            
            {scannedCustomer && getTreatmentHistory(scannedCustomer.customerId).length === 0 && (
              <View style={styles.medicalHistorySection}>
                <Text style={styles.medicalHistoryTitle}>施術履歴</Text>
                <View style={styles.medicalHistoryCard}>
                  <Text style={styles.noHistoryText}>この顧客の施術履歴はまだありません</Text>
                </View>
              </View>
            )}

            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>💡 カルテ記入の流れ</Text>
              <Text style={styles.instructionText}>
                1. 来店を記録{"\n"}
                2. カルテを記入{"\n"}
                3. 顧客に評価通知が送信{"\n"}
                4. 顧客が評価を完了{"\n"}
                5. BTが付与
              </Text>
            </View>

          </ScrollView>

          <View style={styles.customerRecordActions}>
            <TouchableOpacity
              style={styles.checkInButtonFull}
              onPress={handleCheckIn}
            >
              <Text style={styles.checkInButtonText}>来店を記録</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showMapView}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowMapView(false)}
      >
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity
              style={styles.mapCloseButton}
              onPress={() => setShowMapView(false)}
            >
              <X size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.mapTitle}>美容師の位置</Text>
            <View style={styles.mapHeaderSpacer} />
          </View>
          
          {Platform.OS !== 'web' && userLocation ? (
            <View style={styles.mapLoadingContainer}>
              <Text style={styles.mapLoadingText}>地図を読み込み中...</Text>
            </View>
          ) : Platform.OS !== 'web' && !userLocation ? (
            <View style={styles.mapLoadingContainer}>
              <Text style={styles.mapLoadingText}>位置情報を取得中...</Text>
            </View>
          ) : (
            <View style={styles.webMapPlaceholder}>
              <MapPin size={80} color="#FF69B4" />
              <Text style={styles.webMapTitle}>地図表示</Text>
              <Text style={styles.webMapText}>
                Webでは地図機能は制限されています。\n
                モバイルアプリでは以下の美容師の位置が表示されます：
              </Text>
              
              <ScrollView style={styles.webMapList} showsVerticalScrollIndicator={false}>
                {nearbyHairdressers.map((hairdresser) => (
                  <View key={hairdresser.id} style={styles.webMapItem}>
                    <View style={styles.webMapItemHeader}>
                      <MapPin size={16} color="#FF69B4" />
                      <Text style={styles.webMapItemName}>{hairdresser.name}</Text>
                    </View>
                    <Text style={styles.webMapItemAddress}>{hairdresser.address}</Text>
                    <Text style={styles.webMapItemCoords}>
                      座標: {hairdresser.latitude.toFixed(6)}, {hairdresser.longitude.toFixed(6)}
                    </Text>
                    <View style={styles.webMapItemRating}>
                      <Star size={14} color="#D4AF37" fill="#D4AF37" />
                      <Text style={styles.webMapItemRatingText}>{hairdresser.rating}</Text>
                      <Text style={styles.webMapItemDistance}>• {hairdresser.distance}km</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          
          {Platform.OS !== 'web' && (
            <View style={styles.mapLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF69B4' }]} />
                <Text style={styles.legendText}>美容師</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>現在地</Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <Modal
        visible={showDisputeModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowDisputeModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.disputeModalContainer}
        >
          <View style={styles.disputeModalHeader}>
            <TouchableOpacity
              style={styles.disputeModalCloseButton}
              onPress={() => {
                setShowDisputeModal(false);
                setSelectedDispute(null);
                setProposedAmount('');
                setReceiptPhotoUrl('');
              }}
            >
              <X size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.disputeModalTitle}>金額不一致の確認</Text>
            <View style={styles.disputeModalHeaderSpacer} />
          </View>

          <ScrollView style={styles.disputeModalContent} showsVerticalScrollIndicator={false}>
            {selectedDispute && (
              <>
                <View style={styles.disputeInfoCard}>
                  <View style={styles.disputeInfoHeader}>
                    <AlertCircle size={32} color="#E74C3C" />
                    <View style={styles.disputeInfoText}>
                      <Text style={styles.disputeInfoTitle}>金額の不一致が検出されました</Text>
                      <Text style={styles.disputeInfoSubtitle}>顧客: {selectedDispute.customerName}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.amountComparisonCard}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>顧客が入力した金額:</Text>
                    <Text style={styles.amountValue}>¥{typeof selectedDispute.customerAmount === 'number' ? selectedDispute.customerAmount.toLocaleString() : '0'}</Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>あなたが入力した金額:</Text>
                    <Text style={styles.amountValue}>¥{typeof selectedDispute.hairdresserAmount === 'number' ? selectedDispute.hairdresserAmount.toLocaleString() : '0'}</Text>
                  </View>
                  <View style={styles.amountDivider} />
                  <View style={styles.amountRow}>
                    <Text style={styles.amountDiffLabel}>差額:</Text>
                    <Text style={styles.amountDiffValue}>
                      ¥{Math.abs((selectedDispute.customerAmount || 0) - (selectedDispute.hairdresserAmount || 0)).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.disputeActionCard}>
                  <Text style={styles.disputeActionTitle}>対応方法を選択してください</Text>
                  <Text style={styles.disputeActionSubtitle}>
                    正しい金額を確認し、必要に応じて領収書の写真をアップロードしてください。
                  </Text>
                </View>

                <View style={styles.proposedAmountSection}>
                  <Text style={styles.proposedAmountLabel}>正しい受領金額（円）</Text>
                  <View style={styles.proposedAmountInputWrapper}>
                    <Text style={styles.proposedAmountCurrency}>¥</Text>
                    <TextInput
                      style={styles.proposedAmountInput}
                      placeholder="例: 8000"
                      value={proposedAmount}
                      onChangeText={setProposedAmount}
                      keyboardType="number-pad"
                      placeholderTextColor="#95A5A6"
                    />
                  </View>
                  {proposedAmount && parseInt(proposedAmount) > 0 && (
                    <View style={styles.btEstimateCard}>
                      <Text style={styles.btEstimateLabel}>獲得予定BT</Text>
                      <Text style={styles.btEstimateValue}>{Math.floor(parseInt(proposedAmount) / 1000)} BT</Text>
                    </View>
                  )}
                </View>

                <View style={styles.receiptUploadSection}>
                  <Text style={styles.receiptUploadLabel}>領収書の写真（必須）</Text>
                  <Text style={styles.receiptUploadSubtitle}>
                    金額の証拠として領収書やレシートの写真をアップロードしてください
                  </Text>
                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={async () => {
                      try {
                        setIsUploadingPhoto(true);

                        
                        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        
                        if (!permissionResult.granted) {
                          Alert.alert('許可が必要です', 'フォトライブラリへのアクセス許可が必要です。');
                          setIsUploadingPhoto(false);
                          return;
                        }

                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ['images'],
                          allowsEditing: true,
                          quality: 0.8,
                        });

                        if (!result.canceled && result.assets[0]) {
                          const imageUri = result.assets[0].uri;

                          setReceiptPhotoUrl(imageUri);
                          Alert.alert('成功', '写真が選択されました');
                        }
                      } catch (error) {

                        Alert.alert('エラー', '写真の選択に失敗しました');
                      } finally {
                        setIsUploadingPhoto(false);
                      }
                    }}
                    disabled={isUploadingPhoto}
                  >
                    <Upload size={24} color="#87CEEB" />
                    <Text style={styles.uploadButtonText}>
                      {isUploadingPhoto ? 'アップロード中...' : '写真をアップロード'}
                    </Text>
                  </TouchableOpacity>
                  {receiptPhotoUrl && (
                    <View style={styles.uploadedPreview}>
                      <Image 
                        source={{ uri: receiptPhotoUrl }} 
                        style={styles.receiptPreviewImage}
                        resizeMode="cover"
                      />
                      <View style={styles.uploadedInfo}>
                        <CheckCircle size={20} color="#4CAF50" />
                        <Text style={styles.uploadedText}>写真がアップロードされました</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => {
                          setReceiptPhotoUrl('');
                          Alert.alert('削除完了', '写真が削除されました');
                        }}
                      >
                        <X size={16} color="#E74C3C" />
                        <Text style={styles.removePhotoText}>削除</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.disputeInfoNote}>
                  <Text style={styles.disputeInfoNoteTitle}>💡 注意事項</Text>
                  <Text style={styles.disputeInfoNoteText}>
                    • 正しい金額と領収書の写真を提出してください{'\n'}
                    • 顧客に確認メッセージが送信されます{' \n'}
                    • 顧客が金額を承認すると、BTが付与されます{' \n'}
                    • 顧客が承認しない場合、運営に報告されます
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.disputeModalActions}>
            <TouchableOpacity
              style={styles.cancelDisputeButton}
              onPress={() => {
                setShowDisputeModal(false);
                setSelectedDispute(null);
                setProposedAmount('');
                setReceiptPhotoUrl('');
              }}
            >
              <Text style={styles.cancelDisputeButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitDisputeButton,
                (!proposedAmount || parseInt(proposedAmount) <= 0 || !receiptPhotoUrl) && styles.submitDisputeButtonDisabled
              ]}
              onPress={async () => {
                if (!proposedAmount || parseInt(proposedAmount) <= 0) {
                  Alert.alert('エラー', '正しい金額を入力してください');
                  return;
                }

                if (!receiptPhotoUrl) {
                  Alert.alert('エラー', '領収書の写真をアップロードしてください');
                  return;
                }

                if (!selectedDispute) {
                  Alert.alert('エラー', '不一致情報が見つかりません');
                  return;
                }

                try {




                  let disputeId = selectedDispute.id;
                  
                  if (!disputeId || disputeId.startsWith('temp_')) {

                    disputeId = await disputes.find(d => 
                      d.customerId === selectedDispute.customerId && 
                      d.hairdresserId === selectedDispute.hairdresserId &&
                      d.status === 'pending'
                    )?.id || '';

                    if (!disputeId) {
                      const mismatchSession = mismatchSessions.find(s =>
                        s.customerId === selectedDispute.customerId &&
                        s.hairdresserId === selectedDispute.hairdresserId
                      );

                      if (mismatchSession) {
                        disputeId = await createDispute({
                          visitSessionId: mismatchSession.id,
                          customerId: mismatchSession.customerId,
                          customerName: mismatchSession.customerName,
                          hairdresserId: mismatchSession.hairdresserId,
                          hairdresserName: mismatchSession.hairdresserName,
                          customerAmount: mismatchSession.customerAmount || 0,
                          hairdresserAmount: mismatchSession.hairdresserAmount || 0,
                        });

                      }
                    }
                  }

                  if (disputeId) {
                    await updateDispute(disputeId, {
                      hairdresserProposedAmount: parseInt(proposedAmount),
                      receiptPhotoUrl: receiptPhotoUrl || undefined,
                      status: 'hairdresser_response',
                      hairdresserSubmitted: true,
                    });


                    Alert.alert(
                      '送信完了',
                      `正しい金額（¥${parseInt(proposedAmount).toLocaleString()}）を顧客に送信しました。\n\n顧客が確認すると、BTが付与されます。`,
                      [{ text: 'OK' }]
                    );

                    setShowDisputeModal(false);
                    setSelectedDispute(null);
                    setProposedAmount('');
                    setReceiptPhotoUrl('');
                  } else {
                    throw new Error('Dispute IDが取得できませんでした');
                  }
                } catch (error) {

                  Alert.alert('エラー', '金額修正の送信に失敗しました');
                }
              }}
              disabled={!proposedAmount || parseInt(proposedAmount) <= 0 || !receiptPhotoUrl}
            >
              <Send size={20} color="white" />
              <Text style={styles.submitDisputeButtonText}>顧客に送信</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  balanceBar: {
    position: 'absolute' as const,
    right: 16,
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerMainContent: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  walletBalanceContainer: {
    marginTop: 4,
  },
  welcomeSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 30,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bpValueContainer: {
    alignItems: 'center',
  },
  pendingBPValue: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600' as const,
    marginTop: 2,
  },
  btIcon: {
    width: 32,
    height: 32,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  quickActions: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 12,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  favoriteCustomersSection: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  customerListScrollView: {
    maxHeight: 400,
  },
  customerList: {
    gap: 12,
  },
  customerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  customerDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 4,
  },
  customerDateLabel: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  customerDateValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2C3E50',
  },
  emptyCustomerState: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyCustomerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCustomerText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    lineHeight: 20,
  },
  referralSection: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  referralCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  referralTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  referralStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  referralStatItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  referralStatLabel: {
    fontSize: 11,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  referralStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  referralInfo: {
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
  },
  referralInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#87CEEB',
    marginBottom: 8,
  },
  referralInfoText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 20,
  },
  referralButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  referralButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#95A5A6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  closeButton: {
    padding: 4,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCodePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  qrCodeText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 8,
  },
  qrInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  qrInfoSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
  shareQRButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareQRButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#95A5A6',
  },
  searchModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    height: '85%',
    marginTop: 'auto',
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchInputIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    color: '#2C3E50',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  locationHeaderText: {
    fontSize: 14,
    color: '#FF69B4',
    flex: 1,
  },
  hairdresserList: {
    gap: 16,
  },
  hairdresserCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.1)',
  },
  hairdresserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  hairdresserInfo: {
    flex: 1,
  },
  hairdresserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  hairdresserWorkplace: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  experienceText: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
  },
  distanceText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  locationIcon: {
    padding: 8,
  },
  hairdresserDescription: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    marginBottom: 12,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  specialtyTag: {
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
  },
  specialtyText: {
    fontSize: 12,
    color: '#FF69B4',
    fontWeight: '500',
  },
  availableSlotsContainer: {
    marginBottom: 16,
  },
  availableSlotsTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 6,
    fontWeight: '500',
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  slotTag: {
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
  },
  slotText: {
    fontSize: 11,
    color: '#87CEEB',
    fontWeight: '500',
  },
  hairdresserActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewProfileButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF69B4',
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF69B4',
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#FF69B4',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
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
  mapContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  mapHeader: {
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
  mapCloseButton: {
    padding: 8,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  mapHeaderSpacer: {
    width: 40,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  mapLoadingText: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 24,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  webMapPlaceholder: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  webMapTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  webMapText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  webMapList: {
    flex: 1,
    width: '100%',
  },
  webMapItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  webMapItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  webMapItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  webMapItemAddress: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  webMapItemCoords: {
    fontSize: 12,
    color: '#95A5A6',
    marginBottom: 8,
  },
  webMapItemRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  webMapItemRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
  },
  webMapItemDistance: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  emptySearchResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptySearchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySearchText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  customerRecordContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  customerRecordHeader: {
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
  customerRecordCloseButton: {
    padding: 8,
  },
  customerRecordTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  customerRecordHeaderSpacer: {
    width: 40,
  },
  customerRecordContent: {
    flex: 1,
    padding: 20,
  },
  customerInfoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  customerInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  customerInfoText: {
    flex: 1,
  },
  customerId: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  receivedAmountSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  receivedAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  receivedAmountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
  },
  receivedAmountCurrency: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7F8C8D',
    marginRight: 8,
  },
  receivedAmountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    paddingVertical: 16,
  },
  btEstimateCard: {
    marginTop: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    alignItems: 'center',
  },
  btEstimateLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  btEstimateValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 8,
  },
  btEstimateNote: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  medicalHistorySection: {
    marginBottom: 20,
  },
  medicalHistoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  medicalHistoryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  noHistoryText: {
    fontSize: 14,
    color: '#95A5A6',
  },
  historyItemCard: {
    backgroundColor: 'rgba(135, 206, 235, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.15)',
  },
  historyItemHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  historyItemHeaderLeft: {
    flex: 1,
  },
  historyItemDate: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 2,
  },
  historyItemHairdresser: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  historyItemMenus: {
    fontSize: 13,
    color: '#3498DB',
    marginBottom: 4,
    fontWeight: '600' as const,
  },
  historyItemNotes: {
    fontSize: 12,
    color: '#7F8C8D',
    lineHeight: 16,
  },
  expandButton: {
    backgroundColor: '#87CEEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  expandButtonText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'white',
  },
  expandedDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(135, 206, 235, 0.2)',
  },
  detailsSection: {
    marginBottom: 12,
  },
  detailsLabel: {
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#FF69B4',
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 12,
    color: '#2C3E50',
    lineHeight: 18,
    marginBottom: 2,
  },
  subDetailsSection: {
    marginLeft: 8,
    marginTop: 4,
  },
  moreHistoryText: {
    fontSize: 12,
    color: '#87CEEB',
    textAlign: 'center',
    marginTop: 4,
  },
  instructionCard: {
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
    marginBottom: 20,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#87CEEB',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 22,
  },
  customerRecordActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  checkInButton: {
    flex: 1,
    backgroundColor: '#87CEEB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkInButtonFull: {
    flex: 1,
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  writeRecordButton: {
    flex: 1,
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  writeRecordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  btBreakdownSection: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  btBreakdownTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  upgradeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
  },
  btBreakdownCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  btBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  btBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btBreakdownLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2C3E50',
  },
  btBreakdownValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  btBreakdownValueColumn: {
    alignItems: 'flex-end',
  },
  pendingBPText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600' as const,
    marginTop: 2,
  },
  btBreakdownAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  btBreakdownUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  btTotalDivider: {
    height: 2,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  btTotalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  btTotalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  btTotalValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  btTotalValueColumn: {
    alignItems: 'flex-end',
  },
  pendingBPTotalText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '700' as const,
    marginTop: 4,
  },
  btTotalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  btTotalUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
  },
  highlightSection: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  highlightCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  highlightInfo: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  highlightSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  highlightButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  highlightButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  highlightButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  highlightLastUsed: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  highlightActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  highlightActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  highlightActiveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  highlightActiveTime: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  mismatchAlert: {
    backgroundColor: '#FFF5F5',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E74C3C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mismatchAlertHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
  },
  mismatchAlertTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#E74C3C',
    flex: 1,
  },
  mismatchAlertText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    marginBottom: 16,
  },
  mismatchAlertActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  mismatchAlertButton: {
    flex: 1,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  mismatchAlertButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  mismatchAlertButtonSecondary: {
    flex: 1,
    backgroundColor: '#7F8C8D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  mismatchAlertButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  disputeModalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  disputeModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  disputeModalCloseButton: {
    padding: 8,
  },
  disputeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  disputeModalHeaderSpacer: {
    width: 40,
  },
  disputeModalContent: {
    flex: 1,
    padding: 20,
  },
  disputeInfoCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E74C3C',
  },
  disputeInfoHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  disputeInfoText: {
    flex: 1,
  },
  disputeInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#E74C3C',
    marginBottom: 4,
  },
  disputeInfoSubtitle: {
    fontSize: 14,
    color: '#2C3E50',
  },
  amountComparisonCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  amountRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    flex: 1,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  amountDivider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 12,
  },
  amountDiffLabel: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#E74C3C',
  },
  amountDiffValue: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#E74C3C',
  },
  disputeActionCard: {
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
  },
  disputeActionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#87CEEB',
    marginBottom: 8,
  },
  disputeActionSubtitle: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  proposedAmountSection: {
    marginBottom: 20,
  },
  proposedAmountLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 12,
  },
  proposedAmountInputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
  },
  proposedAmountCurrency: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#7F8C8D',
    marginRight: 8,
  },
  proposedAmountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#2C3E50',
    paddingVertical: 16,
  },
  receiptUploadSection: {
    marginBottom: 20,
  },
  receiptUploadLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  receiptUploadSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 12,
    lineHeight: 18,
  },
  uploadButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#87CEEB',
    borderStyle: 'dashed' as const,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#87CEEB',
  },
  uploadedPreview: {
    marginTop: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  receiptPreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  uploadedInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  uploadedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500' as const,
  },
  removePhotoButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  removePhotoText: {
    fontSize: 13,
    color: '#E74C3C',
    fontWeight: '600' as const,
  },
  disputeInfoNote: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.3)',
  },
  disputeInfoNoteTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#F39C12',
    marginBottom: 8,
  },
  disputeInfoNoteText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 20,
  },
  disputeModalActions: {
    flexDirection: 'row' as const,
    gap: 12,
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  cancelDisputeButton: {
    flex: 1,
    backgroundColor: '#7F8C8D',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  cancelDisputeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  submitDisputeButton: {
    flex: 2,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  submitDisputeButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  submitDisputeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  customerDisputeAlert: {
    backgroundColor: 'white',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FF69B4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  customerDisputeHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
  },
  customerDisputeTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#FF69B4',
    flex: 1,
  },
  customerDisputeText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 22,
    marginBottom: 16,
  },
  customerDisputeActions: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 12,
  },
  reportButton: {
    flex: 1,
    backgroundColor: '#7F8C8D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  viewReceiptButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#87CEEB',
  },
  viewReceiptText: {
    fontSize: 13,
    color: '#87CEEB',
    fontWeight: '500' as const,
  },
});