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
  
  // Internal recursive stringifier that doesn't rely on JSON.stringify's replacer for circularity if possible
  const safeReplacer = (key: string, value: any) => {
    // Handle standard primitives and null directly
    if (value === null || typeof value !== 'object') {
      return value;
    }

    // Circular reference check
    if (cache.has(value)) {
      return '[Circular]';
    }
    cache.add(value);

    // Native Firestore objects handling (obfuscation-safe)
    // DocumentReference/CollectionReference check
    if (typeof value.path === 'string' && (typeof value.id === 'string') && (value.firestore || value._firestore)) {
      return `[FirestoreRef: ${value.path}]`;
    }
    
    // Timestamp check (has seconds and nanoseconds)
    if (typeof value.seconds === 'number' && typeof value.nanoseconds === 'number' && typeof value.toDate === 'function') {
      try {
        return value.toDate().toISOString();
      } catch {
        return `[Timestamp: ${value.seconds}]`;
      }
    }
    
    // GeoPoint check
    if (typeof value.latitude === 'number' && typeof value.longitude === 'number' && !value.path) {
      return `[GeoPoint: ${value.latitude}, ${value.longitude}]`;
    }

    // Protection against DOM elements and React internals which are often circular
    if (value.nodeType && typeof value.nodeName === 'string') {
      return `[DOMElement: ${value.nodeName}]`;
    }
    if (value.$$typeof || value._owner || value._reactInternalFiber || value._reactFiber) {
      return '[ReactInternal]';
    }

    // Handle Error objects specially because message/stack are non-enumerable
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
        ...value // Include other enumerable properties (like code in Firebase errors)
      };
    }

    return value;
  };

  try {
    return JSON.stringify(obj, safeReplacer);
  } catch (err) {
    console.error('safeStringify failed:', err);
    // Ultimate fallback: shallow serializable version
    try {
      const fallback: any = {};
      const keys = Object.keys(obj); // Only enumerable own properties
      for (const k of keys) {
        try {
          const val = obj[k];
          if (val === null || typeof val !== 'object') {
            fallback[k] = val;
          } else {
            fallback[k] = `[${typeof val}]`;
          }
        } catch {
          fallback[k] = '[Unreadable]';
        }
      }
      return JSON.stringify(fallback);
    } catch {
      return '{"error": "Total failure to stringify object"}';
    }
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
