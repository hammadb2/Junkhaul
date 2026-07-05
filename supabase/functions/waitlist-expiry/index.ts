import { supabase, sendSMS } from '../_shared/clients.ts';

// Runs every hour. Finds waitlist entries that were notified but didn't
// respond within 30 minutes, sends them an expiry SMS, and resets them
// so they can be notified again when another slot opens.
Deno.serve(async () => {
  const now = new Date().toISOString();

  const { data: expired } = await supabase
    .from('waitlist')
    .select('*')
    .eq('notified', true)
    .lt('expires_at', now)
    .is('converted_to_booking_id', null);

  let sent = 0;
  for (const entry of expired || []) {
    // Only send the expiry SMS once (check if we already sent it).
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('message_type', 'waitlist_expired')
      .is('booking_id', null)
      .ilike('to_number', entry.phone)
      .limit(1);

    if (existing && existing.length > 0) {
      // Already sent — just reset the flag.
      await supabase
        .from('waitlist')
        .update({ notified: false })
        .eq('id', entry.id);
      continue;
    }

    try {
      await sendSMS(
        entry.phone,
        `The open slot has been released since we didn't hear back. Check junkhaul.ca for current availability or call (587) 325-0751.`,
        null,
        'waitlist_expired',
      );
      sent++;
    } catch (_) {
      /* logged in sendSMS */
    }

    // Reset so they can be notified again when another slot opens.
    await supabase
      .from('waitlist')
      .update({ notified: false })
      .eq('id', entry.id);
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
