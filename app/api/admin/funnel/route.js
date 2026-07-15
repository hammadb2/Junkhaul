import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === await adminToken();
}

export async function GET(req) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '30', 10);
  const abVariant = searchParams.get('variant') || null;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabaseAdmin
    .from('leads')
    .select('last_step_reached, last_step_at, converted_to_booking_id, ab_variant, created_at')
    .gte('created_at', since);

  if (abVariant) query = query.eq('ab_variant', abVariant);

  const { data: leads, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Define the funnel steps in order
  const STEP_ORDER = ['phone', 'address', 'photos', 'review', 'schedule', 'details', 'payment', 'done'];

  // Count how many leads reached each step
  const stepCounts = {};
  for (const step of STEP_ORDER) stepCounts[step] = 0;

  let totalLeads = leads.length;
  let totalConversions = 0;

  for (const lead of leads) {
    const step = lead.last_step_reached;
    if (step && stepCounts.hasOwnProperty(step)) {
      stepCounts[step]++;
    }
    if (lead.converted_to_booking_id) totalConversions++;
  }

  // Build funnel: for each step, how many reached it, what % of total, what % dropped from previous step
  const funnel = [];
  let prevCount = totalLeads;
  for (let i = 0; i < STEP_ORDER.length; i++) {
    const step = STEP_ORDER[i];
    const count = stepCounts[step];
    // A lead "reached" step N if their last_step_reached is N or later
    // But we only store the LAST step, so we need to count cumulative
    // Actually, last_step_reached is the FURTHEST step they got to.
    // So leads who reached 'photos' includes those who went further.
    // We need cumulative counts: count of leads whose last_step >= this step
    let cumulative = 0;
    for (let j = i; j < STEP_ORDER.length; j++) {
      cumulative += stepCounts[STEP_ORDER[j]];
    }

    const pctOfTotal = totalLeads > 0 ? Math.round((cumulative / totalLeads) * 100) : 0;
    const dropFromPrev = prevCount > 0 ? Math.round(((prevCount - cumulative) / prevCount) * 100) : 0;
    const dropCount = prevCount - cumulative;

    funnel.push({
      step,
      reached: cumulative,
      pctOfTotal,
      droppedHere: dropCount,
      dropRate: dropFromPrev,
    });

    prevCount = cumulative;
  }

  // A/B variant comparison
  const variants = {};
  for (const lead of leads) {
    const v = lead.ab_variant || 'unknown';
    if (!variants[v]) variants[v] = { total: 0, converted: 0, steps: {} };
    variants[v].total++;
    if (lead.converted_to_booking_id) variants[v].converted++;
    const step = lead.last_step_reached;
    if (step) {
      variants[v].steps[step] = (variants[v].steps[step] || 0) + 1;
    }
  }

  // Build per-variant funnel
  const variantFunnel = {};
  for (const [variantName, vData] of Object.entries(variants)) {
    const vFunnel = [];
    let vPrev = vData.total;
    for (let i = 0; i < STEP_ORDER.length; i++) {
      const step = STEP_ORDER[i];
      let cumulative = 0;
      for (let j = i; j < STEP_ORDER.length; j++) {
        cumulative += vData.steps[STEP_ORDER[j]] || 0;
      }
      vFunnel.push({
        step,
        reached: cumulative,
        pctOfTotal: vData.total > 0 ? Math.round((cumulative / vData.total) * 100) : 0,
        dropRate: vPrev > 0 ? Math.round(((vPrev - cumulative) / vPrev) * 100) : 0,
      });
      vPrev = cumulative;
    }
    variantFunnel[variantName] = {
      total: vData.total,
      converted: vData.converted,
      conversionRate: vData.total > 0 ? Math.round((vData.converted / vData.total) * 100) : 0,
      funnel: vFunnel,
    };
  }

  // Phone step drop-off specifically (the key metric)
  const phoneStepReached = stepCounts['phone'] + stepCounts['address'] + stepCounts['photos'] + stepCounts['review'] + stepCounts['schedule'] + stepCounts['details'] + stepCounts['payment'] + stepCounts['done'];
  const phoneStepDropOff = totalLeads - phoneStepReached;
  const phoneStepDropRate = totalLeads > 0 ? Math.round((phoneStepDropOff / totalLeads) * 100) : 0;

  return NextResponse.json({
    days,
    totalLeads,
    totalConversions,
    overallConversionRate: totalLeads > 0 ? Math.round((totalConversions / totalLeads) * 100) : 0,
    funnel,
    phoneStepDropRate,
    phoneStepDropOff,
    variants: variantFunnel,
  });
}
