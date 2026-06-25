import { firebaseConfig } from './firebase-config';

export interface FirebaseAuthResult {
  user: any;
  token: string;
}

const AUTH_API_URL = `https://identitytoolkit.googleapis.com/v1`;
const API_KEY = firebaseConfig.apiKey;

let currentUser: any = null;
let authListeners: ((user: any | null) => void)[] = [];

function notifyAuthListeners(user: any | null) {
  authListeners.forEach(callback => callback(user));
}

export async function signInWithEmail(
  email: string, 
  password: string
): Promise<FirebaseAuthResult> {
  try {
    
    const response = await fetch(
      `${AUTH_API_URL}/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'ログインに失敗しました');
    }

    const data = await response.json();
    currentUser = {
      uid: data.localId,
      email: data.email,
      emailVerified: data.emailVerified || false
    };
    
    notifyAuthListeners(currentUser);
    
    return {
      user: currentUser,
      token: data.idToken
    };
  } catch (error) {
    throw error;
  }
}

export async function registerWithEmail(
  email: string,
  password: string
): Promise<FirebaseAuthResult> {
  try {
    
    const response = await fetch(
      `${AUTH_API_URL}/accounts:signUp?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '新規登録に失敗しました');
    }

    const data = await response.json();
    currentUser = {
      uid: data.localId,
      email: data.email,
      emailVerified: false
    };
    
    notifyAuthListeners(currentUser);
    
    return {
      user: currentUser,
      token: data.idToken
    };
  } catch (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  try {
    currentUser = null;
    notifyAuthListeners(null);
  } catch (error) {
    throw error;
  }
}

export function onAuthChange(callback: (user: any | null) => void): () => void {
  authListeners.push(callback);
  callback(currentUser);
  
  return () => {
    authListeners = authListeners.filter(cb => cb !== callback);
  };
}

export async function getCurrentToken(): Promise<string | null> {
  return null;
}
