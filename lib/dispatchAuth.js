// ============================================================
// DISPATCH AUTH — scoped audit logging for the Dispatch AI agent.
//
// The Dispatch agent calls tools via the Vapi webhook (which is
// already authenticated via VAPI_SERVER_SECRET). This module
// provides audit logging so every Dispatch action is recorded
// in the dispatch_actions table for owner review.
//
// Dispatch does NOT hold the admin cookie or employee session.
// It operates with least-privilege: only the specific tools
// defined in lib/dispatchTools.js.
// ============================================================

import { supabaseAdmin } from './supabase';

export const DISPATCH_AGENT = 'Dispatch (AI Crew Support)';

// Log every dispatch action for audit trail
export async function logDispatchAction({ action, caller_phone, employee_id, booking_id, details, tier }) {
  try {
    await supabaseAdmin.from('dispatch_actions').insert({
      action,
      caller_phone: caller_phone || null,
      employee_id: employee_id || null,
      booking_id: booking_id || null,
      details: details || null,
      tier: tier || 'A',
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    // Best-effort — don't fail the tool call over logging
    console.error('dispatch_actions log failed:', e);
  }
}

// Look up an employee by phone number (for crew calling in)
export async function findEmployeeByPhone(phone) {
  if (!phone) return null;
  const normalized = phone.replace(/\D/g, '');
  const patterns = [phone, `+1${normalized}`, `1${normalized}`, normalized];
  const { data } = await supabaseAdmin
    .from('employees')
    .select('id, email, name, first_name, last_name, phone, status, hire_date, pay_rate, onboarded_at, onboarding_completed_at')
    .or(patterns.map(p => `phone.eq.${p}`).join(','))
    .maybeSingle();
  return data;
}

// Look up an employee by email
export async function findEmployeeByEmail(email) {
  if (!email) return null;
  const { data } = await supabaseAdmin
    .from('employees')
    .select('id, email, name, first_name, last_name, phone, status, hire_date, pay_rate, onboarded_at, onboarding_completed_at')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  return data;
}

// Look up an employee by name (fuzzy)
export async function findEmployeeByName(name) {
  if (!name) return null;
  const { data } = await supabaseAdmin
    .from('employees')
    .select('id, email, name, first_name, last_name, phone, status, hire_date, pay_rate, onboarded_at, onboarding_completed_at')
    .ilike('name', `%${name}%`)
    .order('created_at', { ascending: false })
    .limit(5);
  return data;
}
