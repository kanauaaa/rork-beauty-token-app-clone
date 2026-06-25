import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWeb3, POLYGON_MAINNET } from '@/providers/Web3Provider';
import { Wallet, Send, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react-native';

export default function JPYCTestScreen() {
  const {
    address,
    isConnected,
    network,
    balance,
    jpycBalance,
    connectWallet,
    switchNetwork,
    transferJPYC,
    getJPYCBalance,
    getBalance,
  } = useWeb3();

  const [toAddress, setToAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isPolygonNetwork = network.chainId === POLYGON_MAINNET.chainId;

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      if (!isPolygonNetwork) {
        Alert.alert(
          'ネットワーク切替',
          'Polygon Mainnetに切り替えますか？',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '切り替える',
              onPress: () => switchNetwork(POLYGON_MAINNET),
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'ウォレット接続に失敗しました');
    }
  };

  const handleSwitchToPolygon = async () => {
    try {
      await switchNetwork(POLYGON_MAINNET);
      Alert.alert('成功', 'Polygon Mainnetに切り替えました');
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'ネットワーク切替に失敗しました');
    }
  };

  const handleOpenFaucet = () => {
    Linking.openURL('https://faucet.jpyc.co.jp/');
  };

  const handleRefreshBalances = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([getBalance(), getJPYCBalance()]);
      Alert.alert('更新完了', '残高を更新しました');
    } catch (error: any) {
      Alert.alert('エラー', error.message || '残高更新に失敗しました');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTransfer = async () => {
    if (!toAddress || !amount) {
      Alert.alert('エラー', 'アドレスと金額を入力してください');
      return;
    }

    if (!isPolygonNetwork) {
      Alert.alert('エラー', 'Polygon Mainnetに切り替えてください');
      return;
    }

    setIsTransferring(true);
    try {
      const txHash = await transferJPYC(toAddress, amount);
      Alert.alert(
        '送金完了',
        `トランザクション: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`,
        [
          { text: 'OK' },
          {
            text: 'Explorer で確認',
            onPress: () =>
              Linking.openURL(`${POLYGON_MAINNET.blockExplorer}/tx/${txHash}`),
          },
        ]
      );
      setToAddress('');
      setAmount('');
    } catch (error: any) {
      Alert.alert('エラー', error.message || '送金に失敗しました');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>JPYC 送金</Text>
            <Text style={styles.headerSubtitle}>Polygon Mainnet</Text>
          </View>
        </View>
        {isConnected && (
          <View style={styles.balanceContainer}>
            <View style={styles.balanceItem}>
              <Image
                source={{ uri: 'https://jpyc.jp/img/apple-touch-icon.png' }}
                style={styles.currencyIcon}
              />
              <Text style={styles.balanceText}>{parseFloat(jpycBalance).toFixed(0)}</Text>
              <Text style={styles.currencyLabel}>JPYC</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <View style={styles.maticIconContainer}>
                <Text style={styles.maticIcon}>Ⓜ️</Text>
              </View>
              <Text style={styles.balanceText}>{parseFloat(balance).toFixed(3)}</Text>
              <Text style={styles.currencyLabel}>MATIC</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isConnected ? (
          <View style={styles.section}>
            <View style={styles.warningCard}>
              <AlertCircle size={48} color="#FF9800" />
              <Text style={styles.warningTitle}>ウォレット未接続</Text>
              <Text style={styles.warningText}>
                テスト機能を使用するにはウォレットを接続してください
              </Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleConnectWallet}
            >
              <Wallet size={20} color="white" />
              <Text style={styles.primaryButtonText}>ウォレット接続</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ウォレット情報</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>アドレス</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ネットワーク</Text>
                  <View style={styles.networkBadge}>
                    <View
                      style={[
                        styles.networkDot,
                        { backgroundColor: isPolygonNetwork ? '#4CAF50' : '#FF5252' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.infoValue,
                        { color: isPolygonNetwork ? '#4CAF50' : '#FF5252' },
                      ]}
                    >
                      {network.name}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>MATIC 残高</Text>
                  <Text style={styles.infoValue}>{balance} MATIC</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>JPYC 残高</Text>
                  <Text style={styles.jpycBalance}>{jpycBalance} JPYC</Text>
                </View>
              </View>

              {!isPolygonNetwork && (
                <TouchableOpacity
                  style={styles.warningButton}
                  onPress={handleSwitchToPolygon}
                >
                  <AlertCircle size={20} color="#FF9800" />
                  <Text style={styles.warningButtonText}>
                    Polygon Mainnetに切り替える
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleRefreshBalances}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color="#FF69B4" />
                ) : (
                  <>
                    <CheckCircle size={20} color="#FF69B4" />
                    <Text style={styles.secondaryButtonText}>残高を更新</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>JPYC Faucet</Text>
              <View style={styles.faucetCard}>
                <Text style={styles.faucetText}>
                  JPYCの購入・入手はJPYC公式サイトをご確認ください
                </Text>
                <TouchableOpacity
                  style={styles.faucetButton}
                  onPress={handleOpenFaucet}
                >
                  <ExternalLink size={20} color="white" />
                  <Text style={styles.faucetButtonText}>
                    フォーセットを開く
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>JPYC 送金</Text>
              <View style={styles.transferCard}>
                <Text style={styles.inputLabel}>送信先アドレス</Text>
                <TextInput
                  style={styles.input}
                  value={toAddress}
                  onChangeText={setToAddress}
                  placeholder="0x..."
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.inputLabel}>金額 (JPYC)</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="100"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />

                <TouchableOpacity
                  style={[
                    styles.transferButton,
                    (!toAddress || !amount || !isPolygonNetwork || isTransferring) &&
                      styles.transferButtonDisabled,
                  ]}
                  onPress={handleTransfer}
                  disabled={
                    !toAddress || !amount || !isPolygonNetwork || isTransferring
                  }
                >
                  {isTransferring ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Send size={20} color="white" />
                      <Text style={styles.transferButtonText}>送金</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.noteCard}>
                <AlertCircle size={20} color="#2196F3" />
                <Text style={styles.noteText}>
                  Polygon Mainnetで動作しています。実際の資産が使用されます。
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFE4F1',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  balanceContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
  },
  currencyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  maticIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8247E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maticIcon: {
    fontSize: 14,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  currencyLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  warningCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  jpycBalance: {
    fontSize: 16,
    color: '#FF69B4',
    fontWeight: 'bold',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  primaryButton: {
    backgroundColor: '#FF69B4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FF69B4',
  },
  secondaryButtonText: {
    color: '#FF69B4',
    fontSize: 16,
    fontWeight: '600',
  },
  warningButton: {
    backgroundColor: '#FFF3E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  warningButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  faucetCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  faucetText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  faucetButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  faucetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  transferCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  transferButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  transferButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  transferButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noteCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});
