// Screen wake lock management.
//
// Keeps the screen lit during an active emergency and — critically —
// re-acquires the lock when the page returns to the foreground. The Screen
// Wake Lock spec releases the lock on ANY visibility loss (incoming call,
// glancing at another app, a notification), so without a re-acquire the
// screen would sleep mid-resus and stay dark. Native Capacitor builds use
// @capacitor/keep-awake instead; this is the web/Android path.
//
// Lives in its own module so the store no longer imports from main.tsx,
// removing a store -> main -> App -> store cycle (HANDOFF risk #1).
import { isNative } from './platform';

interface WakeLockSentinel {
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

let sentinel: WakeLockSentinel | null = null;
let wanted = false; // true while an emergency is active
let listenerAttached = false;

async function acquire(): Promise<void> {
  if (!wanted || sentinel) return;
  if (!('wakeLock' in navigator)) return;
  try {
    sentinel = await (navigator as unknown as {
      wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinel> };
    }).wakeLock.request('screen');
    // The sentinel auto-releases on visibility loss; clear our ref so the
    // visibility handler re-acquires next time the page is foregrounded.
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    // Denied or unsupported — no-op. The emergency UI still works.
    sentinel = null;
  }
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible' && wanted && !sentinel) {
    void acquire();
  }
}

/** Acquire the screen wake lock and keep it across backgrounding. */
export function enableWakeLock(): void {
  wanted = true;
  // Native (Capacitor): @capacitor-community/keep-awake holds through
  // backgrounding with no visibility dance and no iOS-18.4 floor.
  if (isNative) {
    void import('@capacitor-community/keep-awake')
      .then(({ KeepAwake }) => KeepAwake.keepAwake())
      .catch(() => { /* ignore */ });
    return;
  }
  if (!listenerAttached) {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    listenerAttached = true;
  }
  void acquire();
}

/** Release the wake lock and stop re-acquiring it. */
export function disableWakeLock(): void {
  wanted = false;
  if (isNative) {
    void import('@capacitor-community/keep-awake')
      .then(({ KeepAwake }) => KeepAwake.allowSleep())
      .catch(() => { /* ignore */ });
    return;
  }
  if (sentinel) {
    void sentinel.release().catch(() => { /* ignore */ });
    sentinel = null;
  }
}
