'use client';

import { useState, useEffect } from 'react';

export default function LaunchGatesPanel() {
  const [gates, setGates] = useState([]);

  useEffect(() => {
    fetch('/api/admin/launch-gates')
      .then((r) => r.json())
      .then((data) => setGates(data.gates || []));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Launch Gates</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Gate</th>
            <th className="py-2">Owner</th>
            <th className="py-2">Status</th>
            <th className="py-2">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {gates.map((g) => (
            <tr key={g.gate} className="border-b">
              <td className="py-2">{g.gate}</td>
              <td className="py-2">{g.owner_role}</td>
              <td className="py-2">{g.passed ? '✅ Signed' : '⏳ Pending'}</td>
              <td className="py-2">{g.evidence || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
