// ============================================================
// VAPI DONATION TOOL CONTRACTS
//
// Backend-safe, read-mostly tools for a Vapi assistant handling donation
// pickup calls. These are contracts only in this phase — no assistant
// config or production cutover is included; app/api/vapi/route.js just
// needs to know how to dispatch to donationTools by name once a Vapi
// assistant is configured to call them (external step, out of scope here).
//
// HARD LIMITS — a donation Vapi tool must never:
//   - approve donation eligibility
//   - override a route-fit decision
//   - promise a pickup time before a route proposal is approved
//   - change the selected destination
//   - execute a refund
//   - bypass manager scope
//   - invent policy not already recorded in the database
// Every tool below only reads existing state or writes an escalation /
// concern note / a re-send of an ALREADY-APPROVED photo request — never
// a new decision.
// ============================================================

import { supabaseAdmin } from './supabase';
import { normalizePhone } from './phone';
import { requestAdditionalDonationPhotos } from './donationPhotoSufficiency';
import { recordTimelineEvent } from './timeline';

const NOT_YET_CONFIRMED = 'This is not a confirmed pickup time — only the operations team can confirm that once a route is approved.';

async function findDonationRequest({ request_ref, _caller_phone }) {
  let query = supabaseAdmin.from('donation_requests').select('*').order('created_at', { ascending: false }).limit(1);
  if (request_ref) {
    query = supabaseAdmin.from('donation_requests').select('*').eq('request_ref', request_ref).limit(1);
  } else if (_caller_phone) {
    const normalized = normalizePhone(_caller_phone);
    query = supabaseAdmin.from('donation_requests').select('*').or(`phone.eq.${_caller_phone},normalized_phone.eq.${normalized}`).order('created_at', { ascending: false }).limit(1);
  } else {
    return null;
  }
  const { data } = await query;
  return data?.[0] || null;
}

export const donationVapiTools = {
  // Read donation-request status — plain-language status, never a promise.
  async get_donation_request_status({ request_ref, _caller_phone }) {
    const donation = await findDonationRequest({ request_ref, _caller_phone });
    if (!donation) return "I couldn't find a donation pickup request on this number. Would you like me to escalate this to a manager?";
    return `Your donation request ${donation.request_ref} is currently: ${donation.status.replaceAll('_', ' ')}. ${donation.status_reason ? `Note: ${donation.status_reason}. ` : ''}${NOT_YET_CONFIRMED}`;
  },

  // Read missing photo requirements — reports what's already on file, invents nothing.
  async get_missing_photo_requirements({ request_ref, _caller_phone }) {
    const donation = await findDonationRequest({ request_ref, _caller_phone });
    if (!donation) return "I couldn't find a donation pickup request on this number.";
    const { data: latest } = await supabaseAdmin
      .from('donation_photo_sufficiency')
      .select('*')
      .eq('donation_request_id', donation.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest || latest.status === 'sufficient') return 'Your photos are marked sufficient for review right now — no additional photos are needed at this time.';
    if (!latest.missing_evidence?.length) return `Your request is currently marked "${latest.status.replaceAll('_', ' ')}" — a team member will follow up with specifics if more evidence is needed.`;
    return `We still need: ${latest.missing_evidence.map((m) => m.replaceAll('_', ' ')).join(', ')}. You can upload these at junkhaul.ca/book/donation.`;
  },

  // Read eligibility decision — reports the recorded AI/human decision, does not make one.
  async get_eligibility_decision({ request_ref, _caller_phone }) {
    const donation = await findDonationRequest({ request_ref, _caller_phone });
    if (!donation) return "I couldn't find a donation pickup request on this number.";
    if (['draft', 'submitted', 'analyzing'].includes(donation.status)) return 'Your donation request is still being reviewed — no eligibility decision has been made yet.';
    if (donation.status === 'rejected') return `Your items were not approved for free donation pickup${donation.status_reason ? `: ${donation.status_reason}` : ''}. We can offer a paid junk removal quote instead if you'd like.`;
    if (donation.status === 'paid_quote_offered') return 'Your items were not eligible for free pickup, but a paid junk removal quote is available. Would you like me to connect you with booking?';
    if (['ai_approved', 'manual_review'].includes(donation.status)) return `Your request is at the "${donation.status.replaceAll('_', ' ')}" stage — it has not been finally approved yet.`;
    return `Your items have been approved and your request is now at the "${donation.status.replaceAll('_', ' ')}" stage. ${NOT_YET_CONFIRMED}`;
  },

  // Read route-waiting status — reports whether a route match exists, never promises a route.
  async get_route_waiting_status({ request_ref, _caller_phone }) {
    const donation = await findDonationRequest({ request_ref, _caller_phone });
    if (!donation) return "I couldn't find a donation pickup request on this number.";
    if (!['route_waiting', 'route_matched', 'pickup_window_offered', 'customer_confirmed', 'assigned'].includes(donation.status)) {
      return 'Your request has not reached the route-matching stage yet.';
    }
    if (donation.status === 'route_waiting') return "Your items are approved and we're waiting for a route with available capacity — this can take a few days since paid customer jobs come first. We'll text you the moment a window opens.";
    return `Your request is at the "${donation.status.replaceAll('_', ' ')}" stage. ${NOT_YET_CONFIRMED}`;
  },

  // Read approved pickup window — only ever reports an ALREADY-recorded window; never invents or estimates one.
  async get_approved_pickup_window({ request_ref, _caller_phone }) {
    const donation = await findDonationRequest({ request_ref, _caller_phone });
    if (!donation) return "I couldn't find a donation pickup request on this number.";
    if (!['pickup_window_offered', 'customer_confirmed', 'assigned', 'en_route'].includes(donation.status)) {
      return 'No pickup window has been offered yet for this request.';
    }
    const { data: match } = await supabaseAdmin
      .from('donation_route_matches')
      .select('offer_expires_at, status')
      .eq('donation_request_id', donation.id)
      .in('status', ['offered', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!match) return 'A pickup window offer is being finalized — a team member or text message will confirm the exact window shortly.';
    return `A pickup window has been offered${match.offer_expires_at ? `, and the offer is open until ${new Date(match.offer_expires_at).toLocaleString()}` : ''}. Please confirm via the text message you received to lock it in.`;
  },

  // Trigger an ALREADY-approved Quo photo request resend — does not decide new requirements.
  async request_donation_photos_resend({ request_ref, _caller_phone }) {
    const donation = await findDonationRequest({ request_ref, _caller_phone });
    if (!donation) return "I couldn't find a donation pickup request on this number.";
    const { data: latest } = await supabaseAdmin
      .from('donation_photo_sufficiency')
      .select('*')
      .eq('donation_request_id', donation.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest || latest.status !== 'more_photos_required' || !latest.missing_evidence?.length) {
      return "There isn't an outstanding photo request on file for this donation right now.";
    }
    await requestAdditionalDonationPhotos({
      donationRequestId: donation.id,
      phone: donation.phone,
      missingEvidence: latest.missing_evidence,
      requestedPhotoTypes: latest.requested_photo_types || [],
      actorType: 'vapi',
    });
    return "I've resent the text with exactly what photos are still needed.";
  },

  // Escalate to a human manager — never resolves the issue itself.
  async escalate_to_manager({ request_ref, _caller_phone, reason }) {
    const donation = await findDonationRequest({ request_ref, _caller_phone });
    await supabaseAdmin.from('escalations').insert({
      reason: `Donation${donation ? ` ${donation.request_ref}` : ''}: ${reason || 'Customer requested manager escalation on a donation pickup call'}`,
      caller_phone: _caller_phone || donation?.phone || null,
      priority: 'normal',
      status: 'open',
    });
    if (donation) {
      await recordTimelineEvent({
        entity_type: 'donation_request',
        entity_id: donation.id,
        event_type: 'donation_escalated_via_vapi',
        actor_type: 'customer',
        source: 'vapi',
        reason,
      });
    }
    return "I've flagged this for a manager to call you back. Is there anything else I can note for them?";
  },

  // Record a customer concern on the timeline — never a decision, just a note for reviewers.
  async record_customer_concern({ request_ref, _caller_phone, concern }) {
    if (!concern) return 'Sorry, I did not catch the concern — could you repeat it?';
    const donation = await findDonationRequest({ request_ref, _caller_phone });
    if (!donation) return "I couldn't find a donation pickup request on this number to attach that note to, but I've logged it.";
    await recordTimelineEvent({
      entity_type: 'donation_request',
      entity_id: donation.id,
      event_type: 'donation_customer_concern_logged',
      actor_type: 'customer',
      source: 'vapi',
      metadata: { concern },
    });
    return "Thanks, I've noted that on your request for the review team.";
  },
};

export const runDonationVapiTool = async (name, args) => {
  const fn = donationVapiTools[name];
  if (!fn) return null; // not a donation tool — caller should fall back to the general vapiTools runner
  try {
    return await fn(args || {});
  } catch (e) {
    console.error(`Donation Vapi tool ${name} failed:`, e);
    return 'Sorry, something went wrong on our end looking that up. A team member will follow up.';
  }
};
