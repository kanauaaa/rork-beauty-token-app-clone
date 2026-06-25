import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAg39c6FIKqQWlOZ-Z5RjbVZMT33fMTL1I",
  authDomain: "beauty-token-fbeaa.firebaseapp.com",
  projectId: "beauty-token-fbeaa",
  storageBucket: "beauty-token-fbeaa.firebasestorage.app",
  messagingSenderId: "279460830334",
  appId: "1:279460830334:web:81a4985f3ddd001b2bcc2f",
  measurementId: "G-ZLGPB6Z5D7"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

export function initializeFirebase() {
  if (app) {
    return { app, db, auth };
  }

  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
    
    return { app, db, auth };
  } catch (error) {
    throw error;
  }
}

export function getDb(): Firestore {
  if (!db) {
    const result = initializeFirebase();
    return result.db!;
  }
  return db;
}

export function getAuthInstance(): Auth {
  if (!auth) {
    const result = initializeFirebase();
    return result.auth!;
  }
  return auth;
}

export function getStorageInstance(): FirebaseStorage {
  if (!storage) {
    initializeFirebase();
    return storage!;
  }
  return storage;
}
