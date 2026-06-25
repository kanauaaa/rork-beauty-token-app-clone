import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { getDb } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDoc,
} from 'firebase/firestore';

export interface MatchingRequest {
  id: string;
  customerId: string;
  customerName: string;
  requestDate: string;
  desiredDate?: string;
  desiredTime?: string;
  menu: string[];
  concerns: string;
  budgetRange?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  status: 'pending' | 'matched' | 'completed' | 'cancelled';
  matchedHairdresserId?: string;
  matchedHairdresserName?: string;
  matchedAt?: string;
}

export interface Match {
  id: string;
  requestId: string;
  customerId: string;
  customerName: string;
  hairdresserId: string;
  hairdresserName: string;
  salonName?: string;
  salonAddress?: string;
  matchedAt: string;
  status: 'scout_pending' | 'booking_confirmed' | 'cancelled' | 'completed' | 'rejected';
  chatUnlocked: boolean;
  visitCompleted: boolean;
  ratingCompleted: boolean;
  cancelRequestBy?: 'customer' | 'hairdresser';
  cancelReason?: string;
  scoutMessage?: string;
  proposedPrice?: number;
}

export interface ScoutHistory {
  id: string;
  matchId: string;
  requestId: string;
  customerId: string;
  customerName: string;
  hairdresserId: string;
  hairdresserName: string;
  scoutedAt: string;
  status: 'sent' | 'accepted' | 'rejected';
  acceptedAt?: string;
  rejectedAt?: string;
  scoutMessage?: string;
  proposedPrice?: number;
}

interface MatchingState {
  requests: MatchingRequest[];
  matches: Match[];
  scoutHistory: ScoutHistory[];
  isLoading: boolean;
  reloadData: () => Promise<void>;
  createRequest: (request: Omit<MatchingRequest, 'id' | 'requestDate' | 'status'>) => Promise<void>;
  updateRequest: (requestId: string, updates: Partial<Omit<MatchingRequest, 'id' | 'requestDate'>>) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  scoutCustomer: (requestId: string, hairdresserId: string, hairdresserName: string, scoutMessage?: string, proposedPrice?: number) => Promise<void>;
  acceptScout: (matchId: string) => Promise<void>;
  rejectScout: (matchId: string) => Promise<void>;
  requestCancellation: (matchId: string, requestedBy: 'customer' | 'hairdresser', reason: string) => Promise<void>;
  approveCancellation: (matchId: string) => Promise<void>;
  rejectCancellation: (matchId: string) => Promise<void>;
  markVisitCompleted: (matchId: string) => Promise<void>;
  markRatingCompleted: (matchId: string) => Promise<void>;
  confirmBooking: (matchId: string, qrVerified: boolean) => Promise<void>;
  getCustomerRequests: (customerId: string) => MatchingRequest[];
  getHairdresserMatches: (hairdresserId: string) => Match[];
  getPendingRequests: () => MatchingRequest[];
  getScoutHistory: (hairdresserId: string) => ScoutHistory[];
  getAcceptedScouts: (hairdresserId: string) => ScoutHistory[];
}

export const [MatchingProvider, useMatching] = createContextHook((): MatchingState => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MatchingRequest[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [scoutHistory, setScoutHistory] = useState<ScoutHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const db = getDb();
    const requestsRef = collection(db, 'matchingRequests');
    const matchesRef = collection(db, 'matches');

    let requestsQuery;
    if (user.role === 'customer') {
      requestsQuery = query(requestsRef, where('customerId', '==', user.id));
    } else if (user.role === 'hairdresser') {
      requestsQuery = query(requestsRef, where('status', '==', 'pending'));
    } else {
      requestsQuery = query(requestsRef);
    }

    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData: MatchingRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        requestsData.push({
          id: doc.id,
          customerId: data.customerId,
          customerName: data.customerName,
          requestDate: data.requestDate instanceof Timestamp ? data.requestDate.toDate().toISOString() : data.requestDate,
          desiredDate: data.desiredDate,
          desiredTime: data.desiredTime,
          menu: data.menu || [],
          concerns: data.concerns,
          budgetRange: data.budgetRange,
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
          status: data.status,
          matchedHairdresserId: data.matchedHairdresserId,
          matchedHairdresserName: data.matchedHairdresserName,
          matchedAt: data.matchedAt instanceof Timestamp ? data.matchedAt.toDate().toISOString() : data.matchedAt,
        });
      });
      setRequests(requestsData);
      setIsLoading(false);
    });

    let matchesQuery;
    if (user.role === 'customer') {
      matchesQuery = query(matchesRef, where('customerId', '==', user.id));
    } else if (user.role === 'hairdresser') {
      matchesQuery = query(matchesRef, where('hairdresserId', '==', user.id));
    } else {
      matchesQuery = query(matchesRef);
    }

    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
      const matchesData: Match[] = [];
      
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        
        matchesData.push({
          id: docSnapshot.id,
          requestId: data.requestId,
          customerId: data.customerId,
          customerName: data.customerName,
          hairdresserId: data.hairdresserId,
          hairdresserName: data.hairdresserName,
          salonName: data.salonName || '',
          salonAddress: data.salonAddress || '',
          matchedAt: data.matchedAt instanceof Timestamp ? data.matchedAt.toDate().toISOString() : data.matchedAt,
          status: data.status,
          chatUnlocked: data.chatUnlocked || false,
          visitCompleted: data.visitCompleted || false,
          ratingCompleted: data.ratingCompleted || false,
          cancelRequestBy: data.cancelRequestBy,
          cancelReason: data.cancelReason,
          scoutMessage: data.scoutMessage,
          proposedPrice: data.proposedPrice,
        });
      });
      
      setMatches(matchesData);
    });

    const scoutHistoryRef = collection(db, 'scoutHistory');
    let scoutHistoryQuery;
    if (user.role === 'hairdresser') {
      scoutHistoryQuery = query(scoutHistoryRef, where('hairdresserId', '==', user.id));
    } else {
      scoutHistoryQuery = query(scoutHistoryRef);
    }

    const unsubscribeScoutHistory = onSnapshot(scoutHistoryQuery, (snapshot) => {
      const scoutHistoryData: ScoutHistory[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        scoutHistoryData.push({
          id: doc.id,
          matchId: data.matchId,
          requestId: data.requestId,
          customerId: data.customerId,
          customerName: data.customerName,
          hairdresserId: data.hairdresserId,
          hairdresserName: data.hairdresserName,
          scoutedAt: data.scoutedAt instanceof Timestamp ? data.scoutedAt.toDate().toISOString() : data.scoutedAt,
          status: data.status,
          acceptedAt: data.acceptedAt instanceof Timestamp ? data.acceptedAt.toDate().toISOString() : data.acceptedAt,
          rejectedAt: data.rejectedAt instanceof Timestamp ? data.rejectedAt.toDate().toISOString() : data.rejectedAt,
          scoutMessage: data.scoutMessage,
          proposedPrice: data.proposedPrice,
        });
      });
      setScoutHistory(scoutHistoryData);
    });

    return () => {
      unsubscribeRequests();
      unsubscribeMatches();
      unsubscribeScoutHistory();
    };
  }, [user]);

  const reloadData = useCallback(async () => {
  }, []);

  const createRequest = useCallback(
    async (requestData: Omit<MatchingRequest, 'id' | 'requestDate' | 'status'>) => {
      if (!user) return;

      const db = getDb();
      const requestsRef = collection(db, 'matchingRequests');

      const newRequest = {
        customerId: requestData.customerId,
        customerName: requestData.customerName,
        requestDate: serverTimestamp(),
        desiredDate: requestData.desiredDate || '',
        desiredTime: requestData.desiredTime || '',
        menu: requestData.menu,
        concerns: requestData.concerns,
        budgetRange: requestData.budgetRange || '',
        latitude: requestData.latitude || 0,
        longitude: requestData.longitude || 0,
        address: requestData.address || '',
        status: 'pending',
      };

      await addDoc(requestsRef, newRequest);
    },
    [user]
  );

  const updateRequest = useCallback(
    async (requestId: string, updates: Partial<Omit<MatchingRequest, 'id' | 'requestDate'>>) => {
      if (!user) return;

      const db = getDb();
      const requestRef = doc(db, 'matchingRequests', requestId);

      await updateDoc(requestRef, updates);
    },
    [user]
  );

  const cancelRequest = useCallback(
    async (requestId: string) => {
      if (!user) return;

      const db = getDb();
      const requestRef = doc(db, 'matchingRequests', requestId);

      await updateDoc(requestRef, { status: 'cancelled' });
      
      const relatedMatches = matches.filter(m => m.requestId === requestId);
      
      for (const match of relatedMatches) {
        const matchRef = doc(db, 'matches', match.id);
        await updateDoc(matchRef, { status: 'cancelled' });
        
        const historyEntry = scoutHistory.find(h => h.matchId === match.id);
        if (historyEntry) {
          const historyRef = doc(db, 'scoutHistory', historyEntry.id);
          await updateDoc(historyRef, {
            status: 'rejected',
            rejectedAt: serverTimestamp(),
          });
        }
      }
      
    },
    [user, matches, scoutHistory]
  );

  const scoutCustomer = useCallback(
    async (requestId: string, hairdresserId: string, hairdresserName: string, scoutMessage?: string, proposedPrice?: number) => {
      if (!user) return;

      const db = getDb();
      const matchesRef = collection(db, 'matches');
      const scoutHistoryRef = collection(db, 'scoutHistory');

      const request = requests.find((r) => r.id === requestId);
      if (!request) return;

      const newMatch = {
        requestId,
        customerId: request.customerId,
        customerName: request.customerName,
        hairdresserId,
        hairdresserName,
        salonName: user.workplaceName || '',
        salonAddress: user.address || '',
        matchedAt: serverTimestamp(),
        status: 'scout_pending',
        chatUnlocked: false,
        visitCompleted: false,
        ratingCompleted: false,
        scoutMessage: scoutMessage || '',
        proposedPrice: proposedPrice || 0,
      };

      const matchDoc = await addDoc(matchesRef, newMatch);

      const scoutHistoryEntry = {
        matchId: matchDoc.id,
        requestId,
        customerId: request.customerId,
        customerName: request.customerName,
        hairdresserId,
        hairdresserName,
        scoutedAt: serverTimestamp(),
        status: 'sent',
        scoutMessage: scoutMessage || '',
        proposedPrice: proposedPrice || 0,
      };

      await addDoc(scoutHistoryRef, scoutHistoryEntry);
    },
    [user, requests]
  );

  const acceptScout = useCallback(
    async (matchId: string) => {
      if (!user) return;

      const db = getDb();
      const matchRef = doc(db, 'matches', matchId);

      await updateDoc(matchRef, {
        status: 'booking_confirmed',
        chatUnlocked: true,
      });

      const match = matches.find((m) => m.id === matchId);
      if (match) {
        const requestRef = doc(db, 'matchingRequests', match.requestId);
        await updateDoc(requestRef, {
          status: 'matched',
          matchedHairdresserId: match.hairdresserId,
          matchedHairdresserName: match.hairdresserName,
          matchedAt: serverTimestamp(),
        });

        const historyEntry = scoutHistory.find(h => h.matchId === matchId);
        if (historyEntry) {
          const historyRef = doc(db, 'scoutHistory', historyEntry.id);
          await updateDoc(historyRef, {
            status: 'accepted',
            acceptedAt: serverTimestamp(),
          });
        }
      }
    },
    [user, matches, scoutHistory]
  );

  const rejectScout = useCallback(
    async (matchId: string) => {
      if (!user) return;

      const db = getDb();
      const matchRef = doc(db, 'matches', matchId);

      await updateDoc(matchRef, { status: 'rejected' });

      const historyEntry = scoutHistory.find(h => h.matchId === matchId);
      if (historyEntry) {
        const historyRef = doc(db, 'scoutHistory', historyEntry.id);
        await updateDoc(historyRef, {
          status: 'rejected',
          rejectedAt: serverTimestamp(),
        });
      }
    },
    [user, scoutHistory]
  );

  const requestCancellation = useCallback(
    async (matchId: string, requestedBy: 'customer' | 'hairdresser', reason: string) => {
      if (!user) return;

      const db = getDb();
      const matchRef = doc(db, 'matches', matchId);

      await updateDoc(matchRef, {
        cancelRequestBy: requestedBy,
        cancelReason: reason,
      });
    },
    [user]
  );

  const approveCancellation = useCallback(
    async (matchId: string) => {
      if (!user) return;

      const db = getDb();
      const matchRef = doc(db, 'matches', matchId);

      await updateDoc(matchRef, { status: 'cancelled' });

      const match = matches.find((m) => m.id === matchId);
      if (match) {
        const requestRef = doc(db, 'matchingRequests', match.requestId);
        await updateDoc(requestRef, { status: 'cancelled' });
      }
    },
    [user, matches]
  );

  const rejectCancellation = useCallback(
    async (matchId: string) => {
      if (!user) return;

      const db = getDb();
      const matchRef = doc(db, 'matches', matchId);

      await updateDoc(matchRef, {
        cancelRequestBy: null,
        cancelReason: null,
      });
    },
    [user]
  );

  const markVisitCompleted = useCallback(
    async (matchId: string) => {
      if (!user) return;

      const db = getDb();
      const matchRef = doc(db, 'matches', matchId);

      await updateDoc(matchRef, { visitCompleted: true });
    },
    [user]
  );

  const markRatingCompleted = useCallback(
    async (matchId: string) => {
      if (!user) return;

      const db = getDb();
      const matchRef = doc(db, 'matches', matchId);

      await updateDoc(matchRef, {
        ratingCompleted: true,
        status: 'completed',
      });

      const match = matches.find((m) => m.id === matchId);
      if (match) {
        const requestRef = doc(db, 'matchingRequests', match.requestId);
        await updateDoc(requestRef, { status: 'completed' });
      }
    },
    [user, matches]
  );

  const confirmBooking = useCallback(
    async (matchId: string, qrVerified: boolean) => {
      if (!user) return;

      const db = getDb();
      const matchRef = doc(db, 'matches', matchId);

      await updateDoc(matchRef, {
        status: 'booking_confirmed',
        chatUnlocked: true,
      });
    },
    [user]
  );

  const getCustomerRequests = useCallback(
    (customerId: string) => {
      return requests.filter((r) => r.customerId === customerId);
    },
    [requests]
  );

  const getHairdresserMatches = useCallback(
    (hairdresserId: string) => {
      return matches.filter((m) => m.hairdresserId === hairdresserId);
    },
    [matches]
  );

  const getPendingRequests = useCallback(() => {
    return requests.filter((r) => r.status === 'pending');
  }, [requests]);

  const getScoutHistory = useCallback((hairdresserId: string) => {
    return scoutHistory.filter((h) => h.hairdresserId === hairdresserId);
  }, [scoutHistory]);

  const getAcceptedScouts = useCallback((hairdresserId: string) => {
    return scoutHistory.filter((h) => h.hairdresserId === hairdresserId && h.status === 'accepted');
  }, [scoutHistory]);

  return {
    requests,
    matches,
    scoutHistory,
    isLoading,
    reloadData,
    createRequest,
    updateRequest,
    cancelRequest,
    scoutCustomer,
    acceptScout,
    rejectScout,
    requestCancellation,
    approveCancellation,
    rejectCancellation,
    markVisitCompleted,
    markRatingCompleted,
    confirmBooking,
    getCustomerRequests,
    getHairdresserMatches,
    getPendingRequests,
    getScoutHistory,
    getAcceptedScouts,
  };
});
