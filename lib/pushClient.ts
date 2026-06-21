import { savePushSubscription, deletePushSubscription } from "@/app/actions/push";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getPushSubscriptionStatus(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  return Boolean(subscription);
}

export async function subscribeToPush(): Promise<boolean> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  await navigator.serviceWorker.register("/sw.js");
  // register() resolves before the worker is active, .ready waits for that
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });

  await savePushSubscription({
    endpoint: subscription.endpoint,
    keys: {
      p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!))),
      auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!))),
    },
  });

  return true;
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }
}
