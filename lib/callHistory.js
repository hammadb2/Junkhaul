// ============================================================
// callHistory.js
//
// `phone_calls` (written by every call-ingestion webhook: quo-calls,
// vapi, vapiTools escalation) and `call_history` (read by every admin
// call surface: /admin/call-history, command-center, insights,
// assistant-request customer lookup, dispatchTools, aiAgent) are two
// separate tables with different schemas. Nothing wrote to
// `call_history`, so those admin/alerting surfaces were reading an
// empty table. This mirrors an ingested call into `call_history` in
// its shape, best-effort denormalizing a caller name / booking ref
// when a booking or lead is identifiable. Does not populate
// `sentiment` — nothing in the codebase computes it today for either
// table, so leaving it null here matches existing behavior rather
// than inventing an analysis step.
// ============================================================
import { supabaseAdmin } from './supabase';

export async function recordCallHistory({
  callerNumber,
  vapiCallId = null,
  agentType = null,
  durationSeconds = null,
  callOutcome = null,
  callSummary = null,
  transcript = null,
  bookingId = null,
  leadId = null,
  client = supabaseAdmin,
}) {
  let callerName = null;
  let bookingRef = null;

  try {
    if (bookingId) {
      const { data } = await client.from('bookings').select('name, booking_ref').eq('id', bookingId).maybeSingle();
      callerName = data?.name || null;
      bookingRef = data?.booking_ref || null;
    } else if (leadId) {
      const { data } = await client.from('leads').select('name').eq('id', leadId).maybeSingle();
      callerName = data?.name || null;
    }
  } catch {
    // Best-effort denormalization only — never block call logging on a lookup failure.
  }

  try {
    await client.from('call_history').insert({
      caller_number: callerNumber || null,
      caller_name: callerName,
      vapi_call_id: vapiCallId,
      agent_type: agentType,
      call_date: new Date().toISOString(),
      duration_seconds: durationSeconds,
      call_outcome: callOutcome,
      call_summary: callSummary,
      transcript,
      booking_ref: bookingRef,
    });
  } catch (e) {
    console.error('call_history log failed:', e);
  }
}
