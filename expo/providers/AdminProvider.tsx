import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { getDb } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useWeb3 } from './Web3Provider';

export interface PendingBP {
  id: string;
  hairdresserId: string;
  hairdresserName: string;
  hairdresserWalletAddress?: string;
  customerId: string;
  customerName: string;
  customerWalletAddress?: string;
  ratingId: string;
  categories: {
    id: string;
    name: string;
    rating: number;
    btAmount: number;
  }[];
  totalBT: number;
  status: 'pending' | 'minted' | 'failed';
  createdAt: string;
  mintedAt?: string;
  txHash?: string;
  errorMessage?: string;
}

interface AdminState {
  pendingBPs: PendingBP[];
  isLoading: boolean;
  mintBP: (bpId: string) => Promise<void>;
  getAllPendingBPs: () => Promise<void>;
}

export const [AdminProvider, useAdmin] = createContextHook((): AdminState => {
  const [pendingBPs, setPendingBPs] = useState<PendingBP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { mintBPSBT, wallet, address } = useWeb3();

  useEffect(() => {
    const db = getDb();

    const pendingBPsRef = collection(db, 'pendingBPMints');
    const q = query(
      pendingBPsRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const bps: PendingBP[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            hairdresserId: data.hairdresserId,
            hairdresserName: data.hairdresserName,
            hairdresserWalletAddress: data.hairdresserWalletAddress,
            customerId: data.customerId,
            customerName: data.customerName,
            customerWalletAddress: data.customerWalletAddress,
            ratingId: data.ratingId,
            categories: data.categories || [],
            totalBT: data.totalBT,
            status: data.status,
            createdAt: data.createdAt instanceof Timestamp 
              ? data.createdAt.toDate().toISOString() 
              : data.createdAt,
            mintedAt: data.mintedAt instanceof Timestamp 
              ? data.mintedAt.toDate().toISOString() 
              : data.mintedAt,
            txHash: data.txHash,
            errorMessage: data.errorMessage,
          };
        });

        setPendingBPs(bps);
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const mintBP = async (bpId: string) => {
    try {

      if (!wallet || !address) {
        throw new Error('管理者ウォレットが接続されていません');
      }

      const bp = pendingBPs.find(b => b.id === bpId);
      if (!bp) {
        throw new Error('BPが見つかりません');
      }

      if (!bp.customerWalletAddress) {
        throw new Error('顧客のウォレットアドレスが設定されていません');
      }

      const db = getDb();
      const bpRef = doc(db, 'pendingBPMints', bpId);

      for (const category of bp.categories) {
        
        const txHash = await mintBPSBT(
          bp.customerWalletAddress,
          category.btAmount,
          category.name
        );

      }

      await updateDoc(bpRef, {
        status: 'minted',
        mintedAt: Timestamp.now(),
        mintedBy: address,
      });

    } catch (error) {

      const db = getDb();
      const bpRef = doc(db, 'pendingBPMints', bpId);
      await updateDoc(bpRef, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  };

  const getAllPendingBPs = async () => {
    setIsLoading(true);
    try {
      const db = getDb();
      const pendingBPsRef = collection(db, 'pendingBPMints');
      const q = query(
        pendingBPsRef,
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const bps: PendingBP[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          hairdresserId: data.hairdresserId,
          hairdresserName: data.hairdresserName,
          hairdresserWalletAddress: data.hairdresserWalletAddress,
          customerId: data.customerId,
          customerName: data.customerName,
          customerWalletAddress: data.customerWalletAddress,
          ratingId: data.ratingId,
          categories: data.categories || [],
          totalBT: data.totalBT,
          status: data.status,
          createdAt: data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate().toISOString() 
            : data.createdAt,
        };
      });

      setPendingBPs(bps);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    pendingBPs,
    isLoading,
    mintBP,
    getAllPendingBPs,
  };
});
