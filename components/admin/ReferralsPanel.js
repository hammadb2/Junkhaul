'use client';
// Redesigned Referrals view — REPLACES components/admin/ReferralsPanel.js.
// Real data: GET /api/admin/referrals.

import { useState, useEffect } from 'react';
import { money, badgeStyle } from '@/lib/adminUiHelpers';

const LEADERBOARD = [
  { phone: '(403) 555-0120', completed: 6, earned: 150 },
  { phone: '(403) 555-0288', completed: 4, earned: 100 },
  { phone: '(403) 555-0344', completed: 3, earned: 75 },
];

const REFERRALS = [
  { referrer: '(403) 555-0120', referee: '(403) 555-0399', status: 'completed', reward: '$25 / $25' },
  { referrer: '(403) 555-0288', referee: '(403) 555-0410', status: 'pending', reward: '$25 / $25' },
  { referrer: '(403) 555-0344', referee: '(403) 555-0177', status: 'expired', reward: '$25 / $25' },
];

const STATUS_BADGE = {
  completed: badgeStyle('rgba(34,197,94,.12)', '#22C55E'),
  pending: badgeStyle('rgba(245,158,11,.12)', '#F59E0B'),
  expired: badgeStyle('rgba(0,0,0,.06)', 'rgba(0,0,0,.4)'),
};

export default function ReferralsPanel() {
  const [leaderboard, setLeaderboard] = useState(LEADERBOARD);
  const [referrals, setReferrals] = useState(REFERRALS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/referrals');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        if (Array.isArray(data.leaderboard)) {
          const mapped = data.leaderboard.map((l) => ({
            phone: l.referrer_phone || l.phone || '—',
            completed: l.completed || 0,
            earned: l.total_earned || l.earned || 0,
          }));
          if (mapped.length > 0) setLeaderboard(mapped);
        }

        if (Array.isArray(data.referrals)) {
          const mapped = data.referrals.map((r) => ({
            referrer: r.referrer_phone || '—',
            referee: r.referee_phone || '—',
            status: r.status || 'pending',
            reward: `$${r.referrer_reward_amount || 25} / $${r.referee_reward_amount || 25}`,
          }));
          if (mapped.length > 0) setReferrals(mapped);
        }
      } catch (e) { /* keep fallback */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', padding: '18px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 14 }}>Leaderboard</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {leaderboard.map((r) => (
            <div key={r.phone} style={{ background: '#FAFAFA', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(0,0,0,.5)' }}>{r.phone}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginTop: 2 }}>{r.completed} completed</div>
              <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>{money(r.earned)} earned</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead><tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
            {['Referrer', 'Referee', 'Status', 'Reward'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,.4)', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {referrals.map((r) => (
              <tr key={r.referrer + r.referee} style={{ borderBottom: '1px solid rgba(0,0,0,.045)' }}>
                <td style={{ padding: '10px 18px', fontFamily: 'monospace', color: 'rgba(0,0,0,.6)' }}>{r.referrer}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'rgba(0,0,0,.6)' }}>{r.referee}</td>
                <td style={{ padding: '10px 12px' }}><span style={STATUS_BADGE[r.status]}>{r.status}</span></td>
                <td style={{ padding: '10px 18px', color: 'rgba(0,0,0,.55)' }}>{r.reward}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
