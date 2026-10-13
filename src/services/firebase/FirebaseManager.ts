import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const DEFAULT_CONFIG: FirebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || 'AIzaSyA_TRUMPET_NOTES_DEMO_KEY',
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || 'trumpetnotes-demo.firebaseapp.com',
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || 'trumpetnotes-demo',
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || 'trumpetnotes-demo.appspot.com',
  messagingSenderId: '346257507147',
  appId: '1:346257507147:web:7f81b1c1a9300',
};

/**
 * Singleton FirebaseManager with offline persistent multi-tab cache.
 */
export class FirebaseManager {
  private static instance: FirebaseManager | null = null;
  private app: FirebaseApp;
  private db: Firestore;
  private isOfflineOnly: boolean = false;

  private constructor() {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      this.app = existingApps[0];
    } else {
      this.app = initializeApp(DEFAULT_CONFIG);
    }

    try {
      // Initialize Firestore with persistent multi-tab local cache
      this.db = initializeFirestore(this.app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // If already initialized or cache unsupported in sandbox
      try {
        this.db = getFirestore(this.app);
      } catch {
        this.isOfflineOnly = true;
        this.db = {} as Firestore;
      }
    }
  }

  public static getInstance(): FirebaseManager {
    if (!FirebaseManager.instance) {
      FirebaseManager.instance = new FirebaseManager();
    }
    return FirebaseManager.instance;
  }

  public getFirestore(): Firestore {
    return this.db;
  }

  public getApp(): FirebaseApp {
    return this.app;
  }

  public isOfflineMode(): boolean {
    return this.isOfflineOnly || (typeof navigator !== 'undefined' && !navigator.onLine);
  }
}
