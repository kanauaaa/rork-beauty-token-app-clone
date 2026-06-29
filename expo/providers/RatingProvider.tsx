import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import { getDb } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  increment,
} from 'firebase/firestore';

export interface RatingCategory {
  id: string;
  name: string;
  rating: number;
  btAmount: number;
}

export interface Assistant {
  name: string;
  selected: boolean;
}

export interface Rating {
  id: string;
  customerId: string;
  customerName: string;
  hairdresserId: string;
  hairdresserName: string;
  paidAmount: number;
  totalBT: number;
  categories: RatingCategory[];
  assistants: Assistant[];
  btDiscarded: number;
  comment: string;
  createdAt: string;
  btReflected?: boolean;
  photoUrl?: string;
  isCustomerVerified?: boolean;
}

export interface BTDistribution {
  cut: number;
  color: number;
  perm: number;
  straightening: number;
  extensions: number;
  massage: number;
  service: number;
  timeManagement: number;
  assistant: number;
  discarded: number;
  total: number;
}

export interface PendingBP {
  id: string;
  hairdresserId: string;
  hairdresserName: string;
  hairdresserWalletAddress?: string;
  customerId: string;
  customerName: string;
  customerWalletAddress?: string;
  ratingId: string;
  categories: RatingCategory[];
  totalBT: number;
  status: 'pending' | 'processing' | 'minted' | 'failed';
  txHash?: string;
  createdAt: string;
  isCustomerVerified?: boolean;
}

export interface PendingBTDistribution {
  cut: number;
  color: number;
  perm: number;
  straightening: number;
  extensions: number;
  massage: number;
  service: number;
  timeManagement: number;
  assistant: number;
  total: number;
}

interface RatingState {
  ratings: Rating[];
  pendingBPs: PendingBP[];
  isLoading: boolean;
  addRating: (ratingData: Omit<Rating, 'id' | 'createdAt'>) => Promise<void>;
  getRatingsByHairdresser: (hairdresserId: string) => Rating[];
  getRatingsByCustomer: (customerId: string) => Rating[];
  getBTDistribution: (hairdresserId: string) => BTDistribution;
  getPendingBTDistribution: (hairdresserId: string) => PendingBTDistribution;
  calculateBT: (amount: number) => number;
  deleteRating: (ratingId: string) => Promise<void>;
  deleteMultipleRatings: (ratingIds: string[]) => Promise<void>;
  deleteAllRatingsByCustomer: (customerId: string) => Promise<void>;
}

export const [RatingProvider, useRatings] = createContextHook((): RatingState => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [pendingBPs, setPendingBPs] = useState<PendingBP[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const db = getDb();
    const ratingsRef = collection(db, 'ratings');

    let ratingsQuery;
    if (user.role === 'hairdresser') {
      ratingsQuery = query(ratingsRef, where('hairdresserId', '==', user.id), orderBy('createdAt', 'desc'));
    } else if (user.role === 'customer') {
      ratingsQuery = query(ratingsRef, where('customerId', '==', user.id), orderBy('createdAt', 'desc'));
    } else {
      ratingsQuery = query(ratingsRef, orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(ratingsQuery, (snapshot) => {
      const ratingsData: Rating[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        ratingsData.push({
          id: doc.id,
          customerId: data.customerId,
          customerName: data.customerName,
          hairdresserId: data.hairdresserId,
          hairdresserName: data.hairdresserName,
          paidAmount: data.paidAmount,
          totalBT: data.totalBT,
          categories: data.categories || [],
          assistants: data.assistants || [],
          btDiscarded: data.btDiscarded || 0,
          comment: data.comment || '',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          btReflected: data.btReflected ?? false,
          isCustomerVerified: data.isCustomerVerified ?? false,
        });
      });
      setRatings(ratingsData);
      setIsLoading(false);
    }, (_error) => {
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user?.id || user.role !== 'hairdresser') {
      return;
    }

    const db = getDb();
    const pendingBPRef = collection(db, 'pendingBPMints');
    const pendingBPQuery = query(pendingBPRef, where('hairdresserId', '==', user.id), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(pendingBPQuery, (snapshot) => {
      const pendingBPData: PendingBP[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        pendingBPData.push({
          id: doc.id,
          hairdresserId: data.hairdresserId,
          hairdresserName: data.hairdresserName,
          customerId: data.customerId,
          customerName: data.customerName,
          ratingId: data.ratingId,
          categories: data.categories || [],
          totalBT: data.totalBT,
          status: 'pending',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          isCustomerVerified: data.isCustomerVerified ?? false,
        });
      });
      setPendingBPs(pendingBPData);
    }, (_error) => {
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const calculateBT = useCallback((amount: number): number => {
    return Math.floor(amount / 1000);
  }, []);

  const addRating = useCallback(async (ratingData: Omit<Rating, 'id' | 'createdAt'>) => {
    if (!user) {
      console.error('[RatingProvider] addRating called without user');
      throw new Error('ユーザーがログインしていません');
    }

    console.log('[RatingProvider] addRating called:', JSON.stringify({
      customerId: ratingData.customerId,
      hairdresserId: ratingData.hairdresserId,
      paidAmount: ratingData.paidAmount,
      totalBT: ratingData.totalBT,
    }));
    
    const db = getDb();
    const ratingsRef = collection(db, 'ratings');
    
    const customerDoc = await getDoc(doc(db, 'users', ratingData.customerId));
    const isCustomerVerified = customerDoc.exists() ? (customerDoc.data().isVerified || false) : false;

    const newRatingData = {
      ...ratingData,
      createdAt: serverTimestamp(),
      btReflected: false,
      isCustomerVerified,
    };

    const docRef = await addDoc(ratingsRef, newRatingData);
    console.log('[RatingProvider] Rating document created:', docRef.id);

    const visitSessionsRef = collection(db, 'visitSessions');
    const disputesRef = collection(db, 'disputes');
    
    const qPending = query(
      visitSessionsRef,
      where('customerId', '==', ratingData.customerId),
      where('hairdresserId', '==', ratingData.hairdresserId),
      where('status', '==', 'pending')
    );
    
    const qMismatch = query(
      visitSessionsRef,
      where('customerId', '==', ratingData.customerId),
      where('hairdresserId', '==', ratingData.hairdresserId),
      where('status', '==', 'amount_mismatch')
    );
    
    console.log('[RatingProvider] Querying visitSessions for customerId:', ratingData.customerId, 'hairdresserId:', ratingData.hairdresserId);
    
    let pendingSnapshot;
    let mismatchSnapshot;
    try {
      [pendingSnapshot, mismatchSnapshot] = await Promise.all([
        getDocs(qPending),
        getDocs(qMismatch)
      ]);
      console.log('[RatingProvider] visitSessions query results - pending:', pendingSnapshot.size, 'mismatch:', mismatchSnapshot.size);
    } catch (queryError: any) {
      console.error('[RatingProvider] visitSessions query failed:', queryError?.message);
      console.error('[RatingProvider] This may require a Firestore composite index. Check the error for an index creation link.');
      throw new Error(`visitSessionsクエリに失敗しました: ${queryError?.message || '不明なエラー'}`);
    }
    
    const querySnapshot = !pendingSnapshot.empty ? pendingSnapshot : mismatchSnapshot;
    
    if (querySnapshot.empty) {
      const sessionData = {
        customerId: ratingData.customerId,
        customerName: ratingData.customerName,
        hairdresserId: ratingData.hairdresserId,
        hairdresserName: ratingData.hairdresserName,
        customerAmount: ratingData.paidAmount,
        hairdresserAmount: null,
        customerEvaluated: true,
        hairdresserRecorded: false,
        status: 'pending' as const,
        ratingId: docRef.id,
        medicalRecordId: null,
        btAmount: ratingData.totalBT,
        photoUrl: ratingData.photoUrl || null,
        createdAt: serverTimestamp(),
      };
      await addDoc(visitSessionsRef, sessionData);
    } else {
      const sessionDoc = querySnapshot.docs[0];
      const sessionData = sessionDoc.data();

      if (!mismatchSnapshot.empty) {
        const disputeQuery = query(
          disputesRef,
          where('customerId', '==', ratingData.customerId),
          where('hairdresserId', '==', ratingData.hairdresserId),
          where('status', '==', 'hairdresser_response')
        );
        
        const disputeSnapshot = await getDocs(disputeQuery);
        
        if (!disputeSnapshot.empty) {
          const disputeDoc = disputeSnapshot.docs[0];
          const disputeData = disputeDoc.data();
          const proposedAmount = disputeData.hairdresserProposedAmount;
          
          
          if (ratingData.paidAmount === proposedAmount) {
            
            const userRef = doc(db, 'users', ratingData.hairdresserId);
            await updateDoc(userRef, {
              btBalance: increment(ratingData.totalBT),
            });
            
            {
              const hairdresserDocW = await getDoc(doc(db, 'users', ratingData.hairdresserId));
              const hairdresserWalletAddress = hairdresserDocW.exists() ? hairdresserDocW.data().walletAddress : undefined;
              const customerDocW = await getDoc(doc(db, 'users', ratingData.customerId));
              const customerWalletAddress = customerDocW.exists() ? customerDocW.data().walletAddress : undefined;
              
              const pendingBPRef = collection(db, 'pendingBPMints');
              await addDoc(pendingBPRef, {
                hairdresserId: ratingData.hairdresserId,
                hairdresserName: ratingData.hairdresserName,
                hairdresserWalletAddress,
                customerId: ratingData.customerId,
                customerName: ratingData.customerName,
                customerWalletAddress,
                ratingId: docRef.id,
                categories: ratingData.categories,
                totalBT: ratingData.totalBT,
                status: 'pending',
                createdAt: serverTimestamp(),
                isCustomerVerified,
              });

            }
            
            await updateDoc(doc(db, 'ratings', docRef.id), {
              btReflected: true,
            });
            
            await updateDoc(doc(db, 'visitSessions', sessionDoc.id), {
              customerAmount: ratingData.paidAmount,
              ratingId: docRef.id,
              customerEvaluated: true,
              btAmount: ratingData.totalBT,
              status: 'completed',
            });
            
            await updateDoc(doc(db, 'disputes', disputeDoc.id), {
              status: 'resolved',
            });
            
          } else {
            
            await updateDoc(doc(db, 'visitSessions', sessionDoc.id), {
              customerAmount: ratingData.paidAmount,
              ratingId: docRef.id,
              customerEvaluated: true,
              btAmount: ratingData.totalBT,
              status: 'amount_mismatch',
            });
            
            await updateDoc(doc(db, 'disputes', disputeDoc.id), {
              status: 'customer_reported',
              reportedBy: 'customer',
              reportMessage: `顧客が再評価を完了しましたが、美容師の提案金額と一致しませんでした。顧客入力: ¥${ratingData.paidAmount}, 美容師提案: ¥${proposedAmount}`,
              updatedAt: serverTimestamp(),
            });
          }
        }
      } else {
        const hairdresserAmount: number | null = sessionData.hairdresserAmount;
        const hairdresserRecorded = sessionData.hairdresserRecorded || false;
        
        
        if (hairdresserRecorded && hairdresserAmount !== null && hairdresserAmount === ratingData.paidAmount) {
          
          const userRef = doc(db, 'users', ratingData.hairdresserId);
          await updateDoc(userRef, {
            btBalance: increment(ratingData.totalBT),
          });
          
          {
            const hairdresserDocW = await getDoc(doc(db, 'users', ratingData.hairdresserId));
            const hairdresserWalletAddress = hairdresserDocW.exists() ? hairdresserDocW.data().walletAddress : undefined;
            const customerDocW = await getDoc(doc(db, 'users', ratingData.customerId));
            const customerWalletAddress = customerDocW.exists() ? customerDocW.data().walletAddress : undefined;
            
            const pendingBPRef = collection(db, 'pendingBPMints');
            await addDoc(pendingBPRef, {
              hairdresserId: ratingData.hairdresserId,
              hairdresserName: ratingData.hairdresserName,
              hairdresserWalletAddress,
              customerId: ratingData.customerId,
              customerName: ratingData.customerName,
              customerWalletAddress,
              ratingId: docRef.id,
              categories: ratingData.categories,
              totalBT: ratingData.totalBT,
              status: 'pending',
              createdAt: serverTimestamp(),
              isCustomerVerified,
            });

          }
          
          await updateDoc(doc(db, 'ratings', docRef.id), {
            btReflected: true,
          });
          
          await updateDoc(doc(db, 'visitSessions', sessionDoc.id), {
            customerAmount: ratingData.paidAmount,
            ratingId: docRef.id,
            customerEvaluated: true,
            btAmount: ratingData.totalBT,
            status: 'completed',
          });
        } else if (hairdresserRecorded && hairdresserAmount !== null && hairdresserAmount !== ratingData.paidAmount) {
          
          await updateDoc(doc(db, 'visitSessions', sessionDoc.id), {
            customerAmount: ratingData.paidAmount,
            ratingId: docRef.id,
            customerEvaluated: true,
            btAmount: ratingData.totalBT,
            status: 'amount_mismatch',
          });
          
          const disputesRef = collection(db, 'disputes');
          await addDoc(disputesRef, {
            visitSessionId: sessionDoc.id,
            customerId: ratingData.customerId,
            customerName: ratingData.customerName,
            hairdresserId: ratingData.hairdresserId,
            hairdresserName: ratingData.hairdresserName,
            customerAmount: ratingData.paidAmount,
            hairdresserAmount: hairdresserAmount,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          
        } else {
          await updateDoc(doc(db, 'visitSessions', sessionDoc.id), {
            customerAmount: ratingData.paidAmount,
            ratingId: docRef.id,
            customerEvaluated: true,
            btAmount: ratingData.totalBT,
            status: 'pending',
          });
        }
      }
    }
  }, [user]);

  const getRatingsByHairdresser = useCallback((hairdresserId: string): Rating[] => {
    return ratings.filter(rating => rating.hairdresserId === hairdresserId);
  }, [ratings]);

  const getRatingsByCustomer = useCallback((customerId: string): Rating[] => {
    return ratings.filter(rating => rating.customerId === customerId);
  }, [ratings]);

  const getBTDistribution = useCallback((hairdresserId: string): BTDistribution => {
    
    const hairdresserRatings = ratings.filter(rating => {
      const isCorrectHairdresser = rating.hairdresserId === hairdresserId;
      const isBTReflected = rating.btReflected === true;
      const isVerified = rating.isCustomerVerified === true;
      
      return isCorrectHairdresser && isBTReflected && isVerified;
    });
    
    
    const distribution: BTDistribution = {
      cut: 0,
      color: 0,
      perm: 0,
      straightening: 0,
      extensions: 0,
      massage: 0,
      service: 0,
      timeManagement: 0,
      assistant: 0,
      discarded: 0,
      total: 0,
    };

    hairdresserRatings.forEach(rating => {
      rating.categories.forEach(category => {
        switch (category.id) {
          case 'cut':
            distribution.cut += category.btAmount;
            break;
          case 'color':
            distribution.color += category.btAmount;
            break;
          case 'perm':
            distribution.perm += category.btAmount;
            break;
          case 'straightening':
            distribution.straightening += category.btAmount;
            break;
          case 'extensions':
            distribution.extensions += category.btAmount;
            break;
          case 'massage':
            distribution.massage += category.btAmount;
            break;
          case 'service':
            distribution.service += category.btAmount;
            break;
          case 'timeManagement':
            distribution.timeManagement += category.btAmount;
            break;
          case 'assistant':
            distribution.assistant += category.btAmount;
            break;
        }
      });
      distribution.discarded += rating.btDiscarded || 0;
    });

    distribution.total = distribution.cut + distribution.color + distribution.perm + distribution.straightening + distribution.extensions + distribution.massage + distribution.service + distribution.timeManagement + distribution.assistant;
    

    return distribution;
  }, [ratings]);

  const getPendingBTDistribution = useCallback((hairdresserId: string): PendingBTDistribution => {
    const hairdresserPendingBPs = pendingBPs.filter(bp => bp.hairdresserId === hairdresserId);
    const pendingBPRatingIds = new Set(hairdresserPendingBPs.map(bp => bp.ratingId).filter(Boolean));

    const unverifiedConfirmedRatings = ratings.filter(rating => (
      rating.hairdresserId === hairdresserId
      && rating.btReflected === true
      && rating.isCustomerVerified !== true
      && !pendingBPRatingIds.has(rating.id)
    ));
    
    const distribution: PendingBTDistribution = {
      cut: 0,
      color: 0,
      perm: 0,
      straightening: 0,
      extensions: 0,
      massage: 0,
      service: 0,
      timeManagement: 0,
      assistant: 0,
      total: 0,
    };

    unverifiedConfirmedRatings.forEach(rating => {
      rating.categories.forEach(category => {
        switch (category.id) {
          case 'cut':
            distribution.cut += category.btAmount;
            break;
          case 'color':
            distribution.color += category.btAmount;
            break;
          case 'perm':
            distribution.perm += category.btAmount;
            break;
          case 'straightening':
            distribution.straightening += category.btAmount;
            break;
          case 'extensions':
            distribution.extensions += category.btAmount;
            break;
          case 'massage':
            distribution.massage += category.btAmount;
            break;
          case 'service':
            distribution.service += category.btAmount;
            break;
          case 'timeManagement':
            distribution.timeManagement += category.btAmount;
            break;
          case 'assistant':
            distribution.assistant += category.btAmount;
            break;
        }
      });
    });

    hairdresserPendingBPs.forEach(bp => {
      bp.categories.forEach(category => {
        switch (category.id) {
          case 'cut':
            distribution.cut += category.btAmount;
            break;
          case 'color':
            distribution.color += category.btAmount;
            break;
          case 'perm':
            distribution.perm += category.btAmount;
            break;
          case 'straightening':
            distribution.straightening += category.btAmount;
            break;
          case 'extensions':
            distribution.extensions += category.btAmount;
            break;
          case 'massage':
            distribution.massage += category.btAmount;
            break;
          case 'service':
            distribution.service += category.btAmount;
            break;
          case 'timeManagement':
            distribution.timeManagement += category.btAmount;
            break;
          case 'assistant':
            distribution.assistant += category.btAmount;
            break;
        }
      });
    });

    distribution.total = distribution.cut + distribution.color + distribution.perm + distribution.straightening + distribution.extensions + distribution.massage + distribution.service + distribution.timeManagement + distribution.assistant;

    return distribution;
  }, [pendingBPs, ratings]);

  const deleteRating = useCallback(async (ratingId: string) => {
    
    const db = getDb();
    const ratingRef = doc(db, 'ratings', ratingId);
    
    await deleteDoc(ratingRef);
  }, []);

  const deleteMultipleRatings = useCallback(async (ratingIds: string[]) => {
    
    const db = getDb();
    const batch = writeBatch(db);
    
    ratingIds.forEach(ratingId => {
      const ratingRef = doc(db, 'ratings', ratingId);
      batch.delete(ratingRef);
    });
    
    await batch.commit();
  }, []);

  const deleteAllRatingsByCustomer = useCallback(async (customerId: string) => {
    
    const customerRatings = ratings.filter(rating => rating.customerId === customerId);
    const ratingIds = customerRatings.map(rating => rating.id);
    
    if (ratingIds.length === 0) {
      return;
    }
    
    await deleteMultipleRatings(ratingIds);
  }, [ratings, deleteMultipleRatings]);

  return useMemo(() => ({
    ratings,
    pendingBPs,
    isLoading,
    addRating,
    getRatingsByHairdresser,
    getRatingsByCustomer,
    getBTDistribution,
    getPendingBTDistribution,
    calculateBT,
    deleteRating,
    deleteMultipleRatings,
    deleteAllRatingsByCustomer,
  }), [ratings, pendingBPs, isLoading, addRating, getRatingsByHairdresser, getRatingsByCustomer, getBTDistribution, getPendingBTDistribution, calculateBT, deleteRating, deleteMultipleRatings, deleteAllRatingsByCustomer]);
});
