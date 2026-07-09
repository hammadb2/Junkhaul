'use client';

import { useState, useEffect, useCallback } from 'react';

export default function ReferralsPanel() {
  const [referrals, setReferrals] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/referrals');
      const data = await res.json();
      setReferrals(data.referrals || []);
      setLeaderboard(data.leaderboard || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/referrals');
        const data = await res.json();
        if (mounted) {
          setReferrals(data.referrals || []);
          setLeaderboard(data.leaderboard || []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const statusBadge = (status) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      expired: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return (
      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${classes[status] || classes.pending}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Referrals</h2>

      {loading ? (
        <p className="text-gray-500 py-8">Loading referrals...</p>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Leaderboard</h3>
            {leaderboard.length === 0 ? (
              <p className="text-gray-500 text-sm">No completed referrals yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {leaderboard.slice(0, 6).map((row) => (
                  <div key={row.referrer_phone} className="bg-gray-50 rounded-lg p-3">
                    <p className="font-mono text-sm text-gray-700">{row.referrer_phone}</p>
                    <p className="text-lg font-bold text-gray-900">{row.completed} completed</p>
                    <p className="text-sm text-gray-500">${row.total_earned} earned</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Referrer</th>
                  <th className="text-left px-4 py-2 font-medium">Referee</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Reward</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-700">{r.referrer_phone}</td>
                    <td className="px-4 py-2 font-mono text-gray-700">{r.referee_phone}</td>
                    <td className="px-4 py-2">{statusBadge(r.status)}</td>
                    <td className="px-4 py-2 text-gray-700">${r.referrer_reward_amount} / ${r.referee_reward_amount}</td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('en-CA')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
