import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import { getDb } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  orderBy,
  getDocs,
  getDoc,
  increment,
} from 'firebase/firestore';

export type MenuType = 'cut' | 'color' | 'perm' | 'straightening' | 'treatment' | 'headspa' | 'extension';

export interface CutDetails {
  type: string;
  cmCut?: string;
  thinning?: boolean;
  thinningDetails?: string;
  hasNaturalCurl?: boolean;
  curlDetails?: string;
}

export interface ColorDetails {
  applicationType: string;
  retouchCm?: string;
  isWColor?: boolean;
  firstRoundBrand?: string;
  firstRoundSelection?: string;
  firstRoundSecondLiquidConcentration?: string;
  firstRoundSecondLiquidRatio?: string;
  secondRoundBrand?: string;
  secondRoundSelection?: string;
  secondRoundSecondLiquidConcentration?: string;
  secondRoundSecondLiquidRatio?: string;
  areas?: string[];
  areaWidths?: { [key: string]: string };
  areaBrands?: { [key: string]: string };
  areaSelections?: { [key: string]: string };
  areaSecondLiquidConcentrations?: { [key: string]: string };
  areaSecondLiquidRatios?: { [key: string]: string };
  brand?: string;
  selection?: string;
  secondLiquidConcentration?: string;
  secondLiquidRatio?: string;
  processingTime?: string;
  hasBleach?: boolean;
  bleachBrand?: string;
  bleachSelection?: string;
  hasTreatment?: boolean;
  treatmentDetails?: string;
  publicBrand?: string;
  publicSelection?: string;
  publicSecondLiquidConcentration?: string;
  publicSecondLiquidRatio?: string;
  publicBleachBrand?: string;
  publicBleachSelection?: string;
}

export interface PermDetails {
  type: string;
  windingMethod?: string;
  brand?: string;
  selection?: string;
  firstLiquidTime?: string;
  secondLiquidTime?: string;
  hasTreatment?: boolean;
  treatmentDetails?: string;
  publicBrand?: string;
  publicSelection?: string;
}

export interface StraighteningDetails {
  applicationType: string;
  retouchCm?: string;
  areas?: string[];
  areaWidths?: { [key: string]: string };
  areaBrands?: { [key: string]: string };
  areaSelections?: { [key: string]: string };
  brand?: string;
  selection?: string;
  firstLiquidTime?: string;
  secondLiquidTime?: string;
  hasTreatment?: boolean;
  treatmentDetails?: string;
  publicBrand?: string;
  publicSelection?: string;
}

export interface TreatmentDetails {
  type: string;
  productName?: string;
  publicProductName?: string;
}

export interface HeadSpaDetails {
  notes?: string;
}

export interface ExtensionDetails {
  type: string;
  otherType?: string;
  color?: string;
  quantity?: string;
  quality?: string;
  details?: string;
}

export interface MenuDetails {
  cut?: CutDetails;
  color?: ColorDetails;
  perm?: PermDetails;
  straightening?: StraighteningDetails;
  treatment?: TreatmentDetails;
  headspa?: HeadSpaDetails;
  extension?: ExtensionDetails;
}

export interface TreatmentHistory {
  id: string;
  customerId: string;
  customerName: string;
  hairdresserId: string;
  hairdresserName: string;
  serviceDate: string;
  menus: MenuType[];
  menuDetails: MenuDetails;
  notes?: string;
  createdAt: string;
}

export interface MedicalRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  hairdresserId: string;
  hairdresserName: string;
  requestDate: string;
  status: 'completed' | 'unwritten';
  serviceType?: string;
  preferredDate?: string;
  notes?: string;
  receivedAmount?: number;
  qrScanTime?: string;
  photoUrl?: string;
  medicalRecord?: {
    serviceDate: string;
    menus: MenuType[];
    menuDetails: MenuDetails;
    notes: string;
    receivedAmount?: number;
  };
}

interface MedicalRecordState {
  records: MedicalRecord[];
  treatmentHistory: TreatmentHistory[];
  isLoading: boolean;
  addRecord: (record: Omit<MedicalRecord, 'id' | 'requestDate'>) => Promise<void>;
  updateRecord: (id: string, updates: Partial<MedicalRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  getRecordsByCustomer: (customerId: string) => MedicalRecord[];
  getTreatmentHistory: (customerId: string) => TreatmentHistory[];
  addTreatmentHistory: (history: Omit<TreatmentHistory, 'id' | 'createdAt'>) => Promise<void>;
  getVisibleRecords: (userId: string, isPremium: boolean) => MedicalRecord[];
  isRecordExpired: (record: MedicalRecord, isPremium: boolean) => boolean;
  deleteAllUnwrittenRecords: () => Promise<number>;
}

export const [MedicalRecordProvider, useMedicalRecords] = createContextHook((): MedicalRecordState => {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [treatmentHistory, setTreatmentHistory] = useState<TreatmentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const db = getDb();
    const recordsRef = collection(db, 'medicalRecords');
    const historyRef = collection(db, 'treatmentHistory');

    let recordsQuery;
    if (user.role === 'hairdresser') {
      recordsQuery = query(recordsRef, where('hairdresserId', '==', user.id), orderBy('requestDate', 'desc'));
    } else if (user.role === 'customer') {
      recordsQuery = query(recordsRef, where('customerId', '==', user.id), orderBy('requestDate', 'desc'));
    } else {
      recordsQuery = query(recordsRef, orderBy('requestDate', 'desc'));
    }

    const unsubscribeRecords = onSnapshot(recordsQuery, (snapshot) => {
      const recordsData: MedicalRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        recordsData.push({
          id: doc.id,
          customerId: data.customerId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          hairdresserId: data.hairdresserId,
          hairdresserName: data.hairdresserName,
          requestDate: data.requestDate instanceof Timestamp ? data.requestDate.toDate().toISOString() : data.requestDate,
          status: data.status,
          serviceType: data.serviceType,
          preferredDate: data.preferredDate,
          notes: data.notes,
          receivedAmount: data.receivedAmount,
          qrScanTime: data.qrScanTime instanceof Timestamp ? data.qrScanTime.toDate().toISOString() : data.qrScanTime,
          medicalRecord: data.medicalRecord ? {
            serviceDate: data.medicalRecord.serviceDate instanceof Timestamp ? data.medicalRecord.serviceDate.toDate().toISOString() : data.medicalRecord.serviceDate,
            menus: data.medicalRecord.menus || [],
            menuDetails: data.medicalRecord.menuDetails || {},
            notes: data.medicalRecord.notes || '',
            receivedAmount: data.medicalRecord.receivedAmount,
          } : undefined,
        });
      });
      setRecords(recordsData);
      setIsLoading(false);
    }, (_error) => {
      setIsLoading(false);
    });

    let historyQuery;
    if (user.role === 'hairdresser') {
      historyQuery = query(historyRef, where('hairdresserId', '==', user.id), orderBy('serviceDate', 'desc'));
    } else if (user.role === 'customer') {
      historyQuery = query(historyRef, where('customerId', '==', user.id), orderBy('serviceDate', 'desc'));
    } else {
      historyQuery = query(historyRef, orderBy('serviceDate', 'desc'));
    }

    const unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
      const historyData: TreatmentHistory[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        historyData.push({
          id: doc.id,
          customerId: data.customerId,
          customerName: data.customerName,
          hairdresserId: data.hairdresserId,
          hairdresserName: data.hairdresserName,
          serviceDate: data.serviceDate instanceof Timestamp ? data.serviceDate.toDate().toISOString() : data.serviceDate,
          menus: data.menus || [],
          menuDetails: data.menuDetails || {},
          notes: data.notes,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        });
      });
      setTreatmentHistory(historyData);
    }, (_error) => {
    });

    return () => {
      unsubscribeRecords();
      unsubscribeHistory();
    };
  }, [user]);

  const addRecord = useCallback(async (record: Omit<MedicalRecord, 'id' | 'requestDate'>) => {
    if (!user) return;

    
    if (!record.customerName) {
      throw new Error('customerName is required');
    }
    
    if (!record.customerId) {
      throw new Error('customerId is required');
    }
    
    const db = getDb();
    const recordsRef = collection(db, 'medicalRecords');

    const newRecordData = {
      customerId: record.customerId,
      customerName: record.customerName,
      customerEmail: record.customerEmail || null,
      hairdresserId: record.hairdresserId,
      hairdresserName: record.hairdresserName,
      status: record.status,
      notes: record.notes || '',
      serviceType: record.serviceType || null,
      preferredDate: record.preferredDate || null,
      receivedAmount: record.receivedAmount || null,
      qrScanTime: record.qrScanTime || null,
      requestDate: serverTimestamp(),
      medicalRecord: record.medicalRecord || null,
    };

    await addDoc(recordsRef, newRecordData);
  }, [user]);

  const updateRecord = useCallback(async (id: string, updates: Partial<MedicalRecord>) => {
    if (!user) return;

    const db = getDb();
    const recordRef = doc(db, 'medicalRecords', id);
    await updateDoc(recordRef, updates as any);

    if (updates.status === 'completed' && updates.medicalRecord?.receivedAmount) {
      const record = records.find(r => r.id === id);
      if (!record) return;

      const receivedAmount = updates.medicalRecord.receivedAmount;

      const visitSessionsRef = collection(db, 'visitSessions');
      const q = query(
        visitSessionsRef,
        where('customerId', '==', record.customerId),
        where('hairdresserId', '==', record.hairdresserId),
        where('status', 'in', ['pending', 'amount_mismatch'])
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        const sessionData = {
          customerId: record.customerId,
          customerName: record.customerName,
          hairdresserId: record.hairdresserId,
          hairdresserName: record.hairdresserName,
          customerAmount: null,
          hairdresserAmount: receivedAmount,
          customerEvaluated: false,
          hairdresserRecorded: true,
          status: 'pending' as const,
          ratingId: null,
          medicalRecordId: id,
          btAmount: null,
          createdAt: serverTimestamp(),
        };
        await addDoc(visitSessionsRef, sessionData);
      } else {
        const sessionDoc = querySnapshot.docs[0];
        const sessionData = sessionDoc.data();
        const customerAmount = sessionData.customerAmount;
        const customerEvaluated = sessionData.customerEvaluated || false;
        const btAmount = sessionData.btAmount;
        
        
        if (customerEvaluated && customerAmount !== null) {
          if (customerAmount === receivedAmount) {
            
            if (btAmount !== null) {
              const userRef = doc(db, 'users', record.hairdresserId);
              await updateDoc(userRef, {
                btBalance: increment(btAmount),
              });
              
              if (sessionData.ratingId) {
                const photoUrl = sessionData.photoUrl || null;
                await updateDoc(doc(db, 'ratings', sessionData.ratingId), {
                  btReflected: true,
                });
                
                if (photoUrl) {
                  await updateDoc(recordRef, {
                    photoUrl: photoUrl,
                  });
                }

                const ratingDoc = await getDoc(doc(db, 'ratings', sessionData.ratingId));
                const ratingData = ratingDoc.exists() ? ratingDoc.data() : null;

                const hairdresserDocW = await getDoc(doc(db, 'users', record.hairdresserId));
                const hairdresserWalletAddress = hairdresserDocW.exists() ? hairdresserDocW.data().walletAddress : undefined;
                const customerDocW = await getDoc(doc(db, 'users', record.customerId));
                const customerWalletAddress = customerDocW.exists() ? customerDocW.data().walletAddress : undefined;

                const pendingBPRef = collection(db, 'pendingBPMints');
                await addDoc(pendingBPRef, {
                  hairdresserId: record.hairdresserId,
                  hairdresserName: record.hairdresserName,
                  hairdresserWalletAddress,
                  customerId: record.customerId,
                  customerName: record.customerName,
                  customerWalletAddress,
                  ratingId: sessionData.ratingId,
                  categories: ratingData?.categories || [],
                  totalBT: btAmount,
                  status: 'pending',
                  createdAt: serverTimestamp(),
                });
              }
            }
            
            await updateDoc(doc(db, 'visitSessions', sessionDoc.id), {
              status: 'completed',
              hairdresserAmount: receivedAmount,
              hairdresserRecorded: true,
              medicalRecordId: id,
            });
            
          } else {
            
            await updateDoc(doc(db, 'visitSessions', sessionDoc.id), {
              status: 'amount_mismatch',
              hairdresserAmount: receivedAmount,
              hairdresserRecorded: true,
              medicalRecordId: id,
            });
            
            const disputesRef = collection(db, 'disputes');
            await addDoc(disputesRef, {
              visitSessionId: sessionDoc.id,
              customerId: record.customerId,
              customerName: record.customerName,
              hairdresserId: record.hairdresserId,
              hairdresserName: record.hairdresserName,
              customerAmount: customerAmount,
              hairdresserAmount: receivedAmount,
              status: 'pending',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            
          }
        } else {
          await updateDoc(doc(db, 'visitSessions', sessionDoc.id), {
            hairdresserAmount: receivedAmount,
            hairdresserRecorded: true,
            medicalRecordId: id,
          });
        }
      }
    }
  }, [user, records]);

  const deleteRecord = useCallback(async (id: string) => {
    if (!user) return;

    const db = getDb();
    const recordRef = doc(db, 'medicalRecords', id);
    await deleteDoc(recordRef);
  }, [user]);

  const getRecordsByCustomer = useCallback((customerId: string): MedicalRecord[] => {
    return records.filter(record => record.customerId === customerId);
  }, [records]);

  const getTreatmentHistory = useCallback((customerId: string): TreatmentHistory[] => {
    return treatmentHistory
      .filter(history => history.customerId === customerId)
      .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
  }, [treatmentHistory]);

  const addTreatmentHistory = useCallback(async (history: Omit<TreatmentHistory, 'id' | 'createdAt'>) => {
    if (!user) return;

    const db = getDb();
    const historyRef = collection(db, 'treatmentHistory');

    const newHistoryData = {
      ...history,
      serviceDate: history.serviceDate,
      createdAt: serverTimestamp(),
    };

    await addDoc(historyRef, newHistoryData);
  }, [user]);

  const isRecordExpired = useCallback((record: MedicalRecord, isPremium: boolean): boolean => {
    if (isPremium) {
      return false;
    }
    
    const scanTime = record.qrScanTime || record.requestDate;
    if (!scanTime) return false;
    
    const scanDate = new Date(scanTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - scanDate.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff > 24;
  }, []);

  const getVisibleRecords = useCallback((userId: string, isPremium: boolean): MedicalRecord[] => {
    
    if (isPremium) {
      return records;
    }
    
    const visibleRecords = records.filter(record => {
      const expired = isRecordExpired(record, isPremium);
      if (expired) {
      }
      return !expired;
    });
    
    return visibleRecords;
  }, [records, isRecordExpired]);

  const deleteAllUnwrittenRecords = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    const db = getDb();
    
    const unwrittenRecords = records.filter(record => record.status === 'unwritten');
    
    let deletedCount = 0;
    for (const record of unwrittenRecords) {
      try {
        const recordRef = doc(db, 'medicalRecords', record.id);
        await deleteDoc(recordRef);
        deletedCount++;
      } catch {
      }
    }
    
    return deletedCount;
  }, [user, records]);

  return useMemo(() => ({
    records,
    treatmentHistory,
    isLoading,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordsByCustomer,
    getTreatmentHistory,
    addTreatmentHistory,
    getVisibleRecords,
    isRecordExpired,
    deleteAllUnwrittenRecords,
  }), [records, treatmentHistory, isLoading, addRecord, updateRecord, deleteRecord, getRecordsByCustomer, getTreatmentHistory, addTreatmentHistory, getVisibleRecords, isRecordExpired, deleteAllUnwrittenRecords]);
});
