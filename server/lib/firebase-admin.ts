import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface FirebaseAppletConfig {
  projectId?: string;
  firestoreDatabaseId?: string;
}

function loadAppletConfig(): FirebaseAppletConfig {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as FirebaseAppletConfig;
    }
  } catch (err) {
    console.warn('[FirebaseAdmin] Unable to read firebase-applet-config.json:', err);
  }
  return {};
}

const appletConfig = loadAppletConfig();
let adminApp: admin.app.App | null = null;
let firestoreInstance: admin.firestore.Firestore | null = null;

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
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || appletConfig.projectId,
      });
      console.log('[FirebaseAdmin] Initialized successfully with Service Account credentials.');
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || appletConfig.projectId || 'alert-bedrock-707pf';
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

export function hasServiceAccountCredentials(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_SERVICE_ACCOUNT.trim().length > 0);
}

export function getFirebaseAuth(): admin.auth.Auth {
  return getFirebaseAdminApp().auth();
}

export function getFirebaseFirestore(): admin.firestore.Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const app = getFirebaseAdminApp();
  const databaseId = process.env.FIRESTORE_DATABASE_ID || appletConfig.firestoreDatabaseId;

  firestoreInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  return firestoreInstance;
}

export { admin };
