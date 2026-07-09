'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

const CATEGORIES = [
  { key: 'kill_switch', label: 'Kill switches', bg: 'bg-red-50', border: 'border-red-200' },
  { key: 'pricing', label: 'Pricing', bg: 'bg-green-50', border: 'border-green-200' },
  { key: 'surge', label: 'Surge pricing', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'discount', label: 'Discounts', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'no_show', label: 'No-show risk', bg: 'bg-orange-50', border: 'border-orange-200' },
  { key: 'cancellation', label: 'Cancellation', bg: 'bg-gray-50', border: 'border-gray-200' },
  { key: 'reschedule', label: 'Reschedule', bg: 'bg-gray-50', border: 'border-gray-200' },
  { key: 'abandonment', label: 'Abandonment', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { key: 'referral', label: 'Referrals', bg: 'bg-pink-50', border: 'border-pink-200' },
  { key: 'general', label: 'General', bg: 'bg-white', border: 'border-gray-200' },
];

export default function ConfigPanel() {
  const [config, setConfig] = useState([]);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      setConfig(data.config || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/config');
        const data = await res.json();
        if (mounted) setConfig(data.config || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const grouped = useMemo(() => {
    const groups = {};
    for (const c of config) {
      groups[c.category] = groups[c.category] || [];
      groups[c.category].push(c);
    }
    return groups;
  }, [config]);

  const handleChange = (key, value) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    const updates = Object.entries(edits).map(([key, value]) => {
      const original = config.find((c) => c.key === key);
      return {
        key,
        value,
        value_type: original?.value_type || inferType(value),
        description: original?.description || '',
        category: original?.category || 'general',
      };
    });

    if (updates.length === 0) return;

    setSaving(true);
    setMessage(null);
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, updated_by: 'admin-ui' }),
    });
    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      setMessage({ type: 'success', text: 'Saved. Changes take effect immediately.' });
      setEdits({});
      fetchConfig();
    } else {
      setMessage({ type: 'error', text: data.error || 'Save failed' });
    }
  };

  if (loading) return <p className="text-gray-500 py-8">Loading config...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Control Panel</h2>
        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {message.text}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving || Object.keys(edits).length === 0}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      {Object.keys(edits).length > 0 && (
        <p className="text-sm text-orange-600">
          You have unsaved changes. Click &quot;Save changes&quot; to apply them immediately.
        </p>
      )}

      {CATEGORIES.map((cat) => {
        const items = grouped[cat.key] || [];
        if (items.length === 0) return null;
        return (
          <div key={cat.key} className={`rounded-xl border ${cat.border} ${cat.bg} overflow-hidden`}>
            <div className="px-4 py-3 border-b border-black/5 font-semibold text-gray-800">
              {cat.label}
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <ConfigField
                  key={item.key}
                  item={item}
                  value={edits[item.key] !== undefined ? edits[item.key] : item.value}
                  onChange={(v) => handleChange(item.key, v)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConfigField({ item, value, onChange }) {
  const isBoolean = item.value_type === 'boolean' || item.key.startsWith('kill_switch_');
  const isNumber = item.value_type === 'number';

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {formatLabel(item.key)}
      </label>
      {item.description && (
        <p className="text-xs text-gray-500">{item.description}</p>
      )}
      {isBoolean ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="true">On</option>
          <option value="false">Off</option>
        </select>
      ) : (
        <input
          type={isNumber ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step={isNumber ? 'any' : undefined}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}

function formatLabel(key) {
  return key
    .replace(/^kill_switch_/, 'Kill switch: ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function inferType(value) {
  if (value === 'true' || value === 'false') return 'boolean';
  if (!Number.isNaN(Number(value)) && value !== '') return 'number';
  return 'string';
}
