'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ROLES = ['manager', 'admin', 'employee'];
const SCOPE_TYPES = ['booking', 'date', 'quadrant', 'crew_assignment', 'crew', 'employee', 'truck', 'shift', 'route_plan', 'daily_operation'];

export default function StaffAccessPanel({ flash }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ reason: '', role: 'manager', permission_key: '', scope_type: 'date', scope_value: '', effect: 'allow', expires_at: '' });
  const flashRef = useRef(flash);

  useEffect(() => { flashRef.current = flash; }, [flash]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/staff-access');
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setData(json);
      setSelected((current) => current || json.employees?.[0]?.id || null);
    } else {
      flashRef.current?.(json.error || 'Unable to load staff access', '#EF4444');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function run(action, extra = {}) {
    const employee_id = selected;
    if (!employee_id) return;
    const res = await fetch('/api/admin/staff-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, employee_id, ...form, ...extra }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      flash?.(json.error || 'Action failed', '#EF4444');
      return;
    }
    flash?.('Access updated');
    await load();
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.45)' }}>Loading staff access…</div>;
  if (!data) return <div style={{ padding: 24 }}>Staff access unavailable.</div>;

  const employee = data.employees?.find((e) => e.id === selected);
  const access = selected ? data.access?.[selected] : null;
  const permissions = (data.permissions || []).filter((p) => !p.owner_only);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, overflow: 'hidden' }}>
        {(data.employees || []).map((e) => (
          <button key={e.id} onClick={() => setSelected(e.id)} style={{ display: 'block', width: '100%', padding: 14, border: 'none', borderBottom: '1px solid rgba(0,0,0,.05)', background: selected === e.id ? 'rgba(249,115,22,.08)' : '#fff', textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email || e.id.slice(0, 8)}</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.45)' }}>{e.email || e.phone || 'No contact'} · {e.status || 'unknown'}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{employee?.name || employee?.email || 'Select staff'}</h3>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(0,0,0,.5)' }}>Owner-only. Changes require a reason and create audit events.</p>
          <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Required reason" style={{ marginTop: 12, width: '100%', minHeight: 70, border: '1px solid rgba(0,0,0,.08)', borderRadius: 10, padding: 10 }} />
        </section>

        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16 }}>
          <h4 style={{ margin: '0 0 10px' }}>Roles</h4>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {(access?.roles || []).map((r) => <span key={r.assignment_id} style={{ padding: '6px 9px', borderRadius: 999, background: '#F3F4F6', fontSize: 12 }}>{r.name}</span>)}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            <button onClick={() => run('assign_role')}>Assign role</button>
            <button onClick={() => run('remove_role')}>Remove role</button>
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16 }}>
          <h4 style={{ margin: '0 0 10px' }}>Direct permissions</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(access?.direct_permissions || []).map((p) => <span key={p.grant_id} style={{ padding: '6px 9px', borderRadius: 999, background: '#ECFDF5', fontSize: 12 }}>{p.key}</span>)}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <select value={form.permission_key} onChange={(e) => setForm({ ...form, permission_key: e.target.value })}>
              <option value="">Choose permission</option>
              {permissions.map((p) => <option key={p.key} value={p.key}>{p.key}</option>)}
            </select>
            <button onClick={() => run('assign_permission')}>Grant</button>
            <button onClick={() => run('remove_permission')}>Revoke</button>
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16 }}>
          <h4 style={{ margin: '0 0 10px' }}>Manager scopes</h4>
          <div style={{ display: 'grid', gap: 8 }}>
            {(access?.scopes || []).map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,.06)', borderRadius: 10, padding: 10, fontSize: 12 }}>
                <span>{s.effect || 'allow'} · {s.scope_type}:{s.scope_value} · priority {s.priority || 0}{s.expires_at ? ` · expires ${new Date(s.expires_at).toLocaleDateString()}` : ''}</span>
                <button onClick={() => run('remove_scope', { scope_id: s.id })}>Remove</button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={form.scope_type} onChange={(e) => setForm({ ...form, scope_type: e.target.value })}>{SCOPE_TYPES.map((s) => <option key={s}>{s}</option>)}</select>
            <input value={form.scope_value} onChange={(e) => setForm({ ...form, scope_value: e.target.value })} placeholder="scope value" />
            <select value={form.effect} onChange={(e) => setForm({ ...form, effect: e.target.value })}><option value="allow">allow</option><option value="deny">deny</option></select>
            <input value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} type="datetime-local" />
            <button onClick={() => run('assign_scope')}>Assign scope</button>
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16 }}>
          <button onClick={() => run('disable_access')} style={{ color: '#B91C1C' }}>Disable staff access</button>
        </section>
      </div>
    </div>
  );
}
