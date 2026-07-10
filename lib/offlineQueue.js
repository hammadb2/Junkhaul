// Offline job queue — stores actions in localStorage when offline,
// syncs to server when connection is restored.

const QUEUE_KEY = 'jh-offline-queue';

export function getOfflineQueue() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch { return []; }
}

export function addToOfflineQueue(action, payload) {
  if (typeof window === 'undefined') return;
  const queue = getOfflineQueue();
  queue.push({ action, payload, created_at: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromOfflineQueue(index) {
  if (typeof window === 'undefined') return;
  const queue = getOfflineQueue();
  queue.splice(index, 1);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(QUEUE_KEY);
}

// Sync queued actions to server
export async function syncOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      const res = await fetch(`/api/crew/${item.action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) {
        synced++;
      } else {
        failed++;
        remaining.push(item);
      }
    } catch {
      failed++;
      remaining.push(item);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { synced, failed };
}

// Check if online
export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
