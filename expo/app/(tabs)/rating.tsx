import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { useAuth, isTechCategoryAvailable } from '@/providers/AuthProvider';
import { useRatings, Assistant, ServiceDetails } from '@/providers/RatingProvider';
import { useRatingTasks } from '@/providers/RatingTaskProvider';
import { useAssistantBT } from '@/providers/AssistantBTProvider';
import { useVisitSessionPolling } from '@/providers/VisitSessionPollingProvider';
import { useDisputes } from '@/providers/DisputeProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, CheckCircle, Zap, Heart, Clock, Users, Trash2, DollarSign, Plus, Minus, X, UserPlus, Camera, QrCode, Check, AlertCircle, History, Image as ImageIcon, Scissors, Palette, Waves, AlignJustify, Link, Hand, ChevronDown, Info } from 'lucide-react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useMedicalRecords } from '@/providers/MedicalRecordProvider';
import WalletBalanceHeader from '@/components/WalletBalanceHeader';
import TechnicalSkillChart, { SkillItem } from '@/components/TechnicalSkillChart';
import CategoryProgressBar from '@/components/CategoryProgressBar';
import { createCustomerQR, validateQRCode, serializeQRData, QRData } from '@/lib/qr-utils';
import { getStorageInstance } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';



interface BTAllocation {
  id: string;
  name: string;
  amount: number;
  icon: any;
  color: string;
}

export default function RatingScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <RatingContent />
    </>
  );
}

function RatingContent() {
  const { user } = useAuth();
  const { addRating, calculateBT, getRatingsByCustomer } = useRatings();
  const { tasks, completeRatingTask, createRatingTask, deleteMultipleTasks, deleteAllTasksByCustomer } = useRatingTasks();
  const { createAssistantBTTask } = useAssistantBT();
  const { addRecord, getTreatmentHistory } = useMedicalRecords();
  const { pendingSessions, mismatchSessions } = useVisitSessionPolling();
  const { disputes } = useDisputes();
  const { subscription } = useSubscription();
  const insets = useSafeAreaInsets();

  const [paidAmount, setPaidAmount] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [showRemainderModal, setShowRemainderModal] = useState(false);
  const [includeAssistant, setIncludeAssistant] = useState(true);
  const [remainderAmount, setRemainderAmount] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [assistants, setAssistants] = useState<Assistant[]>([{ name: '', selected: false }]);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannedCustomer, setScannedCustomer] = useState<any | null>(null);
  const [showCustomerMedicalRecord, setShowCustomerMedicalRecord] = useState(false);
  const [showDeleteMode, setShowDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [savePhotoToRecord, setSavePhotoToRecord] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [technicalExpanded, setTechnicalExpanded] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; description: string } | null>(null);

  const categoryDescriptions: Record<string, string> = {
    cut: 'カットの技術・仕上がりを評価してください。',
    color: 'カラーの発色・ムラ・仕上がりを評価してください。',
    perm: 'パーマの巻き具ご・持ちは・仕上がりを評価してください。',
    straightening: '縮毛矯正のストレート感・ダメージ・仕上がりを評価してください。',
    extensions: 'エクステのつけ心地・自然さ・仕上がりを評価してください。',
    massage: 'マッサージの手技・気持ちよさ・癒やしを評価してください。',
    service: '接客態度、カウンセリング、提案力、説明の分かりやすさを評価してください。',
    timeManagement: '施術時間、待ち時間、施術の進行の評価を行なってください。',
    assistant: 'アシスタントによる施術や接客があれば満足度に応じて評価を行なってください。',
  };

  const handleInfoPress = (label: string, infoText: string) => {
    setInfoModal({ title: label, description: infoText });
  };
  
  const [btAllocations, setBtAllocations] = useState<BTAllocation[]>([
    { id: 'cut', name: 'カット', amount: 0, icon: Scissors, color: '#FF69B4' },
    { id: 'color', name: 'カラー', amount: 0, icon: Palette, color: '#FF8C42' },
    { id: 'perm', name: 'パーマ', amount: 0, icon: Waves, color: '#9B59B6' },
    { id: 'straightening', name: '縮毛矯正', amount: 0, icon: AlignJustify, color: '#3498DB' },
    { id: 'extensions', name: 'エクステ', amount: 0, icon: Link, color: '#2ECC71' },
    { id: 'massage', name: 'マッサージ', amount: 0, icon: Hand, color: '#F1C40F' },
    { id: 'service', name: '接客・カウンセリング', amount: 0, icon: Heart, color: '#FF69B4' },
    { id: 'timeManagement', name: '時間管理', amount: 0, icon: Clock, color: '#FF69B4' },
    { id: 'assistant', name: 'アシスタント', amount: 0, icon: Users, color: '#87CEEB' },
    { id: 'discarded', name: 'BP破棄', amount: 0, icon: Trash2, color: '#E74C3C' },
  ]);

  const pendingTasks = useMemo(() => {
    if (!user?.id) return [];
    
    const regularTasks = tasks.filter(task => task.customerId === user.id && task.status === 'pending');
    
    const reEvaluationTasks = disputes
      .filter(dispute => 
        dispute.customerId === user.id && 
        dispute.status === 'hairdresser_response' &&
        dispute.hairdresserProposedAmount !== undefined
      )
      .map(dispute => ({
        id: `dispute_${dispute.id}`,
        customerId: dispute.customerId,
        customerName: dispute.customerName,
        hairdresserId: dispute.hairdresserId,
        hairdresserName: dispute.hairdresserName,
        checkInDate: dispute.createdAt,
        status: 'pending' as const,
        isReEvaluation: true,
        disputeId: dispute.id,
        hairdresserProposedAmount: dispute.hairdresserProposedAmount,
      }));
    



    
    return [...regularTasks, ...reEvaluationTasks];
  }, [tasks, user, disputes]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return pendingTasks.find(task => task.id === selectedTaskId);
  }, [selectedTaskId, pendingTasks]);

  const customerRatingHistory = useMemo(() => {
    if (!user?.id) return [];
    return getRatingsByCustomer(user.id).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [user, getRatingsByCustomer]);

  useEffect(() => {
    if (pendingTasks.length === 1 && !selectedTaskId) {
      setSelectedTaskId(pendingTasks[0].id);
    }
  }, [pendingTasks, selectedTaskId]);

  useEffect(() => {
    if (selectedTask && (selectedTask as any).isReEvaluation && (selectedTask as any).hairdresserProposedAmount) {
      const proposedAmountStr = String((selectedTask as any).hairdresserProposedAmount);
      setPaidAmount(proposedAmountStr);
    }
  }, [selectedTask]);

  const totalBT = useMemo(() => {
    if (!paidAmount) return 0;
    const amount = parseFloat(paidAmount);
    if (isNaN(amount)) return 0;
    return calculateBT(amount);
  }, [paidAmount, calculateBT]);

  const allocatedBT = useMemo(() => {
    return btAllocations.reduce((sum, cat) => sum + cat.amount, 0);
  }, [btAllocations]);

  const remainingBT = totalBT - allocatedBT;

  const addAssistantField = () => {
    setAssistants([...assistants, { name: '', selected: false }]);
  };

  const removeAssistantField = (index: number) => {
    if (assistants.length === 1) return;
    setAssistants(assistants.filter((_, i) => i !== index));
  };

  const updateAssistantName = (index: number, name: string) => {
    const newAssistants = [...assistants];
    newAssistants[index] = { ...newAssistants[index], name };
    setAssistants(newAssistants);
  };

  const updateAssistantSelection = (index: number, selected: boolean) => {
    const newAssistants = [...assistants];
    newAssistants[index] = { ...newAssistants[index], selected };
    setAssistants(newAssistants);
  };

  const updateBTAllocation = (categoryId: string, delta: number) => {
    setBtAllocations(prev => {
      const newAllocations = prev.map(cat => {
        if (cat.id === categoryId) {
          const newAmount = cat.amount + delta;
          if (newAmount < 0) return cat;
          if (allocatedBT + delta > totalBT) return cat;
          return { ...cat, amount: newAmount };
        }
        return cat;
      });
      return newAllocations;
    });
  };

  const handleDistributePress = () => {
    if (totalBT === 0) {
      Alert.alert('エラー', '支払った金額を入力してください');
      return;
    }
    setShowDistributeModal(true);
  };

  const distributeEqually = (includeAssist: boolean) => {
    setShowDistributeModal(false);

    const activeCategories = btAllocations.filter(cat => {
      if (cat.id === 'discarded') return false;
      if (cat.id === 'assistant' && !includeAssist) return false;
      return true;
    });

    const perCategory = Math.floor(totalBT / activeCategories.length);
    const remainder = totalBT % activeCategories.length;

    if (remainder > 0) {
      setRemainderAmount(remainder);
      setIncludeAssistant(includeAssist);
      setShowRemainderModal(true);
      return;
    }

    setBtAllocations(prev => prev.map(cat => {
      if (cat.id === 'discarded') {
        return { ...cat, amount: 0 };
      }
      if (cat.id === 'assistant' && !includeAssist) {
        return { ...cat, amount: 0 };
      }
      const isActive = activeCategories.some(ac => ac.id === cat.id);
      return { ...cat, amount: isActive ? perCategory : 0 };
    }));
  };

  const distributeWithRemainder = (selectedCategoryId: string) => {
    setShowRemainderModal(false);

    const activeCategories = btAllocations.filter(cat => {
      if (cat.id === 'discarded') return false;
      if (cat.id === 'assistant' && !includeAssistant) return false;
      return true;
    });

    const perCategory = Math.floor(totalBT / activeCategories.length);

    setBtAllocations(prev => prev.map(cat => {
      if (cat.id === 'discarded') {
        return { ...cat, amount: 0 };
      }
      if (cat.id === 'assistant' && !includeAssistant) {
        return { ...cat, amount: 0 };
      }
      const isActive = activeCategories.some(ac => ac.id === cat.id);
      if (!isActive) return { ...cat, amount: 0 };

      const baseAmount = perCategory;
      const extra = cat.id === selectedCategoryId ? remainderAmount : 0;
      return { ...cat, amount: baseAmount + extra };
    }));
  };

  const resetAllocations = () => {
    setBtAllocations(prev => prev.map(cat => ({ ...cat, amount: 0 })));
  };

  const toggleSelectTask = (taskId: string) => {
    const newSelected = new Set(selectedForDelete);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedForDelete(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedForDelete.size === 0) {
      Alert.alert('エラー', '削除する評価タスクを選択してください');
      return;
    }

    Alert.alert(
      '確認',
      `選択した${selectedForDelete.size}件の評価タスクを削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMultipleTasks(Array.from(selectedForDelete));
              Alert.alert('完了', '選択した評価タスクを削除しました');
              setSelectedForDelete(new Set());
              setShowDeleteMode(false);
            } catch (error) {

              Alert.alert('エラー', '削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAll = async () => {
    if (!user?.id) return;

    Alert.alert(
      '確認',
      'すべての評価タスクを削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'すべて削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllTasksByCustomer(user.id);
              Alert.alert('完了', 'すべての評価タスクを削除しました');
              setShowDeleteMode(false);
              setSelectedForDelete(new Set());
            } catch (error) {

              Alert.alert('エラー', '削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const handleSubmitRating = async () => {
    if (!selectedTask) {
      Alert.alert('エラー', '評価タスクを選択してください');
      return;
    }

    if (!paidAmount || parseFloat(paidAmount) <= 0) {
      Alert.alert('エラー', '支払った金額を入力してください');
      return;
    }

    if (allocatedBT === 0) {
      Alert.alert('エラー', 'BPを振り分けてください');
      return;
    }

    if (remainingBT !== 0) {
      Alert.alert(
        '確認',
        `未振り分けのBPが${remainingBT}BPあります。\nこのまま送信しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '送信', onPress: submitRating }
        ]
      );
      return;
    }

    submitRating();
  };

  const submitRating = async () => {
    if (!user || !selectedTask) {
      Alert.alert('エラー', 'ログインしてください');
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl: string | undefined = undefined;

      if (savePhotoToRecord && selectedPhoto && subscription.tier === 'premium') {

        setUploadingPhoto(true);
        
        try {
          const response = await fetch(selectedPhoto);
          const blob = await response.blob();
          
          const storage = getStorageInstance();
          const filename = `medical-records/${user.id}/${Date.now()}.jpg`;
          const storageRef = ref(storage, filename);
          
          await uploadBytes(storageRef, blob);
          photoUrl = await getDownloadURL(storageRef);
          

        } catch (error) {

          Alert.alert('警告', '写真のアップロードに失敗しましたが、評価は送信されます。');
        } finally {
          setUploadingPhoto(false);
        }
      }

      const discarded = btAllocations.find(cat => cat.id === 'discarded');
      const categories = btAllocations
        .filter(cat => cat.id !== 'discarded')
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          rating: cat.amount > 0 ? 5 : 0,
          btAmount: cat.amount,
        }));

      const validAssistants = assistants.filter(a => a.name.trim() !== '' || a.selected);

      const customerGender = user?.gender;
      const submittedDetails: ServiceDetails = {};
      const cutAlloc = btAllocations.find(c => c.id === 'cut');
      const colorAlloc = btAllocations.find(c => c.id === 'color');
      const permAlloc = btAllocations.find(c => c.id === 'perm');
      if (cutAlloc && cutAlloc.amount > 0 && (customerGender === 'male' || customerGender === 'female')) {
        submittedDetails.cut = customerGender === 'male' ? 'mens' : 'ladies';
      }
      if (colorAlloc && colorAlloc.amount > 0) {
        const latestHistory = getTreatmentHistory(user.id).find(h => h.menus.includes('color'));
        const appType = latestHistory?.menuDetails.color?.applicationType;
        if (appType === 'Wカラー') {
          submittedDetails.color = 'wColor';
        } else if (appType) {
          submittedDetails.color = 'oneColor';
        }
      }
      if (permAlloc && permAlloc.amount > 0 && (customerGender === 'male' || customerGender === 'female')) {
        submittedDetails.perm = customerGender === 'male' ? 'mens' : 'ladies';
      }

      const ratingData = {
        customerId: user.id,
        customerName: user.name,
        hairdresserId: selectedTask.hairdresserId,
        hairdresserName: selectedTask.hairdresserName,
        paidAmount: parseFloat(paidAmount),
        totalBT: allocatedBT - (discarded?.amount || 0),
        categories: categories,
        assistants: validAssistants,
        btDiscarded: discarded?.amount || 0,
        comment: comment.trim(),
        photoUrl: photoUrl || undefined,
        serviceDetails: submittedDetails,
      };



      await addRating(ratingData);

      await completeRatingTask(selectedTask.id);

      const assistantCategory = categories.find(cat => cat.id === 'assistant');
      if (assistantCategory && assistantCategory.btAmount > 0) {
        await createAssistantBTTask({
          fromHairdresserId: selectedTask.hairdresserId,
          fromHairdresserName: selectedTask.hairdresserName,
          toHairdresserId: '',
          toHairdresserName: '',
          assistantBTAmount: assistantCategory.btAmount,
          customerId: user.id,
          customerName: user.name,
          originalRatingId: `rating_${Date.now()}`,
          status: 'pending',
        });
      }

      Alert.alert(
        '評価送信完了',
        `評価を送信しました！\n\n💡 BPは美容師がカルテを記入し、支払金額が一致するまで保留されます。\n\n送信内容：\n• 合計 ${ratingData.totalBT} BP${
          discarded && discarded.amount > 0 ? `\n• ${discarded.amount} BPが破棄されました` : ''
        }`,
        [{ text: 'OK' }]
      );

      setPaidAmount('');
      setComment('');
      setAssistants([{ name: '', selected: false }]);
      setSelectedTaskId(null);
      setSavePhotoToRecord(false);
      setSelectedPhoto(null);
      resetAllocations();
    } catch (error: any) {
      console.error('[Rating] submitRating error:', error);
      console.error('[Rating] Error message:', error?.message);
      console.error('[Rating] Error code:', error?.code);
      const errorMessage = error?.message || '不明なエラー';
      Alert.alert('エラー', `評価の送信に失敗しました\n\n詳細: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

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


    setShowQRScanner(true);
  };

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
      












      
      const taskId = await createRatingTask(ratingTask);
      







      
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

  if (!user || user.role !== 'customer') {
    if (user?.role === 'hairdresser') {
      return (
        <LinearGradient colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']} style={styles.container}>
          <View style={[styles.balanceBar, { top: insets.top + 8 }]}>
            <WalletBalanceHeader />
          </View>
          <View>
            <TouchableOpacity
              style={styles.qrScanButton}
              onPress={handleQRScan}
            >
              <Camera size={24} color="white" />
              <Text style={styles.qrScanButtonText}>顧客情報を読みこむ</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ paddingTop: 100 }} showsVerticalScrollIndicator={false}>
            <View style={styles.noTasksCard}>
              <CheckCircle size={48} color="#BDC3C7" />
              <Text style={styles.noTasksTitle}>顧客QRをスキャン</Text>
              <Text style={styles.noTasksText}>
                右上の「顧客情報を読みこむ」ボタンで{' \n '}
                顧客のQRコードをスキャンしてください
              </Text>
            </View>
          </ScrollView>

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

                    if (result.data && !isProcessingQR) {
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

                      const mockCustomerData = createCustomerQR({
                        id: 'customer_test_' + Date.now(),
                        name: 'テスト顧客',
                        email: 'test.customer@example.com'
                      });

                      handleQRCodeScanned(serializeQRData(mockCustomerData));
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
            <View style={styles.customerRecordContainer}>
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
                    <Users size={32} color="#FF69B4" />
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
                    {getTreatmentHistory(scannedCustomer.customerId).slice(0, 3).map((history) => (
                      <View key={history.id} style={styles.historyItemCard}>
                        <View style={styles.historyItemHeader}>
                          <Text style={styles.historyItemDate}>{history.serviceDate}</Text>
                          <Text style={styles.historyItemHairdresser}>{history.hairdresserName}</Text>
                        </View>
                        <Text style={styles.historyItemMenus}>
                          {Array.isArray(history.menus) ? history.menus.map((m: string) => {
                            const labels: Record<string, string> = {
                              cut: 'カット',
                              color: 'カラー',
                              perm: 'パーマ',
                              straightening: '縮毛矯正',
                              treatment: 'トリートメント',
                              headspa: 'ヘッドスパ'
                            };
                            return labels[m] || m;
                          }).join(', ') : '-'}
                        </Text>
                        {history.notes && (
                          <Text style={styles.historyItemNotes} numberOfLines={2}>{history.notes}</Text>
                        )}
                      </View>
                    ))}
                    {getTreatmentHistory(scannedCustomer.customerId).length > 3 && (
                      <Text style={styles.moreHistoryText}>
                        ...他 {getTreatmentHistory(scannedCustomer.customerId).length - 3} 件
                      </Text>
                    )}
                  </View>
                )}
                
                {scannedCustomer && getTreatmentHistory(scannedCustomer.customerId).length === 0 && (
                  <View style={styles.medicalHistorySection}>
                    <Text style={styles.medicalHistoryTitle}>施術履歴</Text>
                    <View style={styles.medicalHistoryCard}>
                      <Text style={styles.noMedicalHistoryText}>この顧客の施術履歴はまだありません</Text>
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
                    5. BPが付与
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
            </View>
          </Modal>
        </LinearGradient>
      );
    }
    
    return (
      <LinearGradient colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']} style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>評価機能</Text>
          <Text style={styles.subtitle}>顧客アカウントでのみ利用可能です</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={styles.container}
    >
      <View style={[styles.balanceBar, { top: insets.top + 8 }]}>
        <WalletBalanceHeader />
      </View>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingTop: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowHistoryModal(true)}
          >
            <History size={20} color="#FF69B4" />
            <Text style={styles.historyButtonText}>履歴</Text>
          </TouchableOpacity>
          {pendingTasks.length > 0 && (
            <TouchableOpacity
              style={styles.deleteTasksButton}
              onPress={() => setShowDeleteMode(true)}
            >
              <Trash2 size={20} color="#E74C3C" />
              <Text style={styles.deleteTasksButtonText}>削除</Text>
            </TouchableOpacity>
          )}
        </View>
        {mismatchSessions.filter(s => 
          s.status === 'amount_mismatch'
        ).length > 0 && (
          <View style={styles.mismatchBanner}>
            <View style={styles.mismatchHeader}>
              <AlertCircle size={24} color="#E74C3C" />
              <Text style={styles.mismatchTitle}>金額の不一致が検出されました</Text>
            </View>
            {mismatchSessions.filter(s => 
              s.status === 'amount_mismatch'
            ).map((session) => {
              const relatedDispute = disputes.find(d => 
                d.customerId === session.customerId && 
                d.hairdresserId === session.hairdresserId &&
                (d.status === 'pending' || d.status === 'hairdresser_response')
              );
              







              
              return (
                <View key={session.id} style={styles.mismatchCard}>
                  <View style={styles.mismatchCardHeader}>
                    <Text style={styles.mismatchText}>美容師: {session.hairdresserName}</Text>
                    <TouchableOpacity
                      style={styles.deleteMismatchButton}
                      onPress={async () => {
Alert.alert(
                          '確認',
                          'この金額不一致を手動で解決しますか？\n\n注意: 金額が正しく一致していることを確認してから解決してください。',
                          [
                            { text: 'キャンセル', style: 'cancel' },
                            {
                              text: '解決してBP付与',
                              style: 'default',
                              onPress: async () => {
                                try {









                                  
                                  const { getDb } = await import('@/lib/firebase');
                                  const { doc, updateDoc, getDoc, collection, query, where, getDocs, serverTimestamp, increment } = await import('firebase/firestore');
                                  const db = getDb();
                                  
                                  const sessionRef = doc(db, 'visitSessions', session.id);
                                  const sessionDoc = await getDoc(sessionRef);
                                  
                                  if (!sessionDoc.exists()) {

                                    Alert.alert('エラー', 'セッションが見つかりませんでした');
                                    return;
                                  }
                                  
                                  const sessionData = sessionDoc.data();
                                  const btAmount = sessionData.btAmount || 0;
                                  const hairdresserId = sessionData.hairdresserId;
                                  



                                  
                                  const userRef = doc(db, 'users', hairdresserId);
                                  await updateDoc(userRef, {
                                    btBalance: increment(btAmount),
                                  });

                                  

                                  if (sessionData.ratingId) {
                                    await updateDoc(doc(db, 'ratings', sessionData.ratingId), {
                                      btReflected: true,
                                    });

                                  }
                                  

                                  await updateDoc(sessionRef, {
                                    status: 'completed',
                                    updatedAt: serverTimestamp(),
                                  });

                                  

                                  const disputesRef = collection(db, 'disputes');
                                  const disputeQuery = query(
                                    disputesRef,
                                    where('visitSessionId', '==', session.id)
                                  );
                                  const disputeSnapshot = await getDocs(disputeQuery);
                                  
                                  if (!disputeSnapshot.empty) {
                                    for (const disputeDoc of disputeSnapshot.docs) {

                                      await updateDoc(doc(db, 'disputes', disputeDoc.id), {
                                        status: 'resolved',
                                        updatedAt: serverTimestamp(),
                                      });

                                    }
                                  } else {

                                  }
                                  



                                  
                                  Alert.alert('完了', `金額不一致を解決しました。\n\n${btAmount}BPが美容師に付与されました。`);
                                } catch (error: any) {







                                  Alert.alert('エラー', `解決処理に失敗しました: ${error.message || '不明なエラー'}`);
                                }
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Trash2 size={18} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.mismatchAmounts}>
                    あなたの入力: ¥{typeof session.customerAmount === 'number' ? session.customerAmount.toLocaleString() : '0'}
                  </Text>
                  <Text style={styles.mismatchAmounts}>
                    美容師が受領した金額: ¥{typeof session.hairdresserAmount === 'number' ? session.hairdresserAmount.toLocaleString() : '0'}
                  </Text>
                  {relatedDispute && relatedDispute.hairdresserProposedAmount && (
                    <Text style={styles.mismatchProposedAmount}>
                      💡 美容師の提案金額: ¥{relatedDispute.hairdresserProposedAmount.toLocaleString()}
                    </Text>
                  )}
                  <Text style={styles.mismatchNote}>
                    {relatedDispute && relatedDispute.hairdresserProposedAmount 
                      ? `美容師が受領した金額は¥${typeof session.hairdresserAmount === 'number' ? session.hairdresserAmount.toLocaleString() : '0'}です。\n\n💡 美容師から提案金額¥${relatedDispute.hairdresserProposedAmount.toLocaleString()}があります。\n\nこの金額が正しければ、評価タスクを選択して提案金額で再評価してください。金額が一致すれば自動的にBPが付与されます。\n\n提案金額が間違っている場合、上のゴミ箱ボタンで手動解決するか、運営に報告してください。`
                      : `美容師が受領した金額は¥${typeof session.hairdresserAmount === 'number' ? session.hairdresserAmount.toLocaleString() : '0'}です。\n\nこの金額が正しければ、評価タスクを選択してこの金額で再評価してください。金額が一致すれば自動的にBPが付与されます。\n\n金額が間違っている場合、上のゴミ箱ボタンで手動解決するか、美容師と確認してください。`
                    }
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {disputes.filter(d => d.customerId === user?.id && d.status === 'customer_reported').length > 0 && (
          <View style={styles.reportedBanner}>
            <View style={styles.reportedHeader}>
              <AlertCircle size={24} color="#9B59B6" />
              <Text style={styles.reportedTitle}>運営確認中</Text>
            </View>
            {disputes
              .filter(d => d.customerId === user?.id && d.status === 'customer_reported')
              .map((dispute) => (
                <View key={dispute.id} style={styles.reportedCard}>
                  <Text style={styles.reportedText}>美容師: {dispute.hairdresserName}</Text>
                  <Text style={styles.reportedAmounts}>
                    あなたの入力: ¥{typeof dispute.customerAmount === 'number' ? dispute.customerAmount.toLocaleString() : '0'}
                  </Text>
                  <Text style={styles.reportedAmounts}>
                    美容師の提案: ¥{typeof dispute.hairdresserProposedAmount === 'number' ? dispute.hairdresserProposedAmount.toLocaleString() : '0'}
                  </Text>
                  <Text style={styles.reportedNote}>
                    🔍 運営が確認中です。解決まで少々お待ちください。
                  </Text>
                </View>
              ))}
          </View>
        )}

        {pendingSessions.filter(s => s.customerId === user?.id && s.customerEvaluated).length > 0 && (
          <View style={styles.pendingBanner}>
            <View style={styles.pendingHeader}>
              <Clock size={24} color="#F39C12" />
              <Text style={styles.pendingTitle}>BP付与待ち</Text>
            </View>
            {pendingSessions
              .filter(s => s.customerId === user?.id && s.customerEvaluated)
              .map((session) => (
                <View key={session.id} style={styles.pendingCard}>
                  <Text style={styles.pendingText}>美容師: {session.hairdresserName}</Text>
                  <Text style={styles.pendingAmount}>金額: ¥{typeof session.customerAmount === 'number' ? session.customerAmount.toLocaleString() : '0'}</Text>
                  <Text style={styles.pendingNote}>
                    💡 評価を送信しました。
                    美容師がカルテを記入し、金額が一致するとBPが付与されます。
                  </Text>
                </View>
              ))}
          </View>
        )}

        {pendingTasks.length === 0 ? (
          <View style={styles.noTasksCard}>
            <CheckCircle size={48} color="#BDC3C7" />
            <Text style={styles.noTasksTitle}>評価タスクがありません</Text>
            <Text style={styles.noTasksText}>
              美容師に来店処理をしてもらうと、{'\n'}
              ここに評価タスクが表示されます
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.taskSelector}>
              <View style={styles.taskSelectorHeader}>
                <Text style={styles.taskSelectorLabel}>評価する美容師を選択</Text>
                {showDeleteMode && (
                  <View style={styles.deleteModeActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowDeleteMode(false);
                        setSelectedForDelete(new Set());
                      }}
                    >
                      <Text style={styles.cancelButtonText}>キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteSelectedButton}
                      onPress={handleDeleteSelected}
                      disabled={selectedForDelete.size === 0}
                    >
                      <Trash2 size={18} color="white" />
                      <Text style={styles.deleteSelectedButtonText}>
                        選択を削除 ({selectedForDelete.size})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteAllButton}
                      onPress={handleDeleteAll}
                    >
                      <Text style={styles.deleteAllButtonText}>すべて削除</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {pendingTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.taskCard,
                    !showDeleteMode && selectedTaskId === task.id && styles.taskCardSelected,
                    showDeleteMode && selectedForDelete.has(task.id) && styles.taskCardSelectedForDelete,
                    (task as any).isReEvaluation && styles.taskCardReEvaluation
                  ]}
                  onPress={() => {
                    if (showDeleteMode) {
                      toggleSelectTask(task.id);
                    } else {
                      setSelectedTaskId(task.id);
                    }
                  }}
                >
                  <View style={styles.taskCardHeader}>
                    <View style={styles.taskCardHeaderLeft}>
                      <Text style={styles.taskCardName}>{task.hairdresserName}</Text>
                      {(task as any).isReEvaluation && (
                        <View style={styles.reEvaluationBadge}>
                          <AlertCircle size={14} color="#E74C3C" />
                          <Text style={styles.reEvaluationBadgeText}>再評価</Text>
                        </View>
                      )}
                    </View>
                    {!showDeleteMode && selectedTaskId === task.id && (
                      <CheckCircle size={20} color="#FF69B4" />
                    )}
                    {showDeleteMode && selectedForDelete.has(task.id) && (
                      <View style={styles.selectCheckbox}>
                        <Check size={16} color="white" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.taskCardDate}>
                    来店日: {new Date(task.checkInDate).toLocaleDateString('ja-JP')}
                  </Text>
                  {(task as any).isReEvaluation && (task as any).hairdresserProposedAmount && (
                    <Text style={styles.taskCardProposedAmount}>
                      💡 提案金額: ¥{(task as any).hairdresserProposedAmount.toLocaleString()}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {!showDeleteMode && selectedTask && (
              <View style={styles.ratingCard}>
                {(selectedTask as any).isReEvaluation && (
                  <View style={styles.reEvaluationNotice}>
                    <AlertCircle size={20} color="#FF9800" />
                    <View style={styles.reEvaluationNoticeText}>
                      <Text style={styles.reEvaluationNoticeTitle}>再評価が必要です</Text>
                      <Text style={styles.reEvaluationNoticeMessage}>
                        金額の不一致がありました。美容師が提案した金額で再評価してください。
                      </Text>
                      {(selectedTask as any).hairdresserProposedAmount && (
                        <Text style={styles.reEvaluationNoticeAmount}>
                          💡 美容師の提案金額: ¥{(selectedTask as any).hairdresserProposedAmount.toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
                <View style={styles.hairdresserSection}>
                  <Text style={styles.sectionLabel}>美容師</Text>
                  <View style={styles.hairdresserInfo}>
                    <Text style={styles.hairdresserName}>{selectedTask.hairdresserName}</Text>
                    <Text style={styles.hairdresserDate}>
                      来店日: {new Date(selectedTask.checkInDate).toLocaleDateString('ja-JP')}
                    </Text>
                  </View>
                </View>

                <View style={styles.assistantsSection}>
                  <View style={styles.assistantsSectionHeader}>
                    <Text style={styles.sectionLabel}>アシスタント</Text>
                    <TouchableOpacity
                      style={styles.addAssistantButton}
                      onPress={addAssistantField}
                    >
                      <UserPlus size={16} color="#4CAF50" />
                      <Text style={styles.addAssistantText}>追加</Text>
                    </TouchableOpacity>
                  </View>
                  {assistants.map((assistant, index) => (
                    <View key={index} style={styles.assistantField}>
                      <TextInput
                        style={styles.assistantInput}
                        placeholder="アシスタント名"
                        value={assistant.name}
                        onChangeText={(text) => updateAssistantName(index, text)}
                        placeholderTextColor="#BDC3C7"
                      />
                      <View style={styles.assistantOptions}>
                        <TouchableOpacity
                          style={[
                            styles.assistantOptionButton,
                            !assistant.selected && assistant.name === '' && styles.assistantOptionButtonActive
                          ]}
                          onPress={() => {
                            updateAssistantName(index, '未選択');
                            updateAssistantSelection(index, true);
                          }}
                        >
                          <Text style={styles.assistantOptionText}>未選択</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.assistantOptionButton,
                            !assistant.selected && assistant.name === '' && styles.assistantOptionButtonActive
                          ]}
                          onPress={() => {
                            updateAssistantName(index, 'わからない');
                            updateAssistantSelection(index, true);
                          }}
                        >
                          <Text style={styles.assistantOptionText}>わからない</Text>
                        </TouchableOpacity>
                        {assistants.length > 1 && (
                          <TouchableOpacity
                            style={styles.removeAssistantButton}
                            onPress={() => removeAssistantField(index)}
                          >
                            <X size={16} color="#E74C3C" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.amountSection}>
                  <DollarSign size={24} color="#4CAF50" />
                  <Text style={styles.amountLabel}>支払った金額</Text>
                </View>
                <View style={styles.amountInputWrapper}>
                  <Text style={styles.currencySymbol}>¥</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="8000"
                    value={paidAmount}
                    onChangeText={setPaidAmount}
                    keyboardType="numeric"
                    placeholderTextColor="#BDC3C7"
                  />
                </View>

                {totalBT > 0 && (
                  <View style={styles.btSummaryCard}>
                    <View style={styles.btSummaryRow}>
                      <Text style={styles.btSummaryLabel}>獲得可能BP</Text>
                      <Text style={styles.btSummaryValue}>{totalBT} BP</Text>
                    </View>
                    <View style={styles.btSummaryRow}>
                      <Text style={styles.btSummaryLabel}>振り分け済み</Text>
                      <Text style={[styles.btSummaryValue, allocatedBT > totalBT && styles.btSummaryError]}>
                        {allocatedBT} BP
                      </Text>
                    </View>
                    <View style={styles.btSummaryDivider} />
                    <View style={styles.btSummaryRow}>
                      <Text style={styles.btSummaryTotalLabel}>未振り分け</Text>
                      <Text style={[styles.btSummaryTotalValue, remainingBT < 0 && styles.btSummaryError]}>
                        {remainingBT} BP
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.quickActionsRow}>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={handleDistributePress}
                    disabled={totalBT === 0}
                  >
                    <Text style={styles.quickActionText}>均等に振り分け</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickActionButton, styles.resetButton]}
                    onPress={resetAllocations}
                  >
                    <Text style={styles.quickActionText}>リセット</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.allocationsSection}>
                  <Text style={styles.allocationsSectionTitle}>BP振り分け</Text>
                  <Text style={styles.allocationsSectionSubtitle}>
                    各評価項目にBPを振り分けてください（1000円 = 1BP）
                  </Text>
                  {(() => {
                    const techIds = ['cut', 'color', 'perm', 'straightening', 'extensions', 'massage'];
                    const techAllocations = btAllocations.filter(a => techIds.includes(a.id) && isTechCategoryAvailable(a.id, user?.availableServices));
                    const otherItems = btAllocations.filter(a => !techIds.includes(a.id));
                    const techTotal = techAllocations.reduce((s, a) => s + a.amount, 0);
                    const techSkillItems: SkillItem[] = techAllocations.map(a => ({
                      id: a.id,
                      icon: a.icon,
                      color: a.color,
                      label: a.name,
                      value: a.amount,
                      infoText: categoryDescriptions[a.id],
                    }));
                    return (
                      <>
                        <TouchableOpacity
                          style={[styles.allocationCard, { borderLeftWidth: 3, borderLeftColor: '#FF69B4' }]}
                          onPress={() => setTechnicalExpanded(!technicalExpanded)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.allocationHeader}>
                            <ChevronDown
                              size={20}
                              color="#FF69B4"
                              style={{ transform: [{ rotate: technicalExpanded ? '0deg' : '-90deg' }] }}
                            />
                            <Text style={[styles.allocationName, { color: '#FF69B4', fontWeight: 'bold' as const }]}>技術力</Text>
                          </View>
                          <View style={styles.allocationAmountContainer}>
                            <Text style={[styles.allocationAmount, { color: '#FF69B4' }]}>{techTotal}</Text>
                            <Text style={styles.allocationUnit}>BP</Text>
                          </View>
                        </TouchableOpacity>

                        {technicalExpanded && (
                          <View style={{ marginLeft: 8, marginBottom: 12 }}>
                            <TechnicalSkillChart
                              items={techSkillItems}
                              total={techTotal}
                              interactive
                              onAdjust={(id, delta) => updateBTAllocation(id, delta)}
                              canIncrease={() => remainingBT > 0}
                              canDecrease={(id) => techAllocations.find(a => a.id === id)?.amount !== 0}
                              onInfoPress={handleInfoPress}
                            />
                          </View>
                        )}

                        {otherItems.map((allocation) => {
                          if (allocation.id === 'discarded') {
                            const IconComponent = allocation.icon;
                            return (
                              <View key={allocation.id} style={styles.allocationCard}>
                                <View style={styles.allocationHeader}>
                                  <IconComponent size={24} color={allocation.color} />
                                  <Text style={styles.allocationName}>{allocation.name}</Text>
                                </View>
                                <View style={styles.allocationControls}>
                                  <TouchableOpacity
                                    style={styles.allocationButton}
                                    onPress={() => updateBTAllocation(allocation.id, -1)}
                                    disabled={allocation.amount === 0}
                                  >
                                    <Minus size={20} color={allocation.amount === 0 ? '#BDC3C7' : '#2C3E50'} />
                                  </TouchableOpacity>
                                  <View style={styles.allocationAmountContainer}>
                                    <Text style={styles.allocationAmount}>{allocation.amount}</Text>
                                    <Text style={styles.allocationUnit}>BP</Text>
                                  </View>
                                  <TouchableOpacity
                                    style={styles.allocationButton}
                                    onPress={() => updateBTAllocation(allocation.id, 1)}
                                    disabled={remainingBT <= 0}
                                  >
                                    <Plus size={20} color={remainingBT <= 0 ? '#BDC3C7' : '#2C3E50'} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          }
                          return (
                            <CategoryProgressBar
                              key={allocation.id}
                              icon={allocation.icon}
                              color={allocation.color}
                              label={allocation.name}
                              value={allocation.amount}
                              maxValue={totalBT}
                              interactive
                              onAdjust={(delta) => updateBTAllocation(allocation.id, delta)}
                              canIncrease={remainingBT > 0}
                              canDecrease={allocation.amount > 0}
                              infoText={categoryDescriptions[allocation.id]}
                              onInfoPress={handleInfoPress}
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </View>

                <Text style={styles.commentLabel}>コメント（任意）</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="サービスについてのコメントを入力してください"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#95A5A6"
                />

                <View style={styles.photoSection}>
                  <TouchableOpacity
                    style={[
                      styles.photoCheckboxContainer,
                      subscription.tier !== 'premium' && styles.photoCheckboxContainerDisabled
                    ]}
                    onPress={() => {
                      if (subscription.tier === 'premium') {
                        setSavePhotoToRecord(!savePhotoToRecord);
                      } else {
                        Alert.alert(
                          'プレミアム機能',
                          '写真保存機能はプレミアムプラン限定です。',
                          [
                            { text: 'キャンセル', style: 'cancel' },
                            { 
                              text: 'プレミアムに加入', 
                              onPress: () => router.push('/subscription' as any)
                            }
                          ]
                        );
                      }
                    }}
                    disabled={subscription.tier !== 'premium'}
                  >
                    <View style={[
                      styles.checkbox,
                      savePhotoToRecord && styles.checkboxChecked,
                      subscription.tier !== 'premium' && styles.checkboxDisabled
                    ]}>
                      {savePhotoToRecord && <Check size={16} color="white" />}
                    </View>
                    <View style={styles.photoCheckboxTextContainer}>
                      <Text style={[
                        styles.photoCheckboxLabel,
                        subscription.tier !== 'premium' && styles.photoCheckboxLabelDisabled
                      ]}>
                        写真をカルテに保存（プレミアム）
                      </Text>
                      {subscription.tier !== 'premium' && (
                        <TouchableOpacity
                          style={styles.premiumBadge}
                          onPress={() => router.push('/subscription' as any)}
                        >
                          <Text style={styles.premiumBadgeText}>プレミアムで利用可能</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>

                  {savePhotoToRecord && subscription.tier === 'premium' && (
                    <View style={styles.photoUploadSection}>
                      <TouchableOpacity
                        style={styles.photoSelectButton}
                        onPress={async () => {
                          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                          if (status !== 'granted') {
                            Alert.alert('エラー', '写真へのアクセス許可が必要です');
                            return;
                          }

                          const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 0.8,
                          });

                          if (!result.canceled && result.assets[0]) {
                            setSelectedPhoto(result.assets[0].uri);
                          }
                        }}
                      >
                        <ImageIcon size={20} color="#FF69B4" />
                        <Text style={styles.photoSelectButtonText}>写真を選択</Text>
                      </TouchableOpacity>

                      {selectedPhoto && (
                        <View style={styles.photoPreviewContainer}>
                          <Image source={{ uri: selectedPhoto }} style={styles.photoPreview} />
                          <TouchableOpacity
                            style={styles.photoRemoveButton}
                            onPress={() => setSelectedPhoto(null)}
                          >
                            <X size={16} color="white" />
                          </TouchableOpacity>
                        </View>
                      )}

                      <Text style={styles.photoNotice}>
                        ⚠️ 写真は顧客カルテのみ保存。美容師にデータ残りません。
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitRating}
                  disabled={submitting}
                >
                  {submitting ? (
                    <CheckCircle size={20} color="white" />
                  ) : (
                    <Send size={20} color="white" />
                  )}
                  <Text style={styles.submitButtonText}>
                    {submitting ? '送信中...' : '評価を送信'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>💡 BP振り分けについて</Text>
              <Text style={styles.instructionText}>
                • 支払金額1000円につき1BPが発生します{'\n'}
                • BPを各評価項目に自由に振り分けられます{'\n'}
                • 満足度に応じて振り分け量を調整できます{'\n'}
                • BP破棄は手動でのみ減算可能です{'\n'}
                • 振り分けたBPは美容師に付与されます{'\n'}
                • アシスタントは複数人登録できます
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showDistributeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDistributeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>均等振り分け</Text>
            <Text style={styles.modalMessage}>
              どの項目に振り分けますか？
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => distributeEqually(true)}
            >
              <Text style={styles.modalButtonText}>アシスタントを含めて均等に分配</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => distributeEqually(false)}
            >
              <Text style={styles.modalButtonText}>アシスタントを除いて均等に分配</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setShowDistributeModal(false)}
            >
              <Text style={styles.modalButtonTextCancel}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRemainderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemainderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>余りの振り分け</Text>
            <Text style={styles.modalMessage}>
              {remainderAmount}BPの余りがあります。{'\n'}
              どの項目に追加で振り分けますか？
            </Text>
            {btAllocations
              .filter(cat => {
                if (cat.id === 'discarded') return false;
                if (cat.id === 'assistant' && !includeAssistant) return false;
                return true;
              })
              .map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.modalButton}
                  onPress={() => distributeWithRemainder(cat.id)}
                >
                  <Text style={styles.modalButtonText}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setShowRemainderModal(false)}
            >
              <Text style={styles.modalButtonTextCancel}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHistoryModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <TouchableOpacity
              style={styles.historyCloseButton}
              onPress={() => setShowHistoryModal(false)}
            >
              <X size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.historyTitle}>評価履歴</Text>
            <View style={styles.historyHeaderSpacer} />
          </View>

          {customerRatingHistory.length === 0 ? (
            <View style={styles.noHistoryCard}>
              <CheckCircle size={64} color="#BDC3C7" />
              <Text style={styles.noHistoryTitle}>評価履歴がありません</Text>
              <Text style={styles.noHistoryText}>
                美容院で施術を受けて評価を送信すると、{'\n'}
                ここに履歴が表示されます
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {customerRatingHistory.map((rating) => (
                <View key={rating.id} style={styles.historyRatingCard}>
                  <View style={styles.historyRatingHeader}>
                    <View style={styles.historyRatingInfo}>
                      <Text style={styles.historyRatingHairdresser}>
                        美容師: {rating.hairdresserName}
                      </Text>
                      <Text style={styles.historyRatingDate}>
                        {new Date(rating.createdAt).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                    <View style={styles.historyRatingBT}>
                      <Text style={styles.historyRatingBTAmount}>{rating.totalBT}</Text>
                      <Text style={styles.historyRatingBTUnit}>BP</Text>
                    </View>
                  </View>
                  <View style={styles.historyRatingDetails}>
                    <Text style={styles.historyRatingAmount}>
                      支払金額: ¥{typeof rating.paidAmount === 'number' ? rating.paidAmount.toLocaleString() : '0'}
                    </Text>
                    {rating.btReflected === false && (
                      <View style={styles.historyPendingBadge}>
                        <Clock size={14} color="#F39C12" />
                        <Text style={styles.historyPendingText}>BP付与保留中</Text>
                      </View>
                    )}
                    {rating.btReflected === true && (
                      <View style={styles.historyCompletedBadge}>
                        <CheckCircle size={14} color="#4CAF50" />
                        <Text style={styles.historyCompletedText}>BP付与完了</Text>
                      </View>
                    )}
                  </View>
                  {rating.categories.length > 0 && (
                    <View style={styles.historyCategoriesSection}>
                      <Text style={styles.historyCategoriesTitle}>評価内訳</Text>
                      {rating.categories.map((cat, idx) => (
                        cat.btAmount > 0 && (
                          <View key={idx} style={styles.historyCategoryRow}>
                            <Text style={styles.historyCategoryName}>{cat.name}</Text>
                            <Text style={styles.historyCategoryBT}>{cat.btAmount} BP</Text>
                          </View>
                        )
                      ))}
                      {rating.btDiscarded > 0 && (
                        <View style={styles.historyCategoryRow}>
                          <Text style={[styles.historyCategoryName, styles.discardedText]}>BP破棄</Text>
                          <Text style={[styles.historyCategoryBT, styles.discardedText]}>{rating.btDiscarded} BP</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {rating.comment && (
                    <View style={styles.historyCommentSection}>
                      <Text style={styles.historyCommentLabel}>コメント</Text>
                      <Text style={styles.historyRatingComment}>{rating.comment}</Text>
                    </View>
                  )}
                </View>
              ))}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal
        visible={infoModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <Info size={24} color="#FF69B4" />
              <Text style={styles.infoModalTitle}>{infoModal?.title}</Text>
            </View>
            <Text style={styles.infoModalDescription}>
              {infoModal?.description}
            </Text>
            <TouchableOpacity
              style={styles.infoModalButton}
              onPress={() => setInfoModal(null)}
            >
              <Text style={styles.infoModalButtonText}>閉じる</Text>
            </TouchableOpacity>
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
  balanceBar: {
    position: 'absolute' as const,
    right: 16,
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  noTasksCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noTasksTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 8,
  },
  noTasksText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  taskSelector: {
    marginBottom: 20,
  },
  taskSelectorLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  taskCardSelected: {
    borderColor: '#FF69B4',
    backgroundColor: 'rgba(255, 105, 180, 0.05)',
  },
  taskCardSelectedForDelete: {
    borderColor: '#E74C3C',
    backgroundColor: 'rgba(231, 76, 60, 0.05)',
  },
  taskCardReEvaluation: {
    backgroundColor: 'rgba(255, 152, 0, 0.05)',
    borderColor: '#FF9800',
  },
  taskSelectorHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  deleteTasksButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteTasksButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#E74C3C',
  },
  historyRatingDetails: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  historyRatingAmount: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500' as const,
  },
  historyPendingBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyPendingText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#F39C12',
  },
  historyCompletedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyCompletedText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#4CAF50',
  },
  historyCategoriesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  historyCategoriesTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 8,
  },
  historyCategoryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  historyCategoryName: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  historyCategoryBT: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF69B4',
  },
  discardedText: {
    color: '#E74C3C',
  },
  historyCommentSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  historyCommentLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  taskCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  taskCardHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  taskCardName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  taskCardDate: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  taskCardProposedAmount: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#4CAF50',
    marginTop: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 8,
    borderRadius: 6,
  },
  reEvaluationBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start' as const,
  },
  reEvaluationBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#E74C3C',
  },
  ratingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  hairdresserSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 8,
  },
  hairdresserInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  hairdresserName: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  hairdresserDate: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  assistantsSection: {
    marginBottom: 20,
  },
  assistantsSectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  addAssistantButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addAssistantText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#4CAF50',
  },
  assistantField: {
    marginBottom: 12,
  },
  assistantInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  assistantOptions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  assistantOptionButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  assistantOptionButtonActive: {
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderColor: '#87CEEB',
  },
  assistantOptionText: {
    fontSize: 13,
    color: '#7F8C8D',
    fontWeight: '500' as const,
  },
  removeAssistantButton: {
    width: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
  },
  amountSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  amountInputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#7F8C8D',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#2C3E50',
    paddingVertical: 16,
  },
  btSummaryCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  btSummaryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 4,
  },
  btSummaryLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  btSummaryValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  btSummaryError: {
    color: '#E74C3C',
  },
  btSummaryDivider: {
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
    marginVertical: 8,
  },
  btSummaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#D4AF37',
  },
  btSummaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#D4AF37',
  },
  quickActionsRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  resetButton: {
    backgroundColor: '#7F8C8D',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  allocationsSection: {
    marginBottom: 24,
  },
  allocationsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  allocationsSectionSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 16,
    lineHeight: 18,
  },
  allocationCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  allocationHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  allocationName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  allocationControls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  allocationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  allocationAmountContainer: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: 4,
    minWidth: 60,
    justifyContent: 'center' as const,
  },
  allocationAmount: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  allocationUnit: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#7F8C8D',
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    minHeight: 120,
    textAlignVertical: 'top' as const,
    marginBottom: 20,
  },
  submitButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  instructionCard: {
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 100,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#87CEEB',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 22,
  },
  headerTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    width: '100%',
  },
  headerLeft: {
    flex: 1,
  },
  qrScanButton: {
    backgroundColor: '#FF69B4',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  qrScanButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'white',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    fontWeight: '600' as const,
    color: 'white',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
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
    textAlign: 'center' as const,
    marginTop: 30,
    paddingHorizontal: 40,
  },
  webCameraPlaceholder: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F8F9FA',
    gap: 20,
  },
  webCameraText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center' as const,
  },
  mockScanButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  mockScanButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  customerRecordContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  customerRecordHeader: {
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
  customerRecordCloseButton: {
    padding: 8,
  },
  customerRecordTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  customerInfoText: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  customerId: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  customerEmail: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2,
  },
  medicalHistorySection: {
    marginBottom: 20,
  },
  medicalHistoryTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
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
    alignItems: 'center' as const,
  },
  noMedicalHistoryText: {
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
  historyItemDate: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  historyItemHairdresser: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  historyItemMenus: {
    fontSize: 13,
    color: '#3498DB',
    marginBottom: 4,
  },
  historyItemNotes: {
    fontSize: 12,
    color: '#7F8C8D',
    lineHeight: 16,
  },
  moreHistoryText: {
    fontSize: 12,
    color: '#87CEEB',
    textAlign: 'center' as const,
    marginTop: 4,
  },
  customerRecordActions: {
    flexDirection: 'row' as const,
    gap: 12,
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  checkInButtonFull: {
    flex: 1,
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  modalMessage: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 20,
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  infoModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '84%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  infoModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 16,
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    flexShrink: 1,
  },
  infoModalDescription: {
    fontSize: 15,
    color: '#34495E',
    lineHeight: 24,
    marginBottom: 20,
  },
  infoModalButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  infoModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  modalButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 10,
    alignItems: 'center' as const,
  },
  modalButtonSecondary: {
    backgroundColor: '#87CEEB',
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#7F8C8D',
  },
  headerContent: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  walletBalanceContainer: {
    marginTop: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 20,
  },
  historyButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FF69B4',
  },
  historyContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  historyHeader: {
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
  historyCloseButton: {
    padding: 8,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  historyHeaderSpacer: {
    width: 40,
  },
  historyActions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  deleteButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  deleteModeActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#7F8C8D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  deleteSelectedButton: {
    flex: 2,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 12,
  },
  deleteSelectedButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  deleteAllButton: {
    flex: 1.5,
    backgroundColor: '#C0392B',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  deleteAllButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  noHistoryCard: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 40,
  },
  noHistoryTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 8,
  },
  noHistoryText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  historyList: {
    padding: 20,
  },
  historyRatingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative' as const,
  },
  historyRatingCardSelected: {
    borderColor: '#FF69B4',
    backgroundColor: 'rgba(255, 105, 180, 0.05)',
  },
  historyRatingHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
  },
  historyRatingInfo: {
    flex: 1,
  },
  historyRatingHairdresser: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  historyRatingDate: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  historyRatingBT: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: 4,
  },
  historyRatingBTAmount: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#FF69B4',
  },
  historyRatingBTUnit: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#7F8C8D',
  },
  historyRatingComment: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  selectCheckbox: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF69B4',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  mismatchBanner: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E74C3C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mismatchHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
  },
  mismatchTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#E74C3C',
  },
  mismatchCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  mismatchCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  deleteMismatchButton: {
    padding: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
  },
  mismatchText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  mismatchAmounts: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  mismatchNote: {
    fontSize: 12,
    color: '#E74C3C',
    marginTop: 8,
    lineHeight: 18,
  },
  mismatchProposedAmount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#4CAF50',
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  pendingBanner: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(243, 156, 18, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pendingHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#F39C12',
  },
  pendingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.2)',
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  pendingAmount: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  pendingNote: {
    fontSize: 12,
    color: '#F39C12',
    marginTop: 8,
    lineHeight: 18,
  },
  reportedBanner: {
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(155, 89, 182, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportedHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
  },
  reportedTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#9B59B6',
  },
  reportedCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.2)',
  },
  reportedText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  reportedAmounts: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  reportedNote: {
    fontSize: 12,
    color: '#9B59B6',
    marginTop: 8,
    lineHeight: 18,
  },
  reEvaluationNotice: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  reEvaluationNoticeText: {
    flex: 1,
    gap: 6,
  },
  reEvaluationNoticeTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#FF9800',
  },
  reEvaluationNoticeMessage: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 18,
  },
  reEvaluationNoticeAmount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#4CAF50',
    marginTop: 4,
  },
  photoSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  photoCheckboxContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F4FD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  photoCheckboxContainerDisabled: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E0E0E0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FF69B4',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  checkboxDisabled: {
    borderColor: '#BDC3C7',
    backgroundColor: '#E0E0E0',
  },
  photoCheckboxTextContainer: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  photoCheckboxLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  photoCheckboxLabelDisabled: {
    color: '#95A5A6',
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  photoUploadSection: {
    marginTop: 16,
    gap: 12,
  },
  photoSelectButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF69B4',
    borderStyle: 'dashed' as const,
  },
  photoSelectButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FF69B4',
  },
  photoPreviewContainer: {
    position: 'relative' as const,
    alignItems: 'center' as const,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  photoRemoveButton: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  photoNotice: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
    textAlign: 'center' as const,
    paddingHorizontal: 8,
  },
});
