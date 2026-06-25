import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
  RefreshControl,
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWeb3, POLYGON_MAINNET } from '@/providers/Web3Provider';
import WalletBalanceHeader from '@/components/WalletBalanceHeader';
import { useAuth } from '@/providers/AuthProvider';
import { useRatings } from '@/providers/RatingProvider';
import {
  Wallet,
  Send,
  ExternalLink,
  AlertCircle,
  Copy,
  RefreshCw,
  Shield,
  Award,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  CircleDollarSign,
  Unlink,
} from 'lucide-react-native';

type WalletSection = 'jpyc' | 'send';

export default function WalletScreen() {
  const { user } = useAuth();
  const { getBTDistribution, getPendingBTDistribution } = useRatings();
  const {
    address,
    isConnected,
    network,
    balance,
    jpycBalance,
    isLoading,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    transferJPYC,
    transferJPYCWithPaymaster,
    getJPYCBalance,
    getBalance,
    getBPBalance,
    getBPBalanceERC1155,
  } = useWeb3();

  const [toAddress, setToAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<WalletSection | null>(null);


  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const isPolygonNetwork = network.chainId === POLYGON_MAINNET.chainId;
  const isHairdresser = user?.role === 'hairdresser';
  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);



  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        getBalance(),
        getJPYCBalance(),
      ]);
    } catch (error) {
      console.log('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [getBalance, getJPYCBalance]);

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      if (!isPolygonNetwork) {
        await switchNetwork(POLYGON_MAINNET);
      }
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'ウォレット生成に失敗しました');
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
        `${amount} JPYC を送金しました`,
        [
          { text: 'OK' },
          {
            text: 'Explorerで確認',
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

  const handleCopyAddress = async () => {
    if (address) {
      try {
        if (Platform.OS === 'web') {
          await navigator.clipboard?.writeText(address);
        } else {
          await ExpoClipboard.setStringAsync(address);
        }
        Alert.alert('コピー完了', 'アドレスをコピーしました');
      } catch (error) {
        console.log('Copy failed:', error);
      }
    }
  };

  const toggleSection = (section: WalletSection) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const renderDisconnected = () => (
    <Animated.View style={[styles.disconnectedContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.heroSection}>
        <View style={styles.heroIconWrapper}>
          <Wallet size={48} color="#FFFFFF" />
        </View>
        <Text style={styles.heroTitle}>ウォレット</Text>
        <Text style={styles.heroSubtitle}>
          Polygonネットワーク上でJPYCの管理と{'\n'}
          仮BPの確認ができます
        </Text>
      </View>

      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: '#EBF5FF' }]}>
            <CircleDollarSign size={20} color="#2563EB" />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>JPYC 管理</Text>
            <Text style={styles.featureDesc}>送受信・残高確認</Text>
          </View>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: '#FFF7ED' }]}>
            <Award size={20} color="#FF9800" />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>仮BP</Text>
            <Text style={styles.featureDesc}>評価に基づく仮付与ポイント</Text>
          </View>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: '#F5F3FF' }]}>
            <Shield size={20} color="#7C3AED" />
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>ガスレス対応</Text>
            <Text style={styles.featureDesc}>スマートウォレットでガス代無料</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.connectButton}
        onPress={handleConnectWallet}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Wallet size={20} color="#FFFFFF" />
            <Text style={styles.connectButtonText}>ウォレットを生成</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderConnected = () => (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#2563EB" />
      }
    >
      <View style={styles.walletHeader}>
        <View style={styles.walletHeaderTop}>
          <View style={styles.networkPill}>
            <View style={[styles.networkDot, { backgroundColor: isPolygonNetwork ? '#22C55E' : '#EF4444' }]} />
            <Text style={styles.networkText}>{network.name}</Text>
          </View>
          <TouchableOpacity onPress={() => disconnectWallet()} style={styles.disconnectBtn}>
            <Unlink size={16} color="#EF4444" />
            <Text style={styles.disconnectText}>切断</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleCopyAddress} style={styles.addressRow} activeOpacity={0.7}>
          <Text style={styles.addressText}>
            {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : ''}
          </Text>
          <Copy size={14} color="#6B7280" />
        </TouchableOpacity>

      </View>

      <View style={styles.balanceCards}>
        <View style={styles.mainBalanceCard}>
          <View style={styles.jpycIconLarge}>
            <Text style={styles.jpycIconLargeText}>¥</Text>
          </View>
          <Text style={styles.mainBalanceAmount}>{parseFloat(jpycBalance).toLocaleString()}</Text>
          <Text style={styles.mainBalanceCurrency}>JPYC</Text>
          <Text style={styles.mainBalanceSub}>Polygon Mainnet</Text>
        </View>

        <View style={styles.secondaryBalances}>
          <View style={styles.secondaryCard}>
            <View style={[styles.smallIcon, { backgroundColor: '#8247E5' }]}>
              <Text style={styles.smallIconText}>P</Text>
            </View>
            <Text style={styles.secondaryAmount}>{parseFloat(balance).toFixed(3)}</Text>
            <Text style={styles.secondaryCurrency}>POL</Text>
          </View>
          {isHairdresser && user?.id && (() => {
            const pendingDist = getPendingBTDistribution(user.id);
            const confirmedDist = getBTDistribution(user.id);
            const offChainBP = user.btBalance ?? 0;
            const displayBP = confirmedDist.total > 0 ? confirmedDist.total : offChainBP;
            return (
              <View style={styles.secondaryCard}>
                <View style={[styles.smallIcon, { backgroundColor: '#FF9800' }]}>
                  <Award size={14} color="#FFF" />
                </View>
                <View style={styles.pendingBPRow}>
                  <Text style={styles.bpAmount}>{displayBP % 1 === 0 ? displayBP : displayBP.toFixed(1)}</Text>
                  {pendingDist.total > 0 && (
                    <Text style={styles.pendingBPBadge}>+{pendingDist.total}（仮）</Text>
                  )}
                </View>
                <Text style={styles.bpCurrency}>仮BP</Text>
              </View>
            );
          })()}
        </View>
      </View>



      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('jpyc')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <CircleDollarSign size={20} color="#1E293B" />
            <Text style={styles.sectionTitle}>JPYC 詳細</Text>
          </View>
          {expandedSection === 'jpyc' ? <ChevronUp size={20} color="#9CA3AF" /> : <ChevronDown size={20} color="#9CA3AF" />}
        </TouchableOpacity>
        {expandedSection === 'jpyc' && (
          <View style={styles.sectionContent}>
            <View style={styles.jpycDetailRow}>
              <Text style={styles.jpycDetailLabel}>コントラクト</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`${POLYGON_MAINNET.blockExplorer}/token/0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB`)}
              >
                <Text style={styles.jpycDetailLink}>0x431D...7BDB</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.jpycDetailRow}>
              <Text style={styles.jpycDetailLabel}>ネットワーク</Text>
              <Text style={styles.jpycDetailValue}>Polygon Mainnet</Text>
            </View>
            <View style={styles.jpycDetailRow}>
              <Text style={styles.jpycDetailLabel}>規格</Text>
              <Text style={styles.jpycDetailValue}>ERC-20</Text>
            </View>
            <View style={styles.jpycNoteCard}>
              <AlertCircle size={16} color="#2563EB" />
              <Text style={styles.jpycNoteText}>
                JPYCは日本円連動型ステーブルコインです。施術料金決済には使用しません。
              </Text>
            </View>
            <TouchableOpacity
              style={styles.explorerButton}
              onPress={() => Linking.openURL('https://jpyc.jp/')}
              activeOpacity={0.7}
            >
              <ExternalLink size={16} color="#2563EB" />
              <Text style={styles.explorerButtonText}>JPYC公式サイト</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('send')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <Send size={20} color="#1E293B" />
            <Text style={styles.sectionTitle}>JPYC 送金</Text>
          </View>
          {expandedSection === 'send' ? <ChevronUp size={20} color="#9CA3AF" /> : <ChevronDown size={20} color="#9CA3AF" />}
        </TouchableOpacity>
        {expandedSection === 'send' && (
          <View style={styles.sectionContent}>
            {!isPolygonNetwork && (
              <TouchableOpacity
                style={styles.networkWarning}
                onPress={() => switchNetwork(POLYGON_MAINNET)}
                activeOpacity={0.7}
              >
                <AlertCircle size={16} color="#D97706" />
                <Text style={styles.networkWarningText}>Polygon Mainnetに切り替える</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.inputLabel}>送信先アドレス</Text>
            <TextInput
              style={styles.input}
              value={toAddress}
              onChangeText={setToAddress}
              placeholder="0x..."
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputLabel}>金額 (JPYC)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="100"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!toAddress || !amount || !isPolygonNetwork || isTransferring) && styles.sendButtonDisabled,
              ]}
              onPress={handleTransfer}
              disabled={!toAddress || !amount || !isPolygonNetwork || isTransferring}
              activeOpacity={0.8}
            >
              {isTransferring ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <ArrowUpRight size={18} color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>送金する</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>



      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>ウォレット</Text>
          <View style={styles.topBarRight}>
            <WalletBalanceHeader />
            {isConnected && (
              <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing} style={{ marginLeft: 10 }}>
                <RefreshCw size={20} color={isRefreshing ? '#D1D5DB' : '#1E293B'} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {isConnected ? renderConnected() : renderDisconnected()}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topBarRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  disconnectedContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroIconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#0F172A',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  featureList: {
    marginBottom: 28,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1E293B',
  },
  featureDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  smartWalletSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  smartWalletLabel: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '500' as const,
  },
  emailInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  smartWalletButton: {
    backgroundColor: '#F5F3FF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  smartWalletButtonText: {
    color: '#7C3AED',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  walletHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  walletHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  networkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  networkText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500' as const,
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  disconnectText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500' as const,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  smartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  smartBadgeText: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '500' as const,
  },
  balanceCards: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  mainBalanceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  jpycIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  jpycIconLargeText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  mainBalanceAmount: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  mainBalanceCurrency: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600' as const,
    marginTop: 2,
  },
  mainBalanceSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  secondaryBalances: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  smallIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  smallIconText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  secondaryAmount: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1E293B',
  },
  secondaryCurrency: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600' as const,
    marginTop: 2,
  },
  sectionCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1E293B',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  pendingBPRow: {
    alignItems: 'center',
  },
  bpAmount: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#1E293B',
  },
  bpCurrency: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700' as const,
    marginTop: 3,
  },
  pendingBPBadge: {
    fontSize: 24,
    color: '#FF9800',
    fontWeight: '700' as const,
    marginTop: 4,
  },
  explorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    marginTop: 8,
  },
  explorerButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600' as const,
  },
  jpycDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  jpycDetailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500' as const,
  },
  jpycDetailValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600' as const,
  },
  jpycDetailLink: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600' as const,
  },
  jpycNoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  jpycNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#1D4ED8',
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  networkWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  networkWarningText: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '600' as const,
  },
  upgradeCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FAFAFE',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9E5F5',
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginTop: 10,
    marginBottom: 4,
  },
  upgradeDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
  },
  upgradeButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
