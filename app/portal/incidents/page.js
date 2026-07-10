'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';

// ============================================================
// /portal/incidents — incident reporting and history. Light theme.
// ============================================================

const INCIDENT_TYPES = [
  { value: 'injury', label: 'Injury', icon: '🩹' },
  { value: 'vehicle_accident', label: 'Vehicle Accident', icon: '🚗' },
  { value: 'property_damage', label: 'Property Damage', icon: '🏠' },
  { value: 'near_miss', label: 'Near Miss', icon: '⚠️' },
  { value: 'safety', label: 'Safety Hazard', icon: '🦺' },
  { value: 'other', label: 'Other', icon: '📋' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low', color: '#22C55E' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
  { value: 'critical', label: 'Critical', color: '#EF4444' },
];

const STATUS_STYLES = {
  reported: { bg: 'rgba(245,158,11,.15)', color: '#F59E0B' },
  investigating: { bg: 'rgba(59,130,246,.15)', color: '#3B82F6' },
  resolved: { bg: 'rgba(34,197,94,.15)', color: '#22C55E' },
};

export default function IncidentsPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [type, setType] = useState('injury');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [reportedTo, setReportedTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/employee/incidents');
      if (res.status === 401) { router.push('/portal'); return; }
      const d = await res.json();
      setIncidents(d.incidents || []);
    } catch {}
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const submit = async () => {
    if (!description.trim()) { setError('Please describe what happened.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/employee/incidents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_type: type, severity, description, location, reported_to: reportedTo }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed to submit'); setSubmitting(false); return; }
      setSubmitted(true);
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      setTimeout(() => { setShowForm(false); setSubmitted(false); setDescription(''); setLocation(''); setReportedTo(''); fetchIncidents(); }, 2000);
    } catch { setError('Network error'); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-dvh flex flex-col safe-top safe-bottom" style={{ background: '#FAFAFA', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
        <div onClick={() => router.push('/portal/schedule')} style={{ width: 38, height: 38, borderRadius: 999, background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={17} color="#1a1a1a" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>Incidents</div>
        <div onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 999, background: 'rgba(239,68,68,.10)', cursor: 'pointer' }}>
          <AlertTriangle size={13} color="#EF4444" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>Report</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {/* Form */}
        {showForm && (
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 16, padding: 18, marginBottom: 20 }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <CheckCircle size={48} color="#22C55E" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>Report Filed</div>
                <div style={{ fontSize: 14, color: 'rgba(0,0,0,.6)', marginTop: 4 }}>Your supervisor has been notified.</div>
              </div>
            ) : (
              <>
                {/* Type */}
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(0,0,0,.5)', marginBottom: 8 }}>INCIDENT TYPE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {INCIDENT_TYPES.map((t) => (
                    <div key={t.value} onClick={() => setType(t.value)} style={{
                      padding: '9px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                      ...(type === t.value
                        ? { background: '#f97316', color: '#fff' }
                        : { background: '#F0F0F2', color: 'rgba(0,0,0,.6)' }),
                    }}>
                      {t.icon} {t.label}
                    </div>
                  ))}
                </div>

                {/* Severity */}
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(0,0,0,.5)', marginBottom: 8 }}>SEVERITY</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {SEVERITIES.map((s) => (
                    <div key={s.value} onClick={() => setSeverity(s.value)} style={{
                      flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      ...(severity === s.value
                        ? { background: s.color, color: '#fff' }
                        : { background: '#F0F0F2', color: 'rgba(0,0,0,.5)' }),
                    }}>
                      {s.label}
                    </div>
                  ))}
                </div>

                {/* Description */}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe what happened…"
                  style={{
                    width: '100%', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12,
                    padding: '14px 16px', fontSize: 14, color: '#1a1a1a', fontFamily: 'inherit', resize: 'none',
                    marginBottom: 12, outline: 'none', boxSizing: 'border-box',
                  }}
                />

                {/* Location */}
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location (optional)"
                  style={{
                    width: '100%', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12,
                    padding: '0 16px', height: 48, fontSize: 14, color: '#1a1a1a', fontFamily: 'inherit',
                    marginBottom: 12, outline: 'none', boxSizing: 'border-box',
                  }}
                />

                {/* Reported to */}
                <input
                  value={reportedTo}
                  onChange={(e) => setReportedTo(e.target.value)}
                  placeholder="Reported to (optional)"
                  style={{
                    width: '100%', background: '#F0F0F2', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12,
                    padding: '0 16px', height: 48, fontSize: 14, color: '#1a1a1a', fontFamily: 'inherit',
                    marginBottom: 16, outline: 'none', boxSizing: 'border-box',
                  }}
                />

                {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}

                <div style={{ display: 'flex', gap: 10 }}>
                  <div onClick={() => setShowForm(false)} style={{ flex: 1, height: 48, borderRadius: 14, border: '1px solid rgba(0,0,0,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, color: '#1a1a1a', cursor: 'pointer' }}>
                    Cancel
                  </div>
                  <div onClick={submit} style={{ flex: 1, height: 48, borderRadius: 14, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* History */}
        {!showForm && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10 }}>History</div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                <div style={{ width: 28, height: 28, border: '3px solid #F0F0F2', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : incidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 64 }}>
                <AlertTriangle size={48} color="rgba(0,0,0,.15)" style={{ margin: '0 auto 16px' }} />
                <div style={{ color: '#1a1a1a', fontSize: 16, fontWeight: 600 }}>No incidents reported</div>
                <div style={{ color: 'rgba(0,0,0,.4)', fontSize: 14, marginTop: 4 }}>Report any injuries, accidents, or safety hazards here.</div>
              </div>
            ) : (
              incidents.map((inc) => {
                const sev = SEVERITIES.find((s) => s.value === inc.severity) || SEVERITIES[1];
                const st = STATUS_STYLES[inc.status] || STATUS_STYLES.reported;
                return (
                  <div key={inc.id} style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 16, padding: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div style={{ width: 8, alignSelf: 'stretch', borderRadius: 4, background: sev.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>
                          {inc.incident_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.6)', marginBottom: 4 }}>{inc.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,.4)' }}>
                          {new Date(inc.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                        </span>
                        <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: st.bg, color: st.color }}>
                          {inc.status}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={15} color="rgba(0,0,0,.3)" />
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
