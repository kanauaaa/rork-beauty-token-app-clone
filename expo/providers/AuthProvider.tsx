import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SubscriptionTier, SubscriptionStatus } from './SubscriptionProvider';
import { getAuthInstance, getDb } from '@/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';


export type Gender = 'male' | 'female' | 'unspecified';

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: 'hairdresser' | 'customer' | 'admin';
  gender?: Gender;
  workplace?: string;
  workplaceName?: string;
  hairdresserId?: string;
  status: 'pending' | 'approved' | 'rejected';
  profileImageUri?: string;
  selfIntroduction?: string;
  recommendations?: string[];
  recommendationBt?: number;
  btBalance?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  subscriptionTier?: SubscriptionTier;
  subscriptionStatus?: SubscriptionStatus;
  referredBy?: string;
  walletAddress?: string;
  isVerified?: boolean;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithCustomToken: (customToken: string) => Promise<void>;
  register: (userData: Partial<User> & { email: string; password: string; phoneNumber: string; gender?: Gender }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  verifyCustomer: (customerId: string) => Promise<void>;
  generateWalletForHairdresser: () => Promise<{ address: string; privateKey: string; mnemonic: string }>;
}

export const [AuthProvider, useAuth] = createContextHook((): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuthInstance();
    const db = getDb();
    let unsubscribeUser: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = undefined;
      }
      
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const mappedUser: User = {
              id: firebaseUser.uid,
              name: userData.name || 'Unknown',
              email: firebaseUser.email || '',
              phoneNumber: userData.phoneNumber || '',
              role: userData.role || 'customer',
              gender: userData.gender as Gender | undefined,
              workplace: userData.workplace,
              workplaceName: userData.workplaceName,
              hairdresserId: userData.hairdresserId,
              status: userData.status || 'pending',
              profileImageUri: userData.profileImageUri,
              selfIntroduction: userData.selfIntroduction,
              recommendations: userData.recommendations || [],
              recommendationBt: userData.role === 'hairdresser' ? (userData.recommendationBt || 0) : undefined,
              btBalance: userData.role === 'hairdresser' ? (userData.btBalance || 0) : undefined,
              latitude: userData.latitude,
              longitude: userData.longitude,
              address: userData.address,
              subscriptionTier: userData.subscriptionTier || 'free',
              subscriptionStatus: userData.subscriptionStatus || 'inactive',
              referredBy: userData.referredBy,
              walletAddress: userData.walletAddress,
              isVerified: userData.isVerified || false,
              createdAt: userData.createdAt || new Date().toISOString(),
            };
            setUser(mappedUser);
          }
          setIsLoading(false);
        }, (error) => {
          setIsLoading(false);
        });
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) {
        unsubscribeUser();
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const auth = getAuthInstance();
      const db = getDb();
      
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('接続タイムアウト。ネットワーク接続を確認してください。')), 30000)
      );
      
      const userCredential = await Promise.race([
        signInWithEmailAndPassword(auth, email, password),
        timeoutPromise
      ]) as any;
      const firebaseUser = userCredential.user;
      
      
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('ユーザー情報が見つかりません');
      }
      
      const userData = userDoc.data();
      
      if (userData.role === 'hairdresser' || userData.role === 'customer') {
        router.replace('/(tabs)/home' as any);
      }
    } catch (error: any) {
      let errorMessage = 'ログインに失敗しました';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'ユーザーが見つかりません';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'パスワードが正しくありません';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'このアカウントは無効化されています';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'ネットワーク接続エラー。インターネット接続を確認してください。';
      } else if (error.message && error.message.includes('タイムアウト')) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: Partial<User> & { email: string; password: string; phoneNumber: string; gender?: Gender }) => {
    setIsLoading(true);
    try {
      if (!userData.name || !userData.email || !userData.password || !userData.phoneNumber) {
        throw new Error('必須項目が不足しています');
      }

      if (userData.role === 'hairdresser' && !userData.workplace) {
        throw new Error('美容師の場合は勤務地が必要です');
      }

      const auth = getAuthInstance();
      const db = getDb();
      
      const phoneQuery = await getDoc(doc(db, 'phoneNumbers', userData.phoneNumber));
      if (phoneQuery.exists()) {
        throw new Error('この電話番号は既に登録されています');
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const firebaseUser = userCredential.user;
      
      
      const userDocData: any = {
        name: userData.name,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        role: userData.role || 'customer',
        gender: userData.gender || 'unspecified',
        profileImageUri: userData.profileImageUri || null,
        status: 'approved',
        referredBy: userData.referredBy || null,
        isVerified: false,
        createdAt: serverTimestamp(),
      };

      if (userData.role === 'hairdresser') {
        userDocData.workplace = userData.workplace || null;
        userDocData.workplaceName = userData.workplaceName || null;
        userDocData.hairdresserId = 'ST' + Math.random().toString(36).substr(2, 6);
        userDocData.selfIntroduction = userData.selfIntroduction || null;
        userDocData.latitude = userData.latitude || null;
        userDocData.longitude = userData.longitude || null;
        userDocData.address = userData.address || null;
        userDocData.recommendations = [];
        userDocData.recommendationBt = 0;
        userDocData.btBalance = 0;
        userDocData.subscriptionTier = 'free';
        userDocData.subscriptionStatus = 'inactive';
        
        try {
          const { ethers } = await import('ethers');
          const newWallet = ethers.Wallet.createRandom();
          const privateKey = newWallet.privateKey;
          const walletAddress = newWallet.address;
          const mnemonic = newWallet.mnemonic?.phrase || '';
          
          userDocData.walletAddress = walletAddress;
          
          const walletStorageKey = `@web3_private_key_${firebaseUser.uid}`;
          const mnemonicStorageKey = `@web3_mnemonic_${firebaseUser.uid}`;
          await AsyncStorage.setItem(walletStorageKey, privateKey);
          await AsyncStorage.setItem(mnemonicStorageKey, mnemonic);
          
        } catch (error) {
        }
      }

      await setDoc(doc(db, 'users', firebaseUser.uid), userDocData);
      
      await setDoc(doc(db, 'phoneNumbers', userData.phoneNumber), {
        userId: firebaseUser.uid,
        createdAt: serverTimestamp(),
      });
      
      if (userData.referredBy && userData.role === 'customer') {
        try {
          const referrerDoc = await getDoc(doc(db, 'users', userData.referredBy));
          
          if (referrerDoc.exists()) {
            const referrerData = referrerDoc.data();
            
            if (referrerData.role === 'customer') {
              const referralDocRef = doc(db, 'referrals', userData.referredBy);
              const referralDoc = await getDoc(referralDocRef);
              
              if (!referralDoc.exists()) {
                await setDoc(referralDocRef, {
                  customerId: userData.referredBy,
                  customerName: referrerData.name,
                  referredCustomers: [firebaseUser.uid],
                  hairdresserInviteCount: 2,
                  referredHairdressers: [],
                  totalBonusEarned: 0,
                  createdAt: serverTimestamp(),
                });
              } else {
                await updateDoc(referralDocRef, {
                  referredCustomers: arrayUnion(firebaseUser.uid),
                  hairdresserInviteCount: (referralDoc.data().hairdresserInviteCount || 1) + 1,
                });
              }
              
              const newCustomerReferralDoc = doc(db, 'referrals', firebaseUser.uid);
              await setDoc(newCustomerReferralDoc, {
                customerId: firebaseUser.uid,
                customerName: userData.name,
                referredCustomers: [],
                hairdresserInviteCount: 1,
                referredHairdressers: [],
                totalBonusEarned: 0,
                createdAt: serverTimestamp(),
              });
              
            } else if (referrerData.role === 'hairdresser') {
              const referralDocRef = doc(db, 'referrals', firebaseUser.uid);
              await setDoc(referralDocRef, {
                customerId: firebaseUser.uid,
                customerName: userData.name,
                referredCustomers: [],
                hairdresserInviteCount: 1,
                referredHairdressers: [{
                  hairdresserId: userData.referredBy,
                  hairdresserName: referrerData.name,
                  referredAt: new Date().toISOString(),
                  totalBTEarned: 0,
                  bonusReceived: 0,
                }],
                totalBonusEarned: 0,
                createdAt: serverTimestamp(),
              });
            }
          } else {
          }
        } catch (referralError) {
        }
      } else if (userData.role === 'customer' && !userData.referredBy) {
        const referralDocRef = doc(db, 'referrals', firebaseUser.uid);
        await setDoc(referralDocRef, {
          customerId: firebaseUser.uid,
          customerName: userData.name,
          referredCustomers: [],
          hairdresserInviteCount: 1,
          referredHairdressers: [],
          totalBonusEarned: 0,
          createdAt: serverTimestamp(),
        });
      }
      
      // Verify saved data
      const savedDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (savedDoc.exists()) {
      } else {
        throw new Error('データの保存に失敗しました');
      }
      
      
      router.replace('/(tabs)/home' as any);
    } catch (error: any) {
      
      let errorMessage = '登録に失敗しました';
      if (error.code === 'auth/admin-restricted-operation') {
        errorMessage = 'Firebase Console で Email/Password 認証を有効にする必要があります。\n\n手順:\n1. Firebase Console を開く\n2. Authentication → Sign-in method\n3. Email/Password を有効化';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'パスワードは6文字以上で設定してください';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      
      const auth = getAuthInstance();
      
      await signOut(auth);
      
      setUser(null);
      
      router.replace('/(auth)/welcome' as any);
    } catch (error) {
      throw new Error('ログアウトに失敗しました');
    }
  };

  const loginWithCustomToken = async (customToken: string) => {
    setIsLoading(true);
    try {
      const auth = getAuthInstance();
      const db = getDb();
      
      const userCredential = await signInWithCustomToken(auth, customToken);
      const firebaseUser = userCredential.user;
      
      
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('ユーザー情報が見つかりません');
      }
      
      const userData = userDoc.data();
      
    } catch (error: any) {
      throw new Error('ログインに失敗しました: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) {
      return;
    }
    
    try {
      const db = getDb();
      const userDocRef = doc(db, 'users', user.id);
      
      await updateDoc(userDocRef, updates as any);
    } catch (error) {
      throw new Error('プロフィール更新に失敗しました');
    }
  };

  const verifyCustomer = async (customerId: string) => {
    
    try {
      const db = getDb();
      const userDocRef = doc(db, 'users', customerId);
      
      await updateDoc(userDocRef, {
        isVerified: true,
      });
      
      const pendingBPRef = collection(db, 'pendingBPMints');
      const q = query(
        pendingBPRef,
        where('customerId', '==', customerId),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return;
      }
      
      for (const pendingDoc of querySnapshot.docs) {
        const pendingData = pendingDoc.data();
        
        try {
          const hairdresserDoc = await getDoc(doc(db, 'users', pendingData.hairdresserId));
          if (hairdresserDoc.exists()) {
            const hairdresserData = hairdresserDoc.data();
            const walletAddress = hairdresserData.walletAddress;
            
            if (walletAddress) {
              const privateKey = await AsyncStorage.getItem(`@web3_private_key_${pendingData.hairdresserId}`);
              if (privateKey) {
                const { ethers } = await import('ethers');
                const { BP_SBT_ABI, BP_SBT_CONTRACT_ADDRESS } = await import('@/lib/sbt-contract');
                const provider = new ethers.JsonRpcProvider('https://polygon-bor-rpc.publicnode.com');
                const wallet = new ethers.Wallet(privateKey, provider);
                
                for (const category of pendingData.categories) {
                  if (category.btAmount > 0) {
                    const contract = new ethers.Contract(BP_SBT_CONTRACT_ADDRESS, BP_SBT_ABI, wallet);
                    try {
                      const tx = await contract.mintBP(walletAddress, category.btAmount, category.id);
                      await tx.wait();
                    } catch (mintError) {
                    }
                  }
                }
                
                await updateDoc(doc(db, 'pendingBPMints', pendingDoc.id), {
                  status: 'completed',
                  mintedAt: serverTimestamp(),
                });
              } else {
              }
            } else {
            }
          }
        } catch (mintError) {
          await updateDoc(doc(db, 'pendingBPMints', pendingDoc.id), {
            status: 'failed',
            error: String(mintError),
            updatedAt: serverTimestamp(),
          });
        }
      }
      
    } catch (error) {
      throw new Error('本人確認処理に失敗しました');
    }
  };

  const generateWalletForHairdresser = async (): Promise<{ address: string; privateKey: string; mnemonic: string }> => {
    if (!user) {
      throw new Error('ログインが必要です');
    }

    if (user.walletAddress) {
      const existingKey = await AsyncStorage.getItem(`@web3_private_key_${user.id}`);
      if (existingKey) {
        const { ethers } = await import('ethers');
        const existingWallet = new ethers.Wallet(existingKey);
        const existingMnemonic = await AsyncStorage.getItem(`@web3_mnemonic_${user.id}`) || '';
        return {
          address: existingWallet.address,
          privateKey: existingKey,
          mnemonic: existingMnemonic,
        };
      }
    }

    try {
      const { ethers } = await import('ethers');
      const newWallet = ethers.Wallet.createRandom();
      const privateKey = newWallet.privateKey;
      const walletAddress = newWallet.address;
      const mnemonic = newWallet.mnemonic?.phrase || '';

      const walletStorageKey = `@web3_private_key_${user.id}`;
      const mnemonicStorageKey = `@web3_mnemonic_${user.id}`;
      await AsyncStorage.setItem(walletStorageKey, privateKey);
      await AsyncStorage.setItem(mnemonicStorageKey, mnemonic);

      await updateProfile({ walletAddress });


      return { address: walletAddress, privateKey, mnemonic };
    } catch (error) {
      throw error;
    }
  };

  return {
    user,
    isLoading,
    login,
    loginWithCustomToken,
    register,
    logout,
    updateProfile,
    verifyCustomer,
    generateWalletForHairdresser,
  };
});