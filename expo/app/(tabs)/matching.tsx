import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform, Image, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { useMatching, MatchingRequest, Match } from '@/providers/MatchingProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFavorites, ScoutRequest as ScoutRequestType } from '@/providers/FavoriteProvider';
import { Users, MapPin, Calendar, Clock, FileText, Plus, X, CheckCircle, AlertCircle, Star, Navigation, ChevronDown, Map, Send } from 'lucide-react-native';
import * as Location from 'expo-location';
import WalletBalanceHeader from '@/components/WalletBalanceHeader';


interface BudgetRangeSliderProps {
  minBudget: number;
  maxBudget: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}

function BudgetRangeSlider({ minBudget, maxBudget, onMinChange, onMaxChange }: BudgetRangeSliderProps) {
  const sliderContainerRef = useRef<View>(null);
  const [sliderWidth, setSliderWidth] = useState(280);

  const calculateValue = (pageX: number, sliderLeft: number) => {
    const percentage = Math.max(0, Math.min(1, (pageX - sliderLeft) / sliderWidth));
    return Math.round(percentage * 100000 / 1000) * 1000;
  };

  const minPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {

      },
      onPanResponderMove: (evt, gestureState) => {
        sliderContainerRef.current?.measureInWindow((x) => {
          const newMin = calculateValue(evt.nativeEvent.pageX, x);
          if (newMin < maxBudget - 1000 && newMin >= 0) {
            onMinChange(newMin);
          }
        });
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const maxPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {

      },
      onPanResponderMove: (evt, gestureState) => {
        sliderContainerRef.current?.measureInWindow((x) => {
          const newMax = calculateValue(evt.nativeEvent.pageX, x);
          if (newMax > minBudget + 1000 && newMax <= 100000) {
            onMaxChange(newMax);
          }
        });
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <View style={styles.sliderSection}>
      <View style={styles.sliderLabelsRow}>
        <Text style={styles.sliderLabel}>最低: ¥{minBudget.toLocaleString()}</Text>
        <Text style={styles.sliderLabel}>最高: ¥{maxBudget.toLocaleString()}</Text>
      </View>
      <View
        ref={sliderContainerRef}
        style={styles.sliderContainer}
        onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.sliderTrack}>
          <View
            style={[
              styles.sliderFill,
              {
                left: `${(minBudget / 100000) * 100}%`,
                right: `${100 - (maxBudget / 100000) * 100}%`,
              },
            ]}
          />
        </View>
        <View
          {...minPanResponder.panHandlers}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={[
            styles.sliderThumb,
            { left: `${(minBudget / 100000) * 100}%` },
          ]}
        />
        <View
          {...maxPanResponder.panHandlers}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={[
            styles.sliderThumb,
            { left: `${(maxBudget / 100000) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

export default function MatchingScreen() {
  return (
    <LinearGradient colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']} style={{ flex: 1 }}>
      <MatchingContent />
    </LinearGradient>
  );
}

function MatchingContent() {
  const { user } = useAuth();
  const { requests, matches, reloadData, createRequest, updateRequest, cancelRequest, scoutCustomer, acceptScout, rejectScout, requestCancellation, approveCancellation, rejectCancellation, getCustomerRequests, getHairdresserMatches } = useMatching();
  const { getCustomersWhoFavorited, createScoutRequest, getScoutRequestsByHairdresser, getScoutRequestsForCustomer, acceptScoutRequest, rejectScoutRequest, cancelScoutRequest } = useFavorites();
  const insets = useSafeAreaInsets();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    desiredDate: string;
    desiredTime: string;
    menu: string[];
    concerns: string;
    budgetRange: string;
    address: string;
    latitude: number;
    longitude: number;
    minBudget: number;
    maxBudget: number;
  }>({
    desiredDate: '',
    desiredTime: '',
    menu: [],
    concerns: '',
    budgetRange: '',
    address: '',
    latitude: 0,
    longitude: 0,
    minBudget: 0,
    maxBudget: 100000,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showMenuPicker, setShowMenuPicker] = useState(false);
  const [mapLoading, setMapLoading] = useState<Record<string, boolean>>({});
  const [mapError, setMapError] = useState<Record<string, boolean>>({});
  const [showScoutModal, setShowScoutModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [showScoutMessageModal, setShowScoutMessageModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MatchingRequest | null>(null);
  const [scoutMessageData, setScoutMessageData] = useState<{
    message: string;
    proposedPrice: string;
  }>({
    message: '',
    proposedPrice: '',
  });
  const [scoutFormData, setScoutFormData] = useState<{
    desiredDate: string;
    desiredTime: string;
    menu: string[];
    menuCombinations: string[][];
    address: string;
    latitude: number;
    longitude: number;
  }>({
    desiredDate: '',
    desiredTime: '',
    menu: [],
    menuCombinations: [],
    address: '',
    latitude: 0,
    longitude: 0,
  });

  const menuOptions = ['カット', 'カラー', 'パーマ', '縮毛矯正', 'トリートメント', 'ヘッドスパ', 'エクステ'];
  const timeOptions = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    '21:00', '21:30', '22:00', '22:30', '23:00'
  ];

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        label: date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }),
        value: date.toISOString().split('T')[0]
      });
    }
    return dates;
  };

  const isCustomer = user?.role === 'customer';
  const customerRequests = isCustomer && user ? getCustomerRequests(user.id) : [];
  const hairdresserMatches = !isCustomer && user ? getHairdresserMatches(user.id) : [];
  const hairdresserScoutPending = hairdresserMatches.filter(m => m.status === 'scout_pending');
  const hairdresserHistory = hairdresserMatches.filter(m => m.status === 'booking_confirmed' || m.status === 'completed' || m.status === 'cancelled' || m.status === 'rejected');
  const pendingRequests = !isCustomer ? requests.filter(r => {
    const hasExistingMatch = matches.some(m => m.requestId === r.id && m.hairdresserId === user?.id);
    return r.status === 'pending' && !hasExistingMatch;
  }) : [];
  
  
  const receivedMatchScouts = isCustomer && user 
    ? matches.filter(m => m.customerId === user.id && m.status === 'scout_pending')
    : [];
  
  const receivedScoutRequests = isCustomer && user
    ? getScoutRequestsForCustomer(user.id)
    : [];
  
  const totalReceivedScouts = receivedMatchScouts.length + receivedScoutRequests.length;
  
  const acceptedMatches = isCustomer && user
    ? matches.filter(m => m.customerId === user.id && (m.status === 'booking_confirmed' || m.status === 'completed' || m.status === 'cancelled'))
    : [];
  
  
  const [selectedTab, setSelectedTab] = useState<'requests' | 'scouts' | 'history'>('scouts');
  const currentSelectedTab = selectedTab as 'requests' | 'scouts' | 'history';
  const [hairdresserSelectedTab, setHairdresserSelectedTab] = useState<'pending' | 'scouted' | 'history'>('pending');
  const currentHairdresserTab = hairdresserSelectedTab as 'pending' | 'scouted' | 'history';
  const [showScoutHistorySection, setShowScoutHistorySection] = useState(false);

  const handleGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('エラー', '位置情報の許可が必要です');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = addressResult
        ? `${addressResult.region || ''}${addressResult.city || ''}${addressResult.district || ''}${addressResult.street || ''}`
        : `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;

      setFormData(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
      }));

      Alert.alert('成功', '現在地を取得しました');
    } catch (error) {

      Alert.alert('エラー', '位置情報の取得に失敗しました');
    }
  };

  const handleCreateRequest = async () => {
    if (!user) return;

    if (!formData.desiredDate) {
      Alert.alert('エラー', '希望日を選択してください');
      return;
    }

    if (!formData.desiredTime) {
      Alert.alert('エラー', '希望時間を選択してください');
      return;
    }

    if (formData.menu.length === 0) {
      Alert.alert('エラー', 'メニューを選択してください');
      return;
    }

    if (!formData.concerns.trim()) {
      Alert.alert('エラー', '髪の悩みを入力してください');
      return;
    }

    if (formData.minBudget >= formData.maxBudget) {
      Alert.alert('エラー', '希望価格帯が正しくありません');
      return;
    }

    if (!formData.address.trim()) {
      Alert.alert('エラー', '希望場所を入力してください');
      return;
    }

    if (editingRequestId) {
      await updateRequest(editingRequestId, {
        desiredDate: formData.desiredDate,
        desiredTime: formData.desiredTime,
        menu: formData.menu,
        concerns: formData.concerns,
        budgetRange: `¥${formData.minBudget.toLocaleString()}〜¥${formData.maxBudget.toLocaleString()}`,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
      });
      Alert.alert('更新完了', 'マッチング申請を更新しました');
    } else {
      await createRequest({
        customerId: user.id,
        customerName: user.name,
        desiredDate: formData.desiredDate,
        desiredTime: formData.desiredTime,
        menu: formData.menu,
        concerns: formData.concerns,
        budgetRange: `¥${formData.minBudget.toLocaleString()}〜¥${formData.maxBudget.toLocaleString()}`,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
      });
      Alert.alert(
        'マッチング申請完了',
        'あなたの希望を登録しました。\n\n美容師があなたの申請を確認し、スカウトすることができます。マッチングが成立すると通知されます。',
        [{ text: 'OK' }]
      );
    }

    setShowCreateModal(false);
    setEditingRequestId(null);
    setFormData({
      desiredDate: '',
      desiredTime: '',
      menu: [],
      concerns: '',
      budgetRange: '',
      address: '',
      latitude: 0,
      longitude: 0,
      minBudget: 0,
      maxBudget: 100000,
    });
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowMenuPicker(false);
  };

  const handleScoutCustomer = async (request: MatchingRequest) => {
    if (!user) return;

    setSelectedRequest(request);
    setScoutMessageData({
      message: '',
      proposedPrice: '',
    });
    setShowScoutMessageModal(true);
  };

  const handleSendScout = async () => {
    if (!user || !selectedRequest) return;

    if (!scoutMessageData.message.trim()) {
      Alert.alert('エラー', '一言メッセージを入力してください');
      return;
    }

    if (!scoutMessageData.proposedPrice.trim()) {
      Alert.alert('エラー', '提案価格を入力してください');
      return;
    }

    const proposedPrice = parseInt(scoutMessageData.proposedPrice.replace(/[^0-9]/g, ''));
    if (isNaN(proposedPrice) || proposedPrice <= 0) {
      Alert.alert('エラー', '有効な価格を入力してください');
      return;
    }

    try {
      
      await scoutCustomer(selectedRequest.id, user.id, user.name, scoutMessageData.message, proposedPrice);
      

      
      await reloadData();

      
      setShowScoutMessageModal(false);
      setSelectedRequest(null);
      setScoutMessageData({ message: '', proposedPrice: '' });
      
      Alert.alert(
        'スカウト送信完了',
        `${selectedRequest.customerName}さんにスカウト申請を送信しました。\n\n顧客が承認すると、予約が成立します。`,
        [{ text: 'OK' }]
      );
    } catch (error) {

      Alert.alert('エラー', 'スカウト送信に失敗しました');
    }
  };

  const handleAcceptScout = async (matchId: string, hairdresserId: string, hairdresserName: string) => {
    await acceptScout(matchId);
    
    Alert.alert(
      'マッチング成立',
      `${hairdresserName}さんとのマッチングが成立しました！\n\n予約が確定しました。`,
      [{ text: 'OK' }]
    );
  };

  const handleRejectScout = async (matchId: string) => {
    Alert.alert(
      '辞退の確認',
      'このスカウトを辞退しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '辞退する',
          style: 'destructive',
          onPress: async () => {
            await rejectScout(matchId);
            Alert.alert('辞退完了', 'スカウトを辞退しました');
          },
        },
      ]
    );
  };

  const handleRequestCancellation = async (matchId: string, hairdresserName: string) => {
    if (!user) return;

    Alert.prompt(
      '予約取り消し申請',
      `${hairdresserName}さんとの予約を取り消しますか？\n\n取り消し理由を入力してください:`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '申請する',
          onPress: async (reason?: string) => {
            if (!reason || !reason.trim()) {
              Alert.alert('エラー', '取り消し理由を入力してください');
              return;
            }
            await requestCancellation(matchId, user.role === 'customer' ? 'customer' : 'hairdresser', reason);
            Alert.alert(
              '申請完了',
              '予約取り消し申請を送信しました。\n\n相手が承認すると予約が取り消されます。'
            );
          },
        },
      ],
      'plain-text'
    );
  };

  const handleCancellationResponse = async (matchId: string, approve: boolean, requestedBy: string) => {
    if (approve) {
      Alert.alert(
        '承認の確認',
        `${requestedBy === 'customer' ? '顧客' : '美容師'}からの予約取り消し申請を承認しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '承認する',
            onPress: async () => {
              await approveCancellation(matchId);
              Alert.alert('承認完了', '予約が取り消されました');
            },
          },
        ]
      );
    } else {
      await rejectCancellation(matchId);
      Alert.alert('却下完了', '予約取り消し申請を却下しました');
    }
  };

  const customersWhoFavorited = !isCustomer && user ? getCustomersWhoFavorited(user.id) : [];
  const hairdresserScoutRequests = !isCustomer && user ? getScoutRequestsByHairdresser(user.id) : [];

  const handleScoutFavoritedCustomer = (customerId: string, customerName: string) => {
    setSelectedCustomer({ id: customerId, name: customerName });
    setScoutFormData({
      desiredDate: '',
      desiredTime: '',
      menu: [],
      menuCombinations: [],
      address: user?.address || '',
      latitude: user?.latitude || 0,
      longitude: user?.longitude || 0,
    });
    setShowScoutModal(true);
  };

  const handleSendScoutRequest = async () => {
    if (!user || !selectedCustomer) return;

    if (!scoutFormData.desiredDate) {
      Alert.alert('エラー', '希望日を選択してください');
      return;
    }

    if (!scoutFormData.desiredTime) {
      Alert.alert('エラー', '希望時間を選択してください');
      return;
    }

    if (scoutFormData.menu.length === 0) {
      Alert.alert('エラー', '最低1つのメニューを選択してください');
      return;
    }

    if (scoutFormData.menuCombinations.length === 0) {
      Alert.alert('エラー', '対応可能なメニューの組み合わせを選択してください');
      return;
    }

    if (!scoutFormData.address.trim()) {
      Alert.alert('エラー', '場所を入力してください');
      return;
    }

    await createScoutRequest({
      hairdresserId: user.id,
      hairdresserName: user.name,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      desiredDate: scoutFormData.desiredDate,
      desiredTime: scoutFormData.desiredTime,
      menu: scoutFormData.menu,
      menuCombinations: scoutFormData.menuCombinations,
      address: scoutFormData.address,
      latitude: scoutFormData.latitude,
      longitude: scoutFormData.longitude,
    });

    Alert.alert(
      '呼び込み申請送信完了',
      `${selectedCustomer.name}さんに呼び込み申請を送信しました。\n\nキャンセル待ちの顧客に急遽枠を開放できます。顧客が承認すると、予約が成立します。`,
      [{ text: 'OK' }]
    );

    setShowScoutModal(false);
    setSelectedCustomer(null);
    setScoutFormData({
      desiredDate: '',
      desiredTime: '',
      menu: [],
      menuCombinations: [],
      address: '',
      latitude: 0,
      longitude: 0,
    });
  };

  const handleEditRequest = (request: MatchingRequest) => {
    let minBudget = 0;
    let maxBudget = 100000;
    
    if (request.budgetRange) {
      const match = request.budgetRange.match(/¥([\d,]+)〜¥([\d,]+)/);
      if (match) {
        minBudget = parseInt(match[1].replace(/,/g, ''));
        maxBudget = parseInt(match[2].replace(/,/g, ''));
      }
    }
    
    setFormData({
      desiredDate: request.desiredDate || '',
      desiredTime: request.desiredTime || '',
      menu: request.menu,
      concerns: request.concerns,
      budgetRange: request.budgetRange || '',
      address: request.address || '',
      latitude: request.latitude || 0,
      longitude: request.longitude || 0,
      minBudget,
      maxBudget,
    });
    setEditingRequestId(request.id);
    setShowCreateModal(true);
  };

  const handleAcceptScoutRequest = async (scoutRequestId: string, hairdresserName: string) => {
    try {
      await acceptScoutRequest(scoutRequestId);
      
      Alert.alert(
        'マッチング成立',
        `${hairdresserName}さんとのマッチングが成立しました！\n\n予約が確定しました。`,
        [{ text: 'OK' }]
      );
    } catch (error) {

      Alert.alert('エラー', '呼び込み承認に失敗しました');
    }
  };

  const handleRejectScoutRequest = async (scoutRequestId: string) => {
    Alert.alert(
      '辞退の確認',
      'この呼び込みを辞退しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '辞退する',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectScoutRequest(scoutRequestId);
              Alert.alert('辞退完了', '呼び込みを辞退しました');
            } catch (error) {

              Alert.alert('エラー', '呼び込み辞退に失敗しました');
            }
          },
        },
      ]
    );
  };

  const renderScoutRequestCard = (scoutReq: ScoutRequestType) => {
    return (
      <View style={styles.scoutCard}>
        <View style={styles.scoutHeader}>
          <View style={styles.scoutHeaderLeft}>
            <View style={styles.hairdresserInfo}>
              <Star size={20} color="#FFD700" fill="#FFD700" />
              <Text style={styles.hairdresserName}>{scoutReq.hairdresserName}</Text>
            </View>
            <View style={[styles.scoutBadge, { backgroundColor: 'rgba(255, 215, 0, 0.2)' }]}>
              <Text style={[styles.scoutBadgeText, { color: '#FFD700' }]}>呼び込みが届きました</Text>
            </View>
          </View>
          <Text style={styles.scoutDate}>
            {new Date(scoutReq.createdAt).toLocaleDateString('ja-JP')}
          </Text>
        </View>

        <View style={styles.scoutBody}>
          <View style={styles.requestInfoSection}>
            <Text style={styles.requestInfoLabel}>美容師からの提案</Text>
            
            {scoutReq.desiredDate && (
              <View style={styles.infoRow}>
                <Calendar size={16} color="#FF69B4" />
                <Text style={styles.infoLabel}>希望日:</Text>
                <Text style={styles.infoValue}>{scoutReq.desiredDate}</Text>
              </View>
            )}
            
            {scoutReq.desiredTime && (
              <View style={styles.infoRow}>
                <Clock size={16} color="#87CEEB" />
                <Text style={styles.infoLabel}>希望時間:</Text>
                <Text style={styles.infoValue}>{scoutReq.desiredTime}</Text>
              </View>
            )}

            {scoutReq.menu && Array.isArray(scoutReq.menu) && scoutReq.menu.length > 0 && (
              <View style={styles.infoRow}>
                <FileText size={16} color="#4CAF50" />
                <Text style={styles.infoLabel}>メニュー:</Text>
                <Text style={styles.infoValue}>{scoutReq.menu.join(', ')}</Text>
              </View>
            )}

            {scoutReq.menuCombinations && scoutReq.menuCombinations.length > 0 && (
              <View style={styles.menuCombinationsInfo}>
                <Text style={styles.menuCombinationsLabel}>対応可能な組み合わせ:</Text>
                {scoutReq.menuCombinations.map((combo, idx) => (
                  <View key={idx} style={styles.menuCombinationChip}>
                    <Text style={styles.menuCombinationText}>{combo.join(' + ')}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.infoRow}>
              <MapPin size={16} color="#D4AF37" />
              <Text style={styles.infoLabel}>場所:</Text>
              <Text style={styles.infoValue}>{scoutReq.address}</Text>
            </View>
          </View>

          <View style={[styles.scoutMessageSection, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
            <Text style={[styles.scoutMessageLabel, { color: '#FFD700' }]}>💡 この呼び込みについて</Text>
            <Text style={styles.scoutMessageText}>• キャンセル待ちや急な空き時間を活用できます</Text>
            <Text style={styles.scoutMessageText}>• {scoutReq.hairdresserName}さんからの直接提案です</Text>
            <Text style={styles.scoutMessageText}>• 承認すると予約が成立します</Text>
          </View>
        </View>

        <View style={styles.scoutActions}>
          <TouchableOpacity
            style={styles.scoutRejectButton}
            onPress={() => handleRejectScoutRequest(scoutReq.id)}
          >
            <X size={18} color="#E74C3C" />
            <Text style={styles.scoutRejectButtonText}>辞退</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scoutAcceptButton, { backgroundColor: '#FFD700' }]}
            onPress={() => handleAcceptScoutRequest(scoutReq.id, scoutReq.hairdresserName)}
          >
            <CheckCircle size={18} color="white" />
            <Text style={styles.scoutAcceptButtonText}>承認する</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderScoutCard = (match: Match) => {
    const request = requests.find(r => r.id === match.requestId);
    if (!request) return null;

    return (
      <View style={styles.scoutCard}>
        <View style={styles.scoutHeader}>
          <View style={styles.scoutHeaderLeft}>
            <View style={styles.hairdresserInfo}>
              <Star size={20} color="#FF69B4" />
              <Text style={styles.hairdresserName}>{match.hairdresserName}</Text>
            </View>
            <View style={styles.scoutBadge}>
              <Text style={styles.scoutBadgeText}>スカウトが届きました</Text>
            </View>
          </View>
          <Text style={styles.scoutDate}>
            {new Date(match.matchedAt).toLocaleDateString('ja-JP')}
          </Text>
        </View>

        <View style={styles.scoutBody}>
          <View style={styles.requestInfoSection}>
            <Text style={styles.requestInfoLabel}>あなたの申請内容</Text>
            
            {request.desiredDate && (
              <View style={styles.infoRow}>
                <Calendar size={16} color="#FF69B4" />
                <Text style={styles.infoLabel}>希望日:</Text>
                <Text style={styles.infoValue}>{request.desiredDate}</Text>
              </View>
            )}
            
            {request.desiredTime && (
              <View style={styles.infoRow}>
                <Clock size={16} color="#87CEEB" />
                <Text style={styles.infoLabel}>希望時間:</Text>
                <Text style={styles.infoValue}>{request.desiredTime}</Text>
              </View>
            )}

            {request.menu && Array.isArray(request.menu) && request.menu.length > 0 && (
              <View style={styles.infoRow}>
                <FileText size={16} color="#4CAF50" />
                <Text style={styles.infoLabel}>メニュー:</Text>
                <Text style={styles.infoValue}>{request.menu.join(', ')}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <MapPin size={16} color="#D4AF37" />
              <Text style={styles.infoLabel}>場所:</Text>
              <Text style={styles.infoValue}>{request.address}</Text>
            </View>
          </View>

          {match.scoutMessage && (
            <View style={[styles.scoutMessageSection, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
              <Text style={[styles.scoutMessageLabel, { color: '#3498DB' }]}>💬 美容師からのメッセージ</Text>
              <Text style={[styles.scoutMessageText, { fontWeight: '600' }]}>{match.scoutMessage}</Text>
            </View>
          )}

          {match.proposedPrice && match.proposedPrice > 0 && (
            <View style={[styles.scoutMessageSection, { backgroundColor: 'rgba(46, 204, 113, 0.1)' }]}>
              <Text style={[styles.scoutMessageLabel, { color: '#2ECC71' }]}>💰 提案価格</Text>
              <Text style={[styles.scoutMessageText, { fontSize: 20, fontWeight: 'bold', color: '#2ECC71' }]}>¥{match.proposedPrice.toLocaleString()}</Text>
            </View>
          )}

          <View style={styles.scoutMessageSection}>
            <Text style={styles.scoutMessageLabel}>💡 このスカウトを承認すると</Text>
            <Text style={styles.scoutMessageText}>• 予約が成立します</Text>
            <Text style={styles.scoutMessageText}>• {match.hairdresserName}さんとのマッチングが確定します</Text>
          </View>
        </View>

        <View style={styles.scoutActions}>
          <TouchableOpacity
            style={styles.scoutRejectButton}
            onPress={() => handleRejectScout(match.id)}
          >
            <X size={18} color="#E74C3C" />
            <Text style={styles.scoutRejectButtonText}>辞退</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.scoutAcceptButton}
            onPress={() => handleAcceptScout(match.id, match.hairdresserId, match.hairdresserName)}
          >
            <CheckCircle size={18} color="white" />
            <Text style={styles.scoutAcceptButtonText}>承認する</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCustomerRequest = ({ item }: { item: MatchingRequest }) => {
    const match = matches.find(m => m.requestId === item.id && m.customerId === user?.id);
    
    const displayStatus = match && match.status === 'scout_pending' ? 'pending' : item.status;
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.requestHeaderLeft}>
            <Text style={styles.requestTitle}>マッチング申請</Text>
            <View style={[styles.statusBadge, getStatusStyle(displayStatus)]}>
              {getStatusIcon(displayStatus)}
              <Text style={[styles.statusText, getStatusTextStyle(displayStatus)]}>
                {getStatusLabel(displayStatus)}
              </Text>
            </View>
          </View>
          <Text style={styles.requestDate}>
            {new Date(item.requestDate).toLocaleDateString('ja-JP')}
          </Text>
        </View>

        <View style={styles.requestBody}>
          {item.desiredDate && (
            <View style={styles.infoRow}>
              <Calendar size={16} color="#FF69B4" />
              <Text style={styles.infoLabel}>希望日:</Text>
              <Text style={styles.infoValue}>{item.desiredDate}</Text>
            </View>
          )}
          
          {item.desiredTime && (
            <View style={styles.infoRow}>
              <Clock size={16} color="#87CEEB" />
              <Text style={styles.infoLabel}>希望時間:</Text>
              <Text style={styles.infoValue}>{item.desiredTime}</Text>
            </View>
          )}

          {item.menu && Array.isArray(item.menu) && item.menu.length > 0 && (
            <View style={styles.infoRow}>
              <FileText size={16} color="#4CAF50" />
              <Text style={styles.infoLabel}>メニュー:</Text>
              <Text style={styles.infoValue}>{item.menu.join(', ')}</Text>
            </View>
          )}

          <View style={styles.concernsSection}>
            <Text style={styles.concernsLabel}>悩み:</Text>
            <Text style={styles.concernsText}>{item.concerns}</Text>
          </View>

          {item.budgetRange && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>希望価格帯:</Text>
              <Text style={styles.infoValue}>{item.budgetRange}</Text>
            </View>
          )}

          <View style={styles.locationSection}>
            <View style={styles.infoRow}>
              <MapPin size={16} color="#D4AF37" />
              <Text style={styles.infoLabel}>場所:</Text>
              <Text style={styles.infoValue}>{item.address}</Text>
            </View>
            {item.latitude && item.longitude && (
              <View style={styles.mapContainer}>
                <View style={styles.mapImageWrapper}>
                  {mapLoading[item.id] && !mapError[item.id] && (
                    <View style={styles.mapPlaceholder}>
                      <Map size={32} color="#95A5A6" />
                      <Text style={styles.mapPlaceholderText}>地図を読み込み中...</Text>
                    </View>
                  )}
                  {mapError[item.id] && (
                    <View style={styles.mapPlaceholder}>
                      <MapPin size={32} color="#E74C3C" />
                      <Text style={styles.mapPlaceholderText}>地図の読み込みに失敗しました</Text>
                      <Text style={styles.mapPlaceholderSubtext}>{item.address}</Text>
                    </View>
                  )}
                  <Image
                    source={{
                      uri: `https://maps.googleapis.com/maps/api/staticmap?center=${item.latitude},${item.longitude}&zoom=14&size=600x200&maptype=roadmap&markers=color:red%7C${item.latitude},${item.longitude}&key=AIzaSyBZib4Lvp0g7LU0XXVrC9JF-lVO-IsNjAM`,
                    }}
                    style={styles.mapImage}
                    onLoadStart={() => {
                      setMapLoading(prev => ({ ...prev, [item.id]: true }));
                    }}
                    onLoad={() => {
                      setMapLoading(prev => ({ ...prev, [item.id]: false }));
                      setMapError(prev => ({ ...prev, [item.id]: false }));
                    }}
                    onError={() => {
                      setMapLoading(prev => ({ ...prev, [item.id]: false }));
                      setMapError(prev => ({ ...prev, [item.id]: true }));
                    }}
                    resizeMode="cover"
                  />
                </View>
              </View>
            )}
          </View>

          {item.matchedHairdresserName && (
            <View style={styles.matchedSection}>
              <Users size={18} color="#FF69B4" />
              <Text style={styles.matchedText}>
                {item.matchedHairdresserName}さんからスカウトが届いています
              </Text>
            </View>
          )}
        </View>

        {match && match.status === 'scout_pending' && (
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleRejectScout(match.id)}
            >
              <X size={18} color="#E74C3C" />
              <Text style={styles.rejectButtonText}>辞退</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptScout(match.id, match.hairdresserId, match.hairdresserName)}
            >
              <CheckCircle size={18} color="white" />
              <Text style={styles.acceptButtonText}>承認</Text>
            </TouchableOpacity>
          </View>
        )}

        {match && match.status === 'booking_confirmed' && (
          <View style={styles.confirmedSection}>
            {match.cancelRequestBy ? (
              <View style={styles.cancelRequestSection}>
                <View style={styles.cancelRequestHeader}>
                  <AlertCircle size={20} color="#FF6B6B" />
                  <Text style={styles.cancelRequestTitle}>
                    {match.cancelRequestBy === 'customer' ? '美容師' : '顧客'}から予約取り消し申請
                  </Text>
                </View>
                <View style={styles.cancelReasonBox}>
                  <Text style={styles.cancelReasonLabel}>理由:</Text>
                  <Text style={styles.cancelReasonText}>{match.cancelReason}</Text>
                </View>
                {match.cancelRequestBy !== (user?.role === 'customer' ? 'customer' : 'hairdresser') && (
                  <View style={styles.cancelResponseActions}>
                    <TouchableOpacity
                      style={styles.cancelRejectButton}
                      onPress={() => handleCancellationResponse(match.id, false, match.cancelRequestBy!)}
                    >
                      <X size={16} color="#7F8C8D" />
                      <Text style={styles.cancelRejectButtonText}>却下</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelApproveButton}
                      onPress={() => handleCancellationResponse(match.id, true, match.cancelRequestBy!)}
                    >
                      <CheckCircle size={16} color="white" />
                      <Text style={styles.cancelApproveButtonText}>承認</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {match.cancelRequestBy === (user?.role === 'customer' ? 'customer' : 'hairdresser') && (
                  <View style={styles.waitingSection}>
                    <Clock size={16} color="#95A5A6" />
                    <Text style={styles.waitingText}>相手の承認待ちです</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.confirmedActions}>
                <TouchableOpacity
                  style={styles.cancelRequestButton}
                  onPress={() => handleRequestCancellation(match.id, match.hairdresserName)}
                >
                  <X size={18} color="#E74C3C" />
                  <Text style={styles.cancelRequestButtonText}>予約取り消し申請</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {match && match.status === 'cancelled' && (
          <View style={styles.statusBanner}>
            <AlertCircle size={18} color="#95A5A6" />
            <Text style={styles.statusBannerText}>予約が取り消されました</Text>
          </View>
        )}

        {match && match.status === 'completed' && (
          <View style={styles.statusBanner}>
            <CheckCircle size={18} color="#2ECC71" />
            <Text style={[styles.statusBannerText, { color: '#2ECC71' }]}>完了</Text>
          </View>
        )}

        {item.status === 'pending' && (
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditRequest(item)}
            >
              <FileText size={16} color="#3498DB" />
              <Text style={styles.editButtonText}>編集</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelRequestButton}
              onPress={async () => {
                await cancelRequest(item.id);
                Alert.alert('取り消し完了', 'マッチング申請を取り消しました。\n\nいつでも新しい申請を作成できます。');
              }}
            >
              <X size={16} color="#E74C3C" />
              <Text style={styles.cancelRequestButtonText}>申請を取り消す</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderHairdresserRequest = ({ item }: { item: MatchingRequest }) => {
    const hasScoutedThisRequest = matches.some(
      m => m.requestId === item.id && m.hairdresserId === user?.id
    );

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.requestHeaderLeft}>
            <View style={styles.customerInfo}>
              <Users size={18} color="#FF69B4" />
              <Text style={styles.customerName}>{item.customerName}</Text>
            </View>
          </View>
          <Text style={styles.requestDate}>
            {new Date(item.requestDate).toLocaleString('ja-JP', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>

        <View style={styles.requestBody}>
          {item.desiredDate && (
            <View style={styles.infoRow}>
              <Calendar size={16} color="#FF69B4" />
              <Text style={styles.infoLabel}>希望日:</Text>
              <Text style={styles.infoValue}>{item.desiredDate}</Text>
            </View>
          )}
          
          {item.desiredTime && (
            <View style={styles.infoRow}>
              <Clock size={16} color="#87CEEB" />
              <Text style={styles.infoLabel}>希望時間:</Text>
              <Text style={styles.infoValue}>{item.desiredTime}</Text>
            </View>
          )}

          {item.menu && Array.isArray(item.menu) && item.menu.length > 0 && (
            <View style={styles.infoRow}>
              <FileText size={16} color="#4CAF50" />
              <Text style={styles.infoLabel}>メニュー:</Text>
              <Text style={styles.infoValue}>{item.menu.join(', ')}</Text>
            </View>
          )}

          <View style={styles.concernsSection}>
            <Text style={styles.concernsLabel}>顧客の悩み:</Text>
            <Text style={styles.concernsText}>{item.concerns}</Text>
          </View>

          {item.budgetRange && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>希望価格帯:</Text>
              <Text style={styles.infoValue}>{item.budgetRange}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <MapPin size={16} color="#D4AF37" />
            <Text style={styles.infoLabel}>希望場所:</Text>
            <Text style={styles.infoValue}>{item.address}</Text>
          </View>
        </View>

        {hasScoutedThisRequest ? (
          <View style={styles.scoutedBanner}>
            <CheckCircle size={18} color="#2ECC71" />
            <Text style={styles.scoutedBannerText}>スカウト済み</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.scoutButton}
            onPress={() => handleScoutCustomer(item)}
          >
            <Star size={18} color="white" />
            <Text style={styles.scoutButtonText}>スカウトする</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { backgroundColor: 'rgba(241, 196, 15, 0.1)' };
      case 'matched':
        return { backgroundColor: 'rgba(52, 152, 219, 0.1)' };
      case 'completed':
        return { backgroundColor: 'rgba(46, 204, 113, 0.1)' };
      default:
        return { backgroundColor: 'rgba(149, 165, 166, 0.1)' };
    }
  };

  const getStatusTextStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: '#F1C40F' };
      case 'matched':
        return { color: '#3498DB' };
      case 'completed':
        return { color: '#2ECC71' };
      default:
        return { color: '#95A5A6' };
    }
  };

  const getStatusIcon = (status: string) => {
    const color = getStatusTextStyle(status).color;
    switch (status) {
      case 'pending':
        return <Clock size={14} color={color} />;
      case 'matched':
        return <CheckCircle size={14} color={color} />;
      case 'completed':
        return <CheckCircle size={14} color={color} />;
      default:
        return <AlertCircle size={14} color={color} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '募集中';
      case 'matched':
        return 'マッチング済';
      case 'completed':
        return '完了';
      case 'cancelled':
        return 'キャンセル';
      default:
        return '不明';
    }
  };

  const generateMenuCombinations = (selectedMenus: string[]): string[][] => {
    const combinations: string[][] = [];
    const n = selectedMenus.length;
    
    for (let i = 1; i <= (1 << n) - 1; i++) {
      const combination: string[] = [];
      for (let j = 0; j < n; j++) {
        if (i & (1 << j)) {
          combination.push(selectedMenus[j]);
        }
      }
      combinations.push(combination);
    }
    
    return combinations.sort((a, b) => a.length - b.length || a.join('').localeCompare(b.join('')));
  };

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={styles.container}
    >
        <View style={{ position: 'absolute', top: insets.top + 8, right: 16, zIndex: 100 }}>
          <WalletBalanceHeader />
        </View>
        {isCustomer ? (
          selectedTab === 'scouts' ? (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.requestsList}>
            <View style={{ height: 100 }} />
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.title}>
                    マッチング
                  </Text>
                  <Text style={styles.subtitle}>
                    美容師とマッチング
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Plus size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.statsContainer}>
              <TouchableOpacity 
                style={[styles.statCard, styles.statCardScouts, currentSelectedTab === 'scouts' && styles.statCardActive]}
                onPress={() => setSelectedTab('scouts')}
              >
                <Star size={20} color="#FFD700" fill="none" strokeWidth={2} />
                <Text style={[styles.statValue, currentSelectedTab === 'scouts' && styles.statValueActive]}>
                  {totalReceivedScouts}
                </Text>
                <Text style={[styles.statLabel, currentSelectedTab === 'scouts' && styles.statLabelActive]}>
                  スカウト
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statCard, styles.statCardHistory, currentSelectedTab === 'history' && styles.statCardActive]}
                onPress={() => setSelectedTab('history')}
              >
                <CheckCircle size={20} color="#2ECC71" fill="none" strokeWidth={2} />
                <Text style={[styles.statValue, currentSelectedTab === 'history' && styles.statValueActive]}>
                  {acceptedMatches.length}
                </Text>
                <Text style={[styles.statLabel, currentSelectedTab === 'history' && styles.statLabelActive]}>
                  マッチング履歴
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statCard, styles.statCardRequests, currentSelectedTab === 'requests' && styles.statCardActive]}
                onPress={() => setSelectedTab('requests')}
              >
                <FileText size={20} color="#FF69B4" fill="none" strokeWidth={2} />
                <Text style={[styles.statValue, currentSelectedTab === 'requests' && styles.statValueActive]}>
                  {customerRequests.length}
                </Text>
                <Text style={[styles.statLabel, currentSelectedTab === 'requests' && styles.statLabelActive]}>
                  マイ申請
                </Text>
              </TouchableOpacity>
            </View>
            {receivedMatchScouts.length > 0 && (
              <View style={styles.scoutSection}>
                <View style={styles.scoutSectionHeader}>
                  <Star size={20} color="#FF69B4" fill="#FF69B4" />
                  <Text style={styles.scoutSectionTitle}>マッチングスカウト</Text>
                </View>
                <Text style={styles.scoutSectionDesc}>あなたの申請に対するスカウト</Text>
                {receivedMatchScouts.map((item) => renderScoutCard(item))}
              </View>
            )}

            {receivedScoutRequests.length > 0 && (
              <View style={styles.scoutSection}>
                <View style={styles.scoutSectionHeader}>
                  <Star size={20} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.scoutSectionTitle}>呼び込み</Text>
                </View>
                <Text style={styles.scoutSectionDesc}>美容師からの直接提案</Text>
                {receivedScoutRequests.map((item) => renderScoutRequestCard(item))}
              </View>
            )}

            {totalReceivedScouts === 0 && (
              <View style={styles.emptyState}>
                <Star size={64} color="#BDC3C7" />
                <Text style={styles.emptyStateTitle}>スカウトはありません</Text>
                <Text style={styles.emptyStateText}>
                  マッチング申請を作成すると、美容師からスカウトが届きます{'\n'}
                  また、お気に入り登録した美容師から呼び込みが届く場合もあります
                </Text>
              </View>
            )}
            </ScrollView>
          ) : selectedTab === 'history' ? (
          <FlatList
            data={acceptedMatches.sort((a, b) => new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime())}
            ListHeaderComponent={
              <View>
                <View style={{ height: 100 }} />
                <View style={styles.header}>
                  <View style={styles.headerTop}>
                    <View>
                      <Text style={styles.title}>
                        マッチング
                      </Text>
                      <Text style={styles.subtitle}>
                        美容師とマッチング
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={() => setShowCreateModal(true)}
                    >
                      <Plus size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.statsContainer}>
                  <TouchableOpacity 
                    style={[styles.statCard, styles.statCardScouts, currentSelectedTab === 'scouts' && styles.statCardActive]}
                    onPress={() => setSelectedTab('scouts')}
                  >
                    <Star size={20} color="#FFD700" fill="none" strokeWidth={2} />
                    <Text style={[styles.statValue, currentSelectedTab === 'scouts' && styles.statValueActive]}>
                      {totalReceivedScouts}
                    </Text>
                    <Text style={[styles.statLabel, currentSelectedTab === 'scouts' && styles.statLabelActive]}>
                      スカウト
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.statCard, styles.statCardHistory, currentSelectedTab === 'history' && styles.statCardActive]}
                    onPress={() => setSelectedTab('history')}
                  >
                    <CheckCircle size={20} color="#2ECC71" fill="none" strokeWidth={2} />
                    <Text style={[styles.statValue, currentSelectedTab === 'history' && styles.statValueActive]}>
                      {acceptedMatches.length}
                    </Text>
                    <Text style={[styles.statLabel, currentSelectedTab === 'history' && styles.statLabelActive]}>
                      マッチング履歴
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.statCard, styles.statCardRequests, currentSelectedTab === 'requests' && styles.statCardActive]}
                    onPress={() => setSelectedTab('requests')}
                  >
                    <FileText size={20} color="#FF69B4" fill="none" strokeWidth={2} />
                    <Text style={[styles.statValue, currentSelectedTab === 'requests' && styles.statValueActive]}>
                      {customerRequests.length}
                    </Text>
                    <Text style={[styles.statLabel, currentSelectedTab === 'requests' && styles.statLabelActive]}>
                      マイ申請
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const request = requests.find(r => r.id === item.requestId);
              return (
                <View style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyHeaderLeft}>
                      <View style={styles.hairdresserInfo}>
                        <Star size={18} color="#FF69B4" fill="#FF69B4" />
                        <Text style={styles.historyHairdresserName}>{item.hairdresserName}</Text>
                      </View>
                      <View style={[
                        styles.historyStatusBadge,
                        item.status === 'booking_confirmed' && styles.historyStatusConfirmed,
                        item.status === 'completed' && styles.historyStatusCompleted,
                        item.status === 'cancelled' && styles.historyStatusCancelled,
                      ]}>
                        <Text style={[
                          styles.historyStatusText,
                          item.status === 'booking_confirmed' && styles.historyStatusTextConfirmed,
                          item.status === 'completed' && styles.historyStatusTextCompleted,
                          item.status === 'cancelled' && styles.historyStatusTextCancelled,
                        ]}>
                          {item.status === 'booking_confirmed' ? '予約確定' : item.status === 'completed' ? '完了' : 'キャンセル'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyDate}>
                      {new Date(item.matchedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>

                  {request && (
                    <View style={styles.historyBody}>
                      {item.salonName && (
                        <View style={styles.salonInfoSection}>
                          <Text style={styles.salonInfoLabel}>美容室</Text>
                          <Text style={styles.salonInfoName}>{item.salonName}</Text>
                          {item.salonAddress && (
                            <View style={styles.salonAddressRow}>
                              <MapPin size={12} color="#7F8C8D" />
                              <Text style={styles.salonAddressText}>{item.salonAddress}</Text>
                            </View>
                          )}
                        </View>
                      )}
                      {request.desiredDate && (
                        <View style={styles.infoRow}>
                          <Calendar size={14} color="#FF69B4" />
                          <Text style={styles.historyInfoLabel}>日時:</Text>
                          <Text style={styles.historyInfoValue}>{request.desiredDate} {request.desiredTime}</Text>
                        </View>
                      )}
                      {request.menu && Array.isArray(request.menu) && request.menu.length > 0 && (
                        <View style={styles.infoRow}>
                          <FileText size={14} color="#4CAF50" />
                          <Text style={styles.historyInfoLabel}>メニュー:</Text>
                          <Text style={styles.historyInfoValue}>{request.menu.join(', ')}</Text>
                        </View>
                      )}
                      {request.address && (
                        <View style={styles.infoRow}>
                          <MapPin size={14} color="#D4AF37" />
                          <Text style={styles.historyInfoLabel}>場所:</Text>
                          <Text style={styles.historyInfoValue}>{request.address}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {item.status === 'booking_confirmed' && (
                    <View style={styles.historyFooter}>
                      <View style={styles.historyConfirmedBadge}>
                        <CheckCircle size={16} color="#2ECC71" />
                        <Text style={styles.historyConfirmedText}>予約が確定しています</Text>
                      </View>
                    </View>
                  )}

                  {item.status === 'completed' && (
                    <View style={styles.historyFooter}>
                      <View style={styles.historyCompletedBadge}>
                        <CheckCircle size={16} color="#2ECC71" />
                        <Text style={styles.historyCompletedText}>施術完了</Text>
                      </View>
                    </View>
                  )}

                  {item.status === 'cancelled' && (
                    <View style={styles.historyFooter}>
                      <View style={styles.historyCancelledBadge}>
                        <X size={16} color="#95A5A6" />
                        <Text style={styles.historyCancelledText}>キャンセル済み</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            }}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.requestsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <CheckCircle size={64} color="#BDC3C7" />
                <Text style={styles.emptyStateTitle}>マッチング履歴はありません</Text>
                <Text style={styles.emptyStateText}>
                  スカウトを承認すると、ここに履歴が表示されます
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={customerRequests}
            renderItem={renderCustomerRequest}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.requestsList}
            ListHeaderComponent={
              <View>
                <View style={{ height: 100 }} />
                <View style={styles.header}>
                  <View style={styles.headerTop}>
                    <View>
                      <Text style={styles.title}>
                        マッチング
                      </Text>
                      <Text style={styles.subtitle}>
                        美容師とマッチング
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={() => setShowCreateModal(true)}
                    >
                      <Plus size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.statsContainer}>
                  <TouchableOpacity 
                    style={[styles.statCard, styles.statCardScouts, currentSelectedTab === 'scouts' && styles.statCardActive]}
                    onPress={() => setSelectedTab('scouts')}
                  >
                    <Star size={20} color="#FFD700" fill="none" strokeWidth={2} />
                    <Text style={[styles.statValue, currentSelectedTab === 'scouts' && styles.statValueActive]}>
                      {totalReceivedScouts}
                    </Text>
                    <Text style={[styles.statLabel, currentSelectedTab === 'scouts' && styles.statLabelActive]}>
                      スカウト
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.statCard, styles.statCardHistory, currentSelectedTab === 'history' && styles.statCardActive]}
                    onPress={() => setSelectedTab('history')}
                  >
                    <CheckCircle size={20} color="#2ECC71" fill="none" strokeWidth={2} />
                    <Text style={[styles.statValue, currentSelectedTab === 'history' && styles.statValueActive]}>
                      {acceptedMatches.length}
                    </Text>
                    <Text style={[styles.statLabel, currentSelectedTab === 'history' && styles.statLabelActive]}>
                      マッチング履歴
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.statCard, styles.statCardRequests, currentSelectedTab === 'requests' && styles.statCardActive]}
                    onPress={() => setSelectedTab('requests')}
                  >
                    <FileText size={20} color="#FF69B4" fill="none" strokeWidth={2} />
                    <Text style={[styles.statValue, currentSelectedTab === 'requests' && styles.statValueActive]}>
                      {customerRequests.length}
                    </Text>
                    <Text style={[styles.statLabel, currentSelectedTab === 'requests' && styles.statLabelActive]}>
                      マイ申請
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <FileText size={64} color="#BDC3C7" />
                <Text style={styles.emptyStateTitle}>マッチング申請がありません</Text>
                <Text style={styles.emptyStateText}>
                  右上の＋ボタンから新しいマッチング申請を作成しましょう
                </Text>
              </View>
            }
          />
        )
      ) : (
        hairdresserSelectedTab === 'pending' ? (
          <FlatList
            data={pendingRequests}
            renderItem={renderHairdresserRequest}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.requestsList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
            <View>
              <View style={{ height: 100 }} />
              <View style={styles.header}>
                <View style={styles.headerTop}>
                  <View>
                    <Text style={styles.title}>
                      顧客スカウト
                    </Text>
                    <Text style={styles.subtitle}>
                      顧客を見つける
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.statsContainer}>
                <TouchableOpacity 
                  style={[
                    styles.statCard,
                    styles.statCardScouts,
                    currentHairdresserTab === 'pending' && styles.statCardActive
                  ]}
                  onPress={() => setHairdresserSelectedTab('pending')}
                >
                  <Users size={20} color="#FF69B4" fill="none" strokeWidth={2} />
                  <Text style={[styles.statValue, currentHairdresserTab === 'pending' && styles.statValueActive]}>
                    {pendingRequests.length}
                  </Text>
                  <Text style={[styles.statLabel, currentHairdresserTab === 'pending' && styles.statLabelActive]}>
                    募集中
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.statCard,
                    styles.statCardHistory,
                    currentHairdresserTab === 'scouted' && styles.statCardActive
                  ]}
                  onPress={() => setHairdresserSelectedTab('scouted')}
                >
                  <Star size={20} color="#FFD700" fill="none" strokeWidth={2} />
                  <Text style={[styles.statValue, currentHairdresserTab === 'scouted' && styles.statValueActive]}>
                    {hairdresserScoutPending.length}
                  </Text>
                  <Text style={[styles.statLabel, currentHairdresserTab === 'scouted' && styles.statLabelActive]}>
                    承認待ち
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.statCard,
                    styles.statCardRequests,
                    currentHairdresserTab === 'history' && styles.statCardActive
                  ]}
                  onPress={() => setHairdresserSelectedTab('history')}
                >
                  <CheckCircle size={20} color="#2ECC71" fill="none" strokeWidth={2} />
                  <Text style={[styles.statValue, currentHairdresserTab === 'history' && styles.statValueActive]}>
                    {hairdresserHistory.length}
                  </Text>
                  <Text style={[styles.statLabel, currentHairdresserTab === 'history' && styles.statLabelActive]}>
                    履歴
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.scoutHistorySection}>
                <TouchableOpacity 
                  style={styles.sectionHeaderInline}
                  onPress={() => setShowScoutHistorySection(!showScoutHistorySection)}
                >
                  <Star size={20} color="#FF69B4" fill="#FF69B4" />
                  <Text style={styles.sectionTitle}>呼び込み履歴</Text>
                  <ChevronDown 
                    size={20} 
                    color="#7F8C8D" 
                    style={{ 
                      transform: [{ rotate: showScoutHistorySection ? '180deg' : '0deg' }],
                      marginLeft: 'auto' as const
                    }} 
                  />
                </TouchableOpacity>
                <Text style={styles.sectionDescription}>あなたが送信した呼び込み申請の状況</Text>
                {showScoutHistorySection && (
                  hairdresserScoutRequests.length > 0 ? (
                  <View style={styles.scoutHistoryList}>
                    {hairdresserScoutRequests.map((scoutReq) => (
                      <View key={scoutReq.id} style={styles.scoutHistoryCard}>
                        <View style={styles.scoutHistoryHeader}>
                          <View style={styles.scoutHistoryHeaderLeft}>
                            <Users size={16} color="#FF69B4" />
                            <Text style={styles.scoutHistoryCustomerName}>{scoutReq.customerName}</Text>
                          </View>
                          <View style={[
                            styles.scoutHistoryStatusBadge,
                            scoutReq.status === 'accepted' && styles.scoutHistoryStatusAccepted,
                            scoutReq.status === 'rejected' && styles.scoutHistoryStatusRejected,
                            scoutReq.status === 'pending' && styles.scoutHistoryStatusPending,
                          ]}>
                            <Text style={[
                              styles.scoutHistoryStatusText,
                              scoutReq.status === 'accepted' && styles.scoutHistoryStatusTextAccepted,
                              scoutReq.status === 'rejected' && styles.scoutHistoryStatusTextRejected,
                              scoutReq.status === 'pending' && styles.scoutHistoryStatusTextPending,
                            ]}>
                              {scoutReq.status === 'accepted' ? '承認済み' : scoutReq.status === 'rejected' ? '辞退済み' : '待機中'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.scoutHistoryBody}>
                          <View style={styles.scoutHistoryInfoRow}>
                            <Calendar size={14} color="#7F8C8D" />
                            <Text style={styles.scoutHistoryInfoText}>{scoutReq.desiredDate} {scoutReq.desiredTime}</Text>
                          </View>
                          <View style={styles.scoutHistoryInfoRow}>
                            <FileText size={14} color="#7F8C8D" />
                            <Text style={styles.scoutHistoryInfoText}>{scoutReq.menu.join(', ')}</Text>
                          </View>
                          <View style={styles.scoutHistoryInfoRow}>
                            <Clock size={14} color="#7F8C8D" />
                            <Text style={styles.scoutHistoryInfoText}>
                              {new Date(scoutReq.createdAt).toLocaleDateString('ja-JP')}
                            </Text>
                          </View>
                        </View>
                        {scoutReq.status === 'pending' && (
                          <View style={styles.scoutHistoryActions}>
                            <TouchableOpacity
                              style={styles.scoutHistoryCancelButton}
                              onPress={() => {
                                Alert.alert(
                                  'キャンセルの確認',
                                  `${scoutReq.customerName}さんへの呼び込み申請をキャンセルしますか？`,
                                  [
                                    { text: 'キャンセル', style: 'cancel' },
                                    {
                                      text: 'キャンセルする',
                                      style: 'destructive',
                                      onPress: async () => {
                                        try {
                                          await cancelScoutRequest(scoutReq.id);
                                          Alert.alert('キャンセル完了', '呼び込み申請をキャンセルしました');
                                        } catch (error) {

                                          Alert.alert('エラー', 'キャンセルに失敗しました');
                                        }
                                      },
                                    },
                                  ]
                                );
                              }}
                            >
                              <X size={14} color="#E74C3C" />
                              <Text style={styles.scoutHistoryCancelButtonText}>キャンセル</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noScoutHistoryState}>
                    <Text style={styles.noScoutHistoryText}>呼び込み履歴はありません</Text>
                    <Text style={styles.noScoutHistorySubtext}>お気に入り登録してくれた顧客に呼び込み申請を送ると、ここに表示されます</Text>
                  </View>
                )
                )}
              </View>

              <View style={styles.favoritedCustomersSection}>
                <View style={styles.sectionHeaderInline}>
                  <Star size={20} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.sectionTitle}>キャンセル待ち＆呼び込み</Text>
                </View>
                <Text style={styles.sectionDescription}>お気に入り登録してくれた顧客にスカウト申請を送信できます</Text>
                {customersWhoFavorited.length > 0 ? (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.favoritedCustomersList}
                  >
                    {customersWhoFavorited.map((fav) => (
                      <TouchableOpacity
                        key={fav.id}
                        style={styles.favoritedCustomerCard}
                        onPress={() => handleScoutFavoritedCustomer(fav.customerId, fav.customerName)}
                      >
                        <View style={styles.favoritedCustomerHeader}>
                          <Users size={18} color="#FF69B4" />
                          <Text style={styles.favoritedCustomerName}>{fav.customerName}</Text>
                        </View>
                        <View style={styles.scoutButtonSmall}>
                          <Send size={14} color="white" />
                          <Text style={styles.scoutButtonSmallText}>呼び込む</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noFavoritesState}>
                    <Text style={styles.noFavoritesText}>お気に入り登録してくれた顧客はいません</Text>
                    <Text style={styles.noFavoritesSubtext}>顧客があなたをお気に入り登録すると、ここに表示されます</Text>
                  </View>
                )}
              </View>

              <View style={styles.sectionHeader}>
                <Users size={20} color="#FF69B4" />
                <Text style={styles.sectionTitle}>募集中の顧客</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Users size={64} color="#BDC3C7" />
              <Text style={styles.emptyStateTitle}>募集中の顧客がいません</Text>
              <Text style={styles.emptyStateText}>
                現在、募集中の顧客はいません
              </Text>
            </View>
          }
          />
        ) : hairdresserSelectedTab === 'scouted' ? (
          <FlatList
            data={hairdresserScoutPending}
            ListHeaderComponent={
              <View>
                <View style={{ height: 100 }} />
                <View style={styles.header}>
                  <View style={styles.headerTop}>
                    <View>
                      <Text style={styles.title}>
                        顧客スカウト
                      </Text>
                      <Text style={styles.subtitle}>
                        顧客を見つける
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.statsContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.statCard,
                      styles.statCardScouts,
                      currentHairdresserTab === 'pending' && styles.statCardActive
                    ]}
                    onPress={() => setHairdresserSelectedTab('pending')}
                  >
                    <Users size={20} color="#FF69B4" fill="none" strokeWidth={2} />
                    <Text style={[styles.statValue, currentHairdresserTab === 'pending' && styles.statValueActive]}>
                      {pendingRequests.length}
                    </Text>
                    <Text style={[styles.statLabel, currentHairdresserTab === 'pending' && styles.statLabelActive]}>
                      募集中
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.statCard,
                      styles.statCardHistory,
                      currentHairdresserTab === 'scouted' && styles.statCardActive
                    ]}
                    onPress={() => setHairdresserSelectedTab('scouted')}
                  >
                    <Star size={20} color="#FFD700" fill="none" strokeWidth={2} />
                    <Text style={[styles.statValue, currentHairdresserTab === 'scouted' && styles.statValueActive]}>
                      {hairdresserScoutPending.length}
                    </Text>
                    <Text style={[styles.statLabel, currentHairdresserTab === 'scouted' && styles.statLabelActive]}>
                      承認待ち
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.statCard,
                      styles.statCardRequests,
                      currentHairdresserTab === 'history' && styles.statCardActive
                    ]}
                    onPress={() => setHairdresserSelectedTab('history')}
                  >
                    <CheckCircle size={20} color="#2ECC71" fill="none" strokeWidth={2} />
                    <Text style={[styles.statValue, currentHairdresserTab === 'history' && styles.statValueActive]}>
                      {hairdresserHistory.length}
                    </Text>
                    <Text style={[styles.statLabel, currentHairdresserTab === 'history' && styles.statLabelActive]}>
                      履歴
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const request = requests.find(r => r.id === item.requestId);
              return (
                <View style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyHeaderLeft}>
                      <View style={styles.hairdresserInfo}>
                        <Users size={18} color="#FF69B4" />
                        <Text style={styles.historyHairdresserName}>{item.customerName}</Text>
                      </View>
                      <View style={[
                        styles.historyStatusBadge,
                        styles.historyStatusPending,
                      ]}>
                        <Text style={[
                          styles.historyStatusText,
                          styles.historyStatusTextPending,
                        ]}>
                          承認待ち
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyDate}>
                      {new Date(item.matchedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>

                  {request && (
                    <View style={styles.historyBody}>
                      {request.desiredDate && (
                        <View style={styles.infoRow}>
                          <Calendar size={14} color="#FF69B4" />
                          <Text style={styles.historyInfoLabel}>日時:</Text>
                          <Text style={styles.historyInfoValue}>{request.desiredDate} {request.desiredTime}</Text>
                        </View>
                      )}
                      {request.menu && Array.isArray(request.menu) && request.menu.length > 0 && (
                        <View style={styles.infoRow}>
                          <FileText size={14} color="#4CAF50" />
                          <Text style={styles.historyInfoLabel}>メニュー:</Text>
                          <Text style={styles.historyInfoValue}>{request.menu.join(', ')}</Text>
                        </View>
                      )}
                      {request.address && (
                        <View style={styles.infoRow}>
                          <MapPin size={14} color="#D4AF37" />
                          <Text style={styles.historyInfoLabel}>場所:</Text>
                          <Text style={styles.historyInfoValue}>{request.address}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.requestsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Star size={64} color="#BDC3C7" />
                <Text style={styles.emptyStateTitle}>承認待ちはありません</Text>
                <Text style={styles.emptyStateText}>
                  顧客をスカウトすると、ここに表示されます
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={hairdresserHistory}
            ListHeaderComponent={
              <View>
                <View style={{ height: 100 }} />
                <View style={styles.header}>
                  <View style={styles.headerTop}>
                    <View>
                      <Text style={styles.title}>
                        顧客スカウト
                      </Text>
                      <Text style={styles.subtitle}>
                        顧客を見つける
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.statsContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.statCard,
                      styles.statCardScouts,
                      currentHairdresserTab === 'pending' && styles.statCardActive
                    ]}
                    onPress={() => setHairdresserSelectedTab('pending')}
                  >
                    <Users size={20} color="#FF69B4" fill="none" strokeWidth={2} />
                    <Text style={[styles.statValue, currentHairdresserTab === 'pending' && styles.statValueActive]}>
                      {pendingRequests.length}
                    </Text>
                    <Text style={[styles.statLabel, currentHairdresserTab === 'pending' && styles.statLabelActive]}>
                      募集中
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.statCard,
                      styles.statCardHistory,
                      currentHairdresserTab === 'scouted' && styles.statCardActive
                    ]}
                    onPress={() => setHairdresserSelectedTab('scouted')}
                  >
                    <Star size={20} color="#FFD700" fill="none" strokeWidth={2} />
                    <Text style={[styles.statValue, currentHairdresserTab === 'scouted' && styles.statValueActive]}>
                      {hairdresserScoutPending.length}
                    </Text>
                    <Text style={[styles.statLabel, currentHairdresserTab === 'scouted' && styles.statLabelActive]}>
                      承認待ち
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.statCard,
                      styles.statCardRequests,
                      currentHairdresserTab === 'history' && styles.statCardActive
                    ]}
                    onPress={() => setHairdresserSelectedTab('history')}
                  >
                    <CheckCircle size={20} color="#2ECC71" fill="none" strokeWidth={2} />
                    <Text style={[styles.statValue, currentHairdresserTab === 'history' && styles.statValueActive]}>
                      {hairdresserHistory.length}
                    </Text>
                    <Text style={[styles.statLabel, currentHairdresserTab === 'history' && styles.statLabelActive]}>
                      履歴
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const request = requests.find(r => r.id === item.requestId);
              
              const getStatusInfo = (status: string) => {
                switch (status) {
                  case 'booking_confirmed':
                    return { label: '承認済み', color: '#2ECC71', bgColor: 'rgba(46, 204, 113, 0.15)' };
                  case 'completed':
                    return { label: '完了', color: '#3498DB', bgColor: 'rgba(52, 152, 219, 0.15)' };
                  case 'cancelled':
                    return { label: 'キャンセル', color: '#95A5A6', bgColor: 'rgba(149, 165, 166, 0.15)' };
                  case 'rejected':
                    return { label: '辞退', color: '#E74C3C', bgColor: 'rgba(231, 76, 60, 0.15)' };
                  default:
                    return { label: '不明', color: '#7F8C8D', bgColor: 'rgba(127, 140, 141, 0.15)' };
                }
              };

              const statusInfo = getStatusInfo(item.status);
              
              return (
                <View style={styles.compactHistoryCard}>
                  <View style={styles.compactHistoryHeader}>
                    <View style={styles.compactHistoryHeaderLeft}>
                      <View style={styles.compactCustomerInfo}>
                        <Users size={16} color="#FF69B4" />
                        <Text style={styles.compactCustomerName}>{item.customerName}</Text>
                      </View>
                      <View style={[styles.compactStatusBadge, { backgroundColor: statusInfo.bgColor }]}>
                        <Text style={[styles.compactStatusText, { color: statusInfo.color }]}>
                          {statusInfo.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.compactDate}>
                      {new Date(item.matchedAt).toLocaleDateString('ja-JP', { 
                        year: 'numeric',
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>

                  {request && (
                    <View style={styles.compactHistoryBody}>
                      {request.desiredDate && request.desiredTime && (
                        <View style={styles.compactInfoRow}>
                          <Calendar size={14} color="#7F8C8D" />
                          <Text style={styles.compactInfoLabel}>日時:</Text>
                          <Text style={styles.compactInfoValue}>
                            {new Date(request.desiredDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} {request.desiredTime}
                          </Text>
                        </View>
                      )}

                      {request.menu && Array.isArray(request.menu) && request.menu.length > 0 && (
                        <View style={styles.compactInfoRow}>
                          <FileText size={14} color="#7F8C8D" />
                          <Text style={styles.compactInfoLabel}>メニュー:</Text>
                          <Text style={styles.compactInfoValue}>{request.menu.join(', ')}</Text>
                        </View>
                      )}

                      {request.address && (
                        <View style={styles.compactInfoRow}>
                          <MapPin size={14} color="#7F8C8D" />
                          <Text style={styles.compactInfoLabel}>希望場所:</Text>
                          <Text style={styles.compactInfoValue}>{request.address}</Text>
                        </View>
                      )}

                      {request.concerns && (
                        <View style={styles.compactConcernsSection}>
                          <Text style={styles.compactConcernsLabel}>悩み:</Text>
                          <Text style={styles.compactConcernsText} numberOfLines={2}>{request.concerns}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.requestsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <CheckCircle size={64} color="#BDC3C7" />
                <Text style={styles.emptyStateTitle}>履歴はありません</Text>
                <Text style={styles.emptyStateText}>
                  スカウトが承認または却下されると、ここに表示されます
                </Text>
              </View>
            }
          />
        )
      )}

      <Modal
        visible={showCreateModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCreateModal(false)}
            >
              <X size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingRequestId ? 'マッチング申請を編集' : 'マッチング申請'}</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>希望日 *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <View style={styles.pickerButtonContent}>
                  <Calendar size={18} color="#FF69B4" />
                  <Text style={[styles.pickerButtonText, !formData.desiredDate && styles.pickerPlaceholder]}>
                    {formData.desiredDate ? new Date(formData.desiredDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : '日付を選択してください'}
                  </Text>
                </View>
                <ChevronDown size={20} color="#7F8C8D" />
              </TouchableOpacity>
              {showDatePicker && (
                <ScrollView style={styles.pickerList} nestedScrollEnabled>
                  {generateDates().map((date) => (
                    <TouchableOpacity
                      key={date.value}
                      style={styles.pickerItem}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, desiredDate: date.value }));
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{date.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>希望時間 *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowTimePicker(!showTimePicker)}
              >
                <View style={styles.pickerButtonContent}>
                  <Clock size={18} color="#87CEEB" />
                  <Text style={[styles.pickerButtonText, !formData.desiredTime && styles.pickerPlaceholder]}>
                    {formData.desiredTime || '時間を選択してください'}
                  </Text>
                </View>
                <ChevronDown size={20} color="#7F8C8D" />
              </TouchableOpacity>
              {showTimePicker && (
                <ScrollView style={styles.pickerList} nestedScrollEnabled>
                  {timeOptions.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={styles.pickerItem}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, desiredTime: time }));
                        setShowTimePicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{time}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>希望メニュー * (複数選択可)</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowMenuPicker(!showMenuPicker)}
              >
                <View style={styles.pickerButtonContent}>
                  <FileText size={18} color="#4CAF50" />
                  <Text style={[styles.pickerButtonText, formData.menu.length === 0 && styles.pickerPlaceholder]}>
                    {Array.isArray(formData.menu) && formData.menu.length > 0 ? formData.menu.join(', ') : 'メニューを選択してください'}
                  </Text>
                </View>
                <ChevronDown size={20} color="#7F8C8D" />
              </TouchableOpacity>
              {showMenuPicker && (
                <ScrollView style={styles.menuPickerList} horizontal showsHorizontalScrollIndicator={false}>
                  {menuOptions.map((menu) => {
                    const isSelected = formData.menu.includes(menu);
                    return (
                      <TouchableOpacity
                        key={menu}
                        style={[styles.menuChip, isSelected && styles.menuChipSelected]}
                        onPress={() => {
                          setFormData(prev => ({
                            ...prev,
                            menu: isSelected
                              ? prev.menu.filter(m => m !== menu)
                              : [...prev.menu, menu],
                          }));
                        }}
                      >
                        <Text style={[styles.menuChipText, isSelected && styles.menuChipTextSelected]}>
                          {menu}
                        </Text>
                        {isSelected && <CheckCircle size={16} color="white" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>髪の悩み *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="例: 髪のダメージが気になる、くせ毛を直したい"
                value={formData.concerns}
                onChangeText={(text) => setFormData(prev => ({ ...prev, concerns: text }))}
                multiline
                numberOfLines={4}
                placeholderTextColor="#95A5A6"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>希望価格帯 *</Text>
              <View style={styles.budgetRangeContainer}>
                <Text style={styles.budgetRangeText}>
                  ¥{formData.minBudget.toLocaleString()} 〜 ¥{formData.maxBudget.toLocaleString()}
                </Text>
              </View>
              
              <BudgetRangeSlider
                minBudget={formData.minBudget}
                maxBudget={formData.maxBudget}
                onMinChange={(value) => setFormData(prev => ({ ...prev, minBudget: value }))}
                onMaxChange={(value) => setFormData(prev => ({ ...prev, maxBudget: value }))}
              />
              
              <View style={styles.budgetInputContainer}>
                <View style={styles.budgetInputSection}>
                  <Text style={styles.budgetInputLabel}>最低価格</Text>
                  <TextInput
                    style={styles.budgetInput}
                    placeholder="0"
                    keyboardType="numeric"
                    value={formData.minBudget.toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                      if (value < formData.maxBudget - 1000 && value <= 100000) {
                        setFormData(prev => ({ ...prev, minBudget: value }));
                      }
                    }}
                    placeholderTextColor="#95A5A6"
                  />
                </View>
                <Text style={styles.budgetSeparator}>〜</Text>
                <View style={styles.budgetInputSection}>
                  <Text style={styles.budgetInputLabel}>最高価格</Text>
                  <TextInput
                    style={styles.budgetInput}
                    placeholder="100000"
                    keyboardType="numeric"
                    value={formData.maxBudget.toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                      if (value > formData.minBudget + 1000 && value <= 100000) {
                        setFormData(prev => ({ ...prev, maxBudget: value }));
                      }
                    }}
                    placeholderTextColor="#95A5A6"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>希望場所 *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="例: 渋谷区、新宿駅周辺"
                value={formData.address}
                onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                placeholderTextColor="#95A5A6"
              />
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={handleGetLocation}
              >
                <Navigation size={16} color="#3498DB" />
                <Text style={styles.currentLocationText}>現在地を使用</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formInfo}>
              <Text style={styles.formInfoText}>
                💡 マッチング申請を作成すると、あなたの希望条件が美容師に公開されます。
              </Text>
              <Text style={styles.formInfoText}>
                ✨ 美容師があなたをスカウトし、承認するとチャットと予約が可能になります。
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreateRequest}
            >
              <Text style={styles.submitButtonText}>{editingRequestId ? '更新する' : '申請を作成'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showScoutModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowScoutModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowScoutModal(false)}
            >
              <X size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedCustomer?.name}さんを呼び込む</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>希望日 *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <View style={styles.pickerButtonContent}>
                  <Calendar size={18} color="#FF69B4" />
                  <Text style={[styles.pickerButtonText, !scoutFormData.desiredDate && styles.pickerPlaceholder]}>
                    {scoutFormData.desiredDate ? new Date(scoutFormData.desiredDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : '日付を選択してください'}
                  </Text>
                </View>
                <ChevronDown size={20} color="#7F8C8D" />
              </TouchableOpacity>
              {showDatePicker && (
                <ScrollView style={styles.pickerList} nestedScrollEnabled>
                  {generateDates().map((date) => (
                    <TouchableOpacity
                      key={date.value}
                      style={styles.pickerItem}
                      onPress={() => {
                        setScoutFormData(prev => ({ ...prev, desiredDate: date.value }));
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{date.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>希望時間 *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowTimePicker(!showTimePicker)}
              >
                <View style={styles.pickerButtonContent}>
                  <Clock size={18} color="#87CEEB" />
                  <Text style={[styles.pickerButtonText, !scoutFormData.desiredTime && styles.pickerPlaceholder]}>
                    {scoutFormData.desiredTime || '時間を選択してください'}
                  </Text>
                </View>
                <ChevronDown size={20} color="#7F8C8D" />
              </TouchableOpacity>
              {showTimePicker && (
                <ScrollView style={styles.pickerList} nestedScrollEnabled>
                  {timeOptions.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={styles.pickerItem}
                      onPress={() => {
                        setScoutFormData(prev => ({ ...prev, desiredTime: time }));
                        setShowTimePicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{time}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>提供メニュー * (複数選択可)</Text>
              <Text style={styles.formHint}>対応可能なメニューをすべて選択してください</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowMenuPicker(!showMenuPicker)}
              >
                <View style={styles.pickerButtonContent}>
                  <FileText size={18} color="#4CAF50" />
                  <Text style={[styles.pickerButtonText, scoutFormData.menu.length === 0 && styles.pickerPlaceholder]}>
                    {Array.isArray(scoutFormData.menu) && scoutFormData.menu.length > 0 ? scoutFormData.menu.join(', ') : 'メニューを選択してください'}
                  </Text>
                </View>
                <ChevronDown size={20} color="#7F8C8D" />
              </TouchableOpacity>
              {showMenuPicker && (
                <ScrollView style={styles.menuPickerList} horizontal showsHorizontalScrollIndicator={false}>
                  {menuOptions.map((menu) => {
                    const isSelected = scoutFormData.menu.includes(menu);
                    return (
                      <TouchableOpacity
                        key={menu}
                        style={[styles.menuChip, isSelected && styles.menuChipSelected]}
                        onPress={() => {
                          const newMenu = isSelected
                            ? scoutFormData.menu.filter(m => m !== menu)
                            : [...scoutFormData.menu, menu];
                          
                          setScoutFormData(prev => ({
                            ...prev,
                            menu: newMenu,
                            menuCombinations: [],
                          }));
                        }}
                      >
                        <Text style={[styles.menuChipText, isSelected && styles.menuChipTextSelected]}>
                          {menu}
                        </Text>
                        {isSelected && <CheckCircle size={16} color="white" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {scoutFormData.menu.length > 0 && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>対応可能なメニューの組み合わせ *</Text>
                <Text style={styles.formHint}>顧客が選べるメニューの組み合わせを選択してください</Text>
                <View style={styles.menuCombinationsContainer}>
                  {generateMenuCombinations(scoutFormData.menu).map((combination, index) => {
                    const combinationKey = combination.join(',');
                    const isSelected = scoutFormData.menuCombinations.some(
                      combo => combo.join(',') === combinationKey
                    );
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.combinationChip, isSelected && styles.combinationChipSelected]}
                        onPress={() => {
                          setScoutFormData(prev => ({
                            ...prev,
                            menuCombinations: isSelected
                              ? prev.menuCombinations.filter(c => c.join(',') !== combinationKey)
                              : [...prev.menuCombinations, combination],
                          }));
                        }}
                      >
                        <Text style={[styles.combinationChipText, isSelected && styles.combinationChipTextSelected]}>
                          {combination.join(' + ')}
                        </Text>
                        {isSelected && <CheckCircle size={14} color="white" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>場所 *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="例: 渋谷区、新宿駅周辺"
                value={scoutFormData.address}
                onChangeText={(text) => setScoutFormData(prev => ({ ...prev, address: text }))}
                placeholderTextColor="#95A5A6"
              />
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={async () => {
                  try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert('エラー', '位置情報の許可が必要です');
                      return;
                    }

                    const location = await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.High,
                    });

                    const [addressResult] = await Location.reverseGeocodeAsync({
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                    });

                    const address = addressResult
                      ? `${addressResult.region || ''}${addressResult.city || ''}${addressResult.district || ''}${addressResult.street || ''}`
                      : `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;

                    setScoutFormData(prev => ({
                      ...prev,
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                      address,
                    }));

                    Alert.alert('成功', '現在地を取得しました');
                  } catch (error) {

                    Alert.alert('エラー', '位置情報の取得に失敗しました');
                  }
                }}
              >
                <Navigation size={16} color="#3498DB" />
                <Text style={styles.currentLocationText}>現在地を使用</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formInfo}>
              <Text style={styles.formInfoText}>
                💡 キャンセルが出た時や急遽予約枠を埋めたい時に使用します。
              </Text>
              <Text style={styles.formInfoText}>
                ✨ 顧客が承認すると、予約が成立します。
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSendScoutRequest}
            >
              <Text style={styles.submitButtonText}>呼び込み申請を送信</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showScoutMessageModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowScoutMessageModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowScoutMessageModal(false)}
            >
              <X size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>スカウト申請</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedRequest && (
              <View style={styles.scoutTargetInfo}>
                <View style={styles.scoutTargetHeader}>
                  <Users size={20} color="#FF69B4" />
                  <Text style={styles.scoutTargetName}>{selectedRequest.customerName}さん</Text>
                </View>
                <View style={styles.scoutTargetDetails}>
                  {selectedRequest.desiredDate && (
                    <View style={styles.scoutTargetRow}>
                      <Calendar size={14} color="#7F8C8D" />
                      <Text style={styles.scoutTargetText}>{selectedRequest.desiredDate} {selectedRequest.desiredTime}</Text>
                    </View>
                  )}
                  {selectedRequest.menu && selectedRequest.menu.length > 0 && (
                    <View style={styles.scoutTargetRow}>
                      <FileText size={14} color="#7F8C8D" />
                      <Text style={styles.scoutTargetText}>{selectedRequest.menu.join(', ')}</Text>
                    </View>
                  )}
                  {selectedRequest.budgetRange && (
                    <View style={styles.scoutTargetRow}>
                      <Text style={styles.scoutTargetLabel}>希望価格帯:</Text>
                      <Text style={styles.scoutTargetText}>{selectedRequest.budgetRange}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>一言メッセージ *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="例: ぜひ担当させてください！あなたの希望を叶えます。"
                value={scoutMessageData.message}
                onChangeText={(text) => setScoutMessageData(prev => ({ ...prev, message: text }))}
                multiline
                numberOfLines={4}
                placeholderTextColor="#95A5A6"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>提案価格 *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="例: 15000"
                value={scoutMessageData.proposedPrice}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setScoutMessageData(prev => ({ ...prev, proposedPrice: numericValue }));
                }}
                keyboardType="numeric"
                placeholderTextColor="#95A5A6"
              />
              {scoutMessageData.proposedPrice && (
                <View style={styles.pricePreview}>
                  <Text style={styles.pricePreviewText}>¥{parseInt(scoutMessageData.proposedPrice || '0').toLocaleString()}</Text>
                </View>
              )}
            </View>

            <View style={styles.formInfo}>
              <Text style={styles.formInfoText}>
                💡 一言メッセージと提案価格を添えることで、顧客に信用と安心感を与えられます。
              </Text>
              <Text style={styles.formInfoText}>
                ✨ 顧客の希望価格帯を参考に、適切な価格を提案しましょう。
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSendScout}
            >
              <Star size={18} color="white" />
              <Text style={styles.submitButtonText}>スカウトを送信</Text>
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
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  createButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statCardScouts: {},
  statCardHistory: {},
  statCardRequests: {},
  statCardActive: {
    borderColor: '#FF69B4',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  statValueActive: {
    color: '#000000',
  },
  statLabel: {
    fontSize: 12,
    color: '#000000',
    textAlign: 'center',
  },
  statLabelActive: {
    color: '#000000',
    fontWeight: '600',
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
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestDate: {
    fontSize: 12,
    color: '#95A5A6',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  distanceText: {
    fontSize: 13,
    color: '#D4AF37',
    fontWeight: '500',
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
  concernsSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  concernsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 4,
  },
  concernsText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  matchedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  matchedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#FF69B4',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2ECC71',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498DB',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  scoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF69B4',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  scoutButtonText: {
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  formSection: {
    marginBottom: 24,
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
  },
  formTextArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  pickerPlaceholder: {
    color: '#95A5A6',
  },
  pickerList: {
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
  },
  currentLocationText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
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
  modalFooter: {
    padding: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  submitButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#3498DB',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498DB',
  },
  pendingActions: {
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  confirmedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  confirmedActions: {
    gap: 10,
  },
  cancelRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  cancelRequestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
  },
  cancelRequestSection: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  cancelRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelRequestTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  cancelReasonBox: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
  },
  cancelReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 4,
  },
  cancelReasonText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  cancelResponseActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelRejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BDC3C7',
  },
  cancelRejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  cancelApproveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  cancelApproveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  waitingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  waitingText: {
    fontSize: 13,
    color: '#95A5A6',
    fontWeight: '500',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(149, 165, 166, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#95A5A6',
  },
  menuPickerList: {
    maxHeight: 60,
    marginTop: 12,
  },
  menuChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    gap: 6,
  },
  menuChipSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  menuChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
  },
  menuChipTextSelected: {
    color: 'white',
  },
  locationSection: {
    gap: 8,
  },
  mapContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapImageWrapper: {
    width: '100%',
    height: 150,
    backgroundColor: '#F8F9FA',
    position: 'relative' as const,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: '#95A5A6',
    textAlign: 'center' as const,
    paddingHorizontal: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
    paddingRight: 48,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 120,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderColor: '#FF69B4',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  tabButtonTextActive: {
    color: '#FF69B4',
  },
  badge: {
    backgroundColor: '#FF69B4',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  scoutCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FF69B4',
  },
  scoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scoutHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  hairdresserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hairdresserName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  scoutBadge: {
    backgroundColor: 'rgba(255, 105, 180, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  scoutBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF69B4',
  },
  scoutDate: {
    fontSize: 12,
    color: '#95A5A6',
  },
  scoutBody: {
    gap: 16,
    marginBottom: 16,
  },
  requestInfoSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  requestInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 4,
  },
  scoutMessageSection: {
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  scoutMessageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF69B4',
    marginBottom: 4,
  },
  scoutMessageText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 20,
  },
  scoutActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  scoutRejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  scoutRejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
  },
  scoutAcceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scoutAcceptButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  scoutedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2ECC71',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  scoutedBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2ECC71',
  },
  favoritedCustomersSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
    gap: 8,
  },
  sectionHeaderInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  favoritedCustomersList: {
    gap: 12,
    paddingRight: 24,
  },
  favoritedCustomerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  favoritedCustomerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  favoritedCustomerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  scoutButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF69B4',
    borderRadius: 8,
    paddingVertical: 8,
    gap: 4,
  },
  scoutButtonSmallText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  noFavoritesState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noFavoritesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 6,
  },
  noFavoritesSubtext: {
    fontSize: 12,
    color: '#95A5A6',
    textAlign: 'center' as const,
  },
  formHint: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
    marginTop: -4,
  },
  menuCombinationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  combinationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    gap: 6,
    marginBottom: 4,
  },
  combinationChipSelected: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  combinationChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2C3E50',
  },
  combinationChipTextSelected: {
    color: 'white',
  },
  scoutHistorySection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scoutHistoryList: {
    gap: 12,
    marginTop: 12,
  },
  scoutHistoryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  scoutHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  scoutHistoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  scoutHistoryCustomerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  scoutHistoryStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoutHistoryStatusAccepted: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
  },
  scoutHistoryStatusRejected: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
  },
  scoutHistoryStatusPending: {
    backgroundColor: 'rgba(241, 196, 15, 0.15)',
  },
  scoutHistoryStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoutHistoryStatusTextAccepted: {
    color: '#2ECC71',
  },
  scoutHistoryStatusTextRejected: {
    color: '#E74C3C',
  },
  scoutHistoryStatusTextPending: {
    color: '#F1C40F',
  },
  scoutHistoryBody: {
    gap: 6,
  },
  scoutHistoryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoutHistoryInfoText: {
    fontSize: 12,
    color: '#2C3E50',
  },
  noScoutHistoryState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noScoutHistoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 4,
  },
  noScoutHistorySubtext: {
    fontSize: 11,
    color: '#95A5A6',
    textAlign: 'center' as const,
    paddingHorizontal: 20,
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
    borderLeftWidth: 4,
    borderLeftColor: '#FF69B4',
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
  historyHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  historyHairdresserName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  historyStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  historyStatusConfirmed: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
  },
  historyStatusCompleted: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
  },
  historyStatusCancelled: {
    backgroundColor: 'rgba(149, 165, 166, 0.15)',
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyStatusTextConfirmed: {
    color: '#3498DB',
  },
  historyStatusTextCompleted: {
    color: '#2ECC71',
  },
  historyStatusTextCancelled: {
    color: '#95A5A6',
  },
  historyDate: {
    fontSize: 12,
    color: '#95A5A6',
    fontWeight: '500',
  },
  historyBody: {
    gap: 8,
    marginBottom: 12,
  },
  historyInfoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7F8C8D',
  },
  historyInfoValue: {
    fontSize: 13,
    color: '#2C3E50',
    flex: 1,
  },
  historyFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  historyConfirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  historyConfirmedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2ECC71',
  },
  historyCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  historyCompletedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2ECC71',
  },
  historyCancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(149, 165, 166, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  historyCancelledText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#95A5A6',
  },
  scoutsScrollView: {
    flex: 1,
  },
  historyStatusPending: {
    backgroundColor: 'rgba(241, 196, 15, 0.15)',
  },
  historyStatusTextPending: {
    color: '#F1C40F',
  },
  historyStatusRejected: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
  },
  historyStatusTextRejected: {
    color: '#E74C3C',
  },
  scoutSection: {
    marginBottom: 24,
  },
  scoutSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  scoutSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  scoutSectionDesc: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 12,
  },
  menuCombinationsInfo: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
  },
  menuCombinationsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 8,
  },
  menuCombinationChip: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  menuCombinationText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
  },
  confirmedDetailCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  confirmedDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  confirmedDetailHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  confirmedDetailCustomerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmedDetailCustomerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  confirmedDetailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  confirmedDetailStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2ECC71',
  },
  confirmedDetailDate: {
    fontSize: 12,
    color: '#95A5A6',
    fontWeight: '500',
  },
  confirmedDetailBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
  },
  confirmedDetailBannerContent: {
    flex: 1,
  },
  confirmedDetailBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ECC71',
    marginBottom: 2,
  },
  confirmedDetailBannerSubtitle: {
    fontSize: 13,
    color: '#2C3E50',
  },
  confirmedDetailBody: {
    gap: 16,
  },
  confirmedDetailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  confirmedDetailSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  confirmedDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  confirmedDetailRowContent: {
    flex: 1,
    gap: 4,
  },
  confirmedDetailRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    textTransform: 'uppercase' as const,
  },
  confirmedDetailRowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  confirmedDetailRowValueMultiline: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22,
  },
  confirmedDetailMenuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  confirmedDetailMenuChip: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  confirmedDetailMenuText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  confirmedDetailFooterNote: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  confirmedDetailFooterNoteText: {
    fontSize: 13,
    color: '#3498DB',
    lineHeight: 20,
  },
  scoutHistoryActions: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  scoutHistoryCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  scoutHistoryCancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E74C3C',
  },
  budgetRangeContainer: {
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF69B4',
  },
  budgetRangeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  sliderSection: {
    marginBottom: 20,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative' as const,
    width: '100%',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    position: 'relative' as const,
  },
  sliderFill: {
    position: 'absolute' as const,
    height: 6,
    backgroundColor: '#FF69B4',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute' as const,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF69B4',
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    marginLeft: -16,
    marginTop: -13,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  budgetInputSection: {
    flex: 1,
    gap: 6,
  },
  budgetInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  budgetInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  budgetSeparator: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7F8C8D',
    marginTop: 20,
  },
  scoutTargetInfo: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF69B4',
  },
  scoutTargetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scoutTargetName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  scoutTargetDetails: {
    gap: 8,
  },
  scoutTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoutTargetLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  scoutTargetText: {
    fontSize: 13,
    color: '#2C3E50',
  },
  pricePreview: {
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2ECC71',
  },
  pricePreviewText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ECC71',
  },
  rejectedNotificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  rejectedNotificationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E74C3C',
  },
  compactHistoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#FF69B4',
  },
  compactHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  compactHistoryHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  compactCustomerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactCustomerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  compactStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  compactStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  compactDate: {
    fontSize: 11,
    color: '#95A5A6',
    textAlign: 'right',
  },
  compactHistoryBody: {
    gap: 6,
  },
  compactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactInfoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7F8C8D',
  },
  compactInfoValue: {
    fontSize: 12,
    color: '#2C3E50',
    flex: 1,
  },
  compactConcernsSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  compactConcernsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 3,
  },
  compactConcernsText: {
    fontSize: 12,
    color: '#2C3E50',
    lineHeight: 16,
  },
  salonInfoSection: {
    backgroundColor: 'rgba(255, 105, 180, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
  },
  salonInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF69B4',
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  salonInfoName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 6,
  },
  salonAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  salonAddressText: {
    fontSize: 12,
    color: '#7F8C8D',
    flex: 1,
  },

});
