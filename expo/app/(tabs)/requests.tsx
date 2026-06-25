import React, { useState, useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Platform, Modal, TextInput, ScrollView, Image } from 'react-native';
import { deleteDoc, doc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { getDb } from '@/lib/firebase';
import { useMedicalRecords, MenuType, MenuDetails } from '@/providers/MedicalRecordProvider';
import { useDisputes } from '@/providers/DisputeProvider';
import { useRatings } from '@/providers/RatingProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { Inbox, CheckCircle, Clock, User, Calendar, FileText, QrCode, X, Save, History as HistoryIcon, ChevronDown, ChevronUp, Timer, Image as ImageIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WalletBalanceHeader from '@/components/WalletBalanceHeader';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';



export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={{ flex: 1 }}
    >
      <Stack.Screen options={{ title: 'カルテ' }} />
      <View style={{ position: 'absolute', top: insets.top + 8, right: 16, zIndex: 100 }}>
        <WalletBalanceHeader />
      </View>
      <RequestsContent />
    </LinearGradient>
  );
}

function RequestsContent() {
  const { user } = useAuth();
  const { records, treatmentHistory, addRecord, updateRecord, getTreatmentHistory, addTreatmentHistory, getVisibleRecords, isRecordExpired, deleteAllUnwrittenRecords } = useMedicalRecords();
  const { getRatingsByCustomer } = useRatings();
  const { subscription, checkSubscriptionStatus } = useSubscription();
  const { disputes } = useDisputes();
  const insets = useSafeAreaInsets();

  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{customerId: string, customerName: string, recordId?: string} | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [selectedMenus, setSelectedMenus] = useState<MenuType[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<Record<MenuType, boolean>>({
    cut: false,
    color: false,
    perm: false,
    straightening: false,
    treatment: false,
    headspa: false,
    extension: false,
  });
  const [menuDetails, setMenuDetails] = useState<MenuDetails>({});
  const [recordNotes, setRecordNotes] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [selectedTab, setSelectedTab] = useState<'completed' | 'unwritten'>('completed');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [expandedRecordIds, setExpandedRecordIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  if (user?.role !== 'hairdresser') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>美容師のみアクセス可能です</Text>
        </View>
      </ScrollView>
    );
  }

  const handleQRScan = async () => {

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


    setIsScanning(true);
    setShowQRScanner(true);
  };

  const handleQRCodeScanned = async (data: string) => {
    if (!isScanning) {

      return;
    }
    

    setIsScanning(false);
    setShowQRScanner(false);
    
    try {
      const customerData = JSON.parse(data);
      if (customerData.type === 'customer_qr' && customerData.customerId) {

        
        const qrScanTime = new Date().toISOString();
        
        const unwrittenRecord = {
          id: 'unwritten_' + Date.now(),
          customerId: customerData.customerId,
          customerName: customerData.userName,
          customerEmail: '',
          hairdresserId: user.id,
          hairdresserName: user.name,
          requestDate: new Date().toISOString().split('T')[0],
          status: 'unwritten' as const,
          qrScanTime: qrScanTime,
        };
        

        await addRecord(unwrittenRecord);
        
        setSelectedCustomer({
          customerId: customerData.customerId,
          customerName: customerData.userName
        });
        setShowRecordForm(true);
      } else {
        Alert.alert('エラー', '無効なQRコードです');
      }
    } catch (error) {

      Alert.alert('エラー', 'QRコードの読み取りに失敗しました');
    }
  };

  const toggleMenu = (menu: MenuType) => {
    if (selectedMenus.includes(menu)) {
      setSelectedMenus(selectedMenus.filter(m => m !== menu));
      const newMenuDetails = { ...menuDetails };
      delete newMenuDetails[menu];
      setMenuDetails(newMenuDetails);
      setExpandedMenus(prev => ({ ...prev, [menu]: false }));
    } else {
      setSelectedMenus([...selectedMenus, menu]);
      
      // メニューを追加した際に、デフォルトの空オブジェクトで初期化
      if (!menuDetails[menu]) {
        setMenuDetails(prev => ({
          ...prev,
          [menu]: {} as any
        }));
      }
      
      setExpandedMenus(prev => ({ ...prev, [menu]: true }));
    }
  };

  const toggleExpand = (menu: MenuType) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const updateMenuDetail = <T extends keyof MenuDetails>(
    menu: T,
    field: keyof NonNullable<MenuDetails[T]>,
    value: any
  ) => {
    setMenuDetails(prev => {
      const currentMenu = prev[menu] || ({} as any);
      return {
        ...prev,
        [menu]: {
          ...currentMenu,
          [field]: value
        }
      };
    });
  };

  const handleSaveRecord = async () => {
    if (!selectedCustomer || !user) return;
    
    if (selectedMenus.length === 0) {
      Alert.alert('エラー', 'メニューを1つ以上選択してください');
      return;
    }
    
    const receivedAmountNum = parseInt(receivedAmount || '0');
    if (receivedAmountNum <= 0) {
      Alert.alert('エラー', '受領金額を入力してください');
      return;
    }
    




    
    const recordData = {
      status: 'completed' as const,
      receivedAmount: receivedAmountNum,
      medicalRecord: {
        serviceDate: new Date().toISOString().split('T')[0],
        menus: selectedMenus,
        menuDetails: menuDetails,
        notes: recordNotes,
        receivedAmount: receivedAmountNum
      }
    };
    
    if (selectedCustomer.recordId) {

      await updateRecord(selectedCustomer.recordId, recordData);
    } else {

      const newRecord = {
        id: 'record_' + Date.now(),
        customerId: selectedCustomer.customerId,
        customerName: selectedCustomer.customerName,
        customerEmail: '',
        hairdresserId: user.id,
        hairdresserName: user.name,
        requestDate: new Date().toISOString().split('T')[0],
        qrScanTime: new Date().toISOString(),
        ...recordData
      };
      await addRecord(newRecord);
    }
    
    await addTreatmentHistory({
      customerId: selectedCustomer.customerId,
      customerName: selectedCustomer.customerName,
      hairdresserId: user.id,
      hairdresserName: user.name,
      serviceDate: new Date().toISOString().split('T')[0],
      menus: selectedMenus,
      menuDetails: menuDetails,
      notes: recordNotes
    });
    
    resetForm();
    
    Alert.alert(
      'カルテ記入完了',
      `${selectedCustomer.customerName}さんのカルテを記入しました。\n\n✅ カルテ記入完了\n📤 顧客に評価依頼通知を送信\n\n顧客が評価を完了すると取引が成立し、BTを獲得できます。`,
      [{ text: 'OK' }]
    );
  };
  
  const handlePostponeRecord = async () => {
    if (!selectedCustomer) return;
    
    const newRecord = {
      id: 'unwritten_' + Date.now(),
      customerId: selectedCustomer.customerId,
      customerName: selectedCustomer.customerName,
      customerEmail: '',
      hairdresserId: user.id,
      hairdresserName: user.name,
      requestDate: new Date().toISOString().split('T')[0],
      qrScanTime: new Date().toISOString(),
      status: 'unwritten' as const,
      medicalRecord: selectedMenus.length > 0 ? {
        serviceDate: new Date().toISOString().split('T')[0],
        menus: selectedMenus,
        menuDetails: menuDetails,
        notes: recordNotes
      } : undefined
    };
    
    await addRecord(newRecord);
    
    resetForm();
    
    Alert.alert(
      '未記入として保存',
      `${selectedCustomer.customerName}さんのカルテを未記入として保存しました。\n\n後でカルテ記入を再開できます。`,
      [{ text: 'OK' }]
    );
  };

  const resetForm = () => {
    setShowRecordForm(false);
    setSelectedCustomer(null);
    setSelectedMenus([]);
    setMenuDetails({});
    setRecordNotes('');
    setReceivedAmount('');
    setExpandedMenus({
      cut: false,
      color: false,
      perm: false,
      straightening: false,
      treatment: false,
      headspa: false,
      extension: false,
    });
  };

  const handleViewHistory = (customerId: string, customerName: string) => {

    setSelectedCustomerHistory(customerId);
    setShowHistoryModal(true);
  };

  const isPremium = subscription.tier === 'premium' && subscription.status === 'active';
  const visibleRecords = getVisibleRecords(user?.id || '', isPremium);
  const filteredRecords = visibleRecords.filter(record => record.status === selectedTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#27AE60';
      case 'unwritten':
        return '#F39C12';
      default:
        return '#95A5A6';
    }
  };

  const getStatusText = (status: string, recordId?: string) => {
    if (status === 'completed' && recordId) {
      const record = records.find(r => r.id === recordId);
      if (record) {
        const dispute = disputes.find(d => 
          d.customerId === record.customerId && 
          d.hairdresserId === record.hairdresserId &&
          d.hairdresserSubmitted === true &&
          d.status === 'hairdresser_response'
        );
        if (dispute) {
          return '再申請済み';
        }
      }
    }
    switch (status) {
      case 'completed':
        return '記入済み';
      case 'unwritten':
        return '未記入';
      default:
        return '不明';
    }
  };

  const getStatusIcon = (status: string) => {
    const color = getStatusColor(status);
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color={color} />;
      case 'unwritten':
        return <Clock size={16} color={color} />;
      default:
        return <Clock size={16} color={color} />;
    }
  };

  const getMenuLabel = (menu: MenuType): string => {
    const labels: Record<MenuType, string> = {
      cut: 'カット',
      color: 'カラー',
      perm: 'パーマ',
      straightening: '縮毛矯正',
      treatment: 'トリートメント',
      headspa: 'ヘッドスパ',
      extension: 'エクステ'
    };
    return labels[menu];
  };

  const getRemainingTime = (record: typeof records[0]): { hours: number; minutes: number; expired: boolean } => {
    const scanTime = record.qrScanTime || record.requestDate;
    if (!scanTime) {
      return { hours: 24, minutes: 0, expired: false };
    }

    const scanDate = new Date(scanTime);
    const now = currentTime;
    const diffMs = now.getTime() - scanDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours >= 24) {
      return { hours: 0, minutes: 0, expired: true };
    }

    const remainingHours = 24 - diffHours;
    const hours = Math.floor(remainingHours);
    const minutes = Math.floor((remainingHours - hours) * 60);

    return { hours, minutes, expired: false };
  };

  const formatRemainingTime = (hours: number, minutes: number): string => {
    if (hours === 0 && minutes === 0) {
      return '期限切れ';
    }
    return `残り ${hours}時間 ${minutes}分`;
  };

  const renderRequestCard = ({ item }: { item: typeof records[0] }) => {
    const customerHistory = getTreatmentHistory(item.customerId);
    const expired = isRecordExpired(item, isPremium);
    const timeRemaining = getRemainingTime(item);
    const isExpanded = expandedRecordIds.has(item.id);
    
    const toggleExpanded = () => {
      const newSet = new Set(expandedRecordIds);
      if (isExpanded) {
        newSet.delete(item.id);
      } else {
        newSet.add(item.id);
      }
      setExpandedRecordIds(newSet);
    };
    
    if (expired && !isPremium) {
      return (
        <View style={styles.expiredCard}>
          <View style={styles.expiredHeader}>
            <Clock size={20} color="#E74C3C" />
            <Text style={styles.expiredTitle}>カルテ閲覧期限切れ</Text>
          </View>
          <Text style={styles.expiredText}>
            {item.customerName}さんのカルテは24時間が経過したため、閲覧できません。
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/subscription' as any)}
          >
            <Text style={styles.upgradeButtonText}>プレミアムにアップグレードして永久保存</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.requestCard}>
        {selectionMode && (
          <TouchableOpacity
            style={styles.selectionCheckbox}
            onPress={() => toggleRecordSelection(item.id)}
          >
            <View style={[
              styles.checkbox,
              selectedRecords.has(item.id) && styles.checkboxSelected
            ]}>
              {selectedRecords.has(item.id) && (
                <CheckCircle size={20} color="#FF69B4" />
              )}
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.requestHeader}>
          <View style={styles.requestHeaderLeft}>
            <View style={styles.customerInfo}>
              <User size={18} color="#FF69B4" />
              <Text style={styles.customerName}>{item.customerName}</Text>
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
                {getStatusIcon(item.status)}
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {getStatusText(item.status, item.id)}
                </Text>
              </View>
              {!isPremium && !timeRemaining.expired && (
                <View style={[
                  styles.timerBadge,
                  timeRemaining.hours < 6 ? styles.timerBadgeWarning : styles.timerBadgeNormal
                ]}>
                  <Timer size={14} color={timeRemaining.hours < 6 ? '#E74C3C' : '#FF69B4'} />
                  <Text style={[
                    styles.timerText,
                    timeRemaining.hours < 6 ? styles.timerTextWarning : styles.timerTextNormal
                  ]}>
                    {formatRemainingTime(timeRemaining.hours, timeRemaining.minutes)}
                  </Text>
                </View>
              )}
            </View>
          </View>

        </View>

        <View style={styles.requestBody}>
          <View style={styles.infoRow}>
            <Calendar size={16} color="#7F8C8D" />
            <Text style={styles.infoLabel}>申請日:</Text>
            <Text style={styles.infoValue}>{item.requestDate}</Text>
          </View>

          {item.medicalRecord && (
            <View style={styles.medicalRecordSection}>
              <TouchableOpacity
                style={styles.medicalRecordHeader}
                onPress={toggleExpanded}
              >
                <Text style={styles.medicalRecordTitle}>カルテ内容</Text>
                {isExpanded ? (
                  <ChevronUp size={20} color="#3498DB" />
                ) : (
                  <ChevronDown size={20} color="#3498DB" />
                )}
              </TouchableOpacity>
              <View style={styles.medicalRecordContent}>
                <Text style={styles.medicalRecordLabel}>施術メニュー:</Text>
                <Text style={styles.medicalRecordValue}>
                  {Array.isArray(item.medicalRecord.menus) ? item.medicalRecord.menus.map(m => getMenuLabel(m)).join(', ') : '-'}
                </Text>
                {!isExpanded && item.medicalRecord.notes && (
                  <>
                    <Text style={styles.medicalRecordLabel}>施術メモ:</Text>
                    <Text style={styles.medicalRecordValue} numberOfLines={2}>{item.medicalRecord.notes}</Text>
                  </>
                )}
                {item.medicalRecord.receivedAmount && (
                  <>
                    <Text style={styles.medicalRecordLabel}>受領金額:</Text>
                    <Text style={styles.medicalRecordValue}>¥{item.medicalRecord.receivedAmount.toLocaleString()}</Text>
                  </>
                )}
              </View>

              {isExpanded && (
                <View style={styles.expandedDetails}>
                  {item.medicalRecord.menus.map((menu) => {
                    const details = item.medicalRecord?.menuDetails?.[menu as keyof typeof item.medicalRecord.menuDetails];
                    return renderMenuDetails(menu, details);
                  })}
                  {item.medicalRecord.notes && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>【メモ】</Text>
                      <Text style={styles.detailsText}>{item.medicalRecord.notes}</Text>
                    </View>
                  )}
                  {(() => {
                    const customerRatings = getRatingsByCustomer(item.customerId);
                    const relatedRating = customerRatings.find(r => 
                      r.hairdresserId === user?.id && 
                      r.photoUrl &&
                      new Date(r.createdAt).toISOString().split('T')[0] === item.medicalRecord?.serviceDate
                    );
                    if (relatedRating?.photoUrl) {
                      return (
                        <View style={styles.detailsSection}>
                          <Text style={styles.detailsLabel}>【保存された写真】</Text>
                          <Image 
                            source={{ uri: relatedRating.photoUrl }} 
                            style={styles.recordPhoto}
                            resizeMode="cover"
                          />
                        </View>
                      );
                    }
                    return null;
                  })()}
                </View>
              )}
            </View>
          )}
        </View>

        {item.status === 'unwritten' && (
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.recordButton]}
              onPress={() => {

                setSelectedCustomer({
                  customerId: item.customerId,
                  customerName: item.customerName,
                  recordId: item.id
                });
                if (item.medicalRecord) {
                  setSelectedMenus(item.medicalRecord.menus);
                  setMenuDetails(item.medicalRecord.menuDetails);
                  setRecordNotes(item.medicalRecord.notes);
                  setReceivedAmount(item.medicalRecord.receivedAmount?.toString() || '');
                }
                setShowRecordForm(true);
              }}
            >
              <FileText size={18} color="white" />
              <Text style={styles.recordButtonText}>記入を再開</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const completedCount = records.filter(r => r.status === 'completed').length;
  const unwrittenCount = records.filter(r => r.status === 'unwritten').length;

  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const selectAllRecords = () => {
    const allIds = new Set(filteredRecords.map(r => r.id));
    setSelectedRecords(allIds);
  };

  const clearSelection = () => {
    setSelectedRecords(new Set());
    setSelectionMode(false);
  };

  const deleteSelectedRecords = async () => {
    Alert.alert(
      '選択したカルテを削除',
      `${selectedRecords.size}件のカルテを削除しますか？この操作は取り消せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = Array.from(selectedRecords).map(id => {
                const recordRef = doc(getDb(), 'medicalRecords', id);
                return deleteDoc(recordRef);
              });
              await Promise.all(deletePromises);
              Alert.alert(
                '削除完了',
                `${selectedRecords.size}件のカルテを削除しました`,
                [{ text: 'OK' }]
              );
              clearSelection();
            } catch (error) {

              Alert.alert('エラー', 'カルテの削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const currentHistory = selectedCustomerHistory ? getTreatmentHistory(selectedCustomerHistory) : [];

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
            {details.brand && <Text style={styles.detailsText}>ブランド: {details.brand}</Text>}
            {details.selection && <Text style={styles.detailsText}>商材名: {details.selection}</Text>}
            {details.secondLiquidConcentration && <Text style={styles.detailsText}>2剤濃度: {details.secondLiquidConcentration}</Text>}
            {details.secondLiquidRatio && <Text style={styles.detailsText}>2剤比率: {details.secondLiquidRatio}</Text>}
            {details.processingTime && <Text style={styles.detailsText}>放置時間: {details.processingTime}</Text>}
            {details.hasBleach && (
              <View style={styles.subDetailsSection}>
                <Text style={styles.detailsText}>ブリーチ: あり</Text>
                {details.bleachBrand && <Text style={styles.detailsText}>  ブランド: {details.bleachBrand}</Text>}
                {details.bleachSelection && <Text style={styles.detailsText}>  商材名: {details.bleachSelection}</Text>}
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
            {details.brand && <Text style={styles.detailsText}>ブランド: {details.brand}</Text>}
            {details.selection && <Text style={styles.detailsText}>商材名: {details.selection}</Text>}
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
            {details.brand && <Text style={styles.detailsText}>ブランド: {details.brand}</Text>}
            {details.selection && <Text style={styles.detailsText}>商材名: {details.selection}</Text>}
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
            {details.productName && <Text style={styles.detailsText}>商品名: {details.productName}</Text>}
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

  const renderCutForm = () => (
    <View style={styles.menuFormSection}>
      <TextInput
        style={styles.formInput}
        placeholder="スタイル or ◯cmカット"
        value={menuDetails.cut?.type || ''}
        onChangeText={(text) => updateMenuDetail('cut', 'type', text)}
        placeholderTextColor="#95A5A6"
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>セニング有無</Text>
        <TouchableOpacity
          style={[styles.switchButton, menuDetails.cut?.thinning && styles.switchButtonActive]}
          onPress={() => updateMenuDetail('cut', 'thinning', !menuDetails.cut?.thinning)}
        >
          <Text style={[styles.switchButtonText, menuDetails.cut?.thinning && styles.switchButtonTextActive]}>
            {menuDetails.cut?.thinning ? '有' : '無'}
          </Text>
        </TouchableOpacity>
      </View>
      {menuDetails.cut?.thinning && (
        <TextInput
          style={styles.formInput}
          placeholder="セニング詳細"
          value={menuDetails.cut?.thinningDetails || ''}
          onChangeText={(text) => updateMenuDetail('cut', 'thinningDetails', text)}
          placeholderTextColor="#95A5A6"
        />
      )}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>クセ有無</Text>
        <TouchableOpacity
          style={[styles.switchButton, menuDetails.cut?.hasNaturalCurl && styles.switchButtonActive]}
          onPress={() => updateMenuDetail('cut', 'hasNaturalCurl', !menuDetails.cut?.hasNaturalCurl)}
        >
          <Text style={[styles.switchButtonText, menuDetails.cut?.hasNaturalCurl && styles.switchButtonTextActive]}>
            {menuDetails.cut?.hasNaturalCurl ? '有' : '無'}
          </Text>
        </TouchableOpacity>
      </View>
      {menuDetails.cut?.hasNaturalCurl && (
        <TextInput
          style={styles.formInput}
          placeholder="クセ詳細"
          value={menuDetails.cut?.curlDetails || ''}
          onChangeText={(text) => updateMenuDetail('cut', 'curlDetails', text)}
          placeholderTextColor="#95A5A6"
        />
      )}
    </View>
  );

  const renderColorForm = () => {
    const areas = menuDetails.color?.areas || [];
    const areaWidths = menuDetails.color?.areaWidths || {};
    const areaBrands = menuDetails.color?.areaBrands || {};
    const areaSelections = menuDetails.color?.areaSelections || {};
    const areaSecondLiquidConcentrations = menuDetails.color?.areaSecondLiquidConcentrations || {};
    const areaSecondLiquidRatios = menuDetails.color?.areaSecondLiquidRatios || {};
    
    return (
      <View style={styles.menuFormSection}>
        <Text style={styles.formLabel}>塗布方法</Text>
        <View style={styles.buttonGroup}>
          {['リタッチ', 'ワンタッチ', '塗り分け'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.optionButton,
                menuDetails.color?.applicationType === type && styles.optionButtonActive
              ]}
              onPress={() => updateMenuDetail('color', 'applicationType', type)}
            >
              <Text style={[
                styles.optionButtonText,
                menuDetails.color?.applicationType === type && styles.optionButtonTextActive
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {menuDetails.color?.applicationType === 'リタッチ' && (
          <TextInput
            style={styles.formInput}
            placeholder="リタッチcm（例: 2cm）"
            value={menuDetails.color?.retouchCm || ''}
            onChangeText={(text) => updateMenuDetail('color', 'retouchCm', text)}
            placeholderTextColor="#95A5A6"
          />
        )}
        
        {menuDetails.color?.applicationType === '塗り分け' && (
          <View>
            <Text style={styles.formLabel}>塗布箇所</Text>
            <View style={styles.buttonGroup}>
              {['根元', '中間', '毛先'].map((area) => (
                <TouchableOpacity
                  key={area}
                  style={[
                    styles.optionButton,
                    areas.includes(area) && styles.optionButtonActive
                  ]}
                  onPress={() => {
                    const newAreas = areas.includes(area)
                      ? areas.filter(a => a !== area)
                      : [...areas, area];
                    updateMenuDetail('color', 'areas', newAreas);
                  }}
                >
                  <Text style={[
                    styles.optionButtonText,
                    areas.includes(area) && styles.optionButtonTextActive
                  ]}>
                    {area}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {areas.map((area) => (
              <View key={area} style={styles.areaDetailSection}>
                <Text style={styles.areaTitle}>{area}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={`${area}の幅（例: 3cm）`}
                  value={areaWidths[area] || ''}
                  onChangeText={(text) => {
                    const newWidths = { ...areaWidths, [area]: text };
                    updateMenuDetail('color', 'areaWidths', newWidths);
                  }}
                  placeholderTextColor="#95A5A6"
                />
                <TextInput
                  style={styles.formInput}
                  placeholder={`${area}のカラー剤メーカー`}
                  value={areaBrands[area] || ''}
                  onChangeText={(text) => {
                    const newBrands = { ...areaBrands, [area]: text };
                    updateMenuDetail('color', 'areaBrands', newBrands);
                  }}
                  placeholderTextColor="#95A5A6"
                />
                <TextInput
                  style={styles.formInput}
                  placeholder={`${area}の選定（色番号など）`}
                  value={areaSelections[area] || ''}
                  onChangeText={(text) => {
                    const newSelections = { ...areaSelections, [area]: text };
                    updateMenuDetail('color', 'areaSelections', newSelections);
                  }}
                  placeholderTextColor="#95A5A6"
                />
                <View style={styles.secondLiquidRow}>
                  <TextInput
                    style={[styles.formInput, styles.secondLiquidInput]}
                    placeholder="2液濃度（例：3パー）"
                    value={areaSecondLiquidConcentrations[area] || ''}
                    onChangeText={(text) => {
                      const newConcentrations = { ...areaSecondLiquidConcentrations, [area]: text };
                      updateMenuDetail('color', 'areaSecondLiquidConcentrations', newConcentrations);
                    }}
                    placeholderTextColor="#95A5A6"
                  />
                  <TextInput
                    style={[styles.formInput, styles.secondLiquidInput]}
                    placeholder="希釈倍率（例：1.5倍）"
                    value={areaSecondLiquidRatios[area] || ''}
                    onChangeText={(text) => {
                      const newRatios = { ...areaSecondLiquidRatios, [area]: text };
                      updateMenuDetail('color', 'areaSecondLiquidRatios', newRatios);
                    }}
                    placeholderTextColor="#95A5A6"
                  />
                </View>
              </View>
            ))}
          </View>
        )}
        
        {menuDetails.color?.applicationType !== '塗り分け' && (
          <>
            <View style={styles.copyButtonWrapper}>
              <TouchableOpacity
                style={styles.copyToPublicButton}
                onPress={() => {
                  updateMenuDetail('color', 'publicBrand', menuDetails.color?.brand || '');
                  updateMenuDetail('color', 'publicSelection', menuDetails.color?.selection || '');
                  updateMenuDetail('color', 'publicSecondLiquidConcentration', menuDetails.color?.secondLiquidConcentration || '');
                  updateMenuDetail('color', 'publicSecondLiquidRatio', menuDetails.color?.secondLiquidRatio || '');
                  Alert.alert('コピー完了', '自分用の情報を公開用にコピーしました');
                }}
              >
                <Text style={styles.copyToPublicButtonText}>📋 自分用の情報を公開用にコピー</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.infoNote}>📝 正確な技術情報（自分用）</Text>
            <TextInput
              style={styles.formInput}
              placeholder="カラー剤メーカー（例：フィオーレラディーチェ）"
              value={menuDetails.color?.brand || ''}
              onChangeText={(text) => updateMenuDetail('color', 'brand', text)}
              placeholderTextColor="#95A5A6"
            />
            <TextInput
              style={styles.formInput}
              placeholder="選定（色番号など）（例：８NB）"
              value={menuDetails.color?.selection || ''}
              onChangeText={(text) => updateMenuDetail('color', 'selection', text)}
              placeholderTextColor="#95A5A6"
            />
            <View style={styles.secondLiquidRow}>
              <TextInput
                style={[styles.formInput, styles.secondLiquidInput]}
                placeholder="2液濃度（例：6パー）"
                value={menuDetails.color?.secondLiquidConcentration || ''}
                onChangeText={(text) => updateMenuDetail('color', 'secondLiquidConcentration', text)}
                placeholderTextColor="#95A5A6"
              />
              <TextInput
                style={[styles.formInput, styles.secondLiquidInput]}
                placeholder="希釈倍率（例：等倍）"
                value={menuDetails.color?.secondLiquidRatio || ''}
                onChangeText={(text) => updateMenuDetail('color', 'secondLiquidRatio', text)}
                placeholderTextColor="#95A5A6"
              />
            </View>
            
            <Text style={styles.publicSectionTitle}>👥 他の美容師に表示する内容（ぼかし表現）</Text>
            <TextInput
              style={styles.formInput}
              placeholder="公開用メーカー（例：白髪染め）"
              value={menuDetails.color?.publicBrand || ''}
              onChangeText={(text) => updateMenuDetail('color', 'publicBrand', text)}
              placeholderTextColor="#95A5A6"
            />
            <TextInput
              style={styles.formInput}
              placeholder="公開用選定（例：ブラウン8トーン）"
              value={menuDetails.color?.publicSelection || ''}
              onChangeText={(text) => updateMenuDetail('color', 'publicSelection', text)}
              placeholderTextColor="#95A5A6"
            />
            <View style={styles.secondLiquidRow}>
              <TextInput
                style={[styles.formInput, styles.secondLiquidInput]}
                placeholder="公開用2液濃度（例：6パー）"
                value={menuDetails.color?.publicSecondLiquidConcentration || ''}
                onChangeText={(text) => updateMenuDetail('color', 'publicSecondLiquidConcentration', text)}
                placeholderTextColor="#95A5A6"
              />
              <TextInput
                style={[styles.formInput, styles.secondLiquidInput]}
                placeholder="公開用希釈倍率（例：等倍）"
                value={menuDetails.color?.publicSecondLiquidRatio || ''}
                onChangeText={(text) => updateMenuDetail('color', 'publicSecondLiquidRatio', text)}
                placeholderTextColor="#95A5A6"
              />
            </View>
          </>
        )}
        
        <TextInput
          style={styles.formInput}
          placeholder="放置時間（例: 30分）"
          value={menuDetails.color?.processingTime || ''}
          onChangeText={(text) => updateMenuDetail('color', 'processingTime', text)}
          placeholderTextColor="#95A5A6"
        />
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>ブリーチ有無</Text>
          <TouchableOpacity
            style={[styles.switchButton, menuDetails.color?.hasBleach && styles.switchButtonActive]}
            onPress={() => updateMenuDetail('color', 'hasBleach', !menuDetails.color?.hasBleach)}
          >
            <Text style={[styles.switchButtonText, menuDetails.color?.hasBleach && styles.switchButtonTextActive]}>
              {menuDetails.color?.hasBleach ? '有' : '無'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {menuDetails.color?.hasBleach && (
          <>
            <View style={styles.copyButtonWrapper}>
              <TouchableOpacity
                style={styles.copyToPublicButton}
                onPress={() => {
                  updateMenuDetail('color', 'publicBleachBrand', menuDetails.color?.bleachBrand || '');
                  updateMenuDetail('color', 'publicBleachSelection', menuDetails.color?.bleachSelection || '');
                  Alert.alert('コピー完了', 'ブリーチの自分用情報を公開用にコピーしました');
                }}
              >
                <Text style={styles.copyToPublicButtonText}>📋 ブリーチ情報を公開用にコピー</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.infoNote}>📝 ブリーチ正確情報（自分用）</Text>
            <TextInput
              style={styles.formInput}
              placeholder="ブリーチ剤メーカー（正確な名称）"
              value={menuDetails.color?.bleachBrand || ''}
              onChangeText={(text) => updateMenuDetail('color', 'bleachBrand', text)}
              placeholderTextColor="#95A5A6"
            />
            <TextInput
              style={styles.formInput}
              placeholder="ブリーチ選定（正確な名称）"
              value={menuDetails.color?.bleachSelection || ''}
              onChangeText={(text) => updateMenuDetail('color', 'bleachSelection', text)}
              placeholderTextColor="#95A5A6"
            />
            
            <Text style={styles.publicSectionTitle}>👥 他の美容師に表示（ぼかし）</Text>
            <TextInput
              style={styles.formInput}
              placeholder="公開用ブリーチメーカー（例：ブリーチ剤）"
              value={menuDetails.color?.publicBleachBrand || ''}
              onChangeText={(text) => updateMenuDetail('color', 'publicBleachBrand', text)}
              placeholderTextColor="#95A5A6"
            />
            <TextInput
              style={styles.formInput}
              placeholder="公開用ブリーチ選定（例：通常ブリーチ）"
              value={menuDetails.color?.publicBleachSelection || ''}
              onChangeText={(text) => updateMenuDetail('color', 'publicBleachSelection', text)}
              placeholderTextColor="#95A5A6"
            />
          </>
        )}
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>処理剤有無</Text>
          <TouchableOpacity
            style={[styles.switchButton, menuDetails.color?.hasTreatment && styles.switchButtonActive]}
            onPress={() => updateMenuDetail('color', 'hasTreatment', !menuDetails.color?.hasTreatment)}
          >
            <Text style={[styles.switchButtonText, menuDetails.color?.hasTreatment && styles.switchButtonTextActive]}>
              {menuDetails.color?.hasTreatment ? '有' : '無'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {menuDetails.color?.hasTreatment && (
          <TextInput
            style={[styles.formInput, styles.formTextArea]}
            placeholder="例：毛髪補修成分、ケラチン、ＣＭＣ導入剤"
            value={menuDetails.color?.treatmentDetails || ''}
            onChangeText={(text) => updateMenuDetail('color', 'treatmentDetails', text)}
            multiline
            numberOfLines={3}
            placeholderTextColor="#95A5A6"
          />
        )}
      </View>
    );
  };

  const renderPermForm = () => (
    <View style={styles.menuFormSection}>
      <Text style={styles.formLabel}>パーマタイプ</Text>
      <View style={styles.buttonGroup}>
        {['水巻', 'つけ巻き', 'デジパ'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.optionButton,
              menuDetails.perm?.type === type && styles.optionButtonActive
            ]}
            onPress={() => updateMenuDetail('perm', 'type', type)}
          >
            <Text style={[
              styles.optionButtonText,
              menuDetails.perm?.type === type && styles.optionButtonTextActive
            ]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.formInput}
        placeholder="巻き方"
        value={menuDetails.perm?.windingMethod || ''}
        onChangeText={(text) => updateMenuDetail('perm', 'windingMethod', text)}
        placeholderTextColor="#95A5A6"
      />
      
      <View style={styles.copyButtonWrapper}>
        <TouchableOpacity
          style={styles.copyToPublicButton}
          onPress={() => {
            updateMenuDetail('perm', 'publicBrand', menuDetails.perm?.brand || '');
            updateMenuDetail('perm', 'publicSelection', menuDetails.perm?.selection || '');
            Alert.alert('コピー完了', '自分用の情報を公開用にコピーしました');
          }}
        >
          <Text style={styles.copyToPublicButtonText}>📋 自分用の情報を公開用にコピー</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.infoNote}>📝 正確な技術情報（自分用）</Text>
      <TextInput
        style={styles.formInput}
        placeholder="パーマ剤メーカー（正確な名称）"
        value={menuDetails.perm?.brand || ''}
        onChangeText={(text) => updateMenuDetail('perm', 'brand', text)}
        placeholderTextColor="#95A5A6"
      />
      <TextInput
        style={styles.formInput}
        placeholder="選定（正確な名称）"
        value={menuDetails.perm?.selection || ''}
        onChangeText={(text) => updateMenuDetail('perm', 'selection', text)}
        placeholderTextColor="#95A5A6"
      />
      
      <Text style={styles.publicSectionTitle}>👥 他の美容師に表示（ぼかし表現）</Text>
      <TextInput
        style={styles.formInput}
        placeholder="公開用メーカー（例：パーマ剤）"
        value={menuDetails.perm?.publicBrand || ''}
        onChangeText={(text) => updateMenuDetail('perm', 'publicBrand', text)}
        placeholderTextColor="#95A5A6"
      />
      <TextInput
        style={styles.formInput}
        placeholder="公開用選定（例：通常パーマ）"
        value={menuDetails.perm?.publicSelection || ''}
        onChangeText={(text) => updateMenuDetail('perm', 'publicSelection', text)}
        placeholderTextColor="#95A5A6"
      />
      
      <TextInput
        style={styles.formInput}
        placeholder="1液放置時間（例: 15分）"
        value={menuDetails.perm?.firstLiquidTime || ''}
        onChangeText={(text) => updateMenuDetail('perm', 'firstLiquidTime', text)}
        placeholderTextColor="#95A5A6"
      />
      <TextInput
        style={styles.formInput}
        placeholder="2液放置時間（例: 10分）"
        value={menuDetails.perm?.secondLiquidTime || ''}
        onChangeText={(text) => updateMenuDetail('perm', 'secondLiquidTime', text)}
        placeholderTextColor="#95A5A6"
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>処理剤有無</Text>
        <TouchableOpacity
          style={[styles.switchButton, menuDetails.perm?.hasTreatment && styles.switchButtonActive]}
          onPress={() => updateMenuDetail('perm', 'hasTreatment', !menuDetails.perm?.hasTreatment)}
        >
          <Text style={[styles.switchButtonText, menuDetails.perm?.hasTreatment && styles.switchButtonTextActive]}>
            {menuDetails.perm?.hasTreatment ? '有' : '無'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {menuDetails.perm?.hasTreatment && (
        <TextInput
          style={[styles.formInput, styles.formTextArea]}
          placeholder="例：毛髪補修成分、ケラチン、ＣＭＣ導入剤"
          value={menuDetails.perm?.treatmentDetails || ''}
          onChangeText={(text) => updateMenuDetail('perm', 'treatmentDetails', text)}
          multiline
          numberOfLines={3}
          placeholderTextColor="#95A5A6"
        />
      )}
    </View>
  );

  const renderStraighteningForm = () => {
    const areas = menuDetails.straightening?.areas || [];
    const areaWidths = menuDetails.straightening?.areaWidths || {};
    const areaBrands = menuDetails.straightening?.areaBrands || {};
    const areaSelections = menuDetails.straightening?.areaSelections || {};
    
    return (
      <View style={styles.menuFormSection}>
        <Text style={styles.formLabel}>塗布方法</Text>
        <View style={styles.buttonGroup}>
          {['リタッチ', 'ワンタッチ', '塗り分け'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.optionButton,
                menuDetails.straightening?.applicationType === type && styles.optionButtonActive
              ]}
              onPress={() => updateMenuDetail('straightening', 'applicationType', type)}
            >
              <Text style={[
                styles.optionButtonText,
                menuDetails.straightening?.applicationType === type && styles.optionButtonTextActive
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {menuDetails.straightening?.applicationType === 'リタッチ' && (
          <TextInput
            style={styles.formInput}
            placeholder="リタッチcm（例: 2cm）"
            value={menuDetails.straightening?.retouchCm || ''}
            onChangeText={(text) => updateMenuDetail('straightening', 'retouchCm', text)}
            placeholderTextColor="#95A5A6"
          />
        )}
        
        {menuDetails.straightening?.applicationType === '塗り分け' && (
          <View>
            <Text style={styles.formLabel}>塗布箇所</Text>
            <View style={styles.buttonGroup}>
              {['根元', '中間', '毛先'].map((area) => (
                <TouchableOpacity
                  key={area}
                  style={[
                    styles.optionButton,
                    areas.includes(area) && styles.optionButtonActive
                  ]}
                  onPress={() => {
                    const newAreas = areas.includes(area)
                      ? areas.filter(a => a !== area)
                      : [...areas, area];
                    updateMenuDetail('straightening', 'areas', newAreas);
                  }}
                >
                  <Text style={[
                    styles.optionButtonText,
                    areas.includes(area) && styles.optionButtonTextActive
                  ]}>
                    {area}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {areas.map((area) => (
              <View key={area} style={styles.areaDetailSection}>
                <Text style={styles.areaTitle}>{area}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={`${area}の幅（例: 3cm）`}
                  value={areaWidths[area] || ''}
                  onChangeText={(text) => {
                    const newWidths = { ...areaWidths, [area]: text };
                    updateMenuDetail('straightening', 'areaWidths', newWidths);
                  }}
                  placeholderTextColor="#95A5A6"
                />
                <TextInput
                  style={styles.formInput}
                  placeholder={`${area}の矯正剤メーカー`}
                  value={areaBrands[area] || ''}
                  onChangeText={(text) => {
                    const newBrands = { ...areaBrands, [area]: text };
                    updateMenuDetail('straightening', 'areaBrands', newBrands);
                  }}
                  placeholderTextColor="#95A5A6"
                />
                <TextInput
                  style={styles.formInput}
                  placeholder={`${area}の選定`}
                  value={areaSelections[area] || ''}
                  onChangeText={(text) => {
                    const newSelections = { ...areaSelections, [area]: text };
                    updateMenuDetail('straightening', 'areaSelections', newSelections);
                  }}
                  placeholderTextColor="#95A5A6"
                />
              </View>
            ))}
          </View>
        )}
        
        {menuDetails.straightening?.applicationType !== '塗り分け' && (
          <>
            <View style={styles.copyButtonWrapper}>
              <TouchableOpacity
                style={styles.copyToPublicButton}
                onPress={() => {
                  updateMenuDetail('straightening', 'publicBrand', menuDetails.straightening?.brand || '');
                  updateMenuDetail('straightening', 'publicSelection', menuDetails.straightening?.selection || '');
                  Alert.alert('コピー完了', '自分用の情報を公開用にコピーしました');
                }}
              >
                <Text style={styles.copyToPublicButtonText}>📋 自分用の情報を公開用にコピー</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.infoNote}>📝 正確な技術情報（自分用）</Text>
            <TextInput
              style={styles.formInput}
              placeholder="矯正剤メーカー（正確な名称）"
              value={menuDetails.straightening?.brand || ''}
              onChangeText={(text) => updateMenuDetail('straightening', 'brand', text)}
              placeholderTextColor="#95A5A6"
            />
            <TextInput
              style={styles.formInput}
              placeholder="選定（正確な名称）"
              value={menuDetails.straightening?.selection || ''}
              onChangeText={(text) => updateMenuDetail('straightening', 'selection', text)}
              placeholderTextColor="#95A5A6"
            />
            
            <Text style={styles.publicSectionTitle}>👥 他の美容師に表示（ぼかし表現）</Text>
            <TextInput
              style={styles.formInput}
              placeholder="公開用メーカー（例：矯正剤）"
              value={menuDetails.straightening?.publicBrand || ''}
              onChangeText={(text) => updateMenuDetail('straightening', 'publicBrand', text)}
              placeholderTextColor="#95A5A6"
            />
            <TextInput
              style={styles.formInput}
              placeholder="公開用選定（例：通常矯正）"
              value={menuDetails.straightening?.publicSelection || ''}
              onChangeText={(text) => updateMenuDetail('straightening', 'publicSelection', text)}
              placeholderTextColor="#95A5A6"
            />
          </>
        )}
        
        <TextInput
          style={styles.formInput}
          placeholder="1液放置時間（例: 15分）"
          value={menuDetails.straightening?.firstLiquidTime || ''}
          onChangeText={(text) => updateMenuDetail('straightening', 'firstLiquidTime', text)}
          placeholderTextColor="#95A5A6"
        />
        <TextInput
          style={styles.formInput}
          placeholder="2液放置時間（例: 10分）"
          value={menuDetails.straightening?.secondLiquidTime || ''}
          onChangeText={(text) => updateMenuDetail('straightening', 'secondLiquidTime', text)}
          placeholderTextColor="#95A5A6"
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>処理剤有無</Text>
          <TouchableOpacity
            style={[styles.switchButton, menuDetails.straightening?.hasTreatment && styles.switchButtonActive]}
            onPress={() => updateMenuDetail('straightening', 'hasTreatment', !menuDetails.straightening?.hasTreatment)}
          >
            <Text style={[styles.switchButtonText, menuDetails.straightening?.hasTreatment && styles.switchButtonTextActive]}>
              {menuDetails.straightening?.hasTreatment ? '有' : '無'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {menuDetails.straightening?.hasTreatment && (
          <TextInput
            style={[styles.formInput, styles.formTextArea]}
            placeholder="例：毛髪補修成分、ケラチン、ＣＭＣ導入剤"
            value={menuDetails.straightening?.treatmentDetails || ''}
            onChangeText={(text) => updateMenuDetail('straightening', 'treatmentDetails', text)}
            multiline
            numberOfLines={3}
            placeholderTextColor="#95A5A6"
          />
        )}
      </View>
    );
  };

  const renderTreatmentForm = () => (
    <View style={styles.menuFormSection}>
      <Text style={styles.formLabel}>トリートメントタイプ</Text>
      <View style={styles.buttonGroup}>
        {['システム', '酸熱', '水素', '超音波', 'その他'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.optionButton,
              menuDetails.treatment?.type === type && styles.optionButtonActive
            ]}
            onPress={() => updateMenuDetail('treatment', 'type', type)}
          >
            <Text style={[
              styles.optionButtonText,
              menuDetails.treatment?.type === type && styles.optionButtonTextActive
            ]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.copyButtonWrapper}>
        <TouchableOpacity
          style={styles.copyToPublicButton}
          onPress={() => {
            updateMenuDetail('treatment', 'publicProductName', menuDetails.treatment?.productName || '');
            Alert.alert('コピー完了', '自分用の情報を公開用にコピーしました');
          }}
        >
          <Text style={styles.copyToPublicButtonText}>📋 自分用の情報を公開用にコピー</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.infoNote}>📝 正確な商材情報（自分用）</Text>
      <TextInput
        style={styles.formInput}
        placeholder="商材名（正確な名称）"
        value={menuDetails.treatment?.productName || ''}
        onChangeText={(text) => updateMenuDetail('treatment', 'productName', text)}
        placeholderTextColor="#95A5A6"
      />
      
      <Text style={styles.publicSectionTitle}>👥 他の美容師に表示（ぼかし表現）</Text>
      <TextInput
        style={styles.formInput}
        placeholder="公開用商材名（例：システムトリートメント）"
        value={menuDetails.treatment?.publicProductName || ''}
        onChangeText={(text) => updateMenuDetail('treatment', 'publicProductName', text)}
        placeholderTextColor="#95A5A6"
      />
    </View>
  );

  const renderHeadSpaForm = () => (
    <View style={styles.menuFormSection}>
      <TextInput
        style={[styles.formInput, styles.formTextArea]}
        placeholder="ヘッドスパの詳細メモ"
        value={menuDetails.headspa?.notes || ''}
        onChangeText={(text) => updateMenuDetail('headspa', 'notes', text)}
        multiline
        numberOfLines={3}
        placeholderTextColor="#95A5A6"
      />
    </View>
  );

  const renderExtensionForm = () => (
    <View style={styles.menuFormSection}>
      <Text style={styles.formLabel}>エクステの種類</Text>
      <View style={styles.buttonGroup}>
        {['編み込み', 'シール', '羽', 'プル'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.optionButton,
              menuDetails.extension?.type === type && styles.optionButtonActive
            ]}
            onPress={() => updateMenuDetail('extension', 'type', type)}
          >
            <Text style={[
              styles.optionButtonText,
              menuDetails.extension?.type === type && styles.optionButtonTextActive
            ]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {menuDetails.extension?.type && !['編み込み', 'シール', '羽', 'プル'].includes(menuDetails.extension.type) && (
        <TextInput
          style={styles.formInput}
          placeholder="その他の種類を入力"
          value={menuDetails.extension?.otherType || ''}
          onChangeText={(text) => updateMenuDetail('extension', 'otherType', text)}
          placeholderTextColor="#95A5A6"
        />
      )}
      
      <TouchableOpacity
        style={[
          styles.optionButton,
          menuDetails.extension?.type === 'その他' && styles.optionButtonActive
        ]}
        onPress={() => {
          updateMenuDetail('extension', 'type', 'その他');
        }}
      >
        <Text style={[
          styles.optionButtonText,
          menuDetails.extension?.type === 'その他' && styles.optionButtonTextActive
        ]}>
          その他
        </Text>
      </TouchableOpacity>
      
      {menuDetails.extension?.type === 'その他' && (
        <TextInput
          style={styles.formInput}
          placeholder="その他の種類を記入"
          value={menuDetails.extension?.otherType || ''}
          onChangeText={(text) => updateMenuDetail('extension', 'otherType', text)}
          placeholderTextColor="#95A5A6"
        />
      )}
      
      <Text style={styles.formLabel}>詳細情報</Text>
      <TextInput
        style={styles.formInput}
        placeholder="カラー（例：ブラウン、ブラック）"
        value={menuDetails.extension?.color || ''}
        onChangeText={(text) => updateMenuDetail('extension', 'color', text)}
        placeholderTextColor="#95A5A6"
      />
      <TextInput
        style={styles.formInput}
        placeholder="本数（例：100本、50束）"
        value={menuDetails.extension?.quantity || ''}
        onChangeText={(text) => updateMenuDetail('extension', 'quantity', text)}
        placeholderTextColor="#95A5A6"
      />
      <TextInput
        style={styles.formInput}
        placeholder="毛質（例：人毛、人工毛、ミックス）"
        value={menuDetails.extension?.quality || ''}
        onChangeText={(text) => updateMenuDetail('extension', 'quality', text)}
        placeholderTextColor="#95A5A6"
      />
      <TextInput
        style={[styles.formInput, styles.formTextArea]}
        placeholder="その他詳細（長さ、太さ、付け位置など）"
        value={menuDetails.extension?.details || ''}
        onChangeText={(text) => updateMenuDetail('extension', 'details', text)}
        multiline
        numberOfLines={3}
        placeholderTextColor="#95A5A6"
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filteredRecords}
        renderItem={renderRequestCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.requestsList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={{ height: 100 }} />
            <View style={styles.header}>
              <View style={styles.headerMainContent}>
                <View>
                  <Text style={styles.title}>カルテ記入リクエスト</Text>
                  <Text style={styles.subtitle}>顧客のカルテを記入してください</Text>
                </View>
              </View>
            </View>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, selectedTab === 'completed' && styles.activeTab]}
                onPress={() => setSelectedTab('completed')}
              >
                <Text style={[styles.tabText, selectedTab === 'completed' && styles.activeTabText]}>
                  記入済み
                </Text>
                {completedCount > 0 && (
                  <View style={[styles.badge, styles.completedBadge]}>
                    <Text style={styles.badgeText}>{completedCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, selectedTab === 'unwritten' && styles.activeTab]}
                onPress={() => setSelectedTab('unwritten')}
              >
                <Text style={[styles.tabText, selectedTab === 'unwritten' && styles.activeTabText]}>
                  未記入
                </Text>
                {unwrittenCount > 0 && (
                  <View style={[styles.badge, styles.unwrittenBadge]}>
                    <Text style={styles.badgeText}>{unwrittenCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {filteredRecords.length > 0 && (
              <View style={styles.deleteAllContainer}>
                {!selectionMode ? (
                  <>
                    <TouchableOpacity
                      style={styles.selectionButton}
                      onPress={() => setSelectionMode(true)}
                    >
                      <CheckCircle size={18} color="#87CEEB" />
                      <Text style={styles.selectionButtonText}>選択して削除</Text>
                    </TouchableOpacity>
                    {selectedTab === 'unwritten' && unwrittenCount > 0 && (
                      <TouchableOpacity
                        style={styles.deleteAllButton}
                        onPress={async () => {
                          Alert.alert(
                            '未記入カルテを全て削除',
                            `${unwrittenCount}件の未記入カルテを削除しますか？この操作は取り消せません。`,
                            [
                              { text: 'キャンセル', style: 'cancel' },
                              {
                                text: '削除',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    const deletedCount = await deleteAllUnwrittenRecords();
                                    Alert.alert(
                                      '削除完了',
                                      `${deletedCount}件の未記入カルテを削除しました`,
                                      [{ text: 'OK' }]
                                    );
                                  } catch (error) {

                                    Alert.alert('エラー', '未記入カルテの削除に失敗しました');
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Text style={styles.deleteAllButtonText}>すべて削除</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.cancelSelectionButton}
                      onPress={clearSelection}
                    >
                      <Text style={styles.cancelSelectionButtonText}>キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.selectAllButton}
                      onPress={selectAllRecords}
                    >
                      <Text style={styles.selectAllButtonText}>すべて選択</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.deleteSelectedButton,
                        selectedRecords.size === 0 && styles.deleteSelectedButtonDisabled
                      ]}
                      onPress={deleteSelectedRecords}
                      disabled={selectedRecords.size === 0}
                    >
                      <Text style={[
                        styles.deleteSelectedButtonText,
                        selectedRecords.size === 0 && styles.deleteSelectedButtonTextDisabled
                      ]}>削除 ({selectedRecords.size})</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Inbox size={64} color="#BDC3C7" />
            <Text style={styles.emptyStateTitle}>カルテがありません</Text>
            <Text style={styles.emptyStateText}>
              {selectedTab === 'completed'
                ? '記入済みのカルテはありません\nQRコードをスキャンしてカルテを記入しましょう'
                : '未記入のカルテはありません'}
            </Text>
          </View>
        }
        ListFooterComponent={
          filteredRecords.length > 0 ? (
            <View style={styles.listFooterNote}>
              <Text style={styles.listFooterNoteTitle}>📋 カルテ記入に関する重要な注意事項</Text>
              <Text style={styles.listFooterNoteText}>
カルテは正確に記入する必要がありますが、公開用に他の美容師に向けたニュアンス的な表現で記入することができます。正確なカルテの内容は担当施術者と運営のみが確認する権限を持ち、かつ運営はカルテの真偽性を明確にすること以外の使用を行わないものとします。
              </Text>
            </View>
          ) : null
        }
      />

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
                  const mockCustomerData = {
                    type: 'customer_qr',
                    customerId: 'customer_' + Date.now(),
                    customerName: 'テスト顧客',
                    timestamp: new Date().toISOString()
                  };
                  handleQRCodeScanned(JSON.stringify(mockCustomerData));
                }}
              >
                <Text style={styles.mockScanButtonText}>テストスキャン</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      <Modal
        visible={showRecordForm}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowRecordForm(false)}
      >
        <View style={styles.formContainer}>
          <View style={[styles.formHeader, { paddingTop: insets.top + 20 }]}>
            <TouchableOpacity
              style={styles.formCloseButton}
              onPress={resetForm}
            >
              <X size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>カルテ記入</Text>
            <View style={styles.formHeaderSpacer} />
          </View>
          
          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            {selectedCustomer && (
              <View>
                <View style={styles.customerInfoCard}>
                  <User size={24} color="#FF69B4" />
                  <View style={styles.customerInfoText}>
                    <Text style={styles.customerInfoName}>{selectedCustomer!.customerName}</Text>
                    <Text style={styles.customerInfoId}>ID: {selectedCustomer!.customerId}</Text>
                  </View>
                  {getTreatmentHistory(selectedCustomer!.customerId).length > 0 && (
                    <TouchableOpacity
                      style={styles.viewHistoryButton}
                      onPress={() => {
                        setSelectedCustomerHistory(selectedCustomer!.customerId);
                        setShowHistoryModal(true);
                      }}
                    >
                      <HistoryIcon size={20} color="#87CEEB" />
                      <Text style={styles.viewHistoryButtonText}>
                        {getTreatmentHistory(selectedCustomer!.customerId).length}回
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {getTreatmentHistory(selectedCustomer!.customerId).length > 0 && (
                  <View style={styles.quickHistorySection}>
                    <Text style={styles.quickHistoryTitle}>📋 最近の施術履歴</Text>
                    {getTreatmentHistory(selectedCustomer!.customerId).slice(0, 3).map((history, index) => (
                      <View key={history.id} style={styles.quickHistoryCard}>
                        <View style={styles.quickHistoryHeader}>
                          <Text style={styles.quickHistoryDate}>{history.serviceDate}</Text>
                          <Text style={styles.quickHistoryHairdresser}>{history.hairdresserName}</Text>
                        </View>
                        <Text style={styles.quickHistoryMenus}>
                          {Array.isArray(history.menus) ? history.menus.map(m => getMenuLabel(m)).join(', ') : '-'}
                        </Text>
                        {history.notes && (
                          <Text style={styles.quickHistoryNotes} numberOfLines={2}>{history.notes}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            
            <View style={styles.formInfoBanner}>
              <Text style={styles.formInfoBannerTitle}>📋 カルテ記入に関する重要な注意事項</Text>
              <Text style={styles.formInfoBannerText}>
カルテは正確に記入する必要がありますが、公開用に他の美容師に向けたニュアンス的な表現で記入することができます。正確なカルテの内容は担当施術者と運営のみが確認する権限を持ち、かつ運営はカルテの真偽性を明確にすること以外の使用を行わないものとします。
              </Text>
            </View>
            
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>施術メニュー選択 *</Text>
              <View style={styles.menuGrid}>
                {(['cut', 'color', 'perm', 'straightening', 'treatment', 'headspa', 'extension'] as MenuType[]).map((menu) => (
                  <TouchableOpacity
                    key={menu}
                    style={[
                      styles.menuChip,
                      selectedMenus.includes(menu) && styles.menuChipActive
                    ]}
                    onPress={() => toggleMenu(menu)}
                  >
                    <Text style={[
                      styles.menuChipText,
                      selectedMenus.includes(menu) && styles.menuChipTextActive
                    ]}>
                      {getMenuLabel(menu)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {selectedMenus.map((menu) => (
              <View key={menu} style={styles.menuDetailCard}>
                <TouchableOpacity
                  style={styles.menuDetailHeader}
                  onPress={() => toggleExpand(menu)}
                >
                  <Text style={styles.menuDetailTitle}>{getMenuLabel(menu)}</Text>
                  {expandedMenus[menu] ? (
                    <ChevronUp size={20} color="#2C3E50" />
                  ) : (
                    <ChevronDown size={20} color="#2C3E50" />
                  )}
                </TouchableOpacity>
                
                {expandedMenus[menu] && (
                  <>
                    {menu === 'cut' && renderCutForm()}
                    {menu === 'color' && renderColorForm()}
                    {menu === 'perm' && renderPermForm()}
                    {menu === 'straightening' && renderStraighteningForm()}
                    {menu === 'treatment' && renderTreatmentForm()}
                    {menu === 'headspa' && renderHeadSpaForm()}
                    {menu === 'extension' && renderExtensionForm()}
                  </>
                )}
              </View>
            ))}
            
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>施術メモ</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="施術の詳細、顧客の要望など"
                value={recordNotes}
                onChangeText={setRecordNotes}
                multiline
                numberOfLines={4}
                placeholderTextColor="#95A5A6"
              />
            </View>
            
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>受領金額（円） *</Text>
              <View style={styles.amountInputWrapper}>
                <Text style={styles.amountCurrency}>¥</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="例: 8000"
                  value={receivedAmount}
                  onChangeText={setReceivedAmount}
                  keyboardType="number-pad"
                  placeholderTextColor="#95A5A6"
                />
              </View>
              {receivedAmount && parseInt(receivedAmount) > 0 && (
                <View style={styles.btEstimate}>
                  <Text style={styles.btEstimateText}>
                    💰 獲得予定BT: {Math.floor(parseInt(receivedAmount) / 1000)}BT（{receivedAmount}円 ÷ 1000円）
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.formInfo}>
              <Text style={styles.formInfoText}>
                💡 カルテと受領金額を記入すると、顧客に評価依頼通知が送信されます。
              </Text>
              <Text style={styles.formInfoText}>
                ✅ 顧客が支払金額を入力して評価を完了し、金額が一致すると取引が成立してBTを獲得できます。
              </Text>
            </View>
          </ScrollView>
          
          <View style={styles.formFooter}>
            <TouchableOpacity
              style={styles.postponeButton}
              onPress={handlePostponeRecord}
            >
              <Clock size={20} color="#9B59B6" />
              <Text style={styles.postponeButtonText}>未記入として保存</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveRecord}
            >
              <Save size={20} color="white" />
              <Text style={styles.saveButtonText}>記入完了</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.historyModalContainer}>
          <View style={[styles.historyModalHeader, { paddingTop: insets.top + 20 }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowHistoryModal(false)}
            >
              <X size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.historyModalTitle}>施術履歴</Text>
            <View style={styles.formHeaderSpacer} />
          </View>

          <FlatList
            data={currentHistory}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.historyList}
            renderItem={({ item }) => (
              <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View>
                    <Text style={styles.historyDate}>{item.serviceDate}</Text>
                    <Text style={styles.historyHairdresser}>
                      施術: {item.hairdresserName}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.historyBody}>
                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>メニュー:</Text>
                    <Text style={styles.historyValue}>
                      {Array.isArray(item.menus) ? item.menus.map(m => getMenuLabel(m)).join(', ') : '-'}
                    </Text>
                  </View>
                  
                  {item.notes && (
                    <View style={styles.historyRow}>
                      <Text style={styles.historyLabel}>メモ:</Text>
                      <Text style={styles.historyValue}>{item.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyHistory}>
                <HistoryIcon size={48} color="#BDC3C7" />
                <Text style={styles.emptyHistoryTitle}>施術履歴がありません</Text>
                <Text style={styles.emptyHistoryText}>
                  この顧客の施術履歴はまだありません
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrScanButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activeTab: {
    backgroundColor: '#FF69B4',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  activeTabText: {
    color: 'white',
  },
  badge: {
    backgroundColor: '#F39C12',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  completedBadge: {
    backgroundColor: '#27AE60',
  },
  unwrittenBadge: {
    backgroundColor: '#F39C12',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold' as const,
    color: 'white',
  },
  requestsList: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    gap: 16,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  requestHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start' as const,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
  },
  timerBadgeNormal: {
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderColor: 'rgba(255, 105, 180, 0.3)',
  },
  timerBadgeWarning: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  timerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timerTextNormal: {
    color: '#FF69B4',
  },
  timerTextWarning: {
    color: '#E74C3C',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
  },
  historyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#87CEEB',
  },
  requestBody: {
    gap: 10,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7F8C8D',
  },
  infoValue: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
  },
  medicalRecordSection: {
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.2)',
  },
  medicalRecordHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  medicalRecordTitle: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#3498DB',
  },
  medicalRecordContent: {
    gap: 8,
  },
  medicalRecordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  medicalRecordValue: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    marginBottom: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  recordButton: {
    backgroundColor: '#FF69B4',
  },
  recordButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  formContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  formCloseButton: {
    padding: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  formHeaderSpacer: {
    width: 40,
  },
  formContent: {
    flex: 1,
    padding: 24,
  },
  customerInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
  },
  customerInfoText: {
    flex: 1,
  },
  customerInfoName: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  customerInfoId: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 12,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuChip: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  menuChipActive: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  menuChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  menuChipTextActive: {
    color: 'white',
  },
  menuDetailCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  menuDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  menuFormSection: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    minHeight: 50,
  },
  formTextArea: {
    minHeight: 100,
    textAlignVertical: 'top' as const,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  optionButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  optionButtonActive: {
    backgroundColor: '#87CEEB',
    borderColor: '#87CEEB',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: 'white',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  switchButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  switchButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  switchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  switchButtonTextActive: {
    color: 'white',
  },
  formInfo: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  formInfoText: {
    fontSize: 14,
    color: '#3498DB',
    lineHeight: 20,
  },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  postponeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#9B59B6',
  },
  postponeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9B59B6',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  historyModalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  historyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalCloseButton: {
    padding: 8,
  },
  historyModalTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  historyList: {
    padding: 24,
    gap: 16,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyDate: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  historyHairdresser: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  historyBody: {
    gap: 12,
  },
  historyRow: {
    gap: 4,
  },
  historyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  historyValue: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  expandedDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 152, 219, 0.2)',
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
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyHistoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingHorizontal: 16,
  },
  amountCurrency: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#7F8C8D',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    paddingVertical: 16,
  },
  btEstimate: {
    marginTop: 12,
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    padding: 12,
  },
  btEstimateText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  areaDetailSection: {
    backgroundColor: 'rgba(135, 206, 235, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.2)',
  },
  areaTitle: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#87CEEB',
    marginBottom: 8,
  },
  secondLiquidRow: {
    gap: 8,
  },
  secondLiquidInput: {
    flex: 1,
  },
  expiredCard: {
    backgroundColor: '#FFF5F5',
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
  expiredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  expiredTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#E74C3C',
  },
  expiredText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  infoNote: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 8,
    fontWeight: '600' as const,
    fontStyle: 'italic' as const,
  },
  publicSectionTitle: {
    fontSize: 14,
    color: '#FF69B4',
    marginTop: 12,
    marginBottom: 8,
    fontWeight: 'bold' as const,
  },
  noteSection: {
    backgroundColor: 'rgba(149, 165, 166, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(149, 165, 166, 0.3)',
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  listFooterNote: {
    backgroundColor: 'rgba(149, 165, 166, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 100,
    borderWidth: 1,
    borderColor: 'rgba(149, 165, 166, 0.3)',
  },
  listFooterNoteTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 8,
  },
  listFooterNoteText: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  formInfoBanner: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
  },
  formInfoBannerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#3498DB',
    marginBottom: 8,
  },
  formInfoBannerText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 20,
  },
  copyButtonWrapper: {
    marginBottom: 12,
  },
  copyToPublicButton: {
    backgroundColor: 'rgba(135, 206, 235, 0.15)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#87CEEB',
    alignItems: 'center',
  },
  copyToPublicButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#87CEEB',
  },
  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
  },
  viewHistoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#87CEEB',
  },
  quickHistorySection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 12,
  },
  quickHistoryCard: {
    backgroundColor: 'rgba(135, 206, 235, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.15)',
  },
  quickHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickHistoryDate: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  quickHistoryHairdresser: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  quickHistoryMenus: {
    fontSize: 13,
    color: '#3498DB',
    marginBottom: 4,
  },
  quickHistoryNotes: {
    fontSize: 12,
    color: '#7F8C8D',
    lineHeight: 16,
  },
  deleteAllContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    flexDirection: 'row' as const,
    gap: 12,
  },
  selectionButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    borderWidth: 2,
    borderColor: '#87CEEB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#87CEEB',
  },
  deleteAllButton: {
    flex: 1,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteAllButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  cancelSelectionButton: {
    flex: 1,
    backgroundColor: '#7F8C8D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelSelectionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  selectAllButton: {
    flex: 1,
    backgroundColor: '#87CEEB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectAllButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  deleteSelectedButton: {
    flex: 1,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteSelectedButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  deleteSelectedButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  deleteSelectedButtonTextDisabled: {
    color: '#ECF0F1',
  },
  selectionCheckbox: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    zIndex: 10,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#BDC3C7',
    backgroundColor: 'white',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkboxSelected: {
    borderColor: '#FF69B4',
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
  },
  recordPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#F5F5F5',
  },
});
