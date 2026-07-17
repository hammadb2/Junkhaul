'use client';

import { useEffect, useState } from 'react';

const RISK_COLORS = { none: '#16A34A', low: '#65A30D', medium: '#F59E0B', high: '#DC2626' };
const DECISION_LABELS = {
  fits_current_route: 'Fits current route',
  fits_with_modification: 'Fits with modification',
  fits_another_route: 'Fits another route',
  hold_for_future_route: 'Hold for future route',
  convert_to_paid: 'Convert to paid',
  reject: 'Reject',
};

async function postJson(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export default function DonationsView({ flash }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const load = () => fetch('/api/admin/donations').then((r) => (r.ok ? r.json() : { donations: [] })).then((d) => setRows(d.donations || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    const reason = window.prompt('Reason required for audit/timeline:');
    if (!reason) return;
    const { ok, data } = await postJson('/api/admin/donations', { donation_request_id: id, action, reason });
    if (ok) { flash?.('Donation action saved'); load(); } else { flash?.(data.error || 'Donation action failed', '#EF4444'); }
  };

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  if (loading) return <div style={{ padding: 40, color: 'rgba(0,0,0,.45)' }}>Loading donations…</div>;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Donation requests</div>
        <div style={{ color: 'rgba(0,0,0,.5)', fontSize: 13, marginTop: 4 }}>
          Shows customer, address, attribution-ready source fields, photos, automated pre-screen outcome, route-fit status, Quo context, reviewer status and final outcome. Free pickup still requires item approval plus route-fit approval.
        </div>
      </div>
      {rows.map((d) => (
        <div key={d.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 800 }}>{d.request_ref} · {d.name || 'Unknown'} · {d.phone}</div>
              <div style={{ color: 'rgba(0,0,0,.55)', fontSize: 13 }}>{d.address}{d.unit ? ` #${d.unit}` : ''}</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>{d.description}</div>
              <div style={{ marginTop: 8, color: 'rgba(0,0,0,.55)', fontSize: 12 }}>Automated pre-screen: {d.ai_outcome || 'pending'} · confidence {d.confidence ?? '—'} · photos {d.photos?.length || 0}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(d.photos || []).map((p) => <a key={p.id} href={`/api/admin/donations/${d.id}/photo/${p.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#f97316' }}>{p.photo_type}</a>)}
              </div>
              <button onClick={() => toggleExpand(d.id)} style={{ ...btn, marginTop: 12 }}>{expandedId === d.id ? 'Hide intelligence' : 'View intelligence'}</button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', borderRadius: 999, padding: '4px 10px', background: '#F0F0F2', fontWeight: 700, fontSize: 12 }}>{d.status}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 12 }}>
                <button onClick={() => act(d.id, 'approve')} style={btn}>Approve</button>
                <button onClick={() => act(d.id, 'request_photos')} style={btn}>Request photos</button>
                <button onClick={() => act(d.id, 'reject')} style={btn}>Reject</button>
                <button onClick={() => act(d.id, 'convert_to_paid')} style={btn}>Paid quote</button>
                <button onClick={() => act(d.id, 'match_route')} style={btn}>Match route</button>
              </div>
            </div>
          </div>
          {expandedId === d.id && <DonationIntelligencePanel donationId={d.id} flash={flash} onChanged={load} />}
        </div>
      ))}
      {rows.length === 0 && <div style={{ background: '#fff', borderRadius: 14, padding: 28, color: 'rgba(0,0,0,.45)' }}>No donation requests yet.</div>}
    </div>
  );
}

function DonationIntelligencePanel({ donationId, flash, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => fetch(`/api/admin/donations/${donationId}`).then((r) => (r.ok ? r.json() : null)).then(setDetail).finally(() => setLoading(false));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [donationId]);

  const refresh = () => { load(); onChanged?.(); };

  const runAnalysis = async () => {
    const { ok, data } = await postJson(`/api/admin/donations/${donationId}/analysis`, { action: 'run' });
    if (ok) { flash?.('Analysis re-run'); refresh(); } else { flash?.(data.error || 'Analysis failed', '#EF4444'); }
  };

  const scoreDestinations = async () => {
    const { ok, data } = await postJson(`/api/admin/donations/${donationId}/destinations`, { action: 'score' });
    if (ok) { flash?.('Destinations scored'); refresh(); } else { flash?.(data.error || 'Scoring failed', '#EF4444'); }
  };

  const overrideDestination = async (destinationScoreId) => {
    const reason = window.prompt('Reason for overriding the AI-selected destination:');
    if (!reason) return;
    const { ok, data } = await postJson(`/api/admin/donations/${donationId}/destinations`, { action: 'override', destination_score_id: destinationScoreId, reason });
    if (ok) { flash?.('Destination overridden'); refresh(); } else { flash?.(data.error || 'Override failed', '#EF4444'); }
  };

  const evaluateRouteFit = async () => {
    const ids = window.prompt('Comma-separated crew_assignment IDs to evaluate:');
    if (!ids) return;
    const crew_assignment_ids = ids.split(',').map((s) => s.trim()).filter(Boolean);
    const { ok, data } = await postJson(`/api/admin/donations/${donationId}/route-fit`, { crew_assignment_ids });
    if (ok) { flash?.(`Route-fit: ${DECISION_LABELS[data.result?.decision] || data.result?.decision}`); refresh(); } else { flash?.(data.error || 'Route-fit evaluation failed', '#EF4444'); }
  };

  const createProposal = async (routeMatchId) => {
    const { ok, data } = await postJson('/api/admin/donations/route-proposals', { donation_request_id: donationId, donation_route_match_id: routeMatchId });
    if (ok) { flash?.('Route proposal created'); refresh(); } else { flash?.(data.error || 'Could not create proposal', '#EF4444'); }
  };

  const actOnProposal = async (proposalId, action) => {
    const reason = action === 'approve' ? null : window.prompt('Reason:');
    if (action !== 'approve' && !reason) return;
    const { ok, data } = await postJson(`/api/admin/donations/route-proposals/${proposalId}`, { action, reason });
    if (ok) { flash?.(`Proposal ${action}d`); refresh(); } else { flash?.(data.error || `Could not ${action} proposal`, '#EF4444'); }
  };

  const correctItem = async (item) => {
    const suitability = window.prompt('Final suitability (suitable / not_suitable / needs_more_evidence / needs_manual_review):', item.suitability || '');
    if (!suitability) return;
    const reason = window.prompt('Reason for this correction:');
    if (!reason) return;
    const { ok, data } = await postJson(`/api/admin/donations/${donationId}/items/${item.id}`, { suitability, ai_decision: suitability, reason });
    if (ok) { flash?.('Item corrected'); refresh(); } else { flash?.(data.error || 'Correction failed', '#EF4444'); }
  };

  if (loading) return <div style={{ marginTop: 14, color: 'rgba(0,0,0,.45)', fontSize: 13 }}>Loading intelligence…</div>;
  if (!detail) return <div style={{ marginTop: 14, color: '#EF4444', fontSize: 13 }}>Could not load intelligence detail.</div>;

  const { donation, items, latest_analysis, sufficiency, destination_scores, capacity_estimate, route_matches, route_proposals, messages, timeline, audit } = detail;

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,.08)', display: 'grid', gap: 14 }}>
      {/* AI recommendation vs final human decision — kept visually distinct on purpose */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: '#F5F7FF', border: '1px solid #C7D2FE', borderRadius: 10, padding: 12 }}>
          <Badge label="AI RECOMMENDATION" color="#4338CA" />
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <div>Outcome: <strong>{latest_analysis?.ai_recommendation?.outcome || donation.ai_outcome || '—'}</strong></div>
            <div>Confidence: {formatPct(latest_analysis?.confidence ?? donation.confidence)}</div>
            <div>Provider/model: {latest_analysis?.provider || '—'} / {latest_analysis?.model || '—'}</div>
            {latest_analysis?.fallback_used && <div style={{ color: '#B45309', marginTop: 4 }}>⚠ Fallback used ({latest_analysis?.failure_reason || 'provider failure'}) — treat as low-confidence.</div>}
          </div>
          <button onClick={runAnalysis} style={{ ...btn, marginTop: 10 }}>Re-run analysis</button>
        </div>
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 12 }}>
          <Badge label="FINAL HUMAN DECISION" color="#15803D" />
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <div>Status: <strong>{donation.status}</strong></div>
            <div>Reviewed by: {donation.reviewed_by || 'not yet reviewed'}</div>
            <div>Reason: {donation.status_reason || '—'}</div>
          </div>
        </div>
      </div>

      {/* Photo sufficiency */}
      {sufficiency?.[0] && (
        <div style={panelStyle}>
          <div style={panelTitle}>Photo sufficiency</div>
          <div style={{ fontSize: 13 }}>Status: <strong>{sufficiency[0].status}</strong></div>
          {sufficiency[0].missing_evidence?.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {sufficiency[0].missing_evidence.map((m) => <span key={m} style={pill}>{m.replaceAll('_', ' ')}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div style={panelStyle}>
        <div style={panelTitle}>Items ({items?.length || 0})</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {(items || []).map((item) => (
            <div key={item.id} style={{ border: '1px solid rgba(0,0,0,.06)', borderRadius: 8, padding: 10, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{item.name || item.subtype || item.category}</strong>
                <span style={{ color: item.manual_correction ? '#15803D' : '#4338CA', fontWeight: 700 }}>{item.manual_correction ? 'HUMAN CORRECTED' : 'AI'}</span>
              </div>
              <div style={{ color: 'rgba(0,0,0,.6)', marginTop: 4 }}>
                {item.category} · {item.condition || 'condition unknown'} · suitability: {item.suitability || item.ai_decision || '—'} · confidence {formatPct(item.confidence)}
              </div>
              {item.rejection_reasons?.length > 0 && <div style={{ marginTop: 4, color: '#B91C1C' }}>Rejection: {item.rejection_reasons.join(', ')}</div>}
              {item.additional_photo_requirements?.length > 0 && <div style={{ marginTop: 4, color: '#B45309' }}>Needs: {item.additional_photo_requirements.join('; ')}</div>}
              <button onClick={() => correctItem(item)} style={{ ...btn, marginTop: 6, fontSize: 11 }}>Correct</button>
            </div>
          ))}
          {!items?.length && <div style={{ color: 'rgba(0,0,0,.4)', fontSize: 12 }}>No items detected yet.</div>}
        </div>
      </div>

      {/* Capacity */}
      <div style={panelStyle}>
        <div style={panelTitle}>Capacity estimate {capacity_estimate ? <span style={{ ...pill, marginLeft: 8 }}>{capacity_estimate.source}{capacity_estimate.is_conservative ? ' · conservative' : ''}</span> : null}</div>
        {capacity_estimate ? (
          <div style={{ fontSize: 12, marginTop: 6, color: 'rgba(0,0,0,.7)' }}>
            {capacity_estimate.volume_cuft} cuft · {capacity_estimate.weight_kg_min}–{capacity_estimate.weight_kg_max} kg · {capacity_estimate.crew_count} crew · pickup {capacity_estimate.pickup_duration_minutes}min / load {capacity_estimate.loading_duration_minutes}min / unload {capacity_estimate.unloading_duration_minutes}min
            {capacity_estimate.required_equipment?.length > 0 && <div>Equipment: {capacity_estimate.required_equipment.join(', ')}</div>}
          </div>
        ) : <div style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>No estimate yet — approve the donation to trigger one.</div>}
      </div>

      {/* Destinations */}
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={panelTitle}>Destination options</div>
          <button onClick={scoreDestinations} style={{ ...btn, fontSize: 11 }}>Re-score</button>
        </div>
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {(destination_scores || []).map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: 8, border: donation.selected_destination_score_id === s.id ? '1px solid #f97316' : '1px solid rgba(0,0,0,.06)', borderRadius: 8, opacity: s.considered ? 1 : 0.5 }}>
              <span>{s.destination_name} <span style={{ color: 'rgba(0,0,0,.45)' }}>({s.destination_type})</span> — score {s.score}{!s.considered ? ` · rejected: ${s.rejection_reason}` : ''}</span>
              {s.considered && donation.selected_destination_score_id !== s.id && <button onClick={() => overrideDestination(s.id)} style={{ ...btn, fontSize: 11 }}>Select / override</button>}
              {donation.selected_destination_score_id === s.id && <span style={{ color: '#f97316', fontWeight: 700 }}>SELECTED</span>}
            </div>
          ))}
          {!destination_scores?.length && <div style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>Not scored yet.</div>}
        </div>
      </div>

      {/* Route fit */}
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={panelTitle}>Route fit</div>
          <button onClick={evaluateRouteFit} style={{ ...btn, fontSize: 11 }}>Evaluate route fit</button>
        </div>
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {(route_matches || []).map((m) => (
            <div key={m.id} style={{ border: '1px solid rgba(0,0,0,.06)', borderRadius: 8, padding: 10, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{DECISION_LABELS[m.decision] || m.decision || m.status}</strong>
                <span style={{ color: RISK_COLORS[m.paid_job_delay_risk] || '#666', fontWeight: 700 }}>paid-job risk: {m.paid_job_delay_risk || 'none'}</span>
              </div>
              <div style={{ color: 'rgba(0,0,0,.6)', marginTop: 4 }}>
                +{m.added_km ?? m.detour_km ?? 0}km · +{m.added_driving_minutes ?? 0}min drive · +{m.added_labour_minutes ?? m.added_service_minutes ?? 0}min labour · confidence {formatPct(m.confidence)}
              </div>
              {m.reasons?.length > 0 && <div style={{ marginTop: 4, color: 'rgba(0,0,0,.5)' }}>Reasons: {m.reasons.join(', ')}</div>}
              {m.alternatives_evaluated?.length > 1 && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ cursor: 'pointer', color: 'rgba(0,0,0,.5)' }}>{m.alternatives_evaluated.length} alternatives evaluated</summary>
                  {m.alternatives_evaluated.map((a, i) => <div key={i} style={{ color: 'rgba(0,0,0,.5)', marginTop: 2 }}>{a.crew_assignment_id}: {a.decision} (+{a.added_km}km)</div>)}
                </details>
              )}
              {m.status === 'candidate' && ['fits_current_route', 'fits_with_modification'].includes(m.decision) && (
                <button onClick={() => createProposal(m.id)} style={{ ...btn, marginTop: 6, fontSize: 11 }}>Create route proposal</button>
              )}
            </div>
          ))}
          {!route_matches?.length && <div style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>Not evaluated yet.</div>}
        </div>
      </div>

      {/* Route proposals */}
      <div style={panelStyle}>
        <div style={panelTitle}>Route proposals</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {(route_proposals || []).map((p) => (
            <div key={p.id} style={{ border: '1px solid rgba(0,0,0,.06)', borderRadius: 8, padding: 10, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Route v{p.source_route_version} → insert @ {p.proposed_insertion_index}</span>
                <span style={{ fontWeight: 700 }}>{p.status}</span>
              </div>
              <div style={{ color: 'rgba(0,0,0,.5)', marginTop: 4 }}>Expires {p.expires_at ? new Date(p.expires_at).toLocaleString() : '—'}</div>
              {p.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button onClick={() => actOnProposal(p.id, 'approve')} style={{ ...btn, fontSize: 11 }}>Approve</button>
                  <button onClick={() => actOnProposal(p.id, 'hold')} style={{ ...btn, fontSize: 11 }}>Hold</button>
                  <button onClick={() => actOnProposal(p.id, 'reject')} style={{ ...btn, fontSize: 11 }}>Reject</button>
                </div>
              )}
            </div>
          ))}
          {!route_proposals?.length && <div style={{ fontSize: 12, color: 'rgba(0,0,0,.4)' }}>No proposals yet.</div>}
        </div>
      </div>

      {/* Quo history */}
      <div style={panelStyle}>
        <div style={panelTitle}>Quo message history</div>
        <div style={{ display: 'grid', gap: 4, marginTop: 8, fontSize: 12 }}>
          {(messages || []).map((m) => (
            <div key={m.id} style={{ color: 'rgba(0,0,0,.65)' }}>[{m.direction}] {m.message_type || '—'} · {m.provider_status || '—'} · {m.body?.slice(0, 80)}</div>
          ))}
          {!messages?.length && <div style={{ color: 'rgba(0,0,0,.4)' }}>No messages yet.</div>}
        </div>
      </div>

      {/* Timeline + audit */}
      <div style={panelStyle}>
        <div style={panelTitle}>Timeline &amp; audit history</div>
        <div style={{ display: 'grid', gap: 4, marginTop: 8, fontSize: 12, maxHeight: 240, overflowY: 'auto' }}>
          {[...(timeline || []).map((e) => ({ ...e, kind: 'timeline' })), ...(audit || []).map((e) => ({ ...e, kind: 'audit' }))]
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .map((e) => (
              <div key={`${e.kind}-${e.id}`} style={{ color: e.kind === 'audit' ? '#7C3AED' : 'rgba(0,0,0,.6)' }}>
                [{e.kind}] {new Date(e.created_at).toLocaleString()} · {e.event_type} {e.reason ? `· ${e.reason}` : ''}
              </div>
            ))}
          {!timeline?.length && !audit?.length && <div style={{ color: 'rgba(0,0,0,.4)' }}>No history yet.</div>}
        </div>
      </div>
    </div>
  );
}

function Badge({ label, color }) {
  return <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color }}>{label}</span>;
}

function formatPct(n) {
  const v = Number(n);
  return Number.isFinite(v) ? `${Math.round(v * 100)}%` : '—';
}

const btn = { border: '1px solid rgba(0,0,0,.1)', borderRadius: 8, padding: '7px 10px', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 };
const panelStyle = { border: '1px solid rgba(0,0,0,.06)', borderRadius: 10, padding: 12 };
const panelTitle = { fontWeight: 800, fontSize: 13 };
const pill = { display: 'inline-block', borderRadius: 999, padding: '2px 8px', background: '#F0F0F2', fontSize: 11, fontWeight: 700 };
