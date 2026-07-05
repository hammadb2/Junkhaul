'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Logo from '@/components/Logo';
import { LOAD_LABELS, calculatePrice } from '@/lib/pricing';
import { formatTime, formatDateLong } from '@/lib/dates';

const RouteMap = dynamic(() => import('@/components/admin/RouteMap'), { ssr: false });

export default function AdminDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDate, setActiveDate] = useState(null);
  const [routeOrder, setRouteOrder] = useState(null);
  const [routeSummary, setRouteSummary] = useState(null);
  const [optimising, setOptimising] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/bookings');
    const data = await res.json();
    setBookings(data.bookings || []);
    setStats(data.stats || null);
    if (!activeDate && data.bookings?.length) setActiveDate(data.bookings[0].job_date);
    setLoading(false);
  }, [activeDate]);

  useEffect(() => {
    load();
  }, [load]);

  const dates = [...new Set(bookings.map((b) => b.job_date))];
  const dayBookings = bookings.filter((b) => b.job_date === activeDate);

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const optimise = async () => {
    setOptimising(true);
    setRouteOrder(null);
    setRouteSummary(null);
    const res = await fetch('/api/admin/optimise-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: activeDate }),
    });
    const data = await res.json();
    setRouteOrder(data.order || []);
    setRouteSummary(data.summary || null);
    setOptimising(false);
  };

  const act = async (path, body, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const res = await fetch(`/api/admin/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      alert(data.error || 'Action failed');
      return;
    }
    await load();
  };

  return (
    <main className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Logo className="h-7" />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Dispatch</span>
          <button onClick={logout} className="text-sm text-gray-400 underline">
            Log out
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Jobs" value={stats.jobs} />
            <Stat label="Revenue" value={`$${stats.revenue}`} />
            <Stat label="Flagged" value={stats.flagged} accent={stats.flagged > 0} />
            <Stat label="High risk" value={stats.high_risk} accent={stats.high_risk > 0} />
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-center py-10">Loading…</p>
        ) : dates.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No upcoming jobs.</p>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {dates.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setActiveDate(d);
                    setRouteOrder(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
                    activeDate === d ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'
                  }`}
                >
                  {formatDateLong(d)}
                </button>
              ))}
            </div>

            <button
              onClick={optimise}
              disabled={optimising}
              className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl disabled:bg-orange-300"
            >
              {optimising ? 'Optimising route…' : '🗺️ Optimise route for this day'}
            </button>

            {routeOrder && routeOrder.length > 0 && (
              <div className="space-y-2">
                <RouteMap stops={routeOrder} />
                {routeSummary && (
                  <div className="bg-white rounded-xl border border-gray-200 p-3 grid grid-cols-4 gap-2 text-center text-xs">
                    <div><div className="font-bold text-gray-900">{routeSummary.jobs}</div><div className="text-gray-400">Jobs</div></div>
                    <div><div className="font-bold text-gray-900">${routeSummary.total_revenue}</div><div className="text-gray-400">Revenue</div></div>
                    <div><div className="font-bold text-gray-900">${routeSummary.total_est_profit}</div><div className="text-gray-400">Est. Profit</div></div>
                    <div><div className="font-bold text-gray-900">{routeSummary.avg_margin}</div><div className="text-gray-400">Margin</div></div>
                  </div>
                )}
                <ol className="bg-white rounded-xl border border-gray-200 divide-y">
                  {routeOrder.map((s) => (
                    <li key={s.id} className="px-3 py-2 flex items-center gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">
                        {s.position}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-gray-400">{s.quadrant}</span>
                        </div>
                        <div className="text-xs text-gray-500">{s.address}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${s.total_price}</div>
                        {s.est_profit !== undefined && (
                          <div className="text-xs text-green-600">~${s.est_profit} profit</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="space-y-3">
              {dayBookings.map((b) => (
                <JobCard key={b.id} b={b} act={act} />
              ))}
            </div>
          </>
        )}

        <ManualBookingButton onCreated={load} />
        <AddCustomDateButton onAdded={load} />
      </div>
    </main>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
      <div className={`text-xl font-bold ${accent ? 'text-orange-600' : 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function JobCard({ b, act }) {
  const [open, setOpen] = useState(false);
  const done = b.status === 'completed';

  return (
    <div className={`bg-white rounded-2xl border p-4 ${b.flag_for_review ? 'border-orange-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{b.name}</span>
            {b.quadrant && <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{b.quadrant}</span>}
            {done && <span className="text-xs bg-green-100 text-green-700 rounded px-1.5 py-0.5">Done</span>}
          </div>
          <a href={`tel:${b.phone}`} className="text-sm text-orange-600">{b.phone}</a>
          <p className="text-sm text-gray-500">{b.address}</p>
        </div>
        <div className="text-right">
          <div className="font-bold">{formatTime(b.job_time)}</div>
          <div className="text-sm text-gray-500">{LOAD_LABELS[b.load_size]}</div>
          <div className="text-sm font-semibold">${b.total_price}</div>
        </div>
      </div>

      {b.flag_for_review && (
        <p className="mt-2 text-xs text-orange-700 bg-orange-50 rounded p-2">
          🚨 {b.flag_reason || 'Flagged for review'}
        </p>
      )}
      {b.has_freon && <p className="mt-1 text-xs text-blue-700">🌡️ Freon appliance, bring straps</p>}
      {(b.no_show_risk_score || 0) >= 50 && (
        <p className="mt-1 text-xs text-red-600">⚠️ No-show risk {b.no_show_risk_score}%</p>
      )}
      {b.photos?.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
          {b.photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={p} alt="job" className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
          ))}
        </div>
      )}

      {!done && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => act('complete', { booking_id: b.id })}
            className="flex-1 bg-green-600 text-white text-sm font-semibold py-2 rounded-lg"
          >
            ✓ Complete
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex-1 border border-gray-300 text-sm font-semibold py-2 rounded-lg"
          >
            Manage
          </button>
        </div>
      )}

      {open && !done && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() =>
              act(
                'cancel',
                { booking_id: b.id, reason: 'Operator cancelled', by: 'operator' },
                'Cancel this job and refund the $50 deposit?'
              )
            }
            className="flex-1 border border-red-300 text-red-600 text-sm py-2 rounded-lg"
          >
            Cancel + refund
          </button>
          <button
            onClick={() => {
              const nd = window.prompt('New date (YYYY-MM-DD)?', b.job_date);
              if (!nd) return;
              const nt = window.prompt('New time (HH:MM 24h)?', b.job_time);
              if (!nt) return;
              act('reschedule', { booking_id: b.id, new_date: nd, new_time: nt });
            }}
            className="flex-1 border border-gray-300 text-sm py-2 rounded-lg"
          >
            Reschedule
          </button>
        </div>
      )}
    </div>
  );
}

function ManualBookingButton({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', unit: '',
    load_size: 'quarter',
    job_date: '', job_time: '09:00',
    same_day: false, stairs: 0, has_freon: false, freon_count: 0,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showSlots, setShowSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setBool = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  const loadSlots = async (date) => {
    if (!date) return;
    const res = await fetch(`/api/slots`);
    const data = await res.json();
    const day = (data.days || []).find((d) => d.date === date);
    setAvailableSlots(day?.slots || []);
    setShowSlots(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          source: 'admin',
          photo_skipped: true,
          has_freon: form.freon_count > 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setOpen(false);
      setForm({ name: '', phone: '', email: '', address: '', unit: '', load_size: 'quarter', job_date: '', job_time: '09:00', same_day: false, stairs: 0, has_freon: false, freon_count: 0, notes: '' });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm font-semibold text-gray-600 hover:border-orange-400 hover:text-orange-600"
      >
        + Add manual booking
      </button>
    );
  }

  // Calculate live price
  const livePrice = calculatePrice({
    load_size: form.load_size,
    same_day: form.same_day,
    stairs: parseInt(form.stairs) || 0,
    has_freon: form.freon_count > 0,
    freon_count: parseInt(form.freon_count) || 0,
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <h3 className="font-bold text-gray-900">Manual booking</h3>

      <div className="space-y-2">
        <input value={form.name} onChange={set('name')} placeholder="Customer name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={form.phone} onChange={set('phone')} placeholder="Phone (+1...)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={form.email} onChange={set('email')} placeholder="Email (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={form.address} onChange={set('address')} placeholder="Pickup address" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={form.unit} onChange={set('unit')} placeholder="Unit / apt (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select value={form.load_size} onChange={set('load_size')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="single_item">1-2 items ($99)</option>
          <option value="quarter">Small ($160)</option>
          <option value="half">Half ($240)</option>
          <option value="full">Full ($380)</option>
        </select>
        <input type="date" value={form.job_date} onChange={(e) => { set('job_date')(e); loadSlots(e.target.value); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      {showSlots && availableSlots.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availableSlots.map((s) => (
            <button
              key={s.time}
              onClick={() => setForm((f) => ({ ...f, job_time: s.time }))}
              className={`px-2 py-1 rounded text-xs ${form.job_time === s.time ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <input type="time" value={form.job_time} onChange={set('job_time')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Freon appliances ($40 each)</label>
          <input type="number" min="0" max="10" value={form.freon_count} onChange={set('freon_count')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Stairs (flights, $25 each)</label>
          <input type="number" min="0" max="10" value={form.stairs} onChange={set('stairs')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={form.same_day} onChange={setBool('same_day')} className="w-4 h-4 rounded" />
        Same-day pickup (+$50)
      </label>

      <textarea value={form.notes} onChange={set('notes')} placeholder="Internal notes (optional, not sent to customer)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16" />

      {/* Live price summary */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
        <div className="flex justify-between"><span>Base ({LOAD_LABELS[form.load_size]})</span><span>${livePrice.base_price}</span></div>
        {livePrice.freon_fee > 0 && <div className="flex justify-between"><span>Freon ({form.freon_count})</span><span>${livePrice.freon_fee}</span></div>}
        {livePrice.stairs_fee > 0 && <div className="flex justify-between"><span>Stairs ({form.stairs})</span><span>${livePrice.stairs_fee}</span></div>}
        {livePrice.same_day_fee > 0 && <div className="flex justify-between"><span>Same-day</span><span>${livePrice.same_day_fee}</span></div>}
        <div className="flex justify-between font-bold pt-1 border-t"><span>Total</span><span>${livePrice.total}</span></div>
        <div className="flex justify-between text-gray-500"><span>Deposit</span><span>$50</span></div>
        <div className="flex justify-between text-gray-500"><span>Balance on pickup</span><span>${livePrice.balance_due}</span></div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 border border-gray-300 text-sm py-2 rounded-lg">Cancel</button>
        <button onClick={submit} disabled={submitting || !form.name || !form.phone || !form.address || !form.job_date} className="flex-1 bg-orange-500 text-white text-sm font-semibold py-2 rounded-lg disabled:bg-orange-300">
          {submitting ? 'Creating…' : 'Create + send deposit link'}
        </button>
      </div>
    </div>
  );
}

function AddCustomDateButton({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [maxJobs, setMaxJobs] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/add-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          times: ['07:30', '09:00', '11:00', '13:00'],
          max_jobs: parseInt(maxJobs),
          day_type: 'custom',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setOpen(false);
      setDate('');
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm font-semibold text-gray-600 hover:border-orange-400 hover:text-orange-600"
      >
        + Add custom work day
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <h3 className="font-bold text-gray-900">Add custom work day</h3>
      <p className="text-xs text-gray-500">Opens slots on a specific date (e.g. a Thursday or weekday). Default slots are Sundays only.</p>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      <div>
        <label className="text-xs text-gray-500">Max jobs per slot</label>
        <input type="number" min="1" max="10" value={maxJobs} onChange={(e) => setMaxJobs(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <p className="text-xs text-gray-400">Slots: 7:30 AM, 9:00 AM, 11:00 AM, 1:00 PM (last job starts by 1 PM so you finish before dump closes at 5 PM)</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 border border-gray-300 text-sm py-2 rounded-lg">Cancel</button>
        <button onClick={submit} disabled={submitting || !date} className="flex-1 bg-orange-500 text-white text-sm font-semibold py-2 rounded-lg disabled:bg-orange-300">
          {submitting ? 'Adding…' : 'Add slots'}
        </button>
      </div>
    </div>
  );
}
