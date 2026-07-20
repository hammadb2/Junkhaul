'use client';

import { useState } from 'react';
import { centsToDollarsString } from '@/lib/money.js';

function classForDecision(decision) {
  switch (decision) {
    case 'reject':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'review':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'accept':
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

function badgeForDecision(decision) {
  switch (decision) {
    case 'reject':
      return 'Loss';
    case 'review':
      return 'Review';
    case 'accept':
    default:
      return 'Accept';
  }
}

function formatPercent(value) {
  if (value === undefined || value === null) return '—';
  return `${Number(value).toFixed(1)}%`;
}

function Currency({ cents, fallback = '—' }) {
  if (cents === undefined || cents === null) return fallback;
  return `$${centsToDollarsString(cents)}`;
}

function SummaryCard({ label, value, tone = 'neutral' }) {
  const toneClasses = {
    neutral: 'bg-white text-slate-900',
    loss: 'bg-red-50 text-red-700',
    review: 'bg-amber-50 text-amber-700',
    profit: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <div className={`rounded-xl border border-slate-200 p-4 shadow-sm ${toneClasses[tone] || toneClasses.neutral}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ExpandableLine({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
      >
        <span>{title}</span>
        <span className="text-slate-400">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-700">{children}</div>}
    </div>
  );
}

function LineItem({ label, value, unit, subtext, actual }) {
  return (
    <div className="flex items-start justify-between py-1">
      <div className="flex-1">
        <span className="font-medium text-slate-700">{label}</span>
        {unit && <span className="ml-2 text-xs text-slate-500">({unit})</span>}
        {subtext && <div className="text-xs text-slate-500">{subtext}</div>}
      </div>
      <div className="text-right tabular-nums">
        <div>{value}</div>
        {actual !== undefined && actual !== null && (
          <div className="text-xs text-slate-500">actual: {actual}</div>
        )}
      </div>
    </div>
  );
}

export default function CostBreakdown({
  breakdown,
  assumptions = {},
  rateVersionIds = {},
  actualBreakdown,
  onEvidenceClick,
}) {
  if (!breakdown) {
    return <div className="text-sm text-slate-500">No cost breakdown available.</div>;
  }

  const tone =
    breakdown.decision === 'reject' ? 'loss' :
    breakdown.decision === 'review' ? 'review' :
    'profit';

  const evidenceItems = [
    { label: 'Rental', id: rateVersionIds.rental_rate_version_id },
    { label: 'Fuel', id: rateVersionIds.fuel_rate_version_id },
    { label: 'Labor', id: rateVersionIds.labor_rate_version_id },
    { label: 'Facility', id: rateVersionIds.facility_rate_version_id },
    { label: 'Overhead', id: rateVersionIds.overhead_rate_version_id },
    { label: 'Policy', id: rateVersionIds.pricing_policy_version_id },
  ].filter((i) => i.id);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Total cost" value={<Currency cents={breakdown.total_cost_cents} />} tone={tone} />
        <SummaryCard label="Minimum price" value={<Currency cents={breakdown.minimum_price_cents} />} tone="neutral" />
        <SummaryCard label="Proposed price" value={<Currency cents={breakdown.proposed_price_cents} />} tone="neutral" />
        <SummaryCard label="Contribution" value={<Currency cents={breakdown.contribution_cents} />} tone={tone} />
        <SummaryCard label="Margin" value={formatPercent(breakdown.margin_percent)} tone={tone} />
        <SummaryCard label="Decision" value={badgeForDecision(breakdown.decision)} tone={tone} />
      </div>

      <div className={`rounded-lg border p-3 text-sm ${classForDecision(breakdown.decision)}`}>
        {breakdown.decision === 'reject' && 'This route loses money at the proposed price.'}
        {breakdown.decision === 'review' && 'Margin is thin; review before committing.'}
        {breakdown.decision === 'accept' && 'Margin meets policy.'}
      </div>

      <ExpandableLine title="Rental" defaultOpen>
        <LineItem label="Daily base" value={<Currency cents={breakdown.rental.base_rental_cents} />} unit={`${breakdown.rental.days} day${breakdown.rental.days === 1 ? '' : 's'}`} />
        <LineItem label="Mileage" value={<Currency cents={breakdown.rental.mileage_charge_cents} />} unit={`${breakdown.rental.mileage_km} km`} />
        <LineItem label="Rental total" value={<Currency cents={breakdown.rental.total_cents} />} subtext="Includes base + mileage charges" />
      </ExpandableLine>

      <ExpandableLine title="Fuel">
        <LineItem label="Litres" value={`${breakdown.fuel.litres} L`} unit="100 km at safety rate" />
        <LineItem label="Cost per litre" value={<Currency cents={breakdown.fuel.cost_per_litre_cents} />} unit="per litre" />
        <LineItem label="Fuel total" value={<Currency cents={breakdown.fuel.total_cents} />} />
      </ExpandableLine>

      <ExpandableLine title="Labor">
        <LineItem label="Hours" value={`${breakdown.labor.hours} h`} unit={`${breakdown.labor.people} people`} />
        <LineItem label="Hourly rate" value={<Currency cents={breakdown.labor.hourly_rate_cents} />} unit="per person" />
        <LineItem label="Burden" value={`${breakdown.labor.burden_percent}%`} />
        <LineItem label="Labor total" value={<Currency cents={breakdown.labor.total_cents} />} />
      </ExpandableLine>

      <ExpandableLine title="Disposal">
        <LineItem label="Facility" value={breakdown.disposal.facility || '—'} />
        <LineItem label="Waste stream" value={breakdown.disposal.waste_stream || 'N/A'} />
        <LineItem label="Predicted weight" value={`${breakdown.disposal.predicted_weight_kg} kg`} />
        <LineItem label="Flat minimum" value={<Currency cents={breakdown.disposal.flat_minimum_cents} />} />
        <LineItem label="Disposal total" value={<Currency cents={breakdown.disposal.total_cents} />} />
      </ExpandableLine>

      <ExpandableLine title="Overhead">
        <LineItem label="Payment fee" value={<Currency cents={breakdown.overhead.payment_fee_cents} />} />
        <LineItem label="Supplies" value={<Currency cents={breakdown.overhead.supplies_cents} />} />
        <LineItem label="Insurance" value={<Currency cents={breakdown.overhead.insurance_cents} />} />
        <LineItem label="Software" value={<Currency cents={breakdown.overhead.software_cents} />} />
        <LineItem label="Admin" value={<Currency cents={breakdown.overhead.admin_cents} />} />
        <LineItem label="Contingency" value={<Currency cents={breakdown.overhead.contingency_cents} />} />
        <LineItem label="Risk reserve" value={<Currency cents={breakdown.overhead.risk_reserve_cents} />} />
        <LineItem label="Overhead total" value={<Currency cents={breakdown.overhead.total_cents} />} />
      </ExpandableLine>

      {actualBreakdown && (
        <ExpandableLine title="Variance (estimated vs actual)">
          <LineItem label="Cost variance" value={<Currency cents={actualBreakdown.total_cost_cents - breakdown.total_cost_cents} />} />
          <LineItem label="Margin variance" value={formatPercent(actualBreakdown.margin_percent - breakdown.margin_percent)} />
        </ExpandableLine>
      )}

      {assumptions && Object.keys(assumptions).length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-800">Assumptions</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(assumptions).map(([key, value]) => (
              <span key={key} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {key}: {String(value)}
              </span>
            ))}
          </div>
        </div>
      )}

      {evidenceItems.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-800">Evidence / source versions</h4>
          <div className="space-y-1">
            {evidenceItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onEvidenceClick?.(item)}
                className="block w-full text-left text-xs text-blue-600 hover:underline"
              >
                {item.label}: {item.id}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
