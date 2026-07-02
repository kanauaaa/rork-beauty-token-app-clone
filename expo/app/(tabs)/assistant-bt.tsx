import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { useAssistantBT } from '@/providers/AssistantBTProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Scissors, Palette, Waves, AlignJustify, Link, Hand, Heart, Clock, Trash2, Users, Plus, Minus, Camera, X, QrCode, Send, ChevronDown } from 'lucide-react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import WalletBalanceHeader from '@/components/WalletBalanceHeader';

interface BTAllocation {
  id: string;
  name: string;
  amount: number;
  icon: any;
  color: string;
}

export default function AssistantBTScreen() {
  const { user } = useAuth();
  const { tasks, transfers, transferAssistantBT, getRemainingAssistantBT } = useAssistantBT();
  const insets = useSafeAreaInsets();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannedAssistant, setScannedAssistant] = useState<any | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const alertShownRef = useRef(false);
  const [technicalExpanded, setTechnicalExpanded] = useState(false);
  
  const [btAllocations, setBtAllocations] = useState<BTAllocation[]>([
    { id: 'cut', name: 'カット', amount: 0, icon: Scissors, color: '#FF69B4' },
    { id: 'color', name: 'カラー', amount: 0, icon: Palette, color: '#FF8C42' },
    { id: 'perm', name: 'パーマ', amount: 0, icon: Waves, color: '#9B59B6' },
    { id: 'straightening', name: '縮毛矯正', amount: 0, icon: AlignJustify, color: '#3498DB' },
    { id: 'extensions', name: 'エクステ', amount: 0, icon: Link, color: '#2ECC71' },
    { id: 'massage', name: 'マッサージ', amount: 0, icon: Hand, color: '#F1C40F' },
    { id: 'service', name: '接客・サービス', amount: 0, icon: Heart, color: '#FF69B4' },
    { id: 'timeManagement', name: '時間管理', amount: 0, icon: Clock, color: '#FF69B4' },
    { id: 'discarded', name: 'BP破棄', amount: 0, icon: Trash2, color: '#E74C3C' },
  ]);

  const pendingTasks = useMemo(() => {
    if (!user?.id) return [];
    return tasks.filter(task => task.fromHairdresserId === user.id && task.status === 'pending');
  }, [tasks, user]);

  const allocatedBT = useMemo(() => {
    return btAllocations.reduce((sum, cat) => sum + cat.amount, 0);
  }, [btAllocations]);

  const remainingAssistantBT = useMemo(() => {
    if (!selectedTask) return 0;
    return getRemainingAssistantBT(selectedTask.originalRatingId) - allocatedBT;
  }, [selectedTask, allocatedBT, getRemainingAssistantBT]);

  const totalAvailableBT = useMemo(() => {
    if (!selectedTask) return 0;
    return getRemainingAssistantBT(selectedTask.originalRatingId);
  }, [selectedTask, getRemainingAssistantBT]);

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
    if (isProcessingQR || alertShownRef.current) {

      return;
    }
    

    setIsProcessingQR(true);
    alertShownRef.current = true;
    setShowQRScanner(false);
    
    try {
      const hairdresserData = JSON.parse(data);
      if (hairdresserData.type === 'hairdresser_qr' && hairdresserData.userId) {

        
        setScannedAssistant({
          hairdresserId: hairdresserData.userId,
          hairdresserName: hairdresserData.userName,
        });
        
        if (pendingTasks.length === 0) {
          Alert.alert('エラー', 'アシスタントBPの振り分けタスクがありません', [{
            text: 'OK',
            onPress: () => {
              setScannedAssistant(null);
              setIsProcessingQR(false);
              alertShownRef.current = false;
            }
          }]);
          return;
        }

        if (pendingTasks.length === 1) {
          setSelectedTask(pendingTasks[0]);
          setShowTransferModal(true);
          setIsProcessingQR(false);
          alertShownRef.current = false;
        } else {
          Alert.alert(
            'タスクを選択',
            '複数のタスクがあります。どのタスクからBPを付与しますか？',
            [
              { 
                text: 'キャンセル', 
                style: 'cancel', 
                onPress: () => {
                  setScannedAssistant(null);
                  setIsProcessingQR(false);
                  alertShownRef.current = false;
                }
              },
              ...pendingTasks.map((task) => ({
                text: `${task.customerName} (残り ${getRemainingAssistantBT(task.originalRatingId)}BP)`,
                onPress: () => {
                  setSelectedTask(task);
                  setShowTransferModal(true);
                  setIsProcessingQR(false);
                  alertShownRef.current = false;
                }
              }))
            ]
          );
        }
      } else {
        Alert.alert('エラー', '美容師のQRコードではありません', [{
          text: 'OK',
          onPress: () => {
            setIsProcessingQR(false);
            alertShownRef.current = false;
          }
        }]);
      }
    } catch (error) {

      Alert.alert('エラー', 'QRコードの読み取りに失敗しました', [{
        text: 'OK',
        onPress: () => {
          setIsProcessingQR(false);
          alertShownRef.current = false;
        }
      }]);
    }
  };

  const updateBTAllocation = (categoryId: string, delta: number) => {
    setBtAllocations(prev => {
      const newAllocations = prev.map(cat => {
        if (cat.id === categoryId) {
          const newAmount = cat.amount + delta;
          if (newAmount < 0) return cat;
          if (allocatedBT + delta > totalAvailableBT) return cat;
          return { ...cat, amount: newAmount };
        }
        return cat;
      });
      return newAllocations;
    });
  };

  const resetAllocations = () => {
    setBtAllocations(prev => prev.map(cat => ({ ...cat, amount: 0 })));
  };

  const handleSubmitTransfer = async () => {
    if (!user || !selectedTask || !scannedAssistant) {
      Alert.alert('エラー', '必要な情報が揃っていません');
      return;
    }

    if (allocatedBT === 0) {
      Alert.alert('エラー', 'BPを振り分けてください');
      return;
    }

    if (allocatedBT > totalAvailableBT) {
      Alert.alert('エラー', '利用可能なBPを超えています');
      return;
    }

    if (remainingAssistantBT !== 0) {
      Alert.alert(
        '確認',
        `未振り分けのBPが${remainingAssistantBT}BPあります。\nこのまま送信しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '送信', onPress: submitTransfer }
        ]
      );
      return;
    }

    submitTransfer();
  };

  const submitTransfer = async () => {
    if (!user || !selectedTask || !scannedAssistant) return;

    setSubmitting(true);
    try {
      const discarded = btAllocations.find(cat => cat.id === 'discarded');
      const categories = btAllocations
        .filter(cat => cat.id !== 'discarded' && cat.amount > 0)
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          btAmount: cat.amount,
        }));

      const transferData = {
        fromHairdresserId: user.id,
        fromHairdresserName: user.name,
        toHairdresserId: scannedAssistant.hairdresserId,
        toHairdresserName: scannedAssistant.hairdresserName,
        categories: categories,
        totalBT: allocatedBT - (discarded?.amount || 0),
        btDiscarded: discarded?.amount || 0,
        customerId: selectedTask.customerId,
        customerName: selectedTask.customerName,
        originalRatingId: selectedTask.originalRatingId,
      };


      await transferAssistantBT(transferData);

      const remainingBT = totalAvailableBT - allocatedBT;
      let message = `${scannedAssistant.hairdresserName}さんに ${transferData.totalBT} BPを付与しました。`;
      
      if (discarded && discarded.amount > 0) {
        message += `\n${discarded.amount} BPが破棄されました。`;
      }
      
      if (remainingBT > 0) {
        message += `\n\n残り ${remainingBT} BPは次回の付与時に引き継がれます。`;
      }

      Alert.alert(
        '送信完了',
        message,
        [{ text: 'OK' }]
      );

      setShowTransferModal(false);
      setScannedAssistant(null);
      setSelectedTask(null);
      resetAllocations();
    } catch (error) {

      Alert.alert('エラー', 'BP付与に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== 'hairdresser') {
    return (
      <LinearGradient colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>アシスタントBP付与</Text>
          <Text style={styles.subtitle}>美容師アカウントでのみ利用可能です</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={styles.container}
    >
      <View style={{ position: 'absolute', top: insets.top + 8, right: 16, zIndex: 100 }}>
        <WalletBalanceHeader />
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 100 }} />
        <View style={styles.header}>
          <Text style={styles.title}>アシスタントBP</Text>
          <Text style={styles.subtitle}>アシスタントにBPを振り分けましょう</Text>
        </View>

        <View style={styles.content}>
        {pendingTasks.length === 0 ? (
          <View style={styles.noTasksCard}>
            <Users size={48} color="#BDC3C7" />
            <Text style={styles.noTasksTitle}>付与タスクがありません</Text>
            <Text style={styles.noTasksText}>
              顧客の評価でアシスタントBPが付与されると、{'\n'}
              ここに付与タスクが表示されます
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.tasksList}>
              <Text style={styles.tasksListTitle}>付与可能なタスク</Text>
              {pendingTasks.map((task) => {
                const remaining = getRemainingAssistantBT(task.originalRatingId);
                return (
                  <View key={task.id} style={styles.taskCard}>
                    <View style={styles.taskCardHeader}>
                      <View style={styles.taskCardInfo}>
                        <Text style={styles.taskCardCustomer}>{task.customerName}</Text>
                        <Text style={styles.taskCardDate}>
                          {new Date(task.createdAt).toLocaleDateString('ja-JP')}
                        </Text>
                      </View>
                      <View style={styles.taskCardBT}>
                        <Text style={styles.taskCardBTAmount}>{remaining}</Text>
                        <Text style={styles.taskCardBTUnit}>BP</Text>
                      </View>
                    </View>
                    <View style={styles.taskCardDetails}>
                      <Text style={styles.taskCardDetailsLabel}>
                        元のアシスタントBP: {task.assistantBTAmount}BP
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.scanSection}>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={handleQRScan}
              >
                <Camera size={24} color="white" />
                <Text style={styles.scanButtonText}>アシスタントのQRをスキャン</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>💡 アシスタントBP付与について</Text>
              <Text style={styles.instructionText}>
                • 顧客がアシスタントに評価したBPを付与できます{'\n'}
                • アシスタント美容師のQRコードをスキャンします{'\n'}
                • BPを各評価項目（カット、カラー、パーマ、縮毛矯正、エクステ、マッサージ、接客・サービス、時間管理）に振り分けて付与します{'\n'}
                • アシスタントが複数いる場合、順番に各アシスタントへ付与します{'\n'}
                • BP破棄を選択すると、そのBPは誰にも付与されず破棄されます{'\n'}
                • 全てのBPを付与すると、タスクは自動的に削除されます
              </Text>
            </View>
          </>
        )}

        {user && user.role === 'hairdresser' && (
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>付与履歴</Text>
            {transfers.length === 0 ? (
              <View style={styles.noHistoryCard}>
                <Text style={styles.noHistoryText}>まだ付与履歴がありません</Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {transfers.map((transfer) => (
                  <View key={transfer.id} style={styles.historyCard}>
                    <View style={styles.historyCardHeader}>
                      <View style={styles.historyCardInfo}>
                        <Text style={styles.historyCardTo}>{transfer.toHairdresserName}さん</Text>
                        <Text style={styles.historyCardCustomer}>顧客: {transfer.customerName}</Text>
                        <Text style={styles.historyCardDate}>
                          {new Date(transfer.createdAt).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                      <View style={styles.historyCardBT}>
                        <Text style={styles.historyCardBTAmount}>{transfer.totalBT}</Text>
                        <Text style={styles.historyCardBTUnit}>BP</Text>
                      </View>
                    </View>
                    {transfer.categories.length > 0 && (
                      <View style={styles.historyCategories}>
                        {transfer.categories.map((cat, index) => (
                          <View key={index} style={styles.historyCategoryChip}>
                            <Text style={styles.historyCategoryName}>{cat.name}</Text>
                            <Text style={styles.historyCategoryBT}>{cat.btAmount}BP</Text>
                          </View>
                        ))}
                        {transfer.btDiscarded > 0 && (
                          <View style={[styles.historyCategoryChip, styles.historyCategoryChipDiscarded]}>
                            <Text style={styles.historyCategoryNameDiscarded}>破棄</Text>
                            <Text style={styles.historyCategoryBTDiscarded}>{transfer.btDiscarded}BP</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
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
            <Text style={styles.scannerTitle}>アシスタントQRコードをスキャン</Text>
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
                  アシスタント美容師のQRコードをフレーム内に合わせてください
                </Text>
              </View>
            </CameraView>
          ) : (
            <View style={styles.webCameraPlaceholder}>
              <QrCode size={100} color="#7F8C8D" />
              <Text style={styles.webCameraText}>
                Webではカメラ機能は利用できません
              </Text>
              <Text style={styles.webCameraSubtext}>
                モバイルデバイスでアプリを開いてQRコードをスキャンしてください
              </Text>
            </View>
          )}
        </View>
      </Modal>

      <Modal
        visible={showTransferModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowTransferModal(false);
          setScannedAssistant(null);
          setSelectedTask(null);
          resetAllocations();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.transferModal}>
            <View style={styles.transferHeader}>
              <Text style={styles.transferTitle}>アシスタントBP付与</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowTransferModal(false);
                  setScannedAssistant(null);
                  setSelectedTask(null);
                  resetAllocations();
                }}
              >
                <X size={24} color="#7F8C8D" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.transferContent} showsVerticalScrollIndicator={false}>
              {selectedTask && scannedAssistant && (
                <>
                  <View style={styles.transferInfoCard}>
                    <View style={styles.transferInfoRow}>
                      <Text style={styles.transferInfoLabel}>顧客</Text>
                      <Text style={styles.transferInfoValue}>{selectedTask.customerName}</Text>
                    </View>
                    <View style={styles.transferInfoRow}>
                      <Text style={styles.transferInfoLabel}>アシスタント</Text>
                      <Text style={styles.transferInfoValue}>{scannedAssistant.hairdresserName}</Text>
                    </View>
                  </View>

                  <View style={styles.btSummaryCard}>
                    <View style={styles.btSummaryRow}>
                      <Text style={styles.btSummaryLabel}>元のアシスタントBP</Text>
                      <Text style={styles.btSummaryValue}>{selectedTask.assistantBTAmount} BP</Text>
                    </View>
                    <View style={styles.btSummaryRow}>
                      <Text style={styles.btSummaryLabel}>残りアシスタントBP</Text>
                      <Text style={styles.btSummaryValue}>{totalAvailableBT} BP</Text>
                    </View>
                    <View style={styles.btSummaryRow}>
                      <Text style={styles.btSummaryLabel}>振り分け済み</Text>
                      <Text style={[styles.btSummaryValue, allocatedBT > totalAvailableBT && styles.btSummaryError]}>
                        {allocatedBT} BP
                      </Text>
                    </View>
                    <View style={styles.btSummaryDivider} />
                    <View style={styles.btSummaryRow}>
                      <Text style={styles.btSummaryTotalLabel}>未振り分け</Text>
                      <Text style={[styles.btSummaryTotalValue, remainingAssistantBT < 0 && styles.btSummaryError]}>
                        {remainingAssistantBT} BP
                      </Text>
                    </View>
                  </View>

                  <View style={styles.quickActionsRow}>
                    <TouchableOpacity
                      style={styles.resetButton}
                      onPress={resetAllocations}
                    >
                      <Text style={styles.quickActionText}>リセット</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.allocationsSection}>
                    <Text style={styles.allocationsSectionTitle}>BP振り分け</Text>
                    <Text style={styles.allocationsSectionSubtitle}>
                      各評価項目にBPを振り分けてください
                    </Text>
                    {(() => {
                      const techIds = ['cut', 'color', 'perm', 'straightening', 'extensions', 'massage'];
                      const techItems = btAllocations.filter(a => techIds.includes(a.id));
                      const otherItems = btAllocations.filter(a => !techIds.includes(a.id));
                      const techTotal = techItems.reduce((s, a) => s + a.amount, 0);
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
                          {technicalExpanded && (() => {
                            const maxTechVal = Math.max(...techItems.map(a => a.amount), 1);
                            const techTotalAmount = techItems.reduce((s, a) => s + a.amount, 0);
                            return (
                              <View style={styles.technicalBarChart}>
                                {techItems.map((allocation) => {
                                  const IconComponent = allocation.icon;
                                  const barHeight = Math.max((allocation.amount / maxTechVal) * 140, 4);
                                  const pct = techTotalAmount > 0 ? ((allocation.amount / techTotalAmount) * 100).toFixed(1) : '0.0';
                                  return (
                                    <View key={allocation.id} style={styles.technicalBarColumn}>
                                      <IconComponent size={18} color={allocation.color} />
                                      <View style={styles.technicalBarValue}>
                                        <Text style={[styles.technicalBarValueText, { color: allocation.color }]}>{allocation.amount}</Text>
                                      </View>
                                      <Text style={styles.technicalBarUnit}>BP</Text>
                                      <View style={styles.technicalBarTrack}>
                                        <View style={[styles.technicalBarFill, { height: barHeight, backgroundColor: allocation.color }]} />
                                      </View>
                                      <Text style={[styles.technicalBarPercent, { color: allocation.color }]}>{pct}%</Text>
                                      <Text style={styles.technicalBarLabel}>{allocation.name}</Text>
                                      <View style={styles.allocationVerticalControls}>
                                        <TouchableOpacity
                                          style={styles.allocationMiniButton}
                                          onPress={() => updateBTAllocation(allocation.id, -1)}
                                          disabled={allocation.amount === 0}
                                        >
                                          <Minus size={12} color={allocation.amount === 0 ? '#BDC3C7' : '#2C3E50'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          style={styles.allocationMiniButton}
                                          onPress={() => updateBTAllocation(allocation.id, 1)}
                                          disabled={remainingAssistantBT <= 0}
                                        >
                                          <Plus size={12} color={remainingAssistantBT <= 0 ? '#BDC3C7' : '#2C3E50'} />
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  );
                                })}
                              </View>
                            );
                          })()}
                          {otherItems.map((allocation) => {
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
                                    disabled={remainingAssistantBT <= 0}
                                  >
                                    <Plus size={20} color={remainingAssistantBT <= 0 ? '#BDC3C7' : '#2C3E50'} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </>
                      );
                    })()}
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmitTransfer}
                    disabled={submitting}
                  >
                    <Send size={20} color="white" />
                    <Text style={styles.submitButtonText}>
                      {submitting ? '送信中...' : 'BPを付与'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
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
  tasksList: {
    marginBottom: 20,
  },
  tasksListTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  taskCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  taskCardInfo: {
    flex: 1,
  },
  taskCardCustomer: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  taskCardDate: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  taskCardBT: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: 4,
  },
  taskCardBTAmount: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#87CEEB',
  },
  taskCardBTUnit: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#7F8C8D',
  },
  taskCardDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  taskCardDetailsLabel: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  scanSection: {
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: '#87CEEB',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonText: {
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
    borderColor: '#87CEEB',
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
    marginBottom: 12,
  },
  webCameraSubtext: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  transferModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  transferHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  transferTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  closeButton: {
    padding: 4,
  },
  transferContent: {
    padding: 24,
  },
  transferInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  transferInfoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  transferInfoLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  transferInfoValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  btSummaryCard: {
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
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
    backgroundColor: 'rgba(135, 206, 235, 0.3)',
    marginVertical: 8,
  },
  btSummaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#87CEEB',
  },
  btSummaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#87CEEB',
  },
  quickActionsRow: {
    marginBottom: 16,
  },
  resetButton: {
    backgroundColor: '#7F8C8D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center' as const,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  technicalBarChart: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    alignItems: 'flex-end' as const,
    paddingVertical: 20,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 8,
    marginLeft: 8,
    minHeight: 240,
  },
  technicalBarColumn: {
    alignItems: 'center' as const,
    width: 52,
    gap: 4,
  },
  technicalBarValue: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: 2,
  },
  technicalBarValueText: {
    fontSize: 13,
    fontWeight: 'bold' as const,
  },
  technicalBarUnit: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#7F8C8D',
    marginTop: -2,
  },
  technicalBarTrack: {
    width: 32,
    height: 140,
    backgroundColor: '#F0F2F5',
    borderRadius: 16,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
    marginTop: 4,
  },
  technicalBarFill: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    minHeight: 4,
  },
  technicalBarPercent: {
    fontSize: 11,
    fontWeight: 'bold' as const,
    marginTop: 4,
  },
  technicalBarLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#7F8C8D',
    textAlign: 'center' as const,
  },
  allocationVerticalControls: {
    flexDirection: 'row' as const,
    gap: 4,
    marginTop: 6,
  },
  allocationMiniButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'white',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
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
  submitButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#87CEEB',
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
  historySection: {
    marginTop: 20,
    marginBottom: 100,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 12,
  },
  noHistoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center' as const,
  },
  noHistoryText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  historyCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
  },
  historyCardInfo: {
    flex: 1,
  },
  historyCardTo: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  historyCardCustomer: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  historyCardDate: {
    fontSize: 12,
    color: '#95A5A6',
  },
  historyCardBT: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: 4,
  },
  historyCardBTAmount: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#87CEEB',
  },
  historyCardBTUnit: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#7F8C8D',
  },
  historyCategories: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  historyCategoryChip: {
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
  },
  historyCategoryChipDiscarded: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  historyCategoryName: {
    fontSize: 12,
    color: '#87CEEB',
    fontWeight: '500' as const,
  },
  historyCategoryBT: {
    fontSize: 12,
    color: '#87CEEB',
    fontWeight: '600' as const,
  },
  historyCategoryNameDiscarded: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '500' as const,
  },
  historyCategoryBTDiscarded: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '600' as const,
  },
});
