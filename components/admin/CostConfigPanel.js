'use client';

import { useState, useEffect, useCallback } from 'react';

const TABLES = [
  { key: 'vehicle_profiles', label: 'Vehicle profiles (fleet)' },
  { key: 'rental_rate_versions', label: 'Rental rates' },
  { key: 'fuel_rate_versions', label: 'Fuel rates' },
  { key: 'labor_rate_versions', label: 'Labor rates' },
  { key: 'facility_rate_versions', label: 'Facility rates' },
  { key: 'overhead_rate_versions', label: 'Overhead rates' },
  { key: 'pricing_policy_versions', label: 'Pricing policy' },
];

// vehicle_profiles is not versioned (no effective_from/to) — it's the
// flat fleet roster, edited in place. Kept out of VERSIONED_TABLES-style
// handling below wherever that distinction matters.
const NON_VERSIONED_TABLES = new Set(['vehicle_profiles']);

const ROUNDING_OPTIONS = ['nearest_dollar', 'nearest_5', 'nearest_10', 'nearest_50', 'none'];

const DEFAULT_RECORD = {
  vehicle_profiles: { name: '', vehicle_class: '', volume_cuft: 0, volume_yd3: 0, legal_payload_kg: 0, operational_weight_limit_kg: 0, planned_payload_percent: 0.85, fuel_baseline_l_per_100km: 45, interior_length_ft: 0, interior_width_ft: 0, interior_height_ft: 0, fuel_tank_capacity_l: 0, ramp_details: '', clean_eligible: false, dirty_eligible: true, active: true, source: '' },
  rental_rate_versions: { provider: 'U-Haul', location: 'Gas Plus Balzac, 10070 Hwy 566, Balzac, AB T4B 2T3', daily_rate: 40, included_km: 0, per_mile_rate: 2.4, taxes_percent: 0, protection_fee: 18 },
  fuel_rate_versions: { price_per_litre: 1.75, quote_safety_l_per_100km: 45, fuel_safety_buffer_percent: 10, source: '' },
  labor_rate_versions: { role_or_employee: 'default_crew', hourly_rate: 20, burden_percent: 0, overtime_rules: {}, time_block_minutes: 30 },
  facility_rate_versions: { facility: 'East Calgary Landfill', waste_stream: 'general_junk', flat_minimum: 80, per_tonne_rate: 0, surcharges: {}, item_fees: {}, tax_treatment: 'included' },
  overhead_rate_versions: { payment_fees_percent: 0, supplies_per_job: 0, insurance_allocation_per_day: 0, software_per_month: 0, admin_per_month: 0, contingency_percent: 0, risk_reserve_percent: 0 },
  pricing_policy_versions: { target_margin_percent: 20, minimum_contribution_percent: 0, rounding_rule: 'nearest_dollar', auto_quote_ceiling: '', review_thresholds: {} },
};

const LOAD_LABELS = {
  single_item: '1-2 items',
  quarter: 'Quarter load',
  half: 'Half load',
  full: 'Full load',
};

export default function CostConfigPanel({ flash }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState('rental_rate_versions');
  const [record, setRecord] = useState(DEFAULT_RECORD['rental_rate_versions']);
  const [effectiveFrom, setEffectiveFrom] = useState(localIso());
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cost-config');
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (e) {
      flash?.('Failed to load cost config', '#EF4444');
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function previewImpact() {
    setPreviewLoading(true);
    try {
      const payload = buildPayload();
      const params = new URLSearchParams({ preview: 'true', type: selectedTable, record: JSON.stringify(payload.record) });
      const res = await fetch(`/api/admin/cost-config?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setPreview(json.preview);
    } catch (e) {
      flash?.('Preview failed: ' + e.message, '#EF4444');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function saveVersion() {
    if (!reason) return flash?.('Reason is required', '#EF4444');
    if (!adminPassword) return flash?.('Admin password required for re-authentication', '#EF4444');
    setSaving(true);
    try {
      const payload = buildPayload();
      const isVehicleProfile = selectedTable === 'vehicle_profiles';
      const expectedReplacedId = isVehicleProfile ? null : currentVersionForTable()?.id || null;
      const res = await fetch('/api/admin/cost-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, expectedReplacedId, reason, adminPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Save failed');
      flash?.(isVehicleProfile ? 'Vehicle profile saved' : 'Cost version created');
      setAdminPassword('');
      setReason('');
      setPreview(null);
      if (isVehicleProfile && json.profile?.id) setSelectedProfileId(json.profile.id);
      await loadConfig();
    } catch (e) {
      flash?.(e.message, '#EF4444');
    } finally {
      setSaving(false);
    }
  }

  function buildPayload() {
    const r = { ...record };
    if (selectedTable === 'vehicle_profiles') {
      if (selectedProfileId) r.id = selectedProfileId;
      return { type: selectedTable, record: r };
    }
    r.effective_from = effectiveFrom;
    if (r.auto_quote_ceiling === '') delete r.auto_quote_ceiling;
    // Convert JSON text fields if the user typed them as objects.
    for (const key of ['overtime_rules', 'surcharges', 'item_fees', 'review_thresholds']) {
      if (typeof r[key] === 'string') {
        try { r[key] = JSON.parse(r[key]); } catch { /* keep as string */ }
      }
    }
    return { type: selectedTable, record: r };
  }

  function currentVersionForTable() {
    return data?.versions?.[selectedTable]?.find((v) => v.status === 'active');
  }

  function onTableChange(key) {
    setSelectedTable(key);
    setRecord(DEFAULT_RECORD[key]);
    setSelectedProfileId('');
    setPreview(null);
  }

  function onProfileChange(profileId) {
    setSelectedProfileId(profileId);
    const profile = data.profiles?.find((p) => p.id === profileId);
    setRecord(profile ? { ...profile } : DEFAULT_RECORD.vehicle_profiles);
    setPreview(null);
  }

  function updateField(key, value) {
    setRecord((r) => ({ ...r, [key]: value }));
    setPreview(null);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
  if (!data) return <div style={{ padding: 40 }}>Could not load cost config.</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 600 }}>Cost Configuration</h2>

      {data.warnings?.length > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <strong>Warnings</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {data.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <CurrentValues data={data} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>{selectedTable === 'vehicle_profiles' ? 'Edit fleet truck' : 'Create new version'}</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Table</label>
            <select value={selectedTable} onChange={(e) => onTableChange(e.target.value)} style={inputStyle}>
              {TABLES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          {selectedTable === 'vehicle_profiles' && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Truck</label>
              <select value={selectedProfileId} onChange={(e) => onProfileChange(e.target.value)} style={inputStyle}>
                <option value="">+ New truck profile</option>
                {data.profiles?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.vehicle_class})</option>)}
              </select>
            </div>
          )}

          <RecordFields table={selectedTable} record={record} profiles={data.profiles} onChange={updateField} />

          {!NON_VERSIONED_TABLES.has(selectedTable) && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Effective from (UTC)</label>
              <input type="datetime-local" value={effectiveFrom.slice(0, 16)} onChange={(e) => setEffectiveFrom(new Date(e.target.value).toISOString())} style={inputStyle} />
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Reason for change</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fuel price updated per receipt" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Admin password (re-authentication)</label>
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            {!NON_VERSIONED_TABLES.has(selectedTable) && (
              <button onClick={previewImpact} disabled={previewLoading} style={buttonStyle('#3B82F6')}>{previewLoading ? 'Previewing…' : 'Preview impact'}</button>
            )}
            <button onClick={saveVersion} disabled={saving} style={buttonStyle('#10B981')}>{saving ? 'Saving…' : (selectedTable === 'vehicle_profiles' ? 'Save truck profile' : 'Create version')}</button>
          </div>

          {preview && <ImpactPreview preview={preview} />}
        </div>

        <div>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>{selectedTable === 'vehicle_profiles' ? 'Current fleet' : 'History'}</h3>
          {selectedTable === 'vehicle_profiles'
            ? <FleetPanel profiles={data.profiles} />
            : <HistoryPanel table={selectedTable} versions={data.versions?.[selectedTable] || []} profiles={data.profiles} />}
        </div>
      </div>
    </div>
  );
}

function CurrentValues({ data }) {
  const c = data.current;
  return (
    <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 16, border: '1px solid #E5E7EB' }}>
      <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Current effective values</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 13 }}>
        <Value label="Vehicle" value={c.vehicle?.name || '—'} />
        <Value label="Payload safety buffer" value={c.vehicle ? `${Math.round((c.vehicle.planned_payload_percent ?? 1) * 100)}%` : '—'} />
        <Value label="Rental per km" value={c.rental ? `$${c.rental.per_km_rate}/km` : '—'} />
        <Value label="Protection fee" value={c.rental ? `$${c.rental.protection_fee}` : '—'} />
        <Value label="Fuel" value={c.fuel ? `$${c.fuel.price_per_litre}/L` : '—'} />
        <Value label="Fuel safety" value={c.fuel ? `${c.fuel.quote_safety_l_per_100km} L/100km` : '—'} />
        <Value label="Fuel safety buffer" value={c.fuel ? `${c.fuel.fuel_safety_buffer_percent ?? 0}%` : '—'} />
        <Value label="Labor" value={c.labor ? `$${c.labor.hourly_rate}/h` : '—'} />
        <Value label="Labor time block" value={c.labor ? `${c.labor.time_block_minutes ?? 30} min` : '—'} />
        <Value label="Facility min" value={c.facility ? `$${c.facility.flat_minimum}` : '—'} />
        <Value label="Target margin" value={c.policy ? `${c.policy.target_margin_percent}%` : '—'} />
        <Value label="Rounding" value={c.policy?.rounding_rule || '—'} />
      </div>
    </div>
  );
}

function FleetPanel({ profiles }) {
  if (!profiles?.length) return <div style={{ color: '#9CA3AF' }}>No vehicle profiles yet.</div>;
  return (
    <div style={{ maxHeight: 420, overflow: 'auto', border: '1px solid #E5E7EB', borderRadius: 8 }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Truck</th>
            <th style={thStyle}>Volume</th>
            <th style={thStyle}>Safe payload</th>
            <th style={thStyle}>Fuel</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => {
            const safePayload = Math.round(Number(p.operational_weight_limit_kg) * Number(p.planned_payload_percent ?? 1));
            return (
              <tr key={p.id}>
                <td style={tdStyle}>{p.name}</td>
                <td style={tdStyle}>{p.volume_cuft} ft³</td>
                <td style={tdStyle}>{safePayload} kg <span style={{ color: '#9CA3AF' }}>({Math.round((p.planned_payload_percent ?? 1) * 100)}% of {p.operational_weight_limit_kg})</span></td>
                <td style={tdStyle}>{p.fuel_baseline_l_per_100km} L/100km</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Value({ label, value }) {
  return (
    <div>
      <div style={{ color: '#6B7280', fontSize: 11 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function RecordFields({ table, record, profiles, onChange }) {
  const fields = FIELDS_BY_TABLE[table];
  return (
    <>
      {fields.map((f) => {
        if (f.key === 'vehicle_profile_id') {
          return (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{f.label}</label>
              <select value={record[f.key] || ''} onChange={(e) => onChange(f.key, e.target.value)} style={inputStyle}>
                <option value="">Select vehicle</option>
                {profiles?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.vehicle_class})</option>)}
              </select>
            </div>
          );
        }
        if (f.type === 'select') {
          const value = f.boolean ? String(!!record[f.key]) : (record[f.key] || '');
          return (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{f.label}</label>
              <select
                value={value}
                onChange={(e) => onChange(f.key, f.boolean ? e.target.value === 'true' : e.target.value)}
                style={inputStyle}
              >
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          );
        }
        if (f.type === 'json') {
          return (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{f.label}</label>
              <textarea
                value={typeof record[f.key] === 'string' ? record[f.key] : JSON.stringify(record[f.key] || {}, null, 2)}
                onChange={(e) => onChange(f.key, e.target.value)}
                rows={4}
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>
          );
        }
        return (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <label style={labelStyle}>{f.label}{f.unit ? ` (${f.unit})` : ''}</label>
            <input
              type={f.type === 'number' ? 'number' : 'text'}
              value={record[f.key] ?? ''}
              onChange={(e) => onChange(f.key, f.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
              style={inputStyle}
            />
          </div>
        );
      })}
    </>
  );
}

const FIELDS_BY_TABLE = {
  vehicle_profiles: [
    { key: 'name', label: 'Name' },
    { key: 'vehicle_class', label: 'Vehicle class (unique key)' },
    { key: 'active', label: 'Active', type: 'select', boolean: true, options: ['true', 'false'] },
    { key: 'volume_cuft', label: 'Cargo volume', type: 'number', unit: 'ft³' },
    { key: 'volume_yd3', label: 'Cargo volume', type: 'number', unit: 'yd³' },
    { key: 'legal_payload_kg', label: 'Legal rated payload', type: 'number', unit: 'kg' },
    { key: 'operational_weight_limit_kg', label: 'Operational weight limit', type: 'number', unit: 'kg' },
    { key: 'planned_payload_percent', label: 'Planned payload safety buffer', type: 'number', unit: 'fraction of limit, e.g. 0.85' },
    { key: 'fuel_baseline_l_per_100km', label: 'Fuel baseline', type: 'number', unit: 'L/100km' },
    { key: 'fuel_tank_capacity_l', label: 'Fuel tank capacity', type: 'number', unit: 'L' },
    { key: 'interior_length_ft', label: 'Interior length', type: 'number', unit: 'ft' },
    { key: 'interior_width_ft', label: 'Interior width', type: 'number', unit: 'ft' },
    { key: 'interior_height_ft', label: 'Interior height', type: 'number', unit: 'ft' },
    { key: 'ramp_details', label: 'Ramp details' },
    { key: 'clean_eligible', label: 'Clean-load eligible', type: 'select', boolean: true, options: ['true', 'false'] },
    { key: 'dirty_eligible', label: 'Junk/dirty-load eligible', type: 'select', boolean: true, options: ['true', 'false'] },
    { key: 'source', label: 'Source / evidence' },
  ],
  rental_rate_versions: [
    { key: 'provider', label: 'Provider' },
    { key: 'location', label: 'Location' },
    { key: 'vehicle_profile_id', label: 'Vehicle profile' },
    { key: 'daily_rate', label: 'Daily rate', type: 'number', unit: '$' },
    { key: 'included_km', label: 'Included km', type: 'number', unit: 'km' },
    { key: 'per_mile_rate', label: 'Per mile rate', type: 'number', unit: '$' },
    { key: 'taxes_percent', label: 'Taxes %', type: 'number', unit: '%' },
    { key: 'protection_fee', label: 'Mandatory protection fee', type: 'number', unit: '$' },
    { key: 'source_document', label: 'Source / evidence' },
  ],
  fuel_rate_versions: [
    { key: 'price_per_litre', label: 'Price per litre', type: 'number', unit: '$' },
    { key: 'quote_safety_l_per_100km', label: 'Safe fuel assumption', type: 'number', unit: 'L/100km' },
    { key: 'fuel_safety_buffer_percent', label: 'Fuel safety buffer', type: 'number', unit: '% on top of truck baseline' },
    { key: 'source', label: 'Source / evidence' },
  ],
  labor_rate_versions: [
    { key: 'role_or_employee', label: 'Role or employee' },
    { key: 'hourly_rate', label: 'Hourly rate', type: 'number', unit: '$' },
    { key: 'burden_percent', label: 'Burden %', type: 'number', unit: '%' },
    { key: 'time_block_minutes', label: 'Time block size', type: 'number', unit: 'minutes' },
    { key: 'overtime_rules', label: 'Overtime rules', type: 'json' },
    { key: 'source', label: 'Source / evidence' },
  ],
  facility_rate_versions: [
    { key: 'facility', label: 'Facility' },
    { key: 'waste_stream', label: 'Waste stream' },
    { key: 'flat_minimum', label: 'Flat minimum', type: 'number', unit: '$' },
    { key: 'per_tonne_rate', label: 'Per tonne rate', type: 'number', unit: '$' },
    { key: 'surcharges', label: 'Surcharges', type: 'json' },
    { key: 'item_fees', label: 'Item fees', type: 'json' },
    { key: 'tax_treatment', label: 'Tax treatment' },
    { key: 'source', label: 'Source / evidence' },
  ],
  overhead_rate_versions: [
    { key: 'payment_fees_percent', label: 'Payment fees %', type: 'number', unit: '%' },
    { key: 'supplies_per_job', label: 'Supplies per job', type: 'number', unit: '$' },
    { key: 'insurance_allocation_per_day', label: 'Insurance per day', type: 'number', unit: '$' },
    { key: 'software_per_month', label: 'Software per month', type: 'number', unit: '$' },
    { key: 'admin_per_month', label: 'Admin per month', type: 'number', unit: '$' },
    { key: 'contingency_percent', label: 'Contingency %', type: 'number', unit: '%' },
    { key: 'risk_reserve_percent', label: 'Risk reserve %', type: 'number', unit: '%' },
    { key: 'source', label: 'Source / evidence' },
  ],
  pricing_policy_versions: [
    { key: 'target_margin_percent', label: 'Target margin %', type: 'number', unit: '%' },
    { key: 'minimum_contribution_percent', label: 'Minimum contribution %', type: 'number', unit: '%' },
    { key: 'rounding_rule', label: 'Rounding rule', type: 'select', options: ROUNDING_OPTIONS },
    { key: 'auto_quote_ceiling', label: 'Auto-quote ceiling', type: 'number', unit: '$' },
    { key: 'review_thresholds', label: 'Review thresholds', type: 'json' },
    { key: 'source', label: 'Source / evidence' },
  ],
};

function ImpactPreview({ preview }) {
  return (
    <div style={{ marginTop: 16, background: '#EFF6FF', borderRadius: 8, padding: 12, border: '1px solid #BFDBFE' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Impact preview (65.98 km scenario)</h4>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Load</th>
            <th style={thStyle}>Current price</th>
            <th style={thStyle}>Adjusted price</th>
            <th style={thStyle}>Change</th>
          </tr>
        </thead>
        <tbody>
          {preview.map((row) => (
            <tr key={row.loadSize}>
              <td style={tdStyle}>{LOAD_LABELS[row.loadSize]}</td>
              <td style={tdStyle}>${row.currentPrice}</td>
              <td style={tdStyle}>${row.adjustedPrice}</td>
              <td style={{ ...tdStyle, color: row.change > 0 ? '#DC2626' : row.change < 0 ? '#059669' : 'inherit' }}>
                {row.change > 0 ? '+' : ''}{row.change}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryPanel({ table, versions, profiles }) {
  if (!versions.length) return <div style={{ color: '#9CA3AF' }}>No versions yet.</div>;
  return (
    <div style={{ maxHeight: 420, overflow: 'auto', border: '1px solid #E5E7EB', borderRadius: 8 }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>From</th>
            <th style={thStyle}>To</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.id}>
              <td style={tdStyle}>{formatDate(v.effective_from)}</td>
              <td style={tdStyle}>{v.effective_to ? formatDate(v.effective_to) : '—'}</td>
              <td style={tdStyle}><StatusBadge status={v.status} /></td>
              <td style={tdStyle}>{historyValue(table, v, profiles)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { active: '#D1FAE5', superseded: '#E5E7EB', draft: '#FEF3C7' };
  return <span style={{ padding: '2px 6px', borderRadius: 4, background: colors[status] || '#E5E7EB', fontSize: 11 }}>{status}</span>;
}

function historyValue(table, v, profiles) {
  if (table === 'rental_rate_versions') return `$${v.daily_rate}/day + $${v.per_km_rate}/km`;
  if (table === 'fuel_rate_versions') return `$${v.price_per_litre}/L`;
  if (table === 'labor_rate_versions') return `$${v.hourly_rate}/h`;
  if (table === 'facility_rate_versions') return `$${v.flat_minimum} min`;
  if (table === 'overhead_rate_versions') return `${v.payment_fees_percent}% payment fees`;
  if (table === 'pricing_policy_versions') return `${v.target_margin_percent}% margin`;
  return JSON.stringify(v).slice(0, 40);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString();
}

function localIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString();
}

const inputStyle = { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13 };
const labelStyle = { display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4 };
const buttonStyle = (bg) => ({ padding: '8px 16px', borderRadius: 6, border: 'none', background: bg, color: '#fff', cursor: 'pointer', fontSize: 13 });
const thStyle = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', fontWeight: 600 };
const tdStyle = { padding: '8px 10px', borderBottom: '1px solid #E5E7EB' };
