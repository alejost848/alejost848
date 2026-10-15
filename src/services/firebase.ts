import { initializeApp, getApps, getApp } from '@firebase/app';
import type { User } from '@firebase/auth';
import {
  getDatabase,
  ref,
  onValue,
  get,
  query,
  orderByChild,
  limitToLast,
  set,
  update,
  DataSnapshot,
} from '@firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyClG-y7seb17rhGIa3hN4QCLn_8Ren4SRw',
  authDomain: 'alejost848-afea9.firebaseapp.com',
  databaseURL: 'https://alejost848-afea9.firebaseio.com',
  projectId: 'alejost848-afea9',
  storageBucket: 'alejost848-afea9.appspot.com',
  messagingSenderId: '776617594441',
  appId: '1:776617594441:web:ddce73736bc8b1b09e7998',
  measurementId: 'G-M52T96265D',
};

// Initialize Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);

// Dynamic lazy-loaded analytics singleton
let analyticsInstance: any = null;

export async function getAnalyticsService(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if (!analyticsInstance) {
    try {
      const { getAnalytics, isSupported: gaSupported } = await import('@firebase/analytics');
      if (await gaSupported()) {
        analyticsInstance = getAnalytics(app);
      }
    } catch (err) {
      console.warn('Analytics initialization failed:', err);
    }
  }
  return analyticsInstance;
}

export async function logPageView(pagePath?: string, pageTitle?: string): Promise<void> {
  try {
    const analytics = await getAnalyticsService();
    if (!analytics) return;
    const { logEvent } = await import('@firebase/analytics');
    logEvent(analytics, 'page_view', {
      page_path: pagePath || window.location.pathname,
      page_title: pageTitle || document.title,
      page_location: window.location.href,
    });
  } catch (err) {
    console.warn('Failed to log page view:', err);
  }
}

// Dynamic lazy-loaded messaging singleton
let messagingInstance: any = null;

export async function isSupported(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return false;
  }
  try {
    const { isSupported: fbIsSupported } = await import('@firebase/messaging');
    return await fbIsSupported();
  } catch {
    return false;
  }
}

export async function getMessagingService(): Promise<any> {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported();
  if (!supported) return null;
  if (!messagingInstance) {
    const { getMessaging } = await import('@firebase/messaging');
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
}

// Lazy-loaded Authentication helper — avoids loading @firebase/auth on critical path
let authInstance: any = null;
let currentUser: User | null = null;
let authPromise: Promise<User | null> | null = null;

export async function ensureAuth(onUserChanged?: (user: User | null) => void): Promise<User | null> {
  if (currentUser) {
    onUserChanged?.(currentUser);
    return currentUser;
  }
  if (!authPromise) {
    authPromise = (async () => {
      try {
        const { getAuth, signInAnonymously, onAuthStateChanged } = await import('@firebase/auth');
        if (!authInstance) {
          authInstance = getAuth(app);
        }
        return await new Promise<User | null>((resolve) => {
          onAuthStateChanged(authInstance, (user) => {
            if (user) {
              currentUser = user;
              onUserChanged?.(user);
              resolve(user);
            } else {
              signInAnonymously(authInstance)
                .then((cred) => {
                  currentUser = cred.user;
                  onUserChanged?.(cred.user);
                  resolve(cred.user);
                })
                .catch((error) => {
                  console.warn('Anonymous sign-in error:', error);
                  resolve(null);
                });
            }
          });
        });
      } catch (err) {
        console.warn('Failed to initialize Firebase Auth:', err);
        return null;
      }
    })();
  } else if (onUserChanged) {
    authPromise.then((u) => onUserChanged(u));
  }
  return authPromise;
}

export function initAuth(onUserChanged?: (user: User | null) => void) {
  // Defer anonymous authentication until browser is idle so it never blocks initial render
  const run = () => {
    ensureAuth(onUserChanged);
  };
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1500);
  }
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

  const dbRef = ref(db, path);
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

// User push notifications helpers
export async function requestFcmToken(): Promise<string | null> {
  try {
    const messaging = await getMessagingService();
    if (!messaging) return null;

    // Register FCM service worker under dedicated scope so it never conflicts with Workbox (/sw.js at '/')
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope',
      });
    }

    const { getToken } = await import('@firebase/messaging');
    const token = await getToken(messaging, {
      serviceWorkerRegistration: swRegistration,
    });
    return token;
  } catch (error) {
    console.warn('Error retrieving FCM token:', error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    getMessagingService().then(async (messaging) => {
      if (messaging) {
        const { onMessage } = await import('@firebase/messaging');
        unsubscribe = onMessage(messaging, callback);
      }
    });
  }
  return () => {
    if (unsubscribe) unsubscribe();
  };
}

export async function saveUserSubscription(uid: string, token: string | null, subscribed: boolean): Promise<void> {
  try {
    const updates: Record<string, any> = {
      subscribed,
    };
    if (token) {
      updates.token = token;
    }
    await update(ref(db, `/users/${uid}`), updates);
  } catch (err) {
    console.warn('Failed to save user subscription:', err);
  }
}
