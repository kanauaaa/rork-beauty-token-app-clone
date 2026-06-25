import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getAdminApp() {
  if (app) {
    return app;
  }

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    const serviceAccountJSON = JSON.parse(serviceAccount);

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJSON),
    });

    return app;
  } catch (error) {
    throw error;
  }
}

export function getAdminAuth() {
  return getAdminApp().auth();
}

export function getAdminFirestore() {
  return getAdminApp().firestore();
}
