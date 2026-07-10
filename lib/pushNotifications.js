import webpush from 'web-push';
import { supabaseAdmin } from './supabase';

// ============================================================
// Push Notifications — send web push notifications to crew.
//
// Uses VAPID keys (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT env vars) and the web-push library.
// ============================================================

let configured = false;

function configure() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:crew@junkhaul.ca';

  if (!publicKey || !privateKey) {
    console.warn('VAPID keys not set — push notifications disabled');
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

/**
 * Send a push notification to an employee.
 * @param {string} employeeId - The employee UUID
 * @param {object} payload - { title, body, url?, actions? }
 */
export async function sendPushToEmployee(employeeId, payload) {
  configure();
  if (!configured) {
    console.warn('Push not configured — VAPID keys missing');
    return { sent: 0, total: 0, error: 'VAPID keys not set' };
  }

  const { data: subs, error: subErr } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('employee_id', employeeId);

  if (subErr) {
    console.error('Push sub query error:', subErr.message);
    return { sent: 0, total: 0, error: subErr.message };
  }

  if (!subs || subs.length === 0) {
    console.warn(`No push subscriptions for employee ${employeeId}`);
    return { sent: 0, total: 0 };
  }

  const notificationPayload = JSON.stringify({
    title: payload.title || 'Junk Haul Crew',
    body: payload.body || '',
    url: payload.url || '/portal/schedule',
    actions: payload.actions || [],
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        notificationPayload
      )
    )
  );

  // Clean up expired subscriptions
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'rejected') {
      console.warn(`Push to ${subs[i].endpoint?.slice(0, 50)}... failed:`, r.reason?.message || r.reason?.statusCode);
      if (r.reason?.statusCode === 410 || r.reason?.statusCode === 404) {
        // Subscription is gone — delete it
        await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subs[i].endpoint);
      }
    }
  }

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  return { sent: succeeded, total: subs.length };
}

/**
 * Send a push notification to multiple employees (e.g. all crew on a date).
 * @param {string[]} employeeIds - Array of employee UUIDs
 * @param {object} payload - { title, body, url?, actions? }
 */
export async function sendPushToEmployees(employeeIds, payload) {
  const results = await Promise.all(
    (employeeIds || []).map((id) => sendPushToEmployee(id, payload))
  );
  return results;
}
