'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Camera, CheckCircle, ChevronRight } from 'lucide-react';

const D = '#0A0A0B';
const CARD = '#161618';
const INPUT = '#1A1A1E';
const ORANGE = '#f97316';
const TXT = 'rgba(255,255,255,0.9)';
const TXT2 = 'rgba(255,255,255,0.6)';
const TXT3 = 'rgba(255,255,255,0.4)';

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

export default function IncidentsPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
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
    <main className="min-h-dvh safe-top safe-bottom" style={{ background: D }}>
      <header className="glass-bar" style={{ position: 'sticky', top: 0, zIndex: 20, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/portal/schedule')} className="glass-btn" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color={TXT2} />
          </button>
          <div style={{ fontSize: 18, fontWeight: 700, color: TXT }}>Incident Reports</div>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, minHeight: 40 }}>
            + Report
          </button>
        )}
      </header>

      <div style={{ maxWidth: 448, margin: '0 auto', padding: '16px 24px' }}>
        {showForm ? (
          submitted ? (
            <div className="dark-card" style={{ padding: 32, textAlign: 'center' }}>
              <CheckCircle size={48} color="#22C55E" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: TXT }}>Report Filed</div>
              <div style={{ fontSize: 14, color: TXT2, marginTop: 4 }}>Your supervisor has been notified.</div>
            </div>
          ) : (
            <div className="dark-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: TXT3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>New Incident Report</div>

              {/* Type selection */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TXT2, marginBottom: 8 }}>Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {INCIDENT_TYPES.map((t) => (
                    <button key={t.value} onClick={() => setType(t.value)} className="dark-card" style={{ padding: 12, textAlign: 'left', cursor: 'pointer', border: type === t.value ? `2px solid ${ORANGE}` : '1px solid rgba(255,255,255,0.06)', background: type === t.value ? 'rgba(249,115,22,0.08)' : CARD }}>
                      <div style={{ fontSize: 18 }}>{t.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: type === t.value ? ORANGE : TXT, marginTop: 4 }}>{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TXT2, marginBottom: 8 }}>Severity</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {SEVERITIES.map((s) => (
                    <button key={s.value} onClick={() => setSeverity(s.value)} className="dark-card" style={{ flex: 1, padding: '10px 8px', textAlign: 'center', cursor: 'pointer', border: severity === s.value ? `2px solid ${s.color}` : '1px solid rgba(255,255,255,0.06)', background: severity === s.value ? `${s.color}15` : CARD }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: severity === s.value ? s.color : TXT }}>{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TXT2, marginBottom: 8 }}>What happened? *</div>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the incident in detail..." className="dark-input" style={{ width: '100%', padding: '12px 16px', fontSize: 14, color: TXT, background: INPUT, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, resize: 'none' }} />
              </div>

              {/* Location */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TXT2, marginBottom: 8 }}>Location (optional)</div>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 123 Main St NE, Calgary" className="dark-input" style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 14, color: TXT, background: INPUT, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
              </div>

              {/* Reported to */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TXT2, marginBottom: 8 }}>Reported to (optional)</div>
                <input value={reportedTo} onChange={(e) => setReportedTo(e.target.value)} placeholder="e.g. Supervisor, 911" className="dark-input" style={{ width: '100%', minHeight: 48, padding: '12px 16px', fontSize: 14, color: TXT, background: INPUT, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
              </div>

              {error && <div style={{ color: '#EF4444', fontSize: 14, marginBottom: 12 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowForm(false)} className="dark-card" style={{ flex: 1, minHeight: 48, fontWeight: 600, color: TXT2, cursor: 'pointer' }}>Cancel</button>
                <button onClick={submit} disabled={submitting} className="btn-primary" style={{ flex: 2, minHeight: 48 }}>{submitting ? 'Submitting...' : 'Submit Report'}</button>
              </div>
            </div>
          )
        ) : loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(249,115,22,0.2)', borderTopColor: ORANGE, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <AlertTriangle size={48} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 16px' }} />
            <div style={{ color: TXT2, fontSize: 16, fontWeight: 600 }}>No incidents reported</div>
            <div style={{ color: TXT3, fontSize: 14, marginTop: 4 }}>Report any injuries, accidents, or safety hazards here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {incidents.map((inc) => {
              const sev = SEVERITIES.find((s) => s.value === inc.severity) || SEVERITIES[1];
              return (
                <div key={inc.id} className="dark-card" style={{ padding: 16, borderLeft: `3px solid ${sev.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: TXT }}>{inc.incident_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                      <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 8, background: `${sev.color}20`, color: sev.color, fontWeight: 600, textTransform: 'uppercase' }}>{inc.severity}</span>
                    </div>
                    <span style={{ fontSize: 12, color: TXT3 }}>{new Date(inc.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div style={{ fontSize: 14, color: TXT2, marginTop: 8 }}>{inc.description}</div>
                  {inc.location && <div style={{ fontSize: 13, color: TXT3, marginTop: 4 }}>📍 {inc.location}</div>}
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: inc.status === 'resolved' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: inc.status === 'resolved' ? '#22C55E' : '#F59E0B', fontWeight: 600, textTransform: 'uppercase' }}>{inc.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
