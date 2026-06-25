import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '../lib/firebase-config';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const demoAccounts = [
  {
    email: 'hairdresser@demo.com',
    password: 'demo123',
    name: 'スタイリスト A',
    role: 'hairdresser',
    workplace: '関東エリア',
    workplaceName: 'サロン A',
    latitude: 35.6595,
    longitude: 139.7004,
    address: '関東エリア',
    selfIntroduction: 'カット・カラーが得意です。10年以上の経験があります！',
    hairdresserId: 'ST000001',
    status: 'approved',
    btBalance: 100,
    recommendationBt: 0,
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
  },
  {
    email: 'customer@demo.com',
    password: 'demo123',
    name: 'ユーザー B',
    role: 'customer',
    status: 'approved',
    btBalance: 50,
    recommendationBt: 0,
    subscriptionTier: 'free',
    subscriptionStatus: 'inactive',
  },
];

async function seedDemoAccounts() {
  for (const account of demoAccounts) {
    try {
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, account.email, account.password);
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          continue;
        }
        throw error;
      }

      const userId = userCredential.user.uid;

      const userDocData = {
        name: account.name,
        email: account.email,
        role: account.role,
        workplace: account.workplace || null,
        workplaceName: account.workplaceName || null,
        latitude: account.latitude || null,
        longitude: account.longitude || null,
        address: account.address || null,
        profileImageUri: null,
        hairdresserId: account.hairdresserId || null,
        status: account.status,
        selfIntroduction: account.selfIntroduction || null,
        recommendations: [],
        recommendationBt: account.recommendationBt,
        btBalance: account.btBalance,
        subscriptionTier: account.subscriptionTier,
        subscriptionStatus: account.subscriptionStatus,
        referredBy: null,
        createdAt: serverTimestamp(),
        isDemoAccount: true,
      };

      await setDoc(doc(db, 'users', userId), userDocData);
    } catch (error) {
    }
  }
}

seedDemoAccounts()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });
