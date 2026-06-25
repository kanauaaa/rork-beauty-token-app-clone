import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { getDb } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  orderBy,
} from 'firebase/firestore';

export interface Dispute {
  id: string;
  visitSessionId: string;
  customerId: string;
  customerName: string;
  hairdresserId: string;
  hairdresserName: string;
  customerAmount: number;
  hairdresserAmount: number;
  hairdresserProposedAmount?: number;
  receiptPhotoUrl?: string;
  status: 'pending' | 'hairdresser_response' | 'customer_reported' | 'resolved' | 'cancelled';
  hairdresserSubmitted?: boolean;
  reportedBy?: 'customer' | 'hairdresser';
  reportMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface DisputeState {
  disputes: Dispute[];
  isLoading: boolean;
  createDispute: (data: Omit<Dispute, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<string>;
  updateDispute: (id: string, updates: Partial<Dispute>) => Promise<void>;
  deleteDispute: (id: string) => Promise<void>;
  getDisputesByHairdresser: (hairdresserId: string) => Dispute[];
  getDisputesByCustomer: (customerId: string) => Dispute[];
  getPendingDisputes: () => Dispute[];
  getReportedDisputes: () => Dispute[];
}

export const [DisputeProvider, useDisputes] = createContextHook((): DisputeState => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const db = getDb();
    const disputesRef = collection(db, 'disputes');

    let disputesQuery;
    const activeStatuses = ['pending', 'hairdresser_response', 'customer_reported'];
    
    if (user.role === 'hairdresser') {
      disputesQuery = query(
        disputesRef,
        where('hairdresserId', '==', user.id),
        where('status', 'in', activeStatuses),
        orderBy('createdAt', 'desc')
      );
    } else if (user.role === 'customer') {
      disputesQuery = query(
        disputesRef,
        where('customerId', '==', user.id),
        where('status', 'in', activeStatuses),
        orderBy('createdAt', 'desc')
      );
    } else if (user.role === 'admin') {
      disputesQuery = query(
        disputesRef,
        where('status', 'in', activeStatuses),
        orderBy('createdAt', 'desc')
      );
    } else {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(disputesQuery, (snapshot) => {
      const disputesData: Dispute[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        disputesData.push({
          id: doc.id,
          visitSessionId: data.visitSessionId,
          customerId: data.customerId,
          customerName: data.customerName,
          hairdresserId: data.hairdresserId,
          hairdresserName: data.hairdresserName,
          customerAmount: data.customerAmount,
          hairdresserAmount: data.hairdresserAmount,
          hairdresserProposedAmount: data.hairdresserProposedAmount,
          receiptPhotoUrl: data.receiptPhotoUrl,
          status: data.status,
          reportedBy: data.reportedBy,
          reportMessage: data.reportMessage,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        });
      });
      setDisputes(disputesData);
      setIsLoading(false);
    }, (error) => {
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const createDispute = useCallback(async (data: Omit<Dispute, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const db = getDb();
    const disputesRef = collection(db, 'disputes');

    const newDisputeData = {
      ...data,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(disputesRef, newDisputeData);
    return docRef.id;
  }, [user]);

  const updateDispute = useCallback(async (id: string, updates: Partial<Dispute>) => {
    if (!user) return;

    const db = getDb();
    const disputeRef = doc(db, 'disputes', id);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(disputeRef, updateData as any);
    if (updates.status) {
    }
  }, [user]);

  const deleteDispute = useCallback(async (id: string) => {
    if (!user) return;

    const db = getDb();
    const disputeRef = doc(db, 'disputes', id);
    
    await deleteDoc(disputeRef);
  }, [user]);

  const getDisputesByHairdresser = useCallback((hairdresserId: string): Dispute[] => {
    return disputes.filter(dispute => dispute.hairdresserId === hairdresserId);
  }, [disputes]);

  const getDisputesByCustomer = useCallback((customerId: string): Dispute[] => {
    return disputes.filter(dispute => dispute.customerId === customerId);
  }, [disputes]);

  const getPendingDisputes = useCallback((): Dispute[] => {
    return disputes.filter(dispute => dispute.status === 'pending' || dispute.status === 'hairdresser_response');
  }, [disputes]);

  const getReportedDisputes = useCallback((): Dispute[] => {
    return disputes.filter(dispute => dispute.status === 'customer_reported');
  }, [disputes]);

  return {
    disputes,
    isLoading,
    createDispute,
    updateDispute,
    deleteDispute,
    getDisputesByHairdresser,
    getDisputesByCustomer,
    getPendingDisputes,
    getReportedDisputes,
  };
});
