import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, CheckCircle, XCircle, Trash2, Wallet, Zap, RefreshCw } from 'lucide-react-native';
import { useDisputes } from '@/providers/DisputeProvider';
import { useAdmin } from '@/providers/AdminProvider';
import { useWeb3 } from '@/providers/Web3Provider';

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { disputes, updateDispute, deleteDispute } = useDisputes();
  const { pendingBPs, isLoading: isLoadingBPs, mintBP, getAllPendingBPs } = useAdmin();
  const { address, isConnected, generateWallet, disconnectWallet } = useWeb3();
  const [mintingBPId, setMintingBPId] = useState<string | null>(null);

  const reportedDisputes = disputes.filter(d => d.status === 'customer_reported');
  const pendingDisputes = disputes.filter(d => d.status === 'pending' || d.status === 'hairdresser_response');

  const handleResolveDispute = async (disputeId: string) => {
    Alert.alert(
      '確認',
      'この不一致を解決済みにしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '解決済みにする',
          onPress: async () => {
            try {
              await updateDispute(disputeId, { status: 'resolved' });
              Alert.alert('完了', '不一致を解決済みにしました');
            } catch (error) {

              Alert.alert('エラー', '更新に失敗しました');
            }
          }
        }
      ]
    );
  };

  const handleCancelDispute = async (disputeId: string) => {
    Alert.alert(
      '確認',
      'この不一致をキャンセルしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'キャンセルする',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDispute(disputeId, { status: 'cancelled' });
              Alert.alert('完了', '不一致をキャンセルしました');
            } catch (error) {

              Alert.alert('エラー', '更新に失敗しました');
            }
          }
        }
      ]
    );
  };

  const handleConnectWallet = async () => {
    try {
      await generateWallet();
      Alert.alert('成功', '管理者ウォレットを生成しました');
    } catch (error) {

      Alert.alert('エラー', 'ウォレットの生成に失敗しました');
    }
  };

  const handleDisconnectWallet = async () => {
    Alert.alert(
      '確認',
      'ウォレットを切断しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '切断する',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectWallet();
              Alert.alert('完了', 'ウォレットを切断しました');
            } catch (error) {

              Alert.alert('エラー', 'ウォレットの切断に失敗しました');
            }
          }
        }
      ]
    );
  };

  const handleMintBP = async (bpId: string) => {
    Alert.alert(
      '確認',
      'このBPをミントしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ミントする',
          onPress: async () => {
            setMintingBPId(bpId);
            try {
              await mintBP(bpId);
              Alert.alert('成功', 'BPをミントしました');
            } catch (error) {

              Alert.alert('エラー', error instanceof Error ? error.message : 'ミントに失敗しました');
            } finally {
              setMintingBPId(null);
            }
          }
        }
      ]
    );
  };

  const handleRefreshBPs = async () => {
    try {
      await getAllPendingBPs();
    } catch (error) {

      Alert.alert('エラー', 'BPリストの更新に失敗しました');
    }
  };

  const handleDeleteDispute = async (disputeId: string) => {

    Alert.alert(
      '警告',
      'この不一致レコードを完全に削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            try {

              await deleteDispute(disputeId);

              Alert.alert('完了', '不一致レコードを削除しました');
            } catch (error) {



              Alert.alert('エラー', `削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
      ]
    );
  };

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>管理ダッシュボード</Text>
        <Text style={styles.subtitle}>SBTミント・金額不一致管理</Text>
        
        <View style={styles.walletCard}>
          {!isConnected ? (
            <TouchableOpacity
              style={styles.connectWalletButton}
              onPress={handleConnectWallet}
            >
              <Wallet size={20} color="white" />
              <Text style={styles.connectWalletText}>管理者ウォレット生成</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.walletInfo}>
              <View style={styles.walletHeader}>
                <Wallet size={20} color="#4CAF50" />
                <Text style={styles.walletConnected}>接続済み</Text>
              </View>
              <Text style={styles.walletAddress}>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}</Text>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={handleDisconnectWallet}
              >
                <Text style={styles.disconnectText}>切断</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Zap size={24} color="#FF6B35" />
            <Text style={styles.sectionTitle}>保留中のBP (ミント待ち)</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefreshBPs}
            >
              <RefreshCw size={18} color="#2C3E50" />
            </TouchableOpacity>
          </View>
          {isLoadingBPs ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.loadingText}>読み込み中...</Text>
            </View>
          ) : pendingBPs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>ミント待ちのBPはありません</Text>
            </View>
          ) : (
            pendingBPs.map((bp) => (
              <View key={bp.id} style={styles.bpCard}>
                <View style={styles.bpHeader}>
                  <Text style={styles.bpTitle}>BP付与: {bp.totalBT} BP</Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>保留中</Text>
                  </View>
                </View>
                <View style={styles.bpDetails}>
                  <Text style={styles.bpLabel}>顧客:</Text>
                  <Text style={styles.bpValue}>{bp.customerName}</Text>
                </View>
                <View style={styles.bpDetails}>
                  <Text style={styles.bpLabel}>美容師:</Text>
                  <Text style={styles.bpValue}>{bp.hairdresserName}</Text>
                </View>
                {bp.customerWalletAddress ? (
                  <View style={styles.walletAddressCard}>
                    <Text style={styles.walletAddressLabel}>ウォレット:</Text>
                    <Text style={styles.walletAddressValue}>
                      {`${bp.customerWalletAddress.slice(0, 6)}...${bp.customerWalletAddress.slice(-4)}`}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.noWalletCard}>
                    <Text style={styles.noWalletText}>⚠️ ウォレット未設定</Text>
                  </View>
                )}
                <View style={styles.categoriesContainer}>
                  <Text style={styles.categoriesLabel}>カテゴリー別:</Text>
                  {bp.categories.map((cat) => (
                    <View key={cat.id} style={styles.categoryChip}>
                      <Text style={styles.categoryName}>{cat.name}</Text>
                      <Text style={styles.categoryBP}>{cat.btAmount} BP</Text>
                    </View>
                  ))}
                </View>
                {isConnected && bp.customerWalletAddress ? (
                  <TouchableOpacity
                    style={[
                      styles.mintButton,
                      mintingBPId === bp.id && styles.disabledButton
                    ]}
                    onPress={() => handleMintBP(bp.id)}
                    disabled={mintingBPId === bp.id}
                  >
                    {mintingBPId === bp.id ? (
                      <>
                        <ActivityIndicator size="small" color="white" />
                        <Text style={styles.mintButtonText}>ミント中...</Text>
                      </>
                    ) : (
                      <>
                        <Zap size={18} color="white" />
                        <Text style={styles.mintButtonText}>ミント実行</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : !isConnected ? (
                  <View style={styles.warningCard}>
                    <Text style={styles.warningText}>⚠️ ウォレットを接続してください</Text>
                  </View>
                ) : (
                  <View style={styles.warningCard}>
                    <Text style={styles.warningText}>⚠️ 顧客のウォレット設定が必要です</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <AlertCircle size={24} color="#E74C3C" />
            <Text style={styles.sectionTitle}>顧客からの報告</Text>
          </View>
          {reportedDisputes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>顧客からの報告はありません</Text>
            </View>
          ) : (
            reportedDisputes.map((dispute) => (
              <View key={dispute.id} style={styles.disputeCard}>
                <View style={styles.disputeHeader}>
                  <Text style={styles.disputeTitle}>不一致報告</Text>
                  <View style={styles.reportedBadge}>
                    <Text style={styles.reportedBadgeText}>報告済み</Text>
                  </View>
                </View>
                <View style={styles.disputeDetails}>
                  <Text style={styles.disputeLabel}>顧客:</Text>
                  <Text style={styles.disputeValue}>{dispute.customerName}</Text>
                </View>
                <View style={styles.disputeDetails}>
                  <Text style={styles.disputeLabel}>美容師:</Text>
                  <Text style={styles.disputeValue}>{dispute.hairdresserName}</Text>
                </View>
                <View style={styles.amountComparison}>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>顧客入力額</Text>
                    <Text style={styles.amountValue}>¥{dispute.customerAmount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>美容師入力額</Text>
                    <Text style={styles.amountValue}>¥{dispute.hairdresserAmount.toLocaleString()}</Text>
                  </View>
                </View>
                {dispute.hairdresserProposedAmount && (
                  <View style={styles.proposedAmountCard}>
                    <Text style={styles.proposedLabel}>美容師提案額:</Text>
                    <Text style={styles.proposedValue}>¥{dispute.hairdresserProposedAmount.toLocaleString()}</Text>
                  </View>
                )}
                {dispute.reportMessage && (
                  <View style={styles.messageCard}>
                    <Text style={styles.messageLabel}>報告メッセージ:</Text>
                    <Text style={styles.messageText}>{dispute.reportMessage}</Text>
                  </View>
                )}
                <View style={styles.disputeActions}>
                  <TouchableOpacity
                    style={styles.resolveButton}
                    onPress={() => handleResolveDispute(dispute.id)}
                  >
                    <CheckCircle size={18} color="white" />
                    <Text style={styles.resolveButtonText}>解決済み</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelDispute(dispute.id)}
                  >
                    <XCircle size={18} color="white" />
                    <Text style={styles.cancelButtonText}>キャンセル</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDispute(dispute.id)}
                >
                  <Trash2 size={18} color="white" />
                  <Text style={styles.deleteButtonText}>削除</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <AlertCircle size={24} color="#F39C12" />
            <Text style={styles.sectionTitle}>保留中の不一致</Text>
          </View>
          {pendingDisputes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>保留中の不一致はありません</Text>
            </View>
          ) : (
            pendingDisputes.map((dispute) => (
              <View key={dispute.id} style={styles.disputeCard}>
                <View style={styles.disputeHeader}>
                  <Text style={styles.disputeTitle}>金額不一致</Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>保留中</Text>
                  </View>
                </View>
                <View style={styles.disputeDetails}>
                  <Text style={styles.disputeLabel}>顧客:</Text>
                  <Text style={styles.disputeValue}>{dispute.customerName}</Text>
                </View>
                <View style={styles.disputeDetails}>
                  <Text style={styles.disputeLabel}>美容師:</Text>
                  <Text style={styles.disputeValue}>{dispute.hairdresserName}</Text>
                </View>
                <View style={styles.amountComparison}>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>顧客入力額</Text>
                    <Text style={styles.amountValue}>¥{dispute.customerAmount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>美容師入力額</Text>
                    <Text style={styles.amountValue}>¥{dispute.hairdresserAmount.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.statusNote}>
                  <Text style={styles.statusNoteText}>
                    💡 双方で金額を確認中です
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDispute(dispute.id)}
                >
                  <Trash2 size={18} color="white" />
                  <Text style={styles.deleteButtonText}>削除</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
        <View style={{height: 100}} />
      </ScrollView>
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
  sectionCard: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center' as const,
  },
  disputeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  disputeHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  disputeTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  reportedBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  reportedBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'white',
  },
  pendingBadge: {
    backgroundColor: '#F39C12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'white',
  },
  disputeDetails: {
    flexDirection: 'row' as const,
    marginBottom: 8,
  },
  disputeLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    width: 80,
    fontWeight: '500' as const,
  },
  disputeValue: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
    fontWeight: '600' as const,
  },
  amountComparison: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  amountItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center' as const,
  },
  amountLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  proposedAmountCard: {
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  proposedLabel: {
    fontSize: 14,
    color: '#87CEEB',
    fontWeight: '600' as const,
  },
  proposedValue: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  messageCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  messageLabel: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  disputeActions: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 12,
  },
  resolveButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
  },
  resolveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  statusNote: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  statusNoteText: {
    fontSize: 13,
    color: '#F39C12',
    textAlign: 'center' as const,
  },
  deleteButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#95A5A6',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  walletCard: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  connectWalletButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
  },
  connectWalletText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  walletInfo: {
    gap: 8,
  },
  walletHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  walletConnected: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#4CAF50',
  },
  walletAddress: {
    fontSize: 14,
    color: '#2C3E50',
    fontFamily: 'monospace',
  },
  disconnectButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start' as const,
    marginTop: 4,
  },
  disconnectText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'white',
  },
  refreshButton: {
    marginLeft: 'auto' as const,
    padding: 4,
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 12,
  },
  bpCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  bpHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  bpTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  bpDetails: {
    flexDirection: 'row' as const,
    marginBottom: 8,
  },
  bpLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    width: 80,
    fontWeight: '500' as const,
  },
  bpValue: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
    fontWeight: '600' as const,
  },
  walletAddressCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  walletAddressLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600' as const,
    marginRight: 8,
  },
  walletAddressValue: {
    fontSize: 12,
    color: '#2C3E50',
    fontFamily: 'monospace',
  },
  noWalletCard: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  noWalletText: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  categoriesContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  categoriesLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
    fontWeight: '600' as const,
  },
  categoryChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 13,
    color: '#2C3E50',
    flex: 1,
  },
  categoryBP: {
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#FF6B35',
  },
  mintButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  mintButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: 'white',
  },
  disabledButton: {
    opacity: 0.6,
  },
  warningCard: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#F39C12',
    textAlign: 'center' as const,
    fontWeight: '600' as const,
  },
});
