/* Web push helpers (VAPID). The daily "your Codex is ready" push job itself is
 * v1.5 — see README. This module handles subscribe/unsubscribe and stores the
 * subscription on the profile (Supabase) or in localStorage (local beta).
 */
import { getSupabase, isConfigured } from './supabase';

const LS_KEY = 'codex:push:v1';

function vapidKey(): string | null {
  const k = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  return k && k.length > 0 ? k : null;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    Boolean(vapidKey())
  );
}

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return buffer;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function storeSubscription(userId: string | null, sub: PushSubscription | null): Promise<void> {
  const json = sub ? sub.toJSON() : null;
  if (!isConfigured() || !userId) {
    try {
      if (json) localStorage.setItem(LS_KEY, JSON.stringify(json));
      else localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  const sb = getSupabase();
  const { error } = await sb.from('profiles').update({ push_subscription: json }).eq('id', userId);
  if (error) throw new Error(`Could not save push subscription: ${error.message}`);
}

/** Subscribe to web push; returns true when subscribed. */
export async function subscribePush(userId: string | null): Promise<boolean> {
  const key = vapidKey();
  if (!isPushSupported() || !key) return false;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToArrayBuffer(key) }));
  await storeSubscription(userId, sub);
  return true;
}

export async function unsubscribePush(userId: string | null): Promise<void> {
  const sub = await currentSubscription();
  if (sub) await sub.unsubscribe();
  await storeSubscription(userId, null);
}

export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  return (await currentSubscription()) !== null;
}
