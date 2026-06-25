import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import { getDb } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

export type VisitSessionStatus = 'pending' | 'completed' | 'amount_mismatch';

export interface VisitSession {
  id: string;
  customerId: string;
  customerName: string;
  hairdresserId: string;
  hairdresserName: string;
  customerAmount: number | null;
  hairdresserAmount: number | null;
  customerEvaluated: boolean;
  hairdresserRecorded: boolean;
  status: VisitSessionStatus;
  ratingId: string | null;
  medicalRecordId: string | null;
  btAmount: number | null;
  createdAt: string;
  updatedAt?: string;
}

interface VisitSessionPollingState {
  sessions: VisitSession[];
  isLoading: boolean;
  pendingSessions: VisitSession[];
  mismatchSessions: VisitSession[];
  completedSessions: VisitSession[];
  hasPendingSessions: boolean;
  hasMismatchSessions: boolean;
}

export const [VisitSessionPollingProvider, useVisitSessionPolling] = createContextHook((): VisitSessionPollingState => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<VisitSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    
    const db = getDb();
    const sessionsRef = collection(db, 'visitSessions');

    let sessionsQuery;
    if (user.role === 'hairdresser') {
      sessionsQuery = query(
        sessionsRef,
        where('hairdresserId', '==', user.id)
      );
    } else if (user.role === 'customer') {
      sessionsQuery = query(
        sessionsRef,
        where('customerId', '==', user.id)
      );
    } else {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(sessionsQuery, async (snapshot) => {
      
      const sessionsData: VisitSession[] = [];
      
      for (const docChange of snapshot.docChanges()) {
        const docData = docChange.doc.data();
        const sessionId = docChange.doc.id;
        
        
        const session: VisitSession = {
          id: sessionId,
          customerId: docData.customerId,
          customerName: docData.customerName,
          hairdresserId: docData.hairdresserId,
          hairdresserName: docData.hairdresserName,
          customerAmount: docData.customerAmount ?? null,
          hairdresserAmount: docData.hairdresserAmount ?? null,
          customerEvaluated: docData.customerEvaluated || false,
          hairdresserRecorded: docData.hairdresserRecorded || false,
          status: docData.status,
          ratingId: docData.ratingId || null,
          medicalRecordId: docData.medicalRecordId || null,
          btAmount: docData.btAmount ?? null,
          createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate().toISOString() : docData.createdAt,
          updatedAt: docData.updatedAt instanceof Timestamp ? docData.updatedAt.toDate().toISOString() : docData.updatedAt,
        };
        
        sessionsData.push(session);

        if (docChange.type === 'modified' && docData.status === 'amount_mismatch') {
        }

        if (docChange.type === 'modified' && docData.status === 'completed') {
        }
      }

      snapshot.forEach((doc) => {
        const alreadyExists = sessionsData.some(s => s.id === doc.id);
        if (!alreadyExists) {
          const docData = doc.data();
          sessionsData.push({
            id: doc.id,
            customerId: docData.customerId,
            customerName: docData.customerName,
            hairdresserId: docData.hairdresserId,
            hairdresserName: docData.hairdresserName,
            customerAmount: docData.customerAmount ?? null,
            hairdresserAmount: docData.hairdresserAmount ?? null,
            customerEvaluated: docData.customerEvaluated || false,
            hairdresserRecorded: docData.hairdresserRecorded || false,
            status: docData.status,
            ratingId: docData.ratingId || null,
            medicalRecordId: docData.medicalRecordId || null,
            btAmount: docData.btAmount ?? null,
            createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate().toISOString() : docData.createdAt,
            updatedAt: docData.updatedAt instanceof Timestamp ? docData.updatedAt.toDate().toISOString() : docData.updatedAt,
          });
        }
      });

      setSessions(sessionsData);
      setIsLoading(false);
      
    }, (error) => {
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const pendingSessions = useMemo(() => sessions.filter(s => s.status === 'pending'), [sessions]);
  const mismatchSessions = useMemo(() => sessions.filter(s => s.status === 'amount_mismatch'), [sessions]);
  const completedSessions = useMemo(() => sessions.filter(s => s.status === 'completed'), [sessions]);
  const hasPendingSessions = useMemo(() => pendingSessions.length > 0, [pendingSessions]);
  const hasMismatchSessions = useMemo(() => mismatchSessions.length > 0, [mismatchSessions]);

  return {
    sessions,
    isLoading,
    pendingSessions,
    mismatchSessions,
    completedSessions,
    hasPendingSessions,
    hasMismatchSessions,
  };
});
