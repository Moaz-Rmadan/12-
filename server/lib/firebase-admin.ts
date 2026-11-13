import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let adminApp: admin.app.App | null = null;

export function getFirebaseAdminApp(): admin.app.App {
  if (adminApp) {
    return adminApp;
  }

  if (admin.apps.length > 0 && admin.apps[0]) {
    adminApp = admin.apps[0];
    return adminApp;
  }

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    const serviceAccount = serviceAccountJson ? JSON.parse(serviceAccountJson) : undefined;

    if (serviceAccount) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[FirebaseAdmin] Initialized successfully with Service Account credentials.');
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || 'alert-bedrock-707pf';
      adminApp = admin.initializeApp({
        projectId,
      });
      if (process.env.NODE_ENV === 'production') {
        console.error('[FirebaseAdmin] CRITICAL WARNING: Running in production without FIREBASE_SERVICE_ACCOUNT.');
      } else {
        console.warn('[FirebaseAdmin] Initialized with Project ID fallback (dev/test mode). Token decoding may be limited.');
      }
    }

    return adminApp;
  } catch (error) {
    console.error('[FirebaseAdmin] Initialization failed:', error);
    throw error;
  }
}

export function getFirebaseAuth(): admin.auth.Auth {
  return getFirebaseAdminApp().auth();
}

export function getFirebaseFirestore(): admin.firestore.Firestore {
  return getFirebaseAdminApp().firestore();
}

export { admin };
