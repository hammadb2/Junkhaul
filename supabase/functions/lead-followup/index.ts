import { supabase, sendSMS } from '../_shared/clients.ts';

Deno.serve(async () => {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .not('ai_price_estimate', 'is', null)
    .is('converted_to_booking_id', null)
    .eq('follow_up_sent', false)
    .lt('updated_at', threeHoursAgo)
    .gt('updated_at', twentyFourHoursAgo);

  let sent = 0;
  for (const lead of leads || []) {
    const msg = `Hey! Junk Haul Calgary here. Your quote of $${lead.ai_price_estimate} is still good. We run Thursdays and Sundays — lock in your slot with a $50 deposit: https://junkhaul.ca/book\n\nQuestions? Call or text (587) 325-0751.`;
    try {
      await sendSMS(lead.phone, msg, null, 'lead_followup');
      await supabase.from('leads').update({ follow_up_sent: true, follow_up_sent_at: new Date().toISOString() }).eq('id', lead.id);
      sent++;
    } catch (_) {}
  }

  return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } });
});
