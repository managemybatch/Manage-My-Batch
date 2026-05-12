import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { firebaseConfig, firestoreDatabaseId } from './firebase-config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with robust settings
// We use initializeFirestore instead of getFirestore to allow for setting custom parameters
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalForceLongPolling: true, // Forces long polling to avoid WebSocket timeouts
}, firestoreDatabaseId || '(default)');

// Test connection to Firestore
async function testConnection() {
  try {
    // Large delay to give network time to settle
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Attempt a direct server fetch
    const connectionDoc = doc(db, 'test', 'connection');
    await getDocFromServer(connectionDoc);
    console.log("Firestore connection verified.");
  } catch (error) {
    if (error instanceof Error) {
      console.warn("Firestore connection attempt issue:", error.message);
      if (error.message.includes('the client is offline')) {
        console.error("Connectivity Issue: The browser cannot reach the Firestore servers. check your internet or firewall.");
      } else if (error.message.includes('Service firestore is not available')) {
        console.error("Configuration Issue: Firestore name might be wrong or service is disabled in the console.");
      } else if (error.message.includes('Missing or insufficient permissions')) {
        // This is actually GOOD for connectivity, it means we reached the server but were denied
        console.log("Connectivity verified (Security Rules blocking test document, which is expected for some security profiles).");
      }
    }
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function safeStringify(obj: any): string {
  const cache = new WeakSet();
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      return value;
    });
  } catch (err) {
    console.error('safeStringify failed:', err);
    return '{"error": "Failed to stringify object due to circularity or complex types"}';
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Ensure we only extract safe, serializable info from any object
  const serializeError = (err: any): string => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    try {
      return String(err);
    } catch {
      return 'Unknown Error Object';
    }
  };

  const errInfo: FirestoreErrorInfo = {
    error: serializeError(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId || '',
        displayName: provider.displayName || null,
        email: provider.email || null,
        photoUrl: provider.photoURL || null
      })) || []
    },
    operationType,
    path: typeof path === 'string' ? path : (path ? String(path) : null)
  }
  
  const json = safeStringify(errInfo);
  console.error('Firestore Error Detailed:', json);
  throw new Error(json);
}

export { auth, db, testConnection, handleFirestoreError, firebaseConfig };
