import { api } from './api';

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  // TS's DOM lib types Uint8Array.buffer as possibly-SharedArrayBuffer,
  // which BufferSource (what PushManager.subscribe wants) rejects — this
  // array is always backed by a plain ArrayBuffer in practice, so the cast
  // is safe, just working around lib.dom.d.ts strictness.
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0))) as unknown as BufferSource;
}

/** Are we already subscribed on this device? (Doesn't require permission prompts.) */
export async function isPushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

/** Requests permission (if needed) and subscribes this device, registering it with the backend. */
export async function subscribeToPush(): Promise<void> {
  if (!pushSupported()) throw new Error('Push notifications are not supported in this browser.');

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? 'Notifications are blocked for this site. Enable them in your browser settings to turn this on.'
      : 'Notification permission was not granted.');
  }

  const { public_key, configured } = await api.getVapidPublicKey();
  if (!configured || !public_key) {
    throw new Error('Push notifications are not set up on the server yet.');
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(public_key),
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Could not read the push subscription from the browser.');
  }
  await api.registerPushSubscription({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent,
  });
}

/** Unsubscribes this device, both locally and from the backend. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await api.unregisterPushSubscription(endpoint).catch(() => {});
}
