import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
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
  updateDoc,
  increment,
  deleteDoc,
} from 'firebase/firestore';

export interface AssistantBTTransfer {
  id: string;
  fromHairdresserId: string;
  fromHairdresserName: string;
  toHairdresserId: string;
  toHairdresserName: string;
  categories: {
    id: string;
    name: string;
    btAmount: number;
  }[];
  totalBT: number;
  btDiscarded: number;
  customerId: string;
  customerName: string;
  originalRatingId: string;
  createdAt: string;
}

export interface AssistantBTTask {
  id: string;
  fromHairdresserId: string;
  fromHairdresserName: string;
  toHairdresserId: string;
  toHairdresserName: string;
  assistantBTAmount: number;
  customerId: string;
  customerName: string;
  originalRatingId: string;
  status: 'pending' | 'completed';
  createdAt: string;
}

interface AssistantBTState {
  transfers: AssistantBTTransfer[];
  tasks: AssistantBTTask[];
  isLoading: boolean;
  createAssistantBTTask: (taskData: Omit<AssistantBTTask, 'id' | 'createdAt'>) => Promise<void>;
  transferAssistantBT: (transferData: Omit<AssistantBTTransfer, 'id' | 'createdAt'>) => Promise<void>;
  getRemainingAssistantBT: (originalRatingId: string) => number;
  getPendingTasksForHairdresser: (hairdresserId: string) => AssistantBTTask[];
}

export const [AssistantBTProvider, useAssistantBT] = createContextHook((): AssistantBTState => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<AssistantBTTransfer[]>([]);
  const [tasks, setTasks] = useState<AssistantBTTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const db = getDb();

    const transfersRef = collection(db, 'assistantBTTransfers');
    let transfersQuery;
    if (user.role === 'hairdresser') {
      transfersQuery = query(
        transfersRef,
        where('fromHairdresserId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
    } else {
      transfersQuery = query(transfersRef, orderBy('createdAt', 'desc'));
    }

    const unsubscribeTransfers = onSnapshot(transfersQuery, (snapshot) => {
      const transfersData: AssistantBTTransfer[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        transfersData.push({
          id: doc.id,
          fromHairdresserId: data.fromHairdresserId,
          fromHairdresserName: data.fromHairdresserName,
          toHairdresserId: data.toHairdresserId,
          toHairdresserName: data.toHairdresserName,
          categories: data.categories || [],
          totalBT: data.totalBT,
          btDiscarded: data.btDiscarded || 0,
          customerId: data.customerId,
          customerName: data.customerName,
          originalRatingId: data.originalRatingId,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        });
      });
      setTransfers(transfersData);
    }, (error) => {
      setTransfers([]);
    });

    const tasksRef = collection(db, 'assistantBTTasks');
    let tasksQuery;
    if (user.role === 'hairdresser') {
      tasksQuery = query(
        tasksRef,
        where('fromHairdresserId', '==', user.id),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
    } else {
      tasksQuery = query(tasksRef, orderBy('createdAt', 'desc'));
    }

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData: AssistantBTTask[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        tasksData.push({
          id: doc.id,
          fromHairdresserId: data.fromHairdresserId,
          fromHairdresserName: data.fromHairdresserName,
          toHairdresserId: data.toHairdresserId,
          toHairdresserName: data.toHairdresserName,
          assistantBTAmount: data.assistantBTAmount,
          customerId: data.customerId,
          customerName: data.customerName,
          originalRatingId: data.originalRatingId,
          status: data.status || 'pending',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        });
      });
      
      setTasks(tasksData);
      setIsLoading(false);
    }, (error) => {
      setTasks([]);
      setIsLoading(false);
    });

    return () => {
      unsubscribeTransfers();
      unsubscribeTasks();
    };
  }, [user]);

  const createAssistantBTTask = useCallback(async (taskData: Omit<AssistantBTTask, 'id' | 'createdAt'>) => {
    
    const db = getDb();
    const tasksRef = collection(db, 'assistantBTTasks');

    const newTaskData = {
      ...taskData,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(tasksRef, newTaskData);
  }, []);

  const transferAssistantBT = useCallback(async (transferData: Omit<AssistantBTTransfer, 'id' | 'createdAt'>) => {
    
    const db = getDb();
    const transfersRef = collection(db, 'assistantBTTransfers');

    const newTransferData = {
      ...transferData,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(transfersRef, newTransferData);

    const toHairdresserRef = doc(db, 'users', transferData.toHairdresserId);
    await updateDoc(toHairdresserRef, {
      btBalance: increment(transferData.totalBT),
    });

    const totalDeduction = transferData.totalBT + transferData.btDiscarded;
    const fromHairdresserRef = doc(db, 'users', transferData.fromHairdresserId);
    await updateDoc(fromHairdresserRef, {
      btBalance: increment(-totalDeduction),
    });

    if (transferData.categories.length > 0 || transferData.btDiscarded > 0) {
      const ratingsRef = collection(db, 'ratings');
      
      
      const mainHairdresserRatingData = {
        customerId: transferData.customerId,
        customerName: transferData.customerName,
        hairdresserId: transferData.fromHairdresserId,
        hairdresserName: transferData.fromHairdresserName,
        paidAmount: 0,
        totalBT: -transferData.totalBT,
        categories: [
          {
            id: 'assistant',
            name: 'アシスタント',
            rating: 0,
            btAmount: -transferData.totalBT,
          }
        ],
        assistants: [],
        btDiscarded: transferData.btDiscarded,
        comment: `アシスタントBP付与により減算（${transferData.toHairdresserName}さんへ）`,
        createdAt: serverTimestamp(),
        btReflected: true,
      };
      await addDoc(ratingsRef, mainHairdresserRatingData);
      
      if (transferData.categories.length > 0) {
        
        const assistantRatingData = {
          customerId: transferData.customerId,
          customerName: transferData.customerName,
          hairdresserId: transferData.toHairdresserId,
          hairdresserName: transferData.toHairdresserName,
          paidAmount: 0,
          totalBT: transferData.totalBT,
          categories: transferData.categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            rating: 5,
            btAmount: cat.btAmount,
          })),
          assistants: [],
          btDiscarded: 0,
          comment: `アシスタントBP付与（${transferData.fromHairdresserName}さんから）`,
          createdAt: serverTimestamp(),
          btReflected: true,
        };
        await addDoc(ratingsRef, assistantRatingData);
      }
    }

    const task = tasks.find(t => t.originalRatingId === transferData.originalRatingId);
    if (task) {
      const transferred = transfers
        .filter(t => t.originalRatingId === transferData.originalRatingId)
        .reduce((sum, t) => sum + t.totalBT + t.btDiscarded, 0);
      
      const newTransferred = transferred + transferData.totalBT + transferData.btDiscarded;
      const remainingBT = task.assistantBTAmount - newTransferred;
      
      
      if (remainingBT <= 0) {
        const taskRef = doc(db, 'assistantBTTasks', task.id);
        await deleteDoc(taskRef);
      }
    }
  }, [tasks, transfers]);

  const getRemainingAssistantBT = useCallback((originalRatingId: string): number => {
    const task = tasks.find(t => t.originalRatingId === originalRatingId);
    if (!task) return 0;

    const transferred = transfers
      .filter(t => t.originalRatingId === originalRatingId)
      .reduce((sum, t) => sum + t.totalBT + t.btDiscarded, 0);

    return Math.max(0, task.assistantBTAmount - transferred);
  }, [tasks, transfers]);

  const getPendingTasksForHairdresser = useCallback((hairdresserId: string): AssistantBTTask[] => {
    return tasks.filter(task => task.fromHairdresserId === hairdresserId && task.status === 'pending');
  }, [tasks]);

  return {
    transfers,
    tasks,
    isLoading,
    createAssistantBTTask,
    transferAssistantBT,
    getRemainingAssistantBT,
    getPendingTasksForHairdresser,
  };
});
