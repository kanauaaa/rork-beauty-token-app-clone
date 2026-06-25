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
  deleteDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';

export interface RatingTask {
  id: string;
  customerId: string;
  customerName: string;
  hairdresserId: string;
  hairdresserName: string;
  checkInDate: string;
  status: 'pending' | 'completed';
  createdAt: string;
}

interface RatingTaskState {
  tasks: RatingTask[];
  isLoading: boolean;
  createRatingTask: (taskData: Omit<RatingTask, 'id' | 'createdAt'>) => Promise<string>;
  completeRatingTask: (taskId: string) => Promise<void>;
  getPendingTasksForCustomer: (customerId: string) => RatingTask[];
  deleteRatingTask: (taskId: string) => Promise<void>;
  deleteMultipleTasks: (taskIds: string[]) => Promise<void>;
  deleteAllTasksByCustomer: (customerId: string) => Promise<void>;
}

const ENABLE_MOCK_TASKS = false;

const MOCK_TASKS: RatingTask[] = [
  {
    id: 'mock-task-1',
    customerId: 'test-customer-1',
    customerName: 'テスト顧客',
    hairdresserId: 'test-hairdresser-1',
    hairdresserName: 'テスト美容師 太郎',
    checkInDate: new Date().toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-task-2',
    customerId: 'test-customer-1',
    customerName: 'テスト顧客',
    hairdresserId: 'test-hairdresser-2',
    hairdresserName: 'テスト美容師 花子',
    checkInDate: new Date(Date.now() - 86400000).toISOString(),
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const [RatingTaskProvider, useRatingTasks] = createContextHook((): RatingTaskState => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<RatingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (ENABLE_MOCK_TASKS) {
      if (!user?.id) {
        setTasks(MOCK_TASKS);
        setIsLoading(false);
        return;
      }

      if (user.role === 'customer') {
        const mockTasksForUser = MOCK_TASKS.map(task => ({
          ...task,
          customerId: user.id,
          customerName: user.name,
        }));
        setTasks(mockTasksForUser);
        setIsLoading(false);
        return;
      }
    }

    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const db = getDb();
    const tasksRef = collection(db, 'ratingTasks');

    let tasksQuery;
    if (user.role === 'customer') {
      tasksQuery = query(
        tasksRef, 
        where('customerId', '==', user.id),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
    } else {
      tasksQuery = query(tasksRef, orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData: RatingTask[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        tasksData.push({
          id: doc.id,
          customerId: data.customerId,
          customerName: data.customerName,
          hairdresserId: data.hairdresserId,
          hairdresserName: data.hairdresserName,
          checkInDate: data.checkInDate,
          status: data.status || 'pending',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        });
      });
      
      if (ENABLE_MOCK_TASKS && user.role === 'customer' && tasksData.length === 0) {
        const mockTasksForUser = MOCK_TASKS.map(task => ({
          ...task,
          customerId: user.id,
          customerName: user.name,
        }));
        setTasks(mockTasksForUser);
      } else {
        setTasks(tasksData);
      }
      
      setIsLoading(false);
    }, (error) => {
      if (ENABLE_MOCK_TASKS && user.role === 'customer') {
        const mockTasksForUser = MOCK_TASKS.map(task => ({
          ...task,
          customerId: user.id,
          customerName: user.name,
        }));
        setTasks(mockTasksForUser);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const createRatingTask = useCallback(async (taskData: Omit<RatingTask, 'id' | 'createdAt'>) => {
    
    try {
      const db = getDb();
      
      const tasksRef = collection(db, 'ratingTasks');

      const newTaskData = {
        ...taskData,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(tasksRef, newTaskData);
      
      return docRef.id;
    } catch (error) {
      throw error;
    }
  }, []);

  const completeRatingTask = useCallback(async (taskId: string) => {
    console.log('[RatingTask] completeRatingTask called with taskId:', taskId);
    
    if (taskId.startsWith('mock-')) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return;
    }
    
    if (taskId.startsWith('dispute_')) {
      console.log('[RatingTask] Dispute-based task, skipping Firestore delete:', taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return;
    }
    
    const db = getDb();
    const taskRef = doc(db, 'ratingTasks', taskId);
    
    await deleteDoc(taskRef);
    console.log('[RatingTask] Task deleted from Firestore:', taskId);
  }, []);

  const getPendingTasksForCustomer = useCallback((customerId: string): RatingTask[] => {
    return tasks.filter(task => task.customerId === customerId && task.status === 'pending');
  }, [tasks]);

  const deleteRatingTask = useCallback(async (taskId: string) => {
    
    if (taskId.startsWith('mock-')) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      return;
    }
    
    const db = getDb();
    const taskRef = doc(db, 'ratingTasks', taskId);
    
    await deleteDoc(taskRef);
  }, []);

  const deleteMultipleTasks = useCallback(async (taskIds: string[]) => {
    
    const mockTaskIds = taskIds.filter(id => id.startsWith('mock-'));
    const firestoreTaskIds = taskIds.filter(id => !id.startsWith('mock-'));
    
    if (mockTaskIds.length > 0) {
      setTasks(prev => prev.filter(t => !mockTaskIds.includes(t.id)));
    }
    
    if (firestoreTaskIds.length === 0) {
      return;
    }
    
    const db = getDb();
    const batch = writeBatch(db);
    
    firestoreTaskIds.forEach(taskId => {
      const taskRef = doc(db, 'ratingTasks', taskId);
      batch.delete(taskRef);
    });
    
    await batch.commit();
  }, []);

  const deleteAllTasksByCustomer = useCallback(async (customerId: string) => {
    
    const customerTasks = tasks.filter(task => task.customerId === customerId && task.status === 'pending');
    const taskIds = customerTasks.map(task => task.id);
    
    if (taskIds.length === 0) {
      return;
    }
    
    await deleteMultipleTasks(taskIds);
  }, [tasks, deleteMultipleTasks]);

  return {
    tasks,
    isLoading,
    createRatingTask,
    completeRatingTask,
    getPendingTasksForCustomer,
    deleteRatingTask,
    deleteMultipleTasks,
    deleteAllTasksByCustomer,
  };
});
