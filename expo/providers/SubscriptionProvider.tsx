import createContextHook from '@nkzw/create-context-hook';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthProvider';
import { getDb } from '@/lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';

export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'inactive' | 'expired' | 'cancelled';

export interface Subscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startDate?: string;
  endDate?: string;
  price: number;
  autoRenew: boolean;
}

export interface SubscriptionFeature {
  name: string;
  included: boolean;
  description?: string;
}

export interface HighlightStatus {
  isActive: boolean;
  activatedAt?: string;
  expiresAt?: string;
  lastUsedDate?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: SubscriptionFeature[];
}

interface SubscriptionState {
  subscription: Subscription;
  isLoading: boolean;
  plans: SubscriptionPlan[];
  highlightStatus: HighlightStatus;
  subscribe: (planId: string, userId: string, userRole: string) => Promise<void>;
  updateHairdresserInviteBonus: (userId: string, additionalSlots: number) => Promise<void>;
  cancelSubscription: (userId: string) => Promise<void>;
  restoreSubscription: (userId: string) => Promise<void>;
  checkSubscriptionStatus: (userId: string) => Promise<Subscription>;
  activateHighlight: (userId: string) => Promise<void>;
  canUseHighlight: () => boolean;
}

const getSubscriptionPlans = (userRole: string): SubscriptionPlan[] => {
  if (userRole === 'customer') {
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
        description: '美容師招待枠と広告非表示で快適に利用',
        features: [
          { name: '基本的なマッチング機能', included: true },
          { name: '美容師招待枠（+3名）', included: true },
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
};

export const [SubscriptionProvider, useSubscription] = createContextHook((): SubscriptionState => {
  const { user } = useAuth();
  
  const [subscription, setSubscription] = useState<Subscription>({
    tier: 'free',
    status: 'inactive',
    price: 0,
    autoRenew: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('customer');
  const [highlightStatus, setHighlightStatus] = useState<HighlightStatus>({
    isActive: false,
  });

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const db = getDb();
    const userDocRef = doc(db, 'users', user.id);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserRole(data.role || 'customer');
        
        setSubscription({
          tier: data.subscriptionTier || 'free',
          status: data.subscriptionStatus || 'inactive',
          startDate: data.subscriptionStartDate,
          endDate: data.subscriptionEndDate,
          price: data.subscriptionPrice || 0,
          autoRenew: data.subscriptionAutoRenew || false,
        });

        if (data.highlightStatus) {
          setHighlightStatus(data.highlightStatus);
        }
        
      }
    }, (error) => {
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const updateHairdresserInviteBonus = useCallback(async (userId: string, additionalSlots: number) => {
    
    try {
      const db = getDb();
      const referralDocRef = doc(db, 'referrals', userId);
      
      const referralDoc = await getDoc(referralDocRef);
      if (referralDoc.exists()) {
        const currentCount = referralDoc.data().hairdresserInviteCount || 0;
        await updateDoc(referralDocRef, {
          hairdresserInviteCount: currentCount + additionalSlots,
        });
      }
    } catch (error) {
    }
  }, []);

  const subscribe = useCallback(async (planId: string, userId: string, role: string) => {
    setIsLoading(true);
    setUserRole(role);
    
    try {
      const plans = getSubscriptionPlans(role);
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        throw new Error('プランが見つかりません');
      }

      if (plan.id === 'free') {
        throw new Error('無料プランは自動的に適用されます');
      }

      const mockPaymentSuccess = await new Promise<boolean>((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 2000);
      });

      if (!mockPaymentSuccess) {
        throw new Error('支払い処理に失敗しました');
      }

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const newSubscription: Subscription = {
        tier: planId as SubscriptionTier,
        status: 'active',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        price: plan.price,
        autoRenew: true,
      };

      const db = getDb();
      const userDocRef = doc(db, 'users', userId);
      
      await updateDoc(userDocRef, {
        subscriptionTier: newSubscription.tier,
        subscriptionStatus: newSubscription.status,
        subscriptionStartDate: newSubscription.startDate,
        subscriptionEndDate: newSubscription.endDate,
        subscriptionPrice: newSubscription.price,
        subscriptionAutoRenew: newSubscription.autoRenew,
      });

      setSubscription(newSubscription);
      

      if (role === 'customer') {
        await updateHairdresserInviteBonus(userId, 3);
      }

      Alert.alert(
        '登録完了',
        `${plan.name}に登録しました。\n次回更新日: ${endDate.toLocaleDateString('ja-JP')}`
      );
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateHairdresserInviteBonus]);

  const cancelSubscription = useCallback(async (userId: string) => {
    setIsLoading(true);
    
    try {
      const db = getDb();
      const userDocRef = doc(db, 'users', userId);
      
      await updateDoc(userDocRef, {
        subscriptionTier: 'free',
        subscriptionStatus: 'inactive',
        subscriptionPrice: 0,
        subscriptionAutoRenew: false,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
      });

      const freeSubscription: Subscription = {
        tier: 'free',
        status: 'inactive',
        price: 0,
        autoRenew: false,
      };

      setSubscription(freeSubscription);
      
      Alert.alert(
        'キャンセル完了',
        '定期購読をキャンセルしました。無料プランに切り替わります。'
      );
    } catch (error) {
      Alert.alert('エラー', 'キャンセルに失敗しました');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restoreSubscription = useCallback(async (userId: string) => {
    setIsLoading(true);
    
    try {
      const db = getDb();
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        
        if (data.subscriptionEndDate) {
          const endDate = new Date(data.subscriptionEndDate);
          if (endDate > new Date()) {
            await updateDoc(userDocRef, {
              subscriptionStatus: 'active',
              subscriptionAutoRenew: true,
            });
            
            setSubscription({
              tier: data.subscriptionTier,
              status: 'active',
              startDate: data.subscriptionStartDate,
              endDate: data.subscriptionEndDate,
              price: data.subscriptionPrice,
              autoRenew: true,
            });
            
            Alert.alert('復元完了', '定期購読を復元しました。');
            return;
          }
        }
      }
      
      Alert.alert('復元できません', '有効な定期購読が見つかりませんでした。');
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkSubscriptionStatus = useCallback(async (userId: string): Promise<Subscription> => {
    
    try {
      const db = getDb();
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        
        if (data.subscriptionEndDate) {
          const endDate = new Date(data.subscriptionEndDate);
          if (endDate < new Date() && data.subscriptionStatus === 'active') {
            await updateDoc(userDocRef, {
              subscriptionStatus: 'expired',
              subscriptionTier: 'free',
            });
            
            const expiredSubscription: Subscription = {
              tier: 'free',
              status: 'expired',
              startDate: data.subscriptionStartDate,
              endDate: data.subscriptionEndDate,
              price: 0,
              autoRenew: false,
            };
            
            setSubscription(expiredSubscription);
            
            Alert.alert('期間終了', '定期購読の期間が終了しました。無料プランに切り替わりました。');
            
            return expiredSubscription;
          }
        }
        
        return {
          tier: data.subscriptionTier || 'free',
          status: data.subscriptionStatus || 'inactive',
          startDate: data.subscriptionStartDate,
          endDate: data.subscriptionEndDate,
          price: data.subscriptionPrice || 0,
          autoRenew: data.subscriptionAutoRenew || false,
        };
      }
      
      return subscription;
    } catch (error) {
      return subscription;
    }
  }, [subscription]);

  const activateHighlight = useCallback(async (userId: string) => {
    
    if (subscription.tier !== 'premium') {
      Alert.alert('エラー', 'ハイライト機能はプレミアムプラン限定です');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (highlightStatus.lastUsedDate === today) {
      Alert.alert('エラー', 'ハイライト機能は1ヶ月に1回のみ利用可能です');
      return;
    }

    try {
      const activatedAt = new Date();
      const expiresAt = new Date(activatedAt.getTime() + 6 * 60 * 60 * 1000);

      const newHighlightStatus: HighlightStatus = {
        isActive: true,
        activatedAt: activatedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        lastUsedDate: today,
      };

      const db = getDb();
      const userDocRef = doc(db, 'users', userId);
      
      await updateDoc(userDocRef, {
        highlightStatus: newHighlightStatus,
      });

      setHighlightStatus(newHighlightStatus);

      Alert.alert(
        'ハイライト開始',
        `あなたのプロフィールが6時間、顧客の検索画面の最上位に表示されます。\n\n終了時刻: ${expiresAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
      );
    } catch (error) {
      Alert.alert('エラー', 'ハイライトの起動に失敗しました');
    }
  }, [subscription.tier, highlightStatus.lastUsedDate]);

  const canUseHighlight = useCallback(() => {
    if (subscription.tier !== 'premium') return false;
    const today = new Date().toISOString().split('T')[0];
    return highlightStatus.lastUsedDate !== today;
  }, [subscription.tier, highlightStatus.lastUsedDate]);

  useEffect(() => {
    const checkHighlightExpiration = async () => {
      if (highlightStatus.isActive && highlightStatus.expiresAt) {
        const now = new Date();
        const expiresAt = new Date(highlightStatus.expiresAt);
        
        if (now > expiresAt) {
          const expiredStatus: HighlightStatus = {
            ...highlightStatus,
            isActive: false,
          };
          setHighlightStatus(expiredStatus);
        }
      }
    };

    const interval = setInterval(checkHighlightExpiration, 60000);
    checkHighlightExpiration();

    return () => clearInterval(interval);
  }, [highlightStatus.isActive, highlightStatus.expiresAt]);

  const plans = useMemo(() => getSubscriptionPlans(userRole), [userRole]);

  return {
    subscription,
    isLoading,
    plans,
    highlightStatus,
    subscribe,
    cancelSubscription,
    restoreSubscription,
    checkSubscriptionStatus,
    updateHairdresserInviteBonus,
    activateHighlight,
    canUseHighlight,
  };
});
