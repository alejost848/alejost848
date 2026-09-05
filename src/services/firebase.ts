import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import {
  getDatabase,
  ref,
  onValue,
  get,
  query,
  orderByChild,
  limitToLast,
  set,
  DataSnapshot,
} from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyClG-y7seb17rhGIa3hN4QCLn_8Ren4SRw',
  authDomain: 'alejost848-afea9.firebaseapp.com',
  databaseURL: 'https://alejost848-afea9.firebaseio.com',
  projectId: 'alejost848-afea9',
  storageBucket: 'alejost848-afea9.appspot.com',
  messagingSenderId: '776617594441',
};

// Initialize Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getDatabase(app);

// Authentication helper
export function initAuth(onUserChanged?: (user: User | null) => void) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      onUserChanged?.(user);
    } else {
      signInAnonymously(auth).catch((error) => {
        console.warn('Anonymous sign-in error:', error);
      });
    }
  });
}

// In-memory cache for instant re-render of visited data
const dataCache = new Map<string, any>();

export function getCachedPath<T = any>(path: string): T | null {
  return dataCache.has(path) ? dataCache.get(path) : null;
}

// Database subscription helper
export function subscribeToPath<T = any>(
  path: string,
  callback: (data: T | null) => void,
  options?: { orderByChild?: string; limitToLast?: number }
): () => void {
  const cacheKey = `${path}?${options?.orderByChild || ''}:${options?.limitToLast || ''}`;
  // Deliver cached data synchronously if available
  if (dataCache.has(cacheKey)) {
    callback(dataCache.get(cacheKey));
  }

  let dbRef = ref(db, path);
  let q = query(dbRef);

  if (options?.orderByChild) {
    q = query(q, orderByChild(options.orderByChild));
  }
  if (options?.limitToLast) {
    q = query(q, limitToLast(options.limitToLast));
  }

  const unsubscribe = onValue(
    q,
    (snapshot: DataSnapshot) => {
      const val = snapshot.val();
      dataCache.set(cacheKey, val);
      callback(val);
    },
    (error) => {
      console.warn(`Error subscribing to path ${path}:`, error);
      if (!dataCache.has(cacheKey)) {
        callback(null);
      }
    }
  );

  return unsubscribe;
}

// Fetch single path helper with cache
export async function fetchPathOnce<T = any>(path: string): Promise<T | null> {
  if (dataCache.has(path)) {
    return dataCache.get(path);
  }
  try {
    const dbRef = ref(db, path);
    const snapshot = await get(dbRef);
    const val = snapshot.val();
    if (val !== null) {
      dataCache.set(path, val);
    }
    return val;
  } catch (error) {
    console.warn(`Error fetching once from path ${path}:`, error);
    return null;
  }
}

// User theme helper
export async function setUserTheme(uid: string, theme: string): Promise<void> {
  try {
    await set(ref(db, `/users/${uid}/theme`), theme);
  } catch (err) {
    console.warn('Failed to save user theme:', err);
  }
}
