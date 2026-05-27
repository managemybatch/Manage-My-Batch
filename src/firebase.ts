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
  const visited = new WeakSet();

  function preClean(val: any): any {
    // Handle standard primitives and null directly
    if (val === null || typeof val !== 'object') {
      return val;
    }

    // Circular reference check
    if (visited.has(val)) {
      return '[Circular]';
    }
    visited.add(val);

    // Date
    if (val instanceof Date) {
      return val.toISOString();
    }

    // RegExp
    if (val instanceof RegExp) {
      return val.toString();
    }

    // Set
    if (val instanceof Set) {
      return Array.from(val).map(item => preClean(item));
    }

    // Map
    if (val instanceof Map) {
      const mapObj: any = {};
      val.forEach((v, k) => {
        try {
          mapObj[String(k)] = preClean(v);
        } catch {
          // ignore
        }
      });
      return mapObj;
    }

    const asAny = val as any;

    // Custom toJSON support
    if (typeof asAny.toJSON === 'function') {
      try {
        const jsonVal = asAny.toJSON();
        if (jsonVal === val) {
          return '[Circular toJSON]';
        }
        return preClean(jsonVal);
      } catch {
        return '[Unreadable toJSON]';
      }
    }

    // Native Firestore Ref
    if (typeof asAny.path === 'string' && typeof asAny.id === 'string' && (asAny.firestore || asAny._firestore)) {
      return `[FirestoreRef: ${asAny.path}]`;
    }

    // Timestamp
    if (typeof asAny.seconds === 'number' && typeof asAny.nanoseconds === 'number' && typeof asAny.toDate === 'function') {
      try {
        return asAny.toDate().toISOString();
      } catch {
        return `[Timestamp: ${asAny.seconds}]`;
      }
    }

    // GeoPoint
    if (typeof asAny.latitude === 'number' && typeof asAny.longitude === 'number' && !asAny.path) {
      return `[GeoPoint: ${asAny.latitude}, ${asAny.longitude}]`;
    }

    // DOM Element
    if (asAny.nodeType && typeof asAny.nodeName === 'string') {
      return `[DOMElement: ${asAny.nodeName}]`;
    }

    // React Fiber
    if (asAny.$$typeof || asAny._owner || asAny._reactInternalFiber || asAny._reactFiber) {
      return '[ReactInternal]';
    }

    // DOM Event
    if (typeof asAny.preventDefault === 'function' && typeof asAny.stopPropagation === 'function') {
      return '[DOMEvent]';
    }

    // Window / Global
    if (val === window || val === document || (asAny.location && asAny.history)) {
      return '[GlobalWindow]';
    }

    // Error Object
    if (val instanceof Error) {
      const errRes: any = {
        name: val.name,
        message: val.message,
        stack: val.stack
      };
      
      const propNames = Object.getOwnPropertyNames(val);
      for (const k of propNames) {
        try {
          const subVal = asAny[k];
          if (subVal === null || typeof subVal !== 'object') {
            errRes[k] = subVal;
          } else if (k === 'customData' && typeof subVal === 'object') {
            errRes[k] = {};
            const subProps = Object.getOwnPropertyNames(subVal);
            for (const subKey of subProps) {
              try {
                const subSubVal = subVal[subKey];
                if (subSubVal === null || typeof subSubVal !== 'object') {
                  errRes[k][subKey] = subSubVal;
                } else {
                  errRes[k][subKey] = `[${typeof subSubVal}]`;
                }
              } catch {
                errRes[k][subKey] = '[Unreadable]';
              }
            }
          } else {
            errRes[k] = `[${subVal.constructor?.name || typeof subVal}]`;
          }
        } catch {
          // ignore
        }
      }
      return errRes;
    }

    // Array
    if (Array.isArray(val)) {
      return val.map(item => preClean(item));
    }

    // For any object, let's build a safe plain object deep copy
    const copy: any = {};
    const keys = Object.getOwnPropertyNames(val);
    for (const k of keys) {
      try {
        const valueAtKey = asAny[k];
        copy[k] = preClean(valueAtKey);
      } catch {
        copy[k] = '[Unreadable]';
      }
    }
    return copy;
  }

  try {
    const cleaned = preClean(obj);
    return JSON.stringify(cleaned);
  } catch (err) {
    console.error('safeStringify fail:', err);
    return '{"error": "Failed to serialize"}';
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
