import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { getDb } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface ReferredHairdresser {
  hairdresserId: string;
  hairdresserName: string;
  referredAt: string;
  totalBTEarned: number;
  bonusReceived: number;
}

export interface ReferralData {
  customerId: string;
  customerName: string;
  referredCustomers: string[];
  hairdresserInviteCount: number;
  referredHairdressers: ReferredHairdresser[];
  totalBonusEarned: number;
}

interface ReferralState {
  referralData: ReferralData | null;
  isLoading: boolean;
  addReferredCustomer: (customerId: string, customerName: string) => Promise<void>;
  addReferredHairdresser: (hairdresserId: string, hairdresserName: string) => Promise<void>;
  canInviteHairdresser: () => boolean;
  getReferralQRData: () => string;
}

export const [ReferralProvider, useReferral] = createContextHook((): ReferralState => {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || user.role !== 'customer') {
      setIsLoading(false);
      return;
    }

    const db = getDb();
    const referralDocRef = doc(db, 'referrals', user.id);

    const initializeReferralDoc = async () => {
      const referralDoc = await getDoc(referralDocRef);
      
      if (!referralDoc.exists()) {
        const initialData: ReferralData = {
          customerId: user.id,
          customerName: user.name,
          referredCustomers: [],
          hairdresserInviteCount: 1,
          referredHairdressers: [],
          totalBonusEarned: 0,
        };
        
        await setDoc(referralDocRef, {
          ...initialData,
          createdAt: serverTimestamp(),
        });
      }
    };

    initializeReferralDoc();

    const unsubscribe = onSnapshot(referralDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        const mapped: ReferralData = {
          customerId: data.customerId,
          customerName: data.customerName,
          referredCustomers: data.referredCustomers || [],
          hairdresserInviteCount: data.hairdresserInviteCount || 1,
          referredHairdressers: (data.referredHairdressers || []).map((h: any) => ({
            hairdresserId: h.hairdresserId,
            hairdresserName: h.hairdresserName,
            referredAt: h.referredAt instanceof Timestamp ? h.referredAt.toDate().toISOString() : h.referredAt,
            totalBTEarned: h.totalBTEarned || 0,
            bonusReceived: h.bonusReceived || 0,
          })),
          totalBonusEarned: data.totalBonusEarned || 0,
        };
        
        setReferralData(mapped);
      }
      setIsLoading(false);
    }, (error) => {
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const addReferredCustomer = useCallback(async (customerId: string, customerName: string) => {
    if (!referralData || !user) return;

    try {
      const db = getDb();
      const referralDocRef = doc(db, 'referrals', user.id);
      
      await updateDoc(referralDocRef, {
        referredCustomers: arrayUnion(customerId),
        hairdresserInviteCount: referralData.hairdresserInviteCount + 1,
      });
      
    } catch (error) {
      throw error;
    }
  }, [referralData, user]);

  const addReferredHairdresser = useCallback(async (hairdresserId: string, hairdresserName: string) => {
    if (!referralData || !user) return;

    if (referralData.hairdresserInviteCount <= 0) {
      throw new Error('美容師への招待可能人数がありません');
    }

    try {
      const db = getDb();
      const referralDocRef = doc(db, 'referrals', user.id);
      
      const newHairdresser: ReferredHairdresser = {
        hairdresserId,
        hairdresserName,
        referredAt: new Date().toISOString(),
        totalBTEarned: 0,
        bonusReceived: 0,
      };

      await updateDoc(referralDocRef, {
        referredHairdressers: arrayUnion(newHairdresser),
        hairdresserInviteCount: referralData.hairdresserInviteCount - 1,
      });
      
    } catch (error) {
      throw error;
    }
  }, [referralData, user]);

  const canInviteHairdresser = useCallback(() => {
    return referralData ? referralData.hairdresserInviteCount > 0 : false;
  }, [referralData]);

  const getReferralQRData = useCallback(() => {
    if (!user) return '';
    
    return JSON.stringify({
      type: 'customer_referral',
      referrerId: user.id,
      referrerName: user.name,
      timestamp: new Date().toISOString(),
    });
  }, [user]);

  return {
    referralData,
    isLoading,
    addReferredCustomer,
    addReferredHairdresser,
    canInviteHairdresser,
    getReferralQRData,
  };
});
