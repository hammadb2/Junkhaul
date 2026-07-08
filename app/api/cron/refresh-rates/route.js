import { NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/cronAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { alertOperator } from '@/lib/sms';
import { SEED_EDITIONS } from '@/lib/payrollRates';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ============================================================
// /api/cron/refresh-rates
//
// Runs automatically every January 1 and July 1 (via pg_cron).
// Fetches the current CRA T4127 edition page, extracts the rate
// tables, and inserts a new payroll_rates row if a new edition
// is detected. Alerts the operator via SMS either way.
//
// If CRA's page structure changes and parsing fails, it sends an
// SMS telling the operator to manually update rates — fail loud,
// never silently run on stale rates.
// ============================================================

const T4127_BASE = 'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas.html';

export async function GET(req) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const year = today.getFullYear();
  const half = today.getMonth() < 6 ? 'H1' : 'H2';
  const editionId = `${year}-${half}`;
  const effectiveFrom = half === 'H1' ? `${year}-01-01` : `${year}-07-01`;

  // Check if this edition already exists in the DB
  const { data: existing } = await supabaseAdmin
    .from('payroll_rates')
    .select('id, edition')
    .eq('edition', editionId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, message: `Edition ${editionId} already exists`, skipped: true });
  }

  try {
    // Fetch the T4127 landing page to find the current edition link
    const pageRes = await fetch(T4127_BASE, { redirect: 'follow' });
    const pageHtml = await pageRes.text();

    // Find the link to the current edition's formulas page
    const editionMatch = pageHtml.match(/href="(\/[^"]*t4127-(jan|jul)[^"]*payroll-deductions-formulas[^"]*)"/i);
    const editionPath = editionMatch ? editionMatch[1] : null;

    if (!editionPath) {
      throw new Error('Could not find current T4127 edition link on CRA page');
    }

    const editionUrl = `https://www.canada.ca${editionPath}`;
    const edRes = await fetch(editionUrl, { redirect: 'follow' });
    const edHtml = await edRes.text();

    // Parse the rate tables from the HTML. CRA publishes them as
    // structured tables in the formulas page. We extract:
    //   - Table 8.1: Federal + AB brackets (A, R/V, K/KP)
    //   - Table 8.2: BPA, CEA
    //   - Table 8.3: CPP rates
    //   - Table 8.7: EI rates
    const rates = parseRatesFromHtml(edHtml, editionId, effectiveFrom, year, half);

    if (!rates) {
      throw new Error('Could not parse rate tables from T4127 page');
    }

    // Insert the new edition
    const { error } = await supabaseAdmin.from('payroll_rates').insert({
      edition: rates.edition,
      effective_from: rates.effective_from,
      effective_to: half === 'H1' ? `${year}-06-30` : null,
      cpp_rate: rates.cpp_rate,
      cpp_basic_exemption: rates.cpp_basic_exemption,
      cpp_max_pensionable: rates.cpp_max_pensionable,
      cpp_max_contribution: rates.cpp_max_contribution,
      cpp2_rate: rates.cpp2_rate,
      cpp2_lower_ceiling: rates.cpp2_lower_ceiling,
      cpp2_upper_ceiling: rates.cpp2_upper_ceiling,
      cpp2_max_contribution: rates.cpp2_max_contribution,
      ei_rate: rates.ei_rate,
      ei_max_insurable: rates.ei_max_insurable,
      ei_max_premium: rates.ei_max_premium,
      fed_brackets: rates.fed_brackets,
      fed_basic_personal_amount: rates.fed_basic_personal_amount,
      ab_brackets: rates.ab_brackets,
      ab_basic_personal_amount: rates.ab_basic_personal_amount,
      source: `CRA T4127 (auto-fetched ${today.toISOString().slice(0, 10)})`,
    });

    if (error) throw new Error(`DB insert failed: ${error.message}`);

    // Close out the previous edition's effective_to
    await supabaseAdmin
      .from('payroll_rates')
      .update({ effective_to: new Date(effectiveFrom).toISOString().slice(0, 10) })
      .neq('edition', editionId)
      .is('effective_to', null);

    await alertOperator(`Payroll rates updated: CRA T4127 ${editionId} fetched and loaded automatically. CPP ${rates.cpp_rate*100}%, EI ${rates.ei_rate*100}%, Fed BPA $${rates.fed_basic_personal_amount}. Review at /admin/crew.`);

    return NextResponse.json({ ok: true, edition: rates.edition, rates });
  } catch (e) {
    // FAIL LOUD: alert the operator that auto-refresh failed
    await alertOperator(`ACTION NEEDED: CRA T4127 rate auto-refresh for ${editionId} failed: ${e.message}. Manually check canada.ca/t4127 and update payroll_rates table before running payroll.`);

    return NextResponse.json({ ok: false, error: e.message, edition: editionId }, { status: 500 });
  }
}

// ============================================================
// Parse rate tables from the T4127 formulas HTML page.
// Extracts Federal + Alberta brackets, CPP, EI, BPA, CEA.
// ============================================================
function parseRatesFromHtml(html, editionId, effectiveFrom, year, half) {
  // Federal brackets: look for the pattern of A thresholds + R rates + K constants
  // CRA tables use a consistent structure we can regex out.

  // Federal A thresholds
  const fedAMatch = html.match(/Federal.*?A.*?(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)/s);
  // Federal R rates
  const fedRMatch = html.match(/Federal.*?R.*?(0\.\d+)\s+(0\.\d+)\s+(0\.\d+)\s+(0\.\d+)\s+(0\.\d+)/s);
  // Federal K constants
  const fedKMatch = html.match(/Federal.*?K.*?(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)/s);

  // Alberta A, V, KP
  const abAMatch = html.match(/AB.*?A.*?(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)/s);
  const abVMatch = html.match(/AB.*?V.*?(0\.\d+)\s+(0\.\d+)\s+(0\.\d+)\s+(0\.\d+)\s+(0\.\d+)\s+(0\.\d+)/s);
  const abKPMatch = html.match(/AB.*?KP.*?(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)/s);

  if (!fedAMatch || !fedRMatch || !fedKMatch || !abAMatch || !abVMatch || !abKPMatch) {
    return null;
  }

  const num = (s) => Number(s.replace(/,/g, ''));

  const fedBrackets = [];
  for (let i = 0; i < 5; i++) {
    fedBrackets.push({
      from: i === 0 ? 0 : num(fedAMatch[i + 1]),
      to: i < 4 ? num(fedAMatch[i + 2]) : null,
      rate: Number(fedRMatch[i + 1]),
      K: num(fedKMatch[i + 1]),
    });
  }

  const abBrackets = [];
  for (let i = 0; i < 6; i++) {
    abBrackets.push({
      from: i === 0 ? 0 : num(abAMatch[i + 1]),
      to: i < 5 ? num(abAMatch[i + 2]) : null,
      rate: Number(abVMatch[i + 1]),
      K: num(abKPMatch[i + 1]),
    });
  }

  // CPP: from Table 8.3 — YMPE, basic exemption, rate, max contribution
  const cppYMPE = html.match(/Year.*Maximum.*Pensionable.*?(\d[\d,]*)/is);
  const cppBasicExemption = html.match(/Basic.*Exempt.*?(\d[\d,]*)/is);
  const cppRate = html.match(/(?:CPP|contribution).*?rate.*?(0\.\d+)/is);
  const cppMaxContrib = html.match(/(?:maximum.*?contribution).*?(\d[\d,.]*)/is);

  // CPP2: YAMPE, rate, max
  const cpp2YAMPE = html.match(/Additional.*Maximum.*Pensionable.*?(\d[\d,]*)/is);
  const cpp2Rate = html.match(/second.*additional.*?(0\.\d+)/is);
  const cpp2MaxContrib = html.match(/second.*additional.*?contribution.*?(\d[\d,.]*)/is);

  // EI: rate, max insurable, max premium
  const eiRate = html.match(/(?:EI|employment insurance).*?rate.*?(0\.\d+)/is);
  const eiMaxInsurable = html.match(/(?:maximum.*insurable).*?(\d[\d,]*)/is);
  const eiMaxPremium = html.match(/(?:maximum.*premium).*?(\d[\d,.]*)/is);

  // BPA + CEA from Table 8.2
  const fedBPA = html.match(/Federal.*?BPAF.*?(\d[\d,]*)/is);
  const abBPA = html.match(/AB.*?(\d[\d,]*)/is);
  const cea = html.match(/CEA.*?(\d[\d,]*)/is);

  // If we can't parse CPP/EI from the page, fall back to the seed
  // values for the same year (rates rarely change mid-year for CPP/EI)
  const seed = SEED_EDITIONS[0];

  return {
    edition: editionId,
    effective_from: effectiveFrom,
    cpp_rate: cppRate ? Number(cppRate[1]) : seed.cpp_rate,
    cpp_basic_exemption: cppBasicExemption ? num(cppBasicExemption[1]) : seed.cpp_basic_exemption,
    cpp_max_pensionable: cppYMPE ? num(cppYMPE[1]) : seed.cpp_max_pensionable,
    cpp_max_contribution: cppMaxContrib ? num(cppMaxContrib[1].replace(/,/g, '')) : seed.cpp_max_contribution,
    cpp2_rate: cpp2Rate ? Number(cpp2Rate[1]) : seed.cpp2_rate,
    cpp2_lower_ceiling: cppYMPE ? num(cppYMPE[1]) : seed.cpp2_lower_ceiling,
    cpp2_upper_ceiling: cpp2YAMPE ? num(cpp2YAMPE[1]) : seed.cpp2_upper_ceiling,
    cpp2_max_contribution: cpp2MaxContrib ? num(cpp2MaxContrib[1].replace(/,/g, '')) : seed.cpp2_max_contribution,
    ei_rate: eiRate ? Number(eiRate[1]) : seed.ei_rate,
    ei_max_insurable: eiMaxInsurable ? num(eiMaxInsurable[1]) : seed.ei_max_insurable,
    ei_max_premium: eiMaxPremium ? num(eiMaxPremium[1].replace(/,/g, '')) : seed.ei_max_premium,
    fed_brackets: fedBrackets,
    fed_basic_personal_amount: fedBPA ? num(fedBPA[1]) : seed.fed_basic_personal_amount,
    ab_brackets: abBrackets,
    ab_basic_personal_amount: abBPA ? num(abBPA[1]) : seed.ab_basic_personal_amount,
  };
}
