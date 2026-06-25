import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { getDb } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
} from 'firebase/firestore';

export interface Favorite {
  id: string;
  customerId: string;
  customerName: string;
  hairdresserId: string;
  hairdresserName: string;
  createdAt: string;
}

export interface ScoutRequest {
  id: string;
  hairdresserId: string;
  hairdresserName: string;
  customerId: string;
  customerName: string;
  desiredDate?: string;
  desiredTime?: string;
  menu: string[];
  menuCombinations?: string[][];
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface FavoriteState {
  favorites: Favorite[];
  scoutRequests: ScoutRequest[];
  isLoading: boolean;
  addFavorite: (hairdresserId: string, hairdresserName: string) => Promise<void>;
  removeFavorite: (hairdresserId: string) => Promise<void>;
  isFavorite: (hairdresserId: string) => boolean;
  getFavoritesByCustomer: (customerId: string) => Favorite[];
  getCustomersWhoFavorited: (hairdresserId: string) => Favorite[];
  createScoutRequest: (request: Omit<ScoutRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  cancelScoutRequest: (requestId: string) => Promise<void>;
  acceptScoutRequest: (requestId: string) => Promise<void>;
  rejectScoutRequest: (requestId: string) => Promise<void>;
  getScoutRequestsForCustomer: (customerId: string) => ScoutRequest[];
  getScoutRequestsByHairdresser: (hairdresserId: string) => ScoutRequest[];
}

export const [FavoriteProvider, useFavorites] = createContextHook((): FavoriteState => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [scoutRequests, setScoutRequests] = useState<ScoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const db = getDb();
    const favoritesRef = collection(db, 'favorites');
    const scoutRequestsRef = collection(db, 'scoutRequests');

    let favoritesQuery;
    if (user.role === 'customer') {
      favoritesQuery = query(favoritesRef, where('customerId', '==', user.id));
    } else if (user.role === 'hairdresser') {
      favoritesQuery = query(favoritesRef, where('hairdresserId', '==', user.id));
    } else {
      favoritesQuery = query(favoritesRef);
    }

    const unsubscribeFavorites = onSnapshot(favoritesQuery, (snapshot) => {
      const favoritesData: Favorite[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        favoritesData.push({
          id: doc.id,
          customerId: data.customerId,
          customerName: data.customerName,
          hairdresserId: data.hairdresserId,
          hairdresserName: data.hairdresserName,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        });
      });
      setFavorites(favoritesData);
      setIsLoading(false);
    }, (error) => {
      setIsLoading(false);
    });

    let scoutRequestsQuery;
    if (user.role === 'customer') {
      scoutRequestsQuery = query(scoutRequestsRef, where('customerId', '==', user.id));
    } else if (user.role === 'hairdresser') {
      scoutRequestsQuery = query(scoutRequestsRef, where('hairdresserId', '==', user.id));
    } else {
      scoutRequestsQuery = query(scoutRequestsRef);
    }

    const unsubscribeScoutRequests = onSnapshot(scoutRequestsQuery, (snapshot) => {
      const scoutRequestsData: ScoutRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const menuCombinations = Array.isArray(data.menuCombinations) 
          ? data.menuCombinations.map((combo: any) => {
              if (typeof combo === 'string') {
                return combo.split(',').filter((item: string) => item.length > 0);
              }
              if (Array.isArray(combo)) {
                return combo.filter((item: any) => typeof item === 'string');
              }
              return [];
            }).filter((combo: string[]) => combo.length > 0)
          : [];

        scoutRequestsData.push({
          id: doc.id,
          hairdresserId: data.hairdresserId,
          hairdresserName: data.hairdresserName,
          customerId: data.customerId,
          customerName: data.customerName,
          desiredDate: data.desiredDate,
          desiredTime: data.desiredTime,
          menu: Array.isArray(data.menu) ? data.menu.filter((item: any) => typeof item === 'string') : [],
          menuCombinations,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          status: data.status,
        });
      });
      setScoutRequests(scoutRequestsData);
    }, (error) => {
    });

    return () => {
      unsubscribeFavorites();
      unsubscribeScoutRequests();
    };
  }, [user?.id, user?.role]);

  const addFavorite = useCallback(async (hairdresserId: string, hairdresserName: string) => {
    if (!user || user.role !== 'customer') return;

    try {
      const db = getDb();
      const favoritesRef = collection(db, 'favorites');

      const newFavorite = {
        customerId: user.id,
        customerName: user.name,
        hairdresserId,
        hairdresserName,
        createdAt: serverTimestamp(),
      };

      await addDoc(favoritesRef, newFavorite);
    } catch (error) {
      throw error;
    }
  }, [user]);

  const removeFavorite = useCallback(async (hairdresserId: string) => {
    if (!user || user.role !== 'customer') return;

    try {
      const db = getDb();
      const favoritesRef = collection(db, 'favorites');
      const q = query(
        favoritesRef,
        where('customerId', '==', user.id),
        where('hairdresserId', '==', hairdresserId)
      );

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

    } catch (error) {
      throw error;
    }
  }, [user]);

  const isFavorite = useCallback((hairdresserId: string): boolean => {
    if (!user || user.role !== 'customer') return false;
    return favorites.some(f => f.customerId === user.id && f.hairdresserId === hairdresserId);
  }, [user, favorites]);

  const getFavoritesByCustomer = useCallback((customerId: string): Favorite[] => {
    return favorites.filter(f => f.customerId === customerId);
  }, [favorites]);

  const getCustomersWhoFavorited = useCallback((hairdresserId: string): Favorite[] => {
    return favorites.filter(f => f.hairdresserId === hairdresserId);
  }, [favorites]);

  const createScoutRequest = useCallback(async (
    requestData: Omit<ScoutRequest, 'id' | 'createdAt' | 'status'>
  ) => {
    if (!user || user.role !== 'hairdresser') return;

    try {
      const db = getDb();
      const scoutRequestsRef = collection(db, 'scoutRequests');

      const flatMenuCombinations = (requestData.menuCombinations || []).map(combo => {
        if (Array.isArray(combo)) {
          return combo.filter((item: any) => typeof item === 'string').join(',');
        }
        return '';
      }).filter(combo => combo.length > 0);

      const newRequest = {
        hairdresserId: requestData.hairdresserId,
        hairdresserName: requestData.hairdresserName,
        customerId: requestData.customerId,
        customerName: requestData.customerName,
        desiredDate: requestData.desiredDate || '',
        desiredTime: requestData.desiredTime || '',
        menu: Array.isArray(requestData.menu) ? requestData.menu.filter((item: any) => typeof item === 'string') : [],
        menuCombinations: flatMenuCombinations,
        address: requestData.address,
        latitude: requestData.latitude,
        longitude: requestData.longitude,
        createdAt: serverTimestamp(),
        status: 'pending',
      };

      await addDoc(scoutRequestsRef, newRequest);
    } catch (error) {
      throw error;
    }
  }, [user]);

  const acceptScoutRequest = useCallback(async (requestId: string) => {
    if (!user) return;

    try {
      const db = getDb();
      const scoutRequestRef = doc(db, 'scoutRequests', requestId);
      
      
      const scoutRequest = scoutRequests.find(r => r.id === requestId);
      if (!scoutRequest) {
        throw new Error('スカウトリクエストが見つかりません');
      }
      
      await updateDoc(scoutRequestRef, { 
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });
      
      const matchesRef = collection(db, 'matches');
      const newMatch = {
        requestId: '',
        customerId: scoutRequest.customerId,
        customerName: scoutRequest.customerName,
        hairdresserId: scoutRequest.hairdresserId,
        hairdresserName: scoutRequest.hairdresserName,
        matchedAt: serverTimestamp(),
        status: 'booking_confirmed',
        chatUnlocked: true,
        visitCompleted: false,
        ratingCompleted: false,
        source: 'scout_request',
        scoutRequestId: requestId,
        desiredDate: scoutRequest.desiredDate,
        desiredTime: scoutRequest.desiredTime,
        menu: scoutRequest.menu,
        address: scoutRequest.address,
        latitude: scoutRequest.latitude,
        longitude: scoutRequest.longitude,
      };
      
      const matchDoc = await addDoc(matchesRef, newMatch);
    } catch (error) {
      throw error;
    }
  }, [user, scoutRequests]);

  const cancelScoutRequest = useCallback(async (requestId: string) => {
    if (!user || user.role !== 'hairdresser') return;

    try {
      const db = getDb();
      const scoutRequestRef = doc(db, 'scoutRequests', requestId);
      
      await updateDoc(scoutRequestRef, { 
        status: 'rejected',
        cancelledAt: serverTimestamp()
      });
    } catch (error) {
      throw error;
    }
  }, [user]);

  const rejectScoutRequest = useCallback(async (requestId: string) => {
    if (!user) return;

    try {
      const db = getDb();
      const scoutRequestRef = doc(db, 'scoutRequests', requestId);
      
      await updateDoc(scoutRequestRef, { status: 'rejected' });
    } catch (error) {
      throw error;
    }
  }, [user]);

  const getScoutRequestsForCustomer = useCallback((customerId: string): ScoutRequest[] => {
    return scoutRequests.filter(r => r.customerId === customerId && r.status === 'pending');
  }, [scoutRequests]);

  const getScoutRequestsByHairdresser = useCallback((hairdresserId: string): ScoutRequest[] => {
    return scoutRequests.filter(r => r.hairdresserId === hairdresserId);
  }, [scoutRequests]);

  return {
    favorites,
    scoutRequests,
    isLoading,
    addFavorite,
    removeFavorite,
    isFavorite,
    getFavoritesByCustomer,
    getCustomersWhoFavorited,
    createScoutRequest,
    cancelScoutRequest,
    acceptScoutRequest,
    rejectScoutRequest,
    getScoutRequestsForCustomer,
    getScoutRequestsByHairdresser,
  };
});
