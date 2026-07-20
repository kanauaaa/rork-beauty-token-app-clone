import React, { useState, useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, Switch, Image, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useRatings } from '@/providers/RatingProvider';
import { User, MapPin, LogOut, Settings, Sparkles, X, Save, Bell, Shield, Palette, QrCode, Award, Camera, Crown, CreditCard, Gift, Info, Zap, Heart, Clock, Users as UsersIcon, Wallet, Network, ExternalLink, RefreshCw, Coins, Trophy, Scissors, Waves, AlignJustify, Link, Hand, ChevronDown } from 'lucide-react-native';
import { router } from 'expo-router';
import QRCodeComponent from '@/components/QRCode';
import * as ImagePicker from 'expo-image-picker';
import { createCustomerQR, createHairdresserQR, createHairdresserReferralQR, getQRCodeInfo, serializeQRData, validateQRCode } from '@/lib/qr-utils';
import WalletBalanceHeader from '@/components/WalletBalanceHeader';
import TechnicalSkillChart, { SkillItem } from '@/components/TechnicalSkillChart';
import CategoryProgressBar from '@/components/CategoryProgressBar';
import { useRatingTasks } from '@/providers/RatingTaskProvider';
import { useWeb3 } from '@/providers/Web3Provider';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile, generateWalletForHairdresser } = useAuth();
  const { subscription, checkSubscriptionStatus } = useSubscription();
  const { createRatingTask } = useRatingTasks();
  const { getBTDistribution, getRatingsByCustomer } = useRatings();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    autoBackup: true,
    locationServices: false,
  });
  const [showQRModal, setShowQRModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [privateKey, setPrivateKey] = useState<string>('');
  const [mnemonic, setMnemonic] = useState<string>('');
  const web3 = useWeb3();
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [showThirdwebEmailModal, setShowThirdwebEmailModal] = useState(false);
  const [thirdwebEmail, setThirdwebEmail] = useState('');
  const [thirdwebVerificationCode, setThirdwebVerificationCode] = useState('');
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [onChainBP, setOnChainBP] = useState<number>(0);
  const [loadingOnChain, setLoadingOnChain] = useState(false);
  const [technicalExpanded, setTechnicalExpanded] = useState(false);

  const [_lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [txHistory, setTxHistory] = useState<Array<{ hash: string; type: string; timestamp: number }>>([]);

  const isHairdresser = user?.role === 'hairdresser';
  const isCustomer = user?.role === 'customer';

  const fetchOnChainBalances = useCallback(async () => {
    if (!web3.isConnected || !web3.address) return;
    setLoadingOnChain(true);
    try {
      if (isHairdresser) {
        const bp = await web3.getBPBalanceERC1155(web3.address);
        setOnChainBP(bp);
        console.log('On-chain BP:', bp);
      }
    } catch (error) {
      console.error('Failed to fetch on-chain balances:', error);
    } finally {
      setLoadingOnChain(false);
    }
  }, [web3, isHairdresser, isCustomer]);

  useEffect(() => {
    if (web3.isConnected && web3.address) {
      void fetchOnChainBalances();
    }
  }, [web3.isConnected, web3.address, fetchOnChainBalances]);

  useEffect(() => {
    const loadTxHistory = async () => {
      if (!user) return;
      try {
        const stored = await AsyncStorage.getItem(`@tx_history_${user.id}`);
        if (stored) setTxHistory(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load tx history:', error);
      }
    };
    void loadTxHistory();
  }, [user]);

  const saveTx = useCallback(async (hash: string, type: string) => {
    if (!user) return;
    const newTx = { hash, type, timestamp: Date.now() };
    const updated = [newTx, ...txHistory].slice(0, 20);
    setTxHistory(updated);
    setLastTxHash(hash);
    await AsyncStorage.setItem(`@tx_history_${user.id}`, JSON.stringify(updated));
  }, [user, txHistory]);



  useEffect(() => {
    if (user) {
      void checkSubscriptionStatus(user.id);
    }
  }, [user, checkSubscriptionStatus]);

  useEffect(() => {
    const loadHairdresserWallet = async () => {
      if (user?.role === 'hairdresser' && user.walletAddress && !web3.isConnected) {
        try {
          setLoadingWallet(true);

          const privateKey = await AsyncStorage.getItem(`@web3_private_key_${user.id}`);
          if (privateKey) {
            await web3.loadWalletFromPrivateKey(privateKey);

          }
        } catch {

        } finally {
          setLoadingWallet(false);
        }
      }
    };
    void loadHairdresserWallet();
  }, [user, web3]);

  const handleGenerateWallet = async () => {
    try {
      setLoadingWallet(true);

      const { address, privateKey: pk, mnemonic: mn } = await generateWalletForHairdresser();
      
      Alert.alert(
        '✅ ウォレット生成完了',
        `ウォレットアドレス:\n${address}\n\n⚠️ 秘密鍵とシードフレーズは安全に保管してください。これらがあればウォレットを復元できます。`,
        [
          { text: 'OK', onPress: () => {
            setShowSecretModal(true);
            setPrivateKey(pk);
            setMnemonic(mn);
          }}
        ]
      );
      
      await web3.loadWalletFromPrivateKey(pk);

    } catch (error: any) {

      Alert.alert('エラー', error?.message || 'ウォレットの生成に失敗しました');
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleShowSecrets = async () => {
    if (!user || user.role !== 'hairdresser') {
      Alert.alert('エラー', 'この機能は美容師アカウントのみ利用できます');
      return;
    }

    try {
      const pk = await AsyncStorage.getItem(`@web3_private_key_${user.id}`);
      const mn = await AsyncStorage.getItem(`@web3_mnemonic_${user.id}`);
      
      if (!pk || !mn) {
        Alert.alert(
          'ウォレット情報が見つかりません',
          '秘密鍵やシードフレーズが見つかりませんでした。新しいウォレットを作成しますか？',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '新規ウォレット作成',
              onPress: () => {
                setShowSecretModal(false);
                void handleGenerateWallet();
              }
            }
          ]
        );
        return;
      }
      
      setPrivateKey(pk);
      setMnemonic(mn);
      setShowSecretModal(true);
    } catch {

      Alert.alert('エラー', 'ウォレット情報の取得に失敗しました');
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>ユーザー情報が見つかりません</Text>
      </View>
    );
  }

  const handleDirectLogout = async () => {
    try {

      await logout();

    } catch {

      Alert.alert('エラー', 'ログアウトに失敗しました。もう一度お試しください。');
    }
  };

  const handleLogout = () => {

    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'ログアウト', 
          style: 'destructive', 
          onPress: handleDirectLogout
        },
      ]
    );
  };

  const _handleEditProfile = () => {

    setEditedUser(user);
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editedUser) return;
    
    try {

      await updateProfile(editedUser);
      Alert.alert('保存完了', 'プロフィールが更新されました');
      setShowEditModal(false);
    } catch {

      Alert.alert('エラー', 'プロフィールの保存に失敗しました');
    }
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
        setEditedUser(prev => prev ? {...prev, profileImageUri: imageUri} : null);
      }
    } catch {

      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  const handleAppSettings = () => {

    setShowSettingsModal(true);
  };

  const handleAccountSettings = () => {

    Alert.alert(
      'アカウント設定',
      'パスワード変更やアカウント削除などの設定を行えます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'パスワード変更', 
          onPress: () => Alert.alert('パスワード変更', 'パスワード変更機能は開発中です') 
        },
        { 
          text: 'アカウント削除', 
          style: 'destructive',
          onPress: () => Alert.alert(
            'アカウント削除',
            'この操作は取り消せません。本当にアカウントを削除しますか？',
            [
              { text: 'キャンセル', style: 'cancel' },
              { text: '削除', style: 'destructive', onPress: () => Alert.alert('削除完了', 'アカウントが削除されました') }
            ]
          )
        }
      ]
    );
  };

  const handlePrivacyPolicy = () => {

    Alert.alert(
      'プライバシーポリシー',
      '当アプリは、お客様の個人情報を適切に保護し、以下の目的でのみ使用いたします：\n\n• サービスの提供・改善\n• お客様サポート\n• 法的要件への対応\n\n詳細については、アプリ内の利用規約をご確認ください。',
      [
        { text: '閉じる', style: 'cancel' },
        { text: '利用規約を見る', onPress: () => Alert.alert('利用規約', '利用規約の詳細画面は開発中です') }
      ]
    );
  };

  const handleTestQRScan = async () => {
    if (!user || user.role !== 'customer') {
      Alert.alert('エラー', 'この機能は顧客アカウントのみ利用できます');
      return;
    }

    try {

      
      const testHairdresserQR = createHairdresserQR({
        id: 'test_hairdresser_001',
        name: 'テスト美容師',
        hairdresserId: 'test_hairdresser_001',
        workplaceName: 'テスト美容室',
      });



      const validation = validateQRCode(serializeQRData(testHairdresserQR));
      
      if (!validation.isValid || !validation.data) {
        Alert.alert('エラー', validation.error || 'QRコードの検証に失敗しました');
        return;
      }

      if (validation.data.type !== 'hairdresser_qr') {
        Alert.alert('エラー', '美容師のQRコードではありません');
        return;
      }




      const _taskId = await createRatingTask({
        customerId: user.id,
        customerName: user.name,
        hairdresserId: validation.data.hairdresserId,
        hairdresserName: validation.data.userName,
        checkInDate: new Date().toISOString(),
        status: 'pending',
      });



      Alert.alert(
        '成功',
        `${validation.data.userName}の評価タスクが作成されました！\n\n評価画面に移動して、BPを贈呈してください。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '評価画面へ', 
            onPress: () => router.push('/(tabs)/rating' as any)
          }
        ]
      );
    } catch {

      Alert.alert('エラー', 'テストQRスキャンに失敗しました');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <LinearGradient
        colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
        style={styles.container}
      >

      <View style={[styles.balanceBar, { top: insets.top + 8 }]}>
        <WalletBalanceHeader />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user.profileImageUri ? (
                <Image source={{ uri: user.profileImageUri }} style={styles.avatarImage} />
              ) : (
                <User size={40} color="#7F8C8D" />
              )}
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user.role === 'hairdresser' ? '美容師' : '顧客'}
              </Text>
            </View>
          </View>

          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>



          {user.workplaceName && (
            <View style={styles.infoItem}>
              <Text style={styles.workplaceNameLabel}>{user.workplaceName}</Text>
            </View>
          )}

          {user.workplace && (
            <View style={styles.infoItem}>
              <MapPin size={16} color="#7F8C8D" />
              <Text style={styles.infoText}>{user.workplace}</Text>
            </View>
          )}



          {user.selfIntroduction && (
            <View style={styles.introContainer}>
              <Text style={styles.introLabel}>自己紹介</Text>
              <Text style={styles.introText}>{user.selfIntroduction}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.subscriptionCard}
          onPress={() => router.push('/subscription' as any)}
        >
          <LinearGradient
            colors={subscription.tier === 'premium' ? ['#D4AF37', '#FFD700'] : ['#FF69B4', '#FF1493']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.subscriptionGradient}
          >
            <View style={styles.subscriptionContent}>
              <View style={styles.subscriptionHeader}>
                {subscription.tier === 'premium' ? (
                  <Crown size={28} color="white" />
                ) : (
                  <Sparkles size={28} color="white" />
                )}
                <View style={styles.subscriptionInfo}>
                  <Text style={styles.subscriptionTitle}>
                    {subscription.tier === 'premium' ? 'プレミアムプラン' : '無料プラン'}
                  </Text>
                  {subscription.tier === 'premium' && subscription.endDate && (
                    <Text style={styles.subscriptionExpiry}>
                      有効期限: {new Date(subscription.endDate).toLocaleDateString('ja-JP')}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.subscriptionAction}>
                <Text style={styles.subscriptionActionText}>
                  {subscription.tier === 'premium' ? '管理' : 'アップグレード'}
                </Text>
                <CreditCard size={20} color="white" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {user.role === 'customer' && (
          <TouchableOpacity
            style={styles.referralCard}
            onPress={() => router.push('/(tabs)/referrals' as any)}
          >
            <LinearGradient
              colors={['#4CAF50', '#66BB6A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.referralGradient}
            >
              <View style={styles.referralContent}>
                <View style={styles.referralHeader}>
                  <Gift size={28} color="white" />
                  <View style={styles.referralInfo}>
                    <Text style={styles.referralTitle}>リファラル管理</Text>
                    <Text style={styles.referralSubtitle}>招待した美容師のデータを確認</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>統計情報</Text>
          
          <View style={styles.statsGrid}>
            {user.role === 'hairdresser' && (
              <View style={styles.statCard}>
                <Sparkles size={24} color="#D4AF37" />
                <Text style={styles.statValue}>
                  {user.btBalance?.toFixed(1) || '0.0'}
                </Text>
                <Text style={styles.statLabel}>保有BP（仮）</Text>
                <Text style={styles.statHint}>オンチェーン保留</Text>
              </View>
            )}
            
            {user.role === 'customer' && (
              <View style={styles.statCard}>
                <Award size={24} color="#D4AF37" />
                <Text style={styles.statValue}>{getRatingsByCustomer(user.id).length}</Text>
                <Text style={styles.statLabel}>評価した数</Text>
              </View>
            )}
          </View>
        </View>

        {(web3.isConnected || !!user.walletAddress) && (
          <View style={styles.onChainSection}>
            <View style={styles.onChainHeader}>
              <Text style={styles.sectionTitle}>オンチェーン残高</Text>
              <TouchableOpacity
                onPress={fetchOnChainBalances}
                disabled={loadingOnChain}
                style={styles.refreshButton}
              >
                {loadingOnChain ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <RefreshCw size={18} color="#8B5CF6" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.onChainGrid}>
              {isHairdresser && (
                <View style={styles.onChainCard}>
                  <LinearGradient
                    colors={['#FF6B9D', '#C44569']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.onChainCardGradient}
                  >
                    <Trophy size={28} color="white" />
                    <Text style={styles.onChainValue}>{onChainBP}</Text>
                    <Text style={styles.onChainLabel}>BP (SBT)</Text>
                    <Text style={styles.onChainSublabel}>Beauty Proof</Text>
                  </LinearGradient>
                </View>
              )}

            </View>

            <View style={styles.onChainWalletInfo}>
              <View style={styles.onChainWalletRow}>
                <Text style={styles.onChainWalletLabel}>ネットワーク</Text>
                <View style={styles.polygonBadge}>
                  <Text style={styles.polygonBadgeText}>Polygon Mainnet</Text>
                </View>
              </View>
              <View style={styles.onChainWalletRow}>
                <Text style={styles.onChainWalletLabel}>POL残高</Text>
                <Text style={styles.onChainWalletValue}>{web3.balance} POL</Text>
              </View>
              <View style={styles.onChainWalletRow}>
                <Text style={styles.onChainWalletLabel}>JPYC残高</Text>
                <Text style={styles.onChainWalletValue}>{web3.jpycBalance} JPYC</Text>
              </View>
              {(web3.address || user.walletAddress) && (
                <TouchableOpacity
                  style={styles.polygonScanLink}
                  onPress={() => Linking.openURL(`https://polygonscan.com/address/${web3.address || user.walletAddress}`)}
                >
                  <ExternalLink size={14} color="#8B5CF6" />
                  <Text style={styles.polygonScanLinkText}>PolygonScanで確認</Text>
                </TouchableOpacity>
              )}
            </View>



            {txHistory.length > 0 && (
              <View style={styles.txHistorySection}>
                <Text style={styles.txHistoryTitle}>トランザクション履歴</Text>
                {txHistory.slice(0, 5).map((tx, index) => (
                  <TouchableOpacity
                    key={tx.hash + index}
                    style={styles.txHistoryItem}
                    onPress={() => Linking.openURL(`https://polygonscan.com/tx/${tx.hash}`)}
                  >
                    <View style={styles.txHistoryLeft}>
                      <View style={[
                        styles.txTypeBadge,
                        styles.txTypeBP,
                      ]}>
                        <Text style={styles.txTypeBadgeText}>{tx.type}</Text>
                      </View>
                      <Text style={styles.txHashText}>
                        {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                      </Text>
                    </View>
                    <View style={styles.txHistoryRight}>
                      <Text style={styles.txTimeText}>
                        {new Date(tx.timestamp).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <ExternalLink size={12} color="#95A5A6" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {user.role === 'hairdresser' && (() => {
          const distribution = getBTDistribution(user.id);

          return (
            <View style={styles.btDistributionContainer}>
              <Text style={styles.sectionTitle}>評価項目別獲得BP</Text>
              <View style={styles.btDistributionGrid}>
                {(() => {
                  const toBreakdown = (a: number, b: number, l1: string, l2: string) => {
                    const t = a + b;
                    if (t === 0) return undefined;
                    const p1 = Math.round((a / t) * 100);
                    return [{ label: l1, percent: p1 }, { label: l2, percent: 100 - p1 }];
                  };
                  const bd = distribution.breakdown;
                  const techItems: SkillItem[] = [
                    { id: 'cut', icon: Scissors, color: '#FF69B4', label: 'カット', value: distribution.cut, breakdown: toBreakdown(bd.cut.mens, bd.cut.ladies, 'メンズ', 'レディース') },
                    { id: 'color', icon: Palette, color: '#FF8C42', label: 'カラー', value: distribution.color, breakdown: toBreakdown(bd.color.oneColor, bd.color.wColor, 'ワンカラー', 'Wカラー') },
                    { id: 'perm', icon: Waves, color: '#9B59B6', label: 'パーマ', value: distribution.perm, breakdown: toBreakdown(bd.perm.mens, bd.perm.ladies, 'メンズ', 'レディース') },
                    { id: 'straightening', icon: AlignJustify, color: '#3498DB', label: '縮毛矯正', value: distribution.straightening },
                    { id: 'extensions', icon: Link, color: '#2ECC71', label: 'エクステ', value: distribution.extensions },
                    { id: 'massage', icon: Hand, color: '#F1C40F', label: 'マッサージ', value: distribution.massage },
                  ];
                  const techTotal = techItems.reduce((s, item) => s + item.value, 0);
                  return (
                    <>
                      <TouchableOpacity
                        style={[styles.btDistributionCard, { borderWidth: 2, borderColor: '#FF69B4' }]}
                        onPress={() => setTechnicalExpanded(!technicalExpanded)}
                        activeOpacity={0.7}
                      >
                        <ChevronDown
                          size={16}
                          color="#FF69B4"
                          style={{ transform: [{ rotate: technicalExpanded ? '0deg' : '-90deg' }], marginBottom: 4 }}
                        />
                        <Text style={[styles.btDistributionValue, { color: '#FF69B4' }]}>{techTotal}</Text>
                        <Text style={[styles.btDistributionLabel, { color: '#FF69B4', fontWeight: 'bold' as const }]}>技術力</Text>
                      </TouchableOpacity>

                      {technicalExpanded && (
                        <View style={{ marginBottom: 12 }}>
                          <TechnicalSkillChart items={techItems} total={techTotal} />
                        </View>
                      )}

                      <CategoryProgressBar
                        icon={Heart}
                        color="#FF69B4"
                        label="接客・カウンセリング"
                        value={distribution.service}
                        maxValue={distribution.total}
                      />

                      <CategoryProgressBar
                        icon={Clock}
                        color="#3498DB"
                        label="時間管理"
                        value={distribution.timeManagement}
                        maxValue={distribution.total}
                      />

                      <CategoryProgressBar
                        icon={UsersIcon}
                        color="#87CEEB"
                        label="アシスタント"
                        value={distribution.assistant}
                        maxValue={distribution.total}
                      />
                    </>
                  );
                })()}
              </View>
              <View style={styles.btDistributionSummary}>
                <Text style={styles.btDistributionSummaryLabel}>合計</Text>
                <Text style={styles.btDistributionSummaryValue}>{distribution.total} BP</Text>
              </View>
              {distribution.discarded > 0 && (
                <View style={styles.btDiscardedInfo}>
                  <Text style={styles.btDiscardedLabel}>破棄されたBP: {distribution.discarded} BP</Text>
                </View>
              )}
            </View>
          );
        })()}

        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>設定</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleAppSettings}>
            <Settings size={20} color="#7F8C8D" />
            <Text style={styles.menuText}>アプリ設定</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleAccountSettings}>
            <User size={20} color="#7F8C8D" />
            <Text style={styles.menuText}>アカウント設定</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setShowQRModal(true)}>
            <QrCode size={20} color="#7F8C8D" />
            <Text style={styles.menuText}>マイQRコード</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, web3.isConnected && styles.walletConnectedItem]} 
            onPress={() => router.push('/(tabs)/wallet' as any)}
          >
            <Wallet size={20} color={web3.isConnected ? "#4CAF50" : "#7F8C8D"} />
            <Text style={[styles.menuText, web3.isConnected && styles.walletConnectedText]}>
              {web3.isConnected ? 'ウォレット管理' : 'ウォレット接続'}
            </Text>
          </TouchableOpacity>

          {user.role === 'customer' && (
            <TouchableOpacity 
              style={[styles.menuItem, styles.testQRItem]} 
              onPress={handleTestQRScan}
            >
              <Camera size={20} color="#4CAF50" />
              <Text style={[styles.menuText, styles.testQRText]}>テストQRスキャン（評価お試し）</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={handlePrivacyPolicy}>
            <Shield size={20} color="#7F8C8D" />
            <Text style={styles.menuText}>プライバシーポリシー</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, styles.logoutItem]} 
            onPress={handleLogout}
            testID="logout-button"
          >
            <LogOut size={20} color="#E74C3C" />
            <Text style={[styles.menuText, styles.logoutText]}>ログアウト</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, styles.directLogoutItem]} 
            onPress={handleDirectLogout}
            testID="direct-logout-button"
          >
            <LogOut size={20} color="#E74C3C" />
            <Text style={[styles.menuText, styles.logoutText]}>直接ログアウト（テスト用）</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>アカウント状態</Text>
          <View style={[
            styles.statusBadge,
            user.status === 'approved' ? styles.approvedBadge : styles.pendingBadge
          ]}>
            <Text style={[
              styles.statusText,
              user.status === 'approved' ? styles.approvedText : styles.pendingText
            ]}>
              {user.status === 'approved' ? '承認済み' : '承認待ち'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* プロフィール編集モーダル */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <X size={24} color="#7F8C8D" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>プロフィール編集</Text>
            <TouchableOpacity onPress={handleSaveProfile}>
              <Save size={24} color="#FF69B4" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>プロフィール画像</Text>
              <TouchableOpacity 
                style={styles.imagePickerButton}
                onPress={handlePickImage}
              >
                <View style={styles.imagePickerPreview}>
                  {editedUser?.profileImageUri ? (
                    <Image source={{ uri: editedUser.profileImageUri }} style={styles.imagePickerImage} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Camera size={32} color="#7F8C8D" />
                      <Text style={styles.imagePickerText}>画像を選択</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>名前</Text>
              <TextInput
                style={styles.textInput}
                value={editedUser?.name || ''}
                onChangeText={(text) => setEditedUser(prev => prev ? {...prev, name: text} : null)}
                placeholder="名前を入力"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>メールアドレス</Text>
              <TextInput
                style={styles.textInput}
                value={editedUser?.email || ''}
                onChangeText={(text) => setEditedUser(prev => prev ? {...prev, email: text} : null)}
                placeholder="メールアドレスを入力"
                keyboardType="email-address"
              />
            </View>

            {editedUser?.role === 'hairdresser' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>勤務先名</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editedUser?.workplaceName || ''}
                    onChangeText={(text) => setEditedUser(prev => prev ? {...prev, workplaceName: text} : null)}
                    placeholder="勤務先名を入力（例: 〇〇美容室）"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>勤務先住所</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editedUser?.workplace || ''}
                    onChangeText={(text) => setEditedUser(prev => prev ? {...prev, workplace: text} : null)}
                    placeholder="勤務先住所を入力"
                  />
                </View>
              </>
            )}



            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>自己紹介</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={editedUser?.selfIntroduction || ''}
                onChangeText={(text) => setEditedUser(prev => prev ? {...prev, selfIntroduction: text} : null)}
                placeholder="自己紹介を入力"
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 設定モーダル */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
              <X size={24} color="#7F8C8D" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>アプリ設定</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>通知設定</Text>
              
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Bell size={20} color="#7F8C8D" />
                  <Text style={styles.settingLabel}>プッシュ通知</Text>
                </View>
                <Switch
                  value={settings.notifications}
                  onValueChange={(value) => setSettings(prev => ({...prev, notifications: value}))}
                  trackColor={{ false: '#E0E0E0', true: '#FF69B4' }}
                  thumbColor={settings.notifications ? '#FFFFFF' : '#F4F3F4'}
                />
              </View>
            </View>

            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>表示設定</Text>
              
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Palette size={20} color="#7F8C8D" />
                  <Text style={styles.settingLabel}>ダークモード</Text>
                </View>
                <Switch
                  value={settings.darkMode}
                  onValueChange={(value) => setSettings(prev => ({...prev, darkMode: value}))}
                  trackColor={{ false: '#E0E0E0', true: '#FF69B4' }}
                  thumbColor={settings.darkMode ? '#FFFFFF' : '#F4F3F4'}
                />
              </View>
            </View>

            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>データ設定</Text>
              
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Shield size={20} color="#7F8C8D" />
                  <Text style={styles.settingLabel}>自動バックアップ</Text>
                </View>
                <Switch
                  value={settings.autoBackup}
                  onValueChange={(value) => setSettings(prev => ({...prev, autoBackup: value}))}
                  trackColor={{ false: '#E0E0E0', true: '#FF69B4' }}
                  thumbColor={settings.autoBackup ? '#FFFFFF' : '#F4F3F4'}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <MapPin size={20} color="#7F8C8D" />
                  <Text style={styles.settingLabel}>位置情報サービス</Text>
                </View>
                <Switch
                  value={settings.locationServices}
                  onValueChange={(value) => setSettings(prev => ({...prev, locationServices: value}))}
                  trackColor={{ false: '#E0E0E0', true: '#FF69B4' }}
                  thumbColor={settings.locationServices ? '#FFFFFF' : '#F4F3F4'}
                />
              </View>
            </View>

            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>アプリ情報</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>バージョン</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>ビルド番号</Text>
                <Text style={styles.infoValue}>2024.12.1</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* QRコードモーダル */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowQRModal(false)}>
              <X size={24} color="#7F8C8D" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {user.role === 'customer' ? '顧客QRコード' : '美容師QRコード'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.qrModalContent}>
            <View style={styles.qrCodeSection}>
              {user.role === 'customer' ? (() => {
                const qrData = createCustomerQR({
                  id: user.id,
                  name: user.name,
                  email: user.email,
                });
                return (
                  <>
                    <Text style={styles.qrCodeTitle}>カルテ記入用QRコード</Text>
                    <Text style={styles.qrCodeDescription}>
                      美容師がこのQRコードをスキャンすると、カルテ記入が可能になります。
                    </Text>

                    <View style={styles.qrCodeWrapper}>
                      <QRCodeComponent
                        value={serializeQRData(qrData)}
                        size={250}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.qrInfoButton}
                      onPress={() => {
                        Alert.alert('QRコード詳細', getQRCodeInfo(qrData), [{ text: 'OK' }]);
                      }}
                    >
                      <Info size={16} color="#FF69B4" />
                      <Text style={styles.qrInfoButtonText}>詳細情報を見る</Text>
                    </TouchableOpacity>
                  </>
                );
              })() : (() => {
                const hairdresserQR = createHairdresserQR({
                  id: user.id,
                  name: user.name,
                  hairdresserId: user.hairdresserId,
                  workplaceName: user.workplaceName,
                });
                const referralQR = createHairdresserReferralQR({
                  id: user.id,
                  name: user.name,
                  hairdresserId: user.hairdresserId,
                });
                return (
                  <>
                    <Text style={styles.qrCodeTitle}>美容師QRコード</Text>
                    <Text style={styles.qrCodeDescription}>
                      このQRコードはアシスタント美容師のBP付与に使用します。
                    </Text>

                    <View style={styles.qrCodeWrapper}>
                      <QRCodeComponent
                        value={serializeQRData(hairdresserQR)}
                        size={250}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.qrInfoButton}
                      onPress={() => {
                        Alert.alert('QRコード詳細', getQRCodeInfo(hairdresserQR), [{ text: 'OK' }]);
                      }}
                    >
                      <Info size={16} color="#FF69B4" />
                      <Text style={styles.qrInfoButtonText}>詳細情報を見る</Text>
                    </TouchableOpacity>

                    <View style={styles.qrDivider} />

                    <Text style={styles.qrCodeTitle}>リファラルQRコード</Text>
                    <Text style={styles.qrCodeDescription}>
                      顧客がこのQRコードをスキャンすると、あなたを紹介した美容師として登録されます。
                    </Text>

                    <View style={styles.qrCodeWrapper}>
                      <QRCodeComponent
                        value={serializeQRData(referralQR)}
                        size={250}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.qrInfoButton}
                      onPress={() => {
                        Alert.alert('QRコード詳細', getQRCodeInfo(referralQR), [{ text: 'OK' }]);
                      }}
                    >
                      <Info size={16} color="#FF69B4" />
                      <Text style={styles.qrInfoButtonText}>詳細情報を見る</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}

              <View style={styles.qrInfoBox}>
                <Text style={styles.qrInfoLabel}>ユーザーID</Text>
                <Text style={styles.qrInfoValue}>{user.id}</Text>
              </View>

              {user.role === 'hairdresser' && user.hairdresserId && (
                <View style={styles.qrInfoBox}>
                  <Text style={styles.qrInfoLabel}>美容師ID</Text>
                  <Text style={styles.qrInfoValue}>{user.hairdresserId}</Text>
                </View>
              )}

              <View style={styles.qrBenefitSection}>
                {user.role === 'customer' ? (
                  <>
                    <Text style={styles.qrBenefitTitle}>カルテ記入の流れ</Text>
                    <View style={styles.qrBenefitList}>
                      <Text style={styles.qrBenefitItem}>1. 美容師がQRコードをスキャン</Text>
                      <Text style={styles.qrBenefitItem}>2. 施術後にカルテを記入</Text>
                      <Text style={styles.qrBenefitItem}>3. あなたが美容師を評価</Text>
                      <Text style={styles.qrBenefitItem}>4. BPの受け渡しが完了</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.qrBenefitTitle}>QRコードの使い分け</Text>
                    <View style={styles.qrBenefitList}>
                      <Text style={styles.qrBenefitItem}>【美容師QRコード】</Text>
                      <Text style={styles.qrBenefitItem}>• アシスタントにBPを付与する際に使用</Text>
                      <Text style={styles.qrBenefitItem}>• アシスタント管理画面で読み取り</Text>
                      <Text style={styles.qrBenefitItem}></Text>
                      <Text style={styles.qrBenefitItem}>【リファラルQRコード】</Text>
                      <Text style={styles.qrBenefitItem}>• 顧客の新規登録時に使用</Text>
                      <Text style={styles.qrBenefitItem}>• 顧客があなたの施術を受けるとBP獲得</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ウォレット管理モーダル */}
      <Modal
        visible={showWalletModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowWalletModal(false)}>
              <X size={24} color="#7F8C8D" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>ウォレット管理</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {web3.isConnected ? (
              <>
                <View style={styles.walletBeginnerBanner}>
                  <View style={styles.walletBeginnerIcon}>
                    <Info size={20} color="#2196F3" />
                  </View>
                  <Text style={styles.walletBeginnerText}>
                    あなたの暗号ウォレットが自動で作成されました！{"\n"}
                    ここでテストトークン（POL）を受け取ってBPをブロックチェーンに記録できます。
                  </Text>
                </View>

                <View style={styles.walletConnectedCard}>
                  <View style={styles.walletConnectedHeader}>
                    <Wallet size={32} color="#4CAF50" />
                    <Text style={styles.walletConnectedTitle}>ウォレット準備完了</Text>
                  </View>
                  
                  <View style={styles.walletAddressSection}>
                    <Text style={styles.walletAddressLabel}>あなたのウォレットアドレス</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        if (web3.address) {
                          Alert.alert('アドレスをコピー', web3.address);
                        }
                      }}
                      style={styles.walletAddressTouchable}
                    >
                      <Text style={styles.walletAddress}>
                        {web3.address ? `${web3.address.slice(0, 8)}...${web3.address.slice(-6)}` : ''}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.walletAddressHint}>タップでフルアドレスを表示</Text>
                  </View>

                  <View style={styles.walletBalanceSection}>
                    <Text style={styles.walletBalanceLabel}>
                      {web3.network.chainId === 11155111 ? 'SepoliaETH残高' : 'POL残高'}（テストネット）
                    </Text>
                    <Text style={styles.walletBalance}>
                      {web3.balance} {web3.network.chainId === 11155111 ? 'SepoliaETH' : 'POL'}
                    </Text>
                    <Text style={styles.walletBalanceHint}>
                      {parseFloat(web3.balance) < 0.01 ? 'テストトークンが必要です' : 'トランザクション実行可能'}
                    </Text>
                  </View>

                  <View style={styles.walletNetworkSection}>
                    <Network size={20} color="#8B5CF6" />
                    <Text style={styles.walletNetworkText}>{web3.network.name}</Text>
                    <View style={styles.walletNetworkBadge}>
                      <Text style={styles.walletNetworkBadgeText}>テストネット</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.walletFaucetCard}>
                  <Text style={styles.walletFaucetTitle}>⛽ ガストークン（POL）</Text>
                  <Text style={styles.walletFaucetDescription}>
                    Polygon Mainnetでトランザクションを実行するにはPOLトークンが必要です。取引所からウォレットアドレスへPOLを送金してください。
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.walletActionButton}
                  onPress={async () => {
                    try {
                      await web3.getBalance();
                      Alert.alert('成功', '残高を更新しました');
                    } catch {
                      Alert.alert('エラー', '残高の取得に失敗しました');
                    }
                  }}
                >
                  <Text style={styles.walletActionButtonText}>残高を更新</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.walletActionButton, styles.walletSecondaryButton]}
                  onPress={() => {
                    Alert.alert(
                      'ネットワーク切り替え',
                      '使用するネットワークを選択してください',
                      [
                        {
                          text: 'Polygon Mainnet',
                          onPress: async () => {
                            try {
                              await web3.switchNetwork({ chainId: 137, name: 'Polygon Mainnet', rpcUrl: 'https://polygon-rpc.com', blockExplorer: 'https://polygonscan.com' });
                              Alert.alert('成功', 'Polygon Mainnetに切り替えました');
                            } catch {
                              Alert.alert('エラー', 'ネットワークの切り替えに失敗しました');
                            }
                          }
                        },
                        { text: 'キャンセル', style: 'cancel' }
                      ]
                    );
                  }}
                >
                  <Network size={20} color="#FF69B4" />
                  <Text style={styles.walletActionButtonText}>ネットワーク切り替え</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.walletActionButton, styles.walletDangerButton]}
                  onPress={() => {
                    Alert.alert(
                      'ウォレット切断',
                      '本当にウォレットを切断しますか？',
                      [
                        { text: 'キャンセル', style: 'cancel' },
                        {
                          text: '切断',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await web3.disconnectWallet();
                              Alert.alert('成功', 'ウォレットを切断しました');
                              setShowWalletModal(false);
                            } catch {
                              Alert.alert('エラー', 'ウォレットの切断に失敗しました');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={[styles.walletActionButtonText, styles.walletDangerButtonText]}>ウォレットを切断</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.walletActionButton, styles.walletInfoButton]}
                  onPress={handleShowSecrets}
                >
                  <Shield size={20} color="#FF9800" />
                  <Text style={styles.walletActionButtonText}>秘密鍵・シードフレーズを表示</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.walletLoadingCard}>
                  <Wallet size={48} color="#7F8C8D" />
                  <Text style={styles.walletLoadingTitle}>
                    {loadingWallet ? 'ウォレットを読み込んでいます...' : 'ウォレット未接続'}
                  </Text>
                  
                  <View style={styles.walletSetupGuide}>
                    <Text style={styles.walletSetupTitle}>🔐 ウォレット設定が必要です</Text>
                    <Text style={styles.walletSetupDescription}>
                      {user?.role === 'hairdresser'
                        ? 'BPをブロックチェーンに記録（ミント）するには、ウォレットが必要です。'
                        : user?.role === 'customer'
                          ? 'BPを受け取るには、ウォレットが必要です。'
                          : 'BPをブロックチェーンに記録（ミント）するには、ウォレットが必要です。'
                      }
                    </Text>
                    <Text style={styles.walletSetupDescription}>
                      ボタンを押すとアプリ内にウォレットが自動生成されます。
                    </Text>
                  </View>
                      
                  <TouchableOpacity
                    style={styles.walletGenerateButton}
                    onPress={handleGenerateWallet}
                    disabled={loadingWallet}
                  >
                    <Wallet size={20} color="white" />
                    <Text style={styles.walletGenerateButtonText}>
                      {loadingWallet ? '生成中...' : 'ウォレットを生成'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* 秘密情報モーダル */}
      <Modal
        visible={showSecretModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowSecretModal(false);
              setPrivateKey('');
              setMnemonic('');
            }}>
              <X size={24} color="#7F8C8D" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>秘密鍵・シードフレーズ</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.secretWarningBanner}>
              <Shield size={24} color="#F44336" />
              <Text style={styles.secretWarningText}>
                ⚠️ この情報は絶対に他人に見せないでください！{"\n"}
                これらがあればウォレットを完全に復元できます。
              </Text>
            </View>

            <View style={styles.secretSection}>
              <Text style={styles.secretSectionTitle}>🔐 秘密鍵 (Private Key)</Text>
              <Text style={styles.secretSectionDescription}>
                この秘密鍵でウォレットにアクセスできます。誰にも教えないでください。
              </Text>
              <View style={styles.secretBox}>
                <Text style={styles.secretText} selectable>{privateKey}</Text>
              </View>
              <TouchableOpacity
                style={styles.secretCopyButton}
                onPress={() => {
                  Alert.alert('コピー', '秘密鍵をコピーしました（実際の実装ではクリップボードAPIを使用）');
                }}
              >
                <Text style={styles.secretCopyButtonText}>秘密鍵をコピー</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.secretSection}>
              <Text style={styles.secretSectionTitle}>📝 シードフレーズ (Mnemonic)</Text>
              <Text style={styles.secretSectionDescription}>
                12個の単語でウォレットを復元できます。紙に書いて安全な場所に保管してください。
              </Text>
              <View style={styles.secretBox}>
                <Text style={styles.secretText} selectable>{mnemonic}</Text>
              </View>
              <TouchableOpacity
                style={styles.secretCopyButton}
                onPress={() => {
                  Alert.alert('コピー', 'シードフレーズをコピーしました（実際の実装ではクリップボードAPIを使用）');
                }}
              >
                <Text style={styles.secretCopyButtonText}>シードフレーズをコピー</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.secretInfoBox}>
              <Text style={styles.secretInfoTitle}>💡 管理のヒント</Text>
              <View style={styles.secretInfoList}>
                <Text style={styles.secretInfoItem}>• 紙に書いて金庫や安全な場所に保管</Text>
                <Text style={styles.secretInfoItem}>• スクリーンショットは避ける（ハッキングリスク）</Text>
                <Text style={styles.secretInfoItem}>• オンラインストレージには保存しない</Text>
                <Text style={styles.secretInfoItem}>• 複数のバックアップを作成する</Text>
                <Text style={styles.secretInfoItem}>• 家族にも保管場所を伝えておく</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.secretCloseButton}
              onPress={() => {
                setShowSecretModal(false);
                setPrivateKey('');
                setMnemonic('');
              }}
            >
              <Text style={styles.secretCloseButtonText}>閉じる</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Thirdwebメール認証モーダル */}
      <Modal
        visible={showThirdwebEmailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowThirdwebEmailModal(false);
              setThirdwebEmail('');
              setThirdwebVerificationCode('');
              setIsVerificationSent(false);
            }}>
              <X size={24} color="#7F8C8D" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Thirdwebウォレット作成</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.thirdwebEmailContainer}>
              <View style={styles.thirdwebInfoBanner}>
                <Info size={20} color="#8B5CF6" />
                <Text style={styles.thirdwebInfoText}>
                  メールアドレスで簡単にウォレットを作成できます。秘密鍵の管理は不要です。
                </Text>
              </View>

              {!isVerificationSent ? (
                <>
                  <View style={styles.thirdwebInputSection}>
                    <Text style={styles.thirdwebInputLabel}>メールアドレス</Text>
                    <TextInput
                      style={styles.thirdwebInput}
                      placeholder="your@email.com"
                      placeholderTextColor="#BDC3C7"
                      value={thirdwebEmail}
                      onChangeText={setThirdwebEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.thirdwebSendButton, (!thirdwebEmail || loadingWallet) && styles.thirdwebButtonDisabled]}
                    onPress={async () => {
                      if (!thirdwebEmail) {
                        Alert.alert('エラー', 'メールアドレスを入力してください');
                        return;
                      }
                      try {
                        setLoadingWallet(true);
                        await web3.sendThirdwebVerificationEmail(thirdwebEmail);
                        setIsVerificationSent(true);
                        Alert.alert('成功', '確認コードをメールで送信しました');
                      } catch (error: any) {
                        Alert.alert('エラー', error.message || '確認コードの送信に失敗しました');
                      } finally {
                        setLoadingWallet(false);
                      }
                    }}
                    disabled={!thirdwebEmail || loadingWallet}
                  >
                    <Text style={styles.thirdwebButtonText}>
                      {loadingWallet ? '送信中...' : '確認コードを送信'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.thirdwebSuccessBanner}>
                    <Text style={styles.thirdwebSuccessText}>
                      ✅ 確認コードを {thirdwebEmail} に送信しました
                    </Text>
                  </View>

                  <View style={styles.thirdwebInputSection}>
                    <Text style={styles.thirdwebInputLabel}>確認コード</Text>
                    <TextInput
                      style={styles.thirdwebInput}
                      placeholder="6桁の確認コード"
                      placeholderTextColor="#BDC3C7"
                      value={thirdwebVerificationCode}
                      onChangeText={setThirdwebVerificationCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.thirdwebVerifyButton, (!thirdwebVerificationCode || loadingWallet) && styles.thirdwebButtonDisabled]}
                    onPress={async () => {
                      if (!thirdwebVerificationCode) {
                        Alert.alert('エラー', '確認コードを入力してください');
                        return;
                      }
                      try {
                        setLoadingWallet(true);
                        const result = await web3.verifyAndConnectThirdwebWallet(thirdwebVerificationCode, thirdwebEmail);
                        Alert.alert(
                          '成功',
                          `Thirdwebウォレットが作成されました！\n\nアドレス: ${result.address.slice(0, 8)}...${result.address.slice(-6)}`,
                          [{
                            text: 'OK',
                            onPress: () => {
                              setShowThirdwebEmailModal(false);
                              setShowWalletModal(false);
                              setThirdwebEmail('');
                              setThirdwebVerificationCode('');
                              setIsVerificationSent(false);
                            }
                          }]
                        );
                      } catch (error: any) {
                        Alert.alert('エラー', error.message || 'ウォレットの作成に失敗しました');
                      } finally {
                        setLoadingWallet(false);
                      }
                    }}
                    disabled={!thirdwebVerificationCode || loadingWallet}
                  >
                    <Text style={styles.thirdwebButtonText}>
                      {loadingWallet ? '確認中...' : 'ウォレットを作成'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.thirdwebResendButton}
                    onPress={async () => {
                      try {
                        setLoadingWallet(true);
                        await web3.sendThirdwebVerificationEmail(thirdwebEmail);
                        Alert.alert('成功', '確認コードを再送信しました');
                      } catch (error: any) {
                        Alert.alert('エラー', error.message || '確認コードの再送信に失敗しました');
                      } finally {
                        setLoadingWallet(false);
                      }
                    }}
                    disabled={loadingWallet}
                  >
                    <Text style={styles.thirdwebResendButtonText}>確認コードを再送信</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.thirdwebBenefitsBox}>
                <Text style={styles.thirdwebBenefitsTitle}>💡 Thirdwebウォレットの特徴</Text>
                <View style={styles.thirdwebBenefitsList}>
                  <Text style={styles.thirdwebBenefitItem}>• メールアドレスだけで簡単作成</Text>
                  <Text style={styles.thirdwebBenefitItem}>• 秘密鍵の管理不要</Text>
                  <Text style={styles.thirdwebBenefitItem}>• ガススポンサー対応予定</Text>
                  <Text style={styles.thirdwebBenefitItem}>• 複数デバイスで利用可能</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
      </LinearGradient>
    </>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  editButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  introContainer: {
    width: '100%',
    marginTop: 16,
  },
  introLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7F8C8D',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
  },
  statValue: {
    fontSize: 20,
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
  statHint: {
    fontSize: 10,
    color: '#95A5A6',
    textAlign: 'center' as const,
    marginTop: 2,
  },
  onChainSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  onChainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onChainGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  onChainCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  onChainCardGradient: {
    padding: 20,
    alignItems: 'center',
  },
  onChainValue: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: 'white',
    marginTop: 8,
  },
  onChainLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 4,
  },
  onChainSublabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  onChainWalletInfo: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  onChainWalletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  onChainWalletLabel: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  onChainWalletValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  polygonBadge: {
    backgroundColor: '#8247E5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  polygonBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'white',
  },
  polygonScanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    marginTop: 4,
  },
  polygonScanLinkText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8B5CF6',
  },

  mintButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mintButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 48,
  },
  mintBPButton: {
    backgroundColor: '#C44569',
  },
  mintButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: 'white',
  },
  txHistorySection: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  txHistoryTitle: {
    fontSize: 15,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 12,
  },
  txHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  txHistoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  txTypeBP: {
    backgroundColor: 'rgba(196, 69, 105, 0.12)',
  },
  txTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#2C3E50',
  },
  txHashText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontFamily: 'monospace' as const,
  },
  txHistoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txTimeText: {
    fontSize: 11,
    color: '#95A5A6',
  },
  menuContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuText: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 12,
  },
  logoutItem: {
    marginTop: 8,
  },
  logoutText: {
    color: '#E74C3C',
  },
  directLogoutItem: {
    marginTop: 4,
    backgroundColor: '#FFF5F5',
  },
  testQRItem: {
    marginTop: 4,
    backgroundColor: '#F0FFF4',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  testQRText: {
    color: '#4CAF50',
    fontWeight: '600' as const,
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: 50,
  },
  statusContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  approvedBadge: {
    backgroundColor: '#E8F5E8',
  },
  pendingBadge: {
    backgroundColor: '#FFF3CD',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  approvedText: {
    color: '#4CAF50',
  },
  pendingText: {
    color: '#FF9800',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  placeholder: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  imagePickerPreview: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 200,
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
    fontSize: 14,
    color: '#7F8C8D',
  },
  workplaceNameLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  settingSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 12,
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
    fontSize: 16,
    color: '#2C3E50',
  },
  infoValue: {
    fontSize: 16,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  qrModalContent: {
    paddingBottom: 40,
  },
  qrCodeSection: {
    alignItems: 'center',
  },
  qrCodeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  qrCodeDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  qrCodeWrapper: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  qrInfoBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  qrInfoLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
    fontWeight: '500',
  },
  qrInfoValue: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
  },
  qrBenefitSection: {
    backgroundColor: 'rgba(255, 105, 180, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
  },
  qrBenefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 12,
  },
  qrBenefitList: {
    gap: 8,
  },
  qrBenefitItem: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  qrDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 32,
    width: '100%',
  },
  qrInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.3)',
  },
  qrInfoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF69B4',
  },
  subscriptionCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  subscriptionGradient: {
    padding: 24,
  },
  subscriptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: 'white',
    marginBottom: 4,
  },
  subscriptionExpiry: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  subscriptionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  subscriptionActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  referralCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  referralGradient: {
    padding: 24,
  },
  referralContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  referralInfo: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: 'white',
    marginBottom: 4,
  },
  referralSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  btDistributionContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  btDistributionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  btDistributionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '47%',
  },
  btDistributionValue: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginTop: 8,
    marginBottom: 4,
  },
  btDistributionLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center' as const,
  },
  btDistributionSummary: {
    backgroundColor: 'rgba(135, 206, 235, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
  },
  btDistributionSummaryLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  btDistributionSummaryValue: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#87CEEB',
  },
  btDiscardedInfo: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.2)',
  },
  btDiscardedLabel: {
    fontSize: 13,
    color: '#E74C3C',
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
  walletConnectedItem: {
    backgroundColor: '#F0FFF4',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  walletConnectedText: {
    color: '#4CAF50',
    fontWeight: '600' as const,
  },
  walletConnectedCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  walletConnectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  walletConnectedTitle: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: '#4CAF50',
  },
  walletBeginnerBanner: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  walletBeginnerIcon: {
    marginTop: 2,
  },
  walletBeginnerText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  walletAddressSection: {
    marginBottom: 20,
  },
  walletAddressLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  walletAddressTouchable: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  walletAddress: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#2C3E50',
    fontFamily: 'monospace' as const,
    textAlign: 'center' as const,
  },
  walletAddressHint: {
    fontSize: 12,
    color: '#95A5A6',
    textAlign: 'center' as const,
    marginTop: 4,
  },
  walletAddressFull: {
    fontSize: 12,
    color: '#7F8C8D',
    fontFamily: 'monospace' as const,
  },
  walletBalanceSection: {
    marginBottom: 20,
  },
  walletBalanceLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#4CAF50',
  },
  walletBalanceHint: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 4,
  },
  walletNetworkSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  walletNetworkText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600' as const,
    flex: 1,
  },
  walletNetworkBadge: {
    backgroundColor: '#E1BEE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  walletNetworkBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8B5CF6',
  },
  walletFaucetCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#87CEEB',
  },
  walletFaucetTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 12,
  },
  walletFaucetDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 16,
  },
  walletFaucetButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
  },
  walletFaucetButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  walletLoadingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  walletLoadingTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  walletLoadingDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  walletSetupGuide: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#87CEEB',
  },
  walletSetupTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  walletSetupDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  walletOptionsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  walletOptionsDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  walletOptionsDividerText: {
    fontSize: 12,
    color: '#95A5A6',
    marginHorizontal: 12,
    fontWeight: '600' as const,
  },
  walletOption: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  walletOptionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF69B4',
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    lineHeight: 28,
  },
  walletOptionContent: {
    flex: 1,
  },
  walletOptionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  walletOptionDescription: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  walletMetaMaskMobileNotice: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  walletMetaMaskMobileText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  walletActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  walletActionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  walletSecondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FF69B4',
  },
  walletDangerButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E74C3C',
  },
  walletDangerButtonText: {
    color: '#E74C3C',
  },
  walletInfoButton: {
    backgroundColor: '#FF9800',
  },
  walletGenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  walletGenerateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  walletGenerateButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF69B4',
  },
  walletGenerateButtonTextSecondary: {
    color: '#FF69B4',
  },
  secretWarningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  secretWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#C62828',
    lineHeight: 20,
    fontWeight: '600' as const,
  },
  secretSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secretSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 8,
  },
  secretSectionDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 16,
  },
  secretBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  secretText: {
    fontSize: 12,
    color: '#495057',
    lineHeight: 18,
    fontFamily: 'monospace' as const,
  },
  secretCopyButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center' as const,
  },
  secretCopyButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  secretInfoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  secretInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#1976D2',
    marginBottom: 12,
  },
  secretInfoList: {
    gap: 8,
  },
  secretInfoItem: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  secretCloseButton: {
    backgroundColor: '#7F8C8D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
  },
  secretCloseButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  walletInfoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  walletInfoTitle: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  walletInfoDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  walletConnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  walletConnectButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  walletQRButton: {
    backgroundColor: '#4CAF50',
  },
  walletGuideSection: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  walletGuideTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#8B5CF6',
    marginBottom: 12,
  },
  walletGuideList: {
    gap: 8,
  },
  walletGuideItem: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  qrScannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  qrScannerHeader: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  qrScannerCloseButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  qrScannerTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: 'white',
    textAlign: 'center' as const,
  },
  qrScannerCamera: {
    flex: 1,
  },
  qrScannerOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  qrScannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 4,
    borderColor: 'white',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  qrScannerInstruction: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center' as const,
    marginTop: 32,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  thirdwebWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  thirdwebWalletButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#8B5CF6',
  },
  thirdwebEmailContainer: {
    padding: 20,
  },
  thirdwebInfoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  thirdwebInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  thirdwebInputSection: {
    marginBottom: 20,
  },
  thirdwebInputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 8,
  },
  thirdwebInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  thirdwebSendButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  thirdwebButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  thirdwebButtonDisabled: {
    opacity: 0.5,
  },
  thirdwebSuccessBanner: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  thirdwebSuccessText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  thirdwebVerifyButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  thirdwebResendButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  thirdwebResendButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8B5CF6',
  },
  thirdwebBenefitsBox: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
  },
  thirdwebBenefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 12,
  },
  thirdwebBenefitsList: {
    gap: 8,
  },
  thirdwebBenefitItem: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
});