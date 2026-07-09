import { supabase, sendSMS, isKillSwitchOn } from '../_shared/clients.ts';

// Runs every 30 min. Texts a review link ~1h after a job is completed.
Deno.serve(async () => {
  if (!(await isKillSwitchOn('review_requests_edge'))) {
    return new Response(JSON.stringify({ skipped: true, reason: 'kill_switch_off' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const reviewLink =
    Deno.env.get('GOOGLE_BUSINESS_REVIEW_LINK') || 'https://junkhaul.ca';

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'completed')
    .eq('review_requested', false)
    .lt('updated_at', cutoff);

  let sent = 0;
  for (const b of bookings || []) {
    const body = `Thanks for choosing Junk Haul Calgary, ${b.name}!

Hope everything's cleared out. If we did a good job, a quick 5-star review means a lot to a local small business:

${reviewLink}

Need us again? Book anytime at junkhaul.ca`;
    try {
      await sendSMS(b.phone, body, b.id, 'review');
      await supabase
        .from('bookings')
        .update({ review_requested: true, review_requested_at: new Date().toISOString() })
        .eq('id', b.id);
      sent++;
    } catch (_) {
      /* logged in sendSMS */
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
