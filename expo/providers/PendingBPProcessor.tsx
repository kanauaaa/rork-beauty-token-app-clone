import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './AuthProvider';
import { useWeb3 } from './Web3Provider';
import { useBPEarned } from './BPEarnedProvider';
import { useRatings } from './RatingProvider';
import { PendingBP } from './RatingProvider';
import { getDb } from '@/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

interface MintResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

interface ProcessorState {
  pendingMints: PendingBP[];
  processingIds: Set<string>;
  isProcessing: boolean;
  lastProcessedAt: string | null;
  processAllPending: () => Promise<void>;
  processSingleMint: (mintId: string) => Promise<MintResult>;
}

export const [PendingBPProcessorProvider, usePendingBPProcessor] = createContextHook((): ProcessorState => {
  const { user } = useAuth();
  const web3 = useWeb3();
  const { triggerEarned } = useBPEarned();
  const { getBTDistribution } = useRatings();
  const [pendingMints, setPendingMints] = useState<PendingBP[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedAt, setLastProcessedAt] = useState<string | null>(null);
  const autoProcessTriggered = useRef(false);
  const lastPendingIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const db = getDb();
    const pendingRef = collection(db, 'pendingBPMints');

    let pendingQuery;
    if (user.role === 'hairdresser') {
      pendingQuery = query(
        pendingRef,
        where('hairdresserId', '==', user.id),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
    } else {
      pendingQuery = query(
        pendingRef,
        where('customerId', '==', user.id),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(pendingQuery, (snapshot) => {
      const mints: PendingBP[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        mints.push({
          id: docSnap.id,
          hairdresserId: data.hairdresserId,
          hairdresserName: data.hairdresserName,
          hairdresserWalletAddress: data.hairdresserWalletAddress,
          customerId: data.customerId,
          customerName: data.customerName,
          customerWalletAddress: data.customerWalletAddress,
          ratingId: data.ratingId,
          categories: data.categories || [],
          totalBT: data.totalBT,
          status: data.status || 'pending',
          txHash: data.txHash,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        });
      });
      setPendingMints(mints);
    }, (_error) => {
    });

    return () => unsubscribe();
  }, [user]);

  const processSingleMint = useCallback(async (mintId: string): Promise<MintResult> => {
    const mint = pendingMints.find(m => m.id === mintId);
    if (!mint) {
      return { success: false, error: 'Mint record not found' };
    }

    if (!web3.isConnected || !web3.address) {
      return { success: false, error: 'Wallet not connected' };
    }

    const targetAddress = mint.hairdresserWalletAddress || web3.address;

    setProcessingIds(prev => new Set(prev).add(mintId));

    try {
      const db = getDb();
      await updateDoc(doc(db, 'pendingBPMints', mintId), {
        status: 'processing',
        updatedAt: serverTimestamp(),
      });

      const txHash = await web3.mintBPSBTWithPaymaster(targetAddress, mint.totalBT, 'combined');

      await updateDoc(doc(db, 'pendingBPMints', mintId), {
        status: 'minted',
        txHash,
        updatedAt: serverTimestamp(),
      });

      const now = new Date().toISOString();
      setLastProcessedAt(now);

      const historyKey = `@bp_mint_history_${user?.id}`;
      try {
        const existing = await AsyncStorage.getItem(historyKey);
        const history = existing ? JSON.parse(existing) : [];
        history.unshift({
          mintId,
          txHash,
          totalBT: mint.totalBT,
          hairdresserName: mint.hairdresserName,
          customerName: mint.customerName,
          timestamp: now,
        });
        await AsyncStorage.setItem(historyKey, JSON.stringify(history.slice(0, 50)));
      } catch {
      }

      return { success: true, txHash };
    } catch (error: any) {
      try {
        const db = getDb();
        await updateDoc(doc(db, 'pendingBPMints', mintId), {
          status: 'failed',
          errorMessage: error.message || 'Unknown error',
          updatedAt: serverTimestamp(),
        });
      } catch {
      }

      return { success: false, error: error.message || 'Minting failed' };
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(mintId);
        return next;
      });
    }
  }, [pendingMints, web3, user]);

  const processAllPending = useCallback(async () => {
    if (isProcessing) return;
    if (!web3.isConnected || !web3.address) return;
    if (pendingMints.length === 0) return;

    setIsProcessing(true);

    let successCount = 0;
    let failCount = 0;
    let cumulativeBP = user?.id ? getBTDistribution(user.id).total : 0;

    for (const mint of pendingMints) {
      if (processingIds.has(mint.id)) continue;

      const result = await processSingleMint(mint.id);
      if (result.success) {
        successCount++;
        cumulativeBP += mint.totalBT;
        triggerEarned(mint.totalBT, cumulativeBP);
      } else {
        failCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 2200));
    }

    setIsProcessing(false);
  }, [isProcessing, web3, pendingMints, processingIds, processSingleMint]);

  useEffect(() => {
    const currentIds = pendingMints.map(m => m.id).sort();
    const prevIds = lastPendingIdsRef.current.sort();
    const hasNewMints = currentIds.length !== prevIds.length
      || currentIds.some((id, i) => id !== prevIds[i]);

    if (
      hasNewMints &&
      web3.isConnected &&
      web3.address &&
      user?.role === 'hairdresser' &&
      pendingMints.length > 0 &&
      web3.wallet
    ) {
      lastPendingIdsRef.current = currentIds;
      autoProcessTriggered.current = true;
      const delay = autoProcessTriggered.current ? 1500 : 3000;
      setTimeout(() => {
        void processAllPending();
      }, delay);
    }
  }, [web3.isConnected, web3.address, pendingMints, user, web3.wallet, processAllPending]);

  return useMemo(() => ({
    pendingMints,
    processingIds,
    isProcessing,
    lastProcessedAt,
    processAllPending,
    processSingleMint,
  }), [pendingMints, processingIds, isProcessing, lastProcessedAt, processAllPending, processSingleMint]);
});
