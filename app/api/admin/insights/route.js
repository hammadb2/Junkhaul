import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { edmontonNowParts } from '@/lib/dates';
import { isKillSwitchOn } from '@/lib/audit';
import { getNumberConfig, getBooleanConfig } from '@/lib/config';
import { callDeepSeek } from '@/lib/deepseek';
import { requireStaffPermission } from '@/lib/staffAuth';
import { isPaidStatus } from '@/lib/paymentStatus';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are the narrator for a junk removal company's admin dashboard in Calgary, Alberta. Your job is to read the raw operational data and write ONE short paragraph (3-5 sentences, plain English) that a sharp operator would say out loud at the start of a shift.

Rules:
- Be concrete. Use actual numbers from the data.
- If something is off (stale cron, frustrated call, no jobs today), say so directly.
- If everything looks fine, say so briefly — don't invent problems.
- Never use bullet points or headers. One flowing paragraph.
- Maximum 80 words. Tight, not chatty.
- Don't give advice or action items unless something is actually broken.
- Refer to the company as "we" not "Junk Haul Calgary".`;

// GET /api/admin/insights?force=1
// Returns the latest cached briefing, or generates a new one if stale.
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'reports.read', action: 'insights.read_or_generate' });
  if (!auth.ok) return auth.response;

  try {
    if (!(await isKillSwitchOn('ai_narrator'))) {
      return NextResponse.json({ skipped: true, reason: 'kill_switch_off' });
    }

    const force = new URL(req.url).searchParams.get('force') === '1';
    const refreshMinutes = await getNumberConfig('ai_narrator_refresh_minutes', 15);

    // Check cache freshness
    if (!force) {
      const { data: latest } = await supabaseAdmin
        .from('ai_insights')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest) {
        const ageMs = Date.now() - new Date(latest.generated_at).getTime();
        const refreshMs = refreshMinutes * 60 * 1000;
        if (ageMs < refreshMs) {
          return NextResponse.json({
            content: latest.content,
            generated_at: latest.generated_at,
            cached: true,
            model: latest.model,
          });
        }
      }
    }

    // Gather the same data command-center uses
    const summary = await gatherInputSummary();

    // Build the prompt
    const prompt = buildPrompt(summary);

    // Call DeepSeek
    const { content, usage } = await callDeepSeek({
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.4,
      max_tokens: 200,
    });

    // Store in ai_insights
    const { data: inserted } = await supabaseAdmin
      .from('ai_insights')
      .insert({
        content: content.trim(),
        model: 'deepseek-v4-pro',
        input_summary: summary,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    return NextResponse.json({
      content: content.trim(),
      generated_at: inserted?.generated_at || new Date().toISOString(),
      cached: false,
      model: 'deepseek-v4-pro',
      usage,
    });
  } catch (error) {
    console.error('Insights error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Gather the same data the Command Center dashboard shows.
async function gatherInputSummary() {
  const { date: today } = edmontonNowParts();

  const { data: todayBookings } = await supabaseAdmin
    .from('bookings')
    .select('total_price, balance_due, status, payment_status, surge_multiplier, surge_mode, name, load_size, job_time')
    .eq('job_date', today)
    .in('status', ['confirmed', 'completed', 'rescheduled']);

  const jobs = todayBookings || [];
  const revenueToCollect = jobs.reduce((s, b) => s + (b.balance_due || 0), 0);
  // See audit G3 — payment_status has no plain 'paid' value; isPaidStatus is
  // the source of truth for "money actually collected".
  const revenueCollected = jobs.filter(b => b.status === 'completed' && isPaidStatus(b.payment_status)).reduce((s, b) => s + b.total_price, 0);
  const surgeBookings = jobs.filter(b => b.surge_multiplier && b.surge_multiplier !== 1);

  const now = new Date().toISOString();
  const { data: pendingOffers } = await supabaseAdmin
    .from('nearby_offers')
    .select('customer_phone, original_price, discounted_price, discount_percent, offer_expires_at')
    .gt('offer_expires_at', now)
    .order('created_at', { ascending: false })
    .limit(10);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: urgentCalls } = await supabaseAdmin
    .from('call_history')
    .select('caller_number, caller_name, sentiment, call_summary, call_date')
    .in('sentiment', ['frustrated', 'negative'])
    .gt('call_date', oneDayAgo)
    .order('call_date', { ascending: false })
    .limit(5);

  const { data: cronHealth } = await supabaseAdmin
    .from('cron_health')
    .select('*')
    .order('job_name', { ascending: true });

  const staleJobs = [];
  const expectedWindows = {
    'abandonment-followup': 45 * 60 * 1000,
    'opportunistic-offer-live': 10 * 60 * 1000,
    'opportunistic-offer-proactive': 25 * 60 * 60 * 1000,
    'review-request': 70 * 60 * 1000,
    'demand-snapshot': 7 * 60 * 60 * 1000,
  };

  for (const job of cronHealth || []) {
    const window = expectedWindows[job.job_name];
    if (window && job.last_run_at) {
      const since = new Date() - new Date(job.last_run_at);
      if (since > window) {
        staleJobs.push({ job_name: job.job_name, minutes_since_run: Math.round(since / 60000) });
      }
    }
  }

  return {
    date: today,
    jobs: {
      count: jobs.length,
      revenue_to_collect: revenueToCollect,
      revenue_collected: revenueCollected,
      list: jobs.map(b => ({ name: b.name, load_size: b.load_size, time: b.job_time, status: b.status, total: b.total_price, balance: b.balance_due })),
    },
    surge: {
      count: surgeBookings.length,
      avg_multiplier: surgeBookings.length ? (surgeBookings.reduce((s, b) => s + b.surge_multiplier, 0) / surgeBookings.length).toFixed(2) : null,
      modes: surgeBookings.reduce((acc, b) => { acc[b.surge_mode || 'none'] = (acc[b.surge_mode || 'none'] || 0) + 1; return acc; }, {}),
    },
    pending_offers: pendingOffers || [],
    urgent_calls: urgentCalls || [],
    stale_cron_jobs: staleJobs,
    cron_health: cronHealth || [],
  };
}

function buildPrompt(summary) {
  const parts = [];

  parts.push(`Date: ${summary.date}`);
  parts.push(`Jobs today: ${summary.jobs.count}`);
  if (summary.jobs.count > 0) {
    parts.push(`Revenue to collect: $${summary.jobs.revenue_to_collect}, already collected: $${summary.jobs.revenue_collected}`);
    parts.push(`Jobs: ${summary.jobs.list.map(j => `${j.name} (${j.load_size}, ${j.time}, $${j.total}, ${j.status})`).join('; ')}`);
  }

  if (summary.surge.count > 0) {
    parts.push(`Surge bookings: ${summary.surge.count}, avg multiplier ${summary.surge.avg_multiplier}x, modes: ${JSON.stringify(summary.surge.modes)}`);
  }

  if (summary.pending_offers.length > 0) {
    parts.push(`Pending opportunistic offers: ${summary.pending_offers.length} (discounts ${summary.pending_offers.map(o => `${o.discount_percent}% off`).join(', ')})`);
  }

  if (summary.urgent_calls.length > 0) {
    parts.push(`Frustrated/negative calls in last 24h: ${summary.urgent_calls.length}`);
    for (const c of summary.urgent_calls) {
      parts.push(`  - ${c.caller_number}: ${c.sentiment} — ${c.call_summary || 'no summary'}`);
    }
  }

  if (summary.stale_cron_jobs.length > 0) {
    parts.push(`Stale cron jobs: ${summary.stale_cron_jobs.map(j => `${j.job_name} (${j.minutes_since_run}min ago)`).join(', ')}`);
  }

  if (summary.jobs.count === 0 && summary.pending_offers.length === 0 && summary.urgent_calls.length === 0 && summary.stale_cron_jobs.length === 0) {
    parts.push('No jobs today, no pending offers, no frustrated calls, no stale crons.');
  }

  parts.push('\nWrite the briefing now.');

  return parts.join('\n');
}
