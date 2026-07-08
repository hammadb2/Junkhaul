// ============================================================
// DIRECT DEPOSIT — abstracted EFT provider interface.
//
// The actual payout to employee bank accounts goes through an EFT
// payments provider linked to the business bank account. We're
// building behind a clean interface so the provider can be swapped
// (VoPay / Peoples Payment Solutions / Plooto) without touching
// the payroll or admin code.
//
// WHAT WE NEED FROM YOU TO GO LIVE (once you pick a provider):
//   - Provider account + API credentials (key/secret or OAuth).
//   - Business bank account linked & verified in the provider
//     dashboard (usually a micro-deposit verification, 1-2 days).
//   - Set the provider env vars (see the chosen adapter below).
//   - Confirm the EFT settlement timing (VoPay: same-day/next-day;
//     Peoples: 1-2 business days; Plooto: 2-3 business days).
//
// Each adapter implements:
//   sendPayment({ amount, employee, reference }) -> { txnId, status, raw }
//   getStatus(txnId) -> { status, settledAt }
//
// Employee banking details are collected at onboarding (encrypted
// at rest) and feed directly into the provider's EFT payload:
//   institution number, transit number, account number.
// ============================================================

import { supabaseAdmin } from './supabase';
import { decryptField } from './employeeAuth';

export const PROVIDERS = ['vopay', 'peoples', 'plooto'];

function activeProvider() {
  return (process.env.EFT_PROVIDER || 'vopay').toLowerCase();
}

// ------------------------------------------------------------
// Decrypt employee banking info for the provider payload.
// ------------------------------------------------------------
export function getEmployeeBanking(employee) {
  if (!employee.bank_account_enc) return null;
  return {
    institution: employee.bank_institution,
    transit: employee.bank_transit,
    account: decryptField(employee.bank_account_enc),
  };
}

// ------------------------------------------------------------
// Adapter: VoPay (EFT API). Docs: developers.vopay.com
//   Env: VOPAY_API_KEY, VOPAY_API_TOKEN, VOPAY_BUSINESS_ACCOUNT
// ------------------------------------------------------------
async function vopaySend({ amount, employee, reference }) {
  const banking = getEmployeeBanking(employee);
  if (!banking) throw new Error('Employee banking info missing');
  const res = await fetch('https://api.vopay.com/api/v1/eft/transactions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOPAY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: process.env.VOPAY_API_KEY,
      account: process.env.VOPAY_BUSINESS_ACCOUNT,
      amount: amount.toFixed(2),
      currency: 'CAD',
      type: 'credit', // push to employee
      institution_number: banking.institution,
      branch_transit_number: banking.transit,
      account_number: banking.account,
      reference,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'VoPay EFT failed');
  return { txnId: data.transaction_id, status: 'sent', raw: data };
}

// ------------------------------------------------------------
// Adapter: Peoples Payment Solutions. Env: PEOPLES_API_KEY, PEOPLES_MERCHANT
// ------------------------------------------------------------
async function peoplesSend({ amount, employee, reference }) {
  const banking = getEmployeeBanking(employee);
  if (!banking) throw new Error('Employee banking info missing');
  const res = await fetch('https://api.peoplespayments.com/v1/eft/credit', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.PEOPLES_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant_id: process.env.PEOPLES_MERCHANT,
      amount: amount.toFixed(2),
      institution: banking.institution,
      transit: banking.transit,
      account: banking.account,
      reference,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Peoples EFT failed');
  return { txnId: data.transaction_id, status: 'sent', raw: data };
}

// ------------------------------------------------------------
// Adapter: Plooto. Env: PLOOTO_API_KEY, PLOOTO_BUSINESS_ID
// ------------------------------------------------------------
async function plootoSend({ amount, employee, reference }) {
  const banking = getEmployeeBanking(employee);
  if (!banking) throw new Error('Employee banking info missing');
  const res = await fetch('https://api.plooto.com/v1/payments', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.PLOOTO_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: process.env.PLOOTO_BUSINESS_ID,
      amount: amount.toFixed(2),
      currency: 'CAD',
      institution_number: banking.institution,
      transit_number: banking.transit,
      account_number: banking.account,
      reference,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Plooto EFT failed');
  return { txnId: data.id, status: 'sent', raw: data };
}

// ------------------------------------------------------------
// Public API — send a direct deposit for one pay stub.
// Records the transaction in direct_deposit_log regardless of
// outcome (failure is logged with the error).
// ------------------------------------------------------------
export async function sendDirectDeposit({ payStub, employee }) {
  const provider = activeProvider();
  const amount = Number(payStub.net_pay);
  const reference = `JH-PAY-${payStub.pay_run_id?.slice(0, 8)}-${employee.id?.slice(0, 6)}`;

  const senders = { vopay: vopaySend, peoples: peoplesSend, plooto: plootoSend };
  const send = senders[provider];
  if (!send) throw new Error(`Unknown EFT provider: ${provider}`);

  try {
    const { txnId, status, raw } = await send({ amount, employee, reference });

    await supabaseAdmin.from('direct_deposit_log').insert({
      pay_stub_id: payStub.id,
      employee_id: employee.id,
      provider,
      provider_txn_id: txnId,
      amount,
      status,
      raw_response: raw,
    });

    await supabaseAdmin.from('pay_stubs')
      .update({ direct_deposit_status: status, direct_deposit_id: txnId, direct_deposit_sent_at: new Date().toISOString() })
      .eq('id', payStub.id);

    return { ok: true, txnId, status };
  } catch (e) {
    await supabaseAdmin.from('direct_deposit_log').insert({
      pay_stub_id: payStub.id,
      employee_id: employee.id,
      provider,
      amount,
      status: 'failed',
      error: e.message,
    });
    await supabaseAdmin.from('pay_stubs')
      .update({ direct_deposit_status: 'failed' })
      .eq('id', payStub.id);
    return { ok: false, error: e.message };
  }
}

export function isDirectDepositConfigured() {
  const p = activeProvider();
  if (p === 'vopay') return !!(process.env.VOPAY_API_KEY && process.env.VOPAY_API_TOKEN);
  if (p === 'peoples') return !!process.env.PEOPLES_API_KEY;
  if (p === 'plooto') return !!process.env.PLOOTO_API_KEY;
  return false;
}
