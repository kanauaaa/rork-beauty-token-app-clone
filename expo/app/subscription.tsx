import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { X, Check, Crown, Sparkles, Calendar, CreditCard, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import type { SubscriptionPlan } from '@/providers/SubscriptionProvider';

function getPlansForRole(role: 'hairdresser' | 'customer' | 'admin'): SubscriptionPlan[] {
  if (role === 'admin') {
    return [
      {
        id: 'free',
        name: '無料プラン',
        price: 0,
        description: '基本機能をご利用いただけます',
        features: [
          { name: '管理機能', included: true },
        ],
      },
    ];
  }
  if (role === 'customer') {
    return [
      {
        id: 'free',
        name: '無料プラン',
        price: 0,
        description: '基本機能をご利用いただけます',
        features: [
          { name: '基本的なマッチング機能', included: true },
          { name: '広告表示あり', included: true },
          { name: '美容師招待枠', included: false },
          { name: '広告非表示', included: false },
        ],
      },
      {
        id: 'premium',
        name: 'プレミアムプラン',
        price: 500,
        description: '美容師招待枠と広告非表示、手数料免除で快適に利用',
        features: [
          { name: '基本的なマッチング機能', included: true },
          { name: '美容師招待枠（+3名）', included: true },
          { name: 'マッチング手数料免除（月1回）', included: true },
          { name: '広告非表示', included: true },
        ],
      },
    ];
  }

  return [
    {
      id: 'free',
      name: '無料プラン',
      price: 0,
      description: '基本機能をご利用いただけます',
      features: [
        { name: '基本的なマッチング機能', included: true },
        { name: 'カルテ閲覧期間：24時間', included: true },
        { name: '広告表示あり', included: true },
        { name: 'カルテ永久保存', included: false },
        { name: 'ハイライト機能', included: false },
        { name: '広告非表示', included: false },
      ],
    },
    {
      id: 'premium',
      name: 'プレミアムプラン',
      price: 500,
      description: 'カルテ永久保存とハイライト機能',
      features: [
        { name: '基本的なマッチング機能', included: true },
        { name: 'カルテ永久保存・閲覧', included: true },
        { name: '自動カルテ更新', included: true },
        { name: 'ハイライト機能（月1回6時間）', included: true },
        { name: '広告非表示', included: true },
      ],
    },
  ];
}

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const { subscription, subscribe, cancelSubscription, restoreSubscription, checkSubscriptionStatus, isLoading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const userRole = user?.role || 'customer';
  const plans = useMemo(() => getPlansForRole(userRole), [userRole]);

  useEffect(() => {
    if (user) {

      checkSubscriptionStatus(user.id);
    }
  }, [user, checkSubscriptionStatus]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>ユーザー情報が見つかりません</Text>
      </View>
    );
  }

  const handleSubscribe = async (planId: string) => {
    if (isLoading || processingPlan) return;
    
    try {
      setProcessingPlan(planId);
      await subscribe(planId, user.id, user.role);
    } catch (error) {

      Alert.alert('エラー', error instanceof Error ? error.message : '定期購読に失敗しました');
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (isLoading) return;
    
    Alert.alert(
      '定期購読のキャンセル',
      '定期購読をキャンセルしますか？期間終了日まで引き続きご利用いただけます。',
      [
        { text: 'キャンセルしない', style: 'cancel' },
        {
          text: 'キャンセルする',
          style: 'destructive',
          onPress: async () => {
            try {

              await cancelSubscription(user.id);
            } catch (error) {

              Alert.alert('エラー', 'キャンセルに失敗しました');
            }
          },
        },
      ]
    );
  };

  const handleRestoreSubscription = async () => {
    try {
      await restoreSubscription(user.id);
    } catch (error) {

      Alert.alert('エラー', '復元に失敗しました');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isPremium = subscription.tier === 'premium' && subscription.status === 'active';
  const isActive = subscription.status === 'active';
  const isCancelled = subscription.status === 'cancelled';

  return (
    <LinearGradient
      colors={['#FFE5F1', '#E8F4FD', '#F0F8FF']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <X size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.title}>サブスクリプション</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {isPremium && (
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanHeader}>
              <Crown size={32} color="#D4AF37" />
              <View style={styles.currentPlanInfo}>
                <Text style={styles.currentPlanTitle}>現在のプラン</Text>
                <Text style={styles.currentPlanName}>プレミアムプラン</Text>
              </View>
            </View>

            <View style={styles.currentPlanDetails}>
              <View style={styles.detailRow}>
                <Calendar size={16} color="#7F8C8D" />
                <Text style={styles.detailText}>
                  開始日: {formatDate(subscription.startDate)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Calendar size={16} color="#7F8C8D" />
                <Text style={styles.detailText}>
                  次回更新日: {formatDate(subscription.endDate)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <CreditCard size={16} color="#7F8C8D" />
                <Text style={styles.detailText}>
                  月額: ¥{subscription.price}
                </Text>
              </View>
            </View>

            {subscription.autoRenew && (
              <Text style={styles.autoRenewText}>
                自動更新が有効です
              </Text>
            )}

            {isCancelled && (
              <View style={styles.cancelledBanner}>
                <Text style={styles.cancelledText}>
                  定期購読はキャンセルされています。{formatDate(subscription.endDate)}まで引き続きご利用いただけます。
                </Text>
              </View>
            )}

            <View style={styles.currentPlanActions}>
              {!isCancelled && (
                <TouchableOpacity
                  style={[styles.cancelButton, isLoading && styles.disabledButton]}
                  onPress={handleCancelSubscription}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#E74C3C" />
                  ) : (
                    <Text style={styles.cancelButtonText}>定期購読をキャンセル</Text>
                  )}
                </TouchableOpacity>
              )}
              {isCancelled && (
                <TouchableOpacity
                  style={[styles.restoreButton, isLoading && styles.disabledButton]}
                  onPress={handleRestoreSubscription}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.restoreButtonText}>定期購読を復元</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>プランを選択</Text>

        {plans.map((plan) => {
          const isCurrentPlan = plan.id === subscription.tier;
          const isSelected = selectedPlan === plan.id;
          const isProcessing = processingPlan === plan.id;
          const isPremiumPlan = plan.id === 'premium';

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                isCurrentPlan && styles.currentPlanBorder,
                isSelected && styles.selectedPlanCard,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
              disabled={isCurrentPlan}
            >
              <View style={styles.planHeader}>
                <View style={styles.planTitleRow}>
                  {isPremiumPlan && <Crown size={24} color="#D4AF37" />}
                  <View style={styles.planTitleContainer}>
                    <Text style={[styles.planName, isPremiumPlan && styles.premiumPlanName]}>
                      {plan.name}
                    </Text>
                    {isCurrentPlan && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>現在のプラン</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.planPrice}>¥{plan.price}</Text>
                  {plan.price > 0 && <Text style={styles.planPeriod}>/月</Text>}
                </View>
              </View>

              <Text style={styles.planDescription}>{plan.description}</Text>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    {feature.included ? (
                      <Check size={16} color="#4CAF50" />
                    ) : (
                      <X size={16} color="#E0E0E0" />
                    )}
                    <Text
                      style={[
                        styles.featureText,
                        !feature.included && styles.featureTextDisabled,
                      ]}
                    >
                      {feature.name}
                    </Text>
                  </View>
                ))}
              </View>

              {!isCurrentPlan && plan.price > 0 && (
                <TouchableOpacity
                  style={[
                    styles.subscribeButton,
                    isSelected && styles.selectedSubscribeButton,
                    isProcessing && styles.processingButton,
                  ]}
                  onPress={() => handleSubscribe(plan.id)}
                  disabled={isProcessing || isLoading}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text style={styles.subscribeButtonText}>
                        このプランに登録
                      </Text>
                      <ArrowRight size={20} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.benefitsSection}>
          <View style={styles.benefitsHeader}>
            <Sparkles size={24} color="#FF69B4" />
            <Text style={styles.benefitsTitle}>プレミアムプランの特典詳細</Text>
          </View>

          <View style={styles.benefitsList}>
            {userRole === 'hairdresser' ? (
              <>
                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Check size={20} color="#FF69B4" />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>カルテ永久保存・閲覧</Text>
                    <Text style={styles.benefitDescription}>
                      担当した顧客のカルテを永久に保存し、いつでも確認できます。無料プランは24時間のみ閲覧可能です。
                    </Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Check size={20} color="#FF69B4" />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>自動カルテ更新</Text>
                    <Text style={styles.benefitDescription}>
                      顧客が他の美容室で施術を受けた場合でも、新しいカルテが自動的に追加されます。
                    </Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Check size={20} color="#FF69B4" />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>ハイライト機能（月1回6時間）</Text>
                    <Text style={styles.benefitDescription}>
                      月に1回、自分のプロフィールを6時間顧客の検索画面の最上位に掲載できます。タイミングはあなたが選べます。
                    </Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Check size={20} color="#FF69B4" />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>広告非表示</Text>
                    <Text style={styles.benefitDescription}>
                      快適な体験のため、すべての広告が非表示になります。
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Check size={20} color="#FF69B4" />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>美容師招待枠（+3名）</Text>
                    <Text style={styles.benefitDescription}>
                      お気に入りの美容師を追加で3名招待できます。無料プランの招待枠に加えて、さらに3名分の枠が追加されます。
                    </Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Check size={20} color="#FF69B4" />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>マッチング手数料免除（月1回）</Text>
                    <Text style={styles.benefitDescription}>
                      通常、マッチング成功時に300円の手数料がかかりますが、プレミアム会員は月1回免除されます。また、直前キャンセルの場合は300円のキャンセル料がかかります（サブスクの有無に関わらず）。
                    </Text>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Check size={20} color="#FF69B4" />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>広告非表示</Text>
                    <Text style={styles.benefitDescription}>
                      快適な体験のため、すべての広告が非表示になります。
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            • 定期購読は自動更新されます{'\n'}
            • いつでもキャンセル可能です{'\n'}
            • キャンセル後も期間終了日まで利用可能です
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  currentPlanCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  currentPlanInfo: {
    marginLeft: 16,
  },
  currentPlanTitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  currentPlanDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  autoRenewText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500' as const,
    marginBottom: 16,
  },
  cancelledBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  cancelledText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
  currentPlanActions: {
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#E74C3C',
  },
  restoreButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currentPlanBorder: {
    borderColor: '#D4AF37',
  },
  selectedPlanCard: {
    borderColor: '#FF69B4',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  premiumPlanName: {
    color: '#D4AF37',
  },
  currentBadge: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: 'bold' as const,
    color: 'white',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  planPeriod: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
    lineHeight: 20,
  },
  featuresContainer: {
    gap: 8,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
  },
  featureTextDisabled: {
    color: '#B0B0B0',
    textDecorationLine: 'line-through' as const,
  },
  subscribeButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  selectedSubscribeButton: {
    backgroundColor: '#FF1493',
  },
  processingButton: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  benefitsSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2C3E50',
  },
  benefitsList: {
    gap: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    gap: 12,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  footerNote: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
  },
  footerNoteText: {
    fontSize: 12,
    color: '#7F8C8D',
    lineHeight: 18,
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: 50,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
