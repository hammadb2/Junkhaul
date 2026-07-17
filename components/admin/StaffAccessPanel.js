'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SCOPE_TYPES = ['booking', 'date', 'quadrant', 'crew_assignment', 'crew', 'employee', 'truck', 'shift', 'route_plan', 'daily_operation'];

const emptyManager = { name: '', email: '', phone: '', temporary_password: '' };
const emptyScope = { scope_id: '', scope_type: 'date', scope_value: '', effect: 'allow', expires_at: '', priority: 0 };

export default function StaffAccessPanel({ flash }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [managerForm, setManagerForm] = useState(emptyManager);
  const [scopeForm, setScopeForm] = useState(emptyScope);
  const [resetPassword, setResetPassword] = useState('');
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

  async function post(payload) {
    const res = await fetch('/api/admin/staff-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, ...payload }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      flash?.(json.error || 'Action failed', '#EF4444');
      return null;
    }
    flash?.('Access updated');
    await load();
    return json;
  }

  async function createManager() {
    const json = await post({ action: 'create_manager', ...managerForm });
    if (json?.result?.employee?.id) {
      setSelected(json.result.employee.id);
      setManagerForm(emptyManager);
    }
  }

  async function runSelected(action, extra = {}) {
    if (!selected) return;
    const json = await post({ action, employee_id: selected, ...extra });
    if (json && action === 'reset_manager_password') setResetPassword('');
  }

  function editScope(scope) {
    setScopeForm({
      scope_id: scope.id,
      scope_type: scope.scope_type || 'date',
      scope_value: scope.scope_value || '',
      effect: scope.effect || 'allow',
      expires_at: scope.expires_at ? scope.expires_at.slice(0, 16) : '',
      priority: scope.priority || 0,
    });
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(0,0,0,.45)' }}>Loading staff access…</div>;
  if (!data) return <div style={{ padding: 24 }}>Staff access unavailable.</div>;

  const employee = data.employees?.find((e) => e.id === selected);
  const access = selected ? data.access?.[selected] : null;
  const isOwner = Boolean(data.capabilities?.owner);
  const canManageManagers = Boolean(data.capabilities?.manage_managers);
  const canUseOwnerControls = isOwner;
  const selectedRoles = (access?.roles || []).map((role) => role.name);
  const selectedIsManager = selectedRoles.includes('manager');
  const audit = data.audit || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Add manager</h3>
          <input value={managerForm.name} onChange={(e) => setManagerForm({ ...managerForm, name: e.target.value })} placeholder="Full name" style={{ width: '100%', marginBottom: 8 }} />
          <input value={managerForm.email} onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })} placeholder="Email" style={{ width: '100%', marginBottom: 8 }} />
          <input value={managerForm.phone} onChange={(e) => setManagerForm({ ...managerForm, phone: e.target.value })} placeholder="Phone optional" style={{ width: '100%', marginBottom: 8 }} />
          <input value={managerForm.temporary_password} onChange={(e) => setManagerForm({ ...managerForm, temporary_password: e.target.value })} placeholder="Temporary password" type="password" style={{ width: '100%', marginBottom: 8 }} />
          <button onClick={createManager} disabled={!canManageManagers}>Create manager</button>
        </section>

        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, overflow: 'hidden' }}>
          {(data.employees || []).map((e) => (
            <button key={e.id} onClick={() => setSelected(e.id)} style={{ display: 'block', width: '100%', padding: 14, border: 'none', borderBottom: '1px solid rgba(0,0,0,.05)', background: selected === e.id ? 'rgba(249,115,22,.08)' : '#fff', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email || e.id.slice(0, 8)}</div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,.45)' }}>{e.email || e.phone || 'No contact'} · {e.status || 'unknown'}</div>
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,.4)' }}>Last login: {e.last_login_at ? new Date(e.last_login_at).toLocaleString() : 'never'}</div>
            </button>
          ))}
        </section>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{employee?.name || employee?.email || 'Select staff'}</h3>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(0,0,0,.5)' }}>
            Admins can manage manager accounts and scopes. Owner/admin role controls remain owner-only.
          </p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required reason" style={{ marginTop: 12, width: '100%', minHeight: 70, border: '1px solid rgba(0,0,0,.08)', borderRadius: 10, padding: 10 }} />
        </section>

        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16 }}>
          <h4 style={{ margin: '0 0 10px' }}>Roles</h4>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {(access?.roles || []).map((r) => <span key={r.assignment_id} style={{ padding: '6px 9px', borderRadius: 999, background: '#F3F4F6', fontSize: 12 }}>{r.name}</span>)}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => runSelected('assign_role', { role: 'manager' })} disabled={!canManageManagers}>Assign manager role</button>
            <button onClick={() => runSelected('remove_role', { role: 'manager' })} disabled={!canManageManagers}>Remove manager role</button>
            {canUseOwnerControls && (
              <>
                <button onClick={() => runSelected('assign_role', { role: 'admin' })}>Assign admin</button>
                <button onClick={() => runSelected('remove_role', { role: 'admin' })}>Remove admin</button>
                <button onClick={() => runSelected('assign_role', { role: 'owner' })}>Assign owner</button>
                <button onClick={() => runSelected('remove_role', { role: 'owner' })}>Remove owner</button>
              </>
            )}
          </div>
        </section>

        {canUseOwnerControls && (
          <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16 }}>
            <h4 style={{ margin: '0 0 10px' }}>Direct permissions</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(access?.direct_permissions || []).map((p) => <span key={p.grant_id} style={{ padding: '6px 9px', borderRadius: 999, background: '#ECFDF5', fontSize: 12 }}>{p.key}</span>)}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(0,0,0,.5)' }}>Direct permission controls are owner-only.</p>
          </section>
        )}

        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16 }}>
          <h4 style={{ margin: '0 0 10px' }}>Manager scopes</h4>
          <div style={{ display: 'grid', gap: 8 }}>
            {(access?.scopes || []).map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, border: '1px solid rgba(0,0,0,.06)', borderRadius: 10, padding: 10, fontSize: 12 }}>
                <span>{s.effect || 'allow'} · {s.scope_type}:{s.scope_value} · priority {s.priority || 0}{s.expires_at ? ` · expires ${new Date(s.expires_at).toLocaleDateString()}` : ''}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => editScope(s)}>Edit</button>
                  <button onClick={() => runSelected('remove_scope', { scope_id: s.id })}>Remove</button>
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={scopeForm.scope_type} onChange={(e) => setScopeForm({ ...scopeForm, scope_type: e.target.value })}>{SCOPE_TYPES.map((s) => <option key={s}>{s}</option>)}</select>
            <input value={scopeForm.scope_value} onChange={(e) => setScopeForm({ ...scopeForm, scope_value: e.target.value })} placeholder="scope value" />
            <select value={scopeForm.effect} onChange={(e) => setScopeForm({ ...scopeForm, effect: e.target.value })}><option value="allow">allow</option><option value="deny">deny</option></select>
            <input value={scopeForm.expires_at} onChange={(e) => setScopeForm({ ...scopeForm, expires_at: e.target.value })} type="datetime-local" />
            <input value={scopeForm.priority} onChange={(e) => setScopeForm({ ...scopeForm, priority: Number(e.target.value || 0) })} type="number" style={{ width: 90 }} />
            <button onClick={() => runSelected(scopeForm.scope_id ? 'change_scope' : 'assign_scope', scopeForm)} disabled={!selectedIsManager && !canUseOwnerControls}>{scopeForm.scope_id ? 'Save scope' : 'Assign scope'}</button>
            {scopeForm.scope_id && <button onClick={() => setScopeForm(emptyScope)}>Cancel edit</button>}
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => runSelected('disable_access')} style={{ color: '#B91C1C' }}>Disable manager</button>
          <button onClick={() => runSelected('reactivate_access')}>Reactivate manager</button>
          <input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Temporary password" type="password" />
          <button onClick={() => runSelected('reset_manager_password', { temporary_password: resetPassword })}>Reset manager password</button>
        </section>

        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 16 }}>
          <h4 style={{ margin: '0 0 10px' }}>Recent staff-access audit</h4>
          <div style={{ display: 'grid', gap: 6, maxHeight: 220, overflow: 'auto' }}>
            {audit.map((event) => (
              <div key={event.id} style={{ fontSize: 12, color: 'rgba(0,0,0,.65)' }}>
                {new Date(event.created_at).toLocaleString()} · {event.event_type} · actor {event.actor_id || 'unknown'} · target {event.entity_id || 'unknown'}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
