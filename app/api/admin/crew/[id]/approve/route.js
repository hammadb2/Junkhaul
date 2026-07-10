import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { ADMIN_COOKIE, adminToken } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function checkAuth() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === (await adminToken());
}

// POST /api/admin/crew/[id]/approve
// Body: { action: 'approve' | 'reject', notes? }
//
// approve  → sets employee status to 'active', sends SMS notification
// reject   → sets employee status to 'rejected', sends SMS with reason
export async function POST(req, { params }) {
  if (!(await checkAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const { action, notes } = await req.json();

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  // Get employee
  const { data: employee, error: empErr } = await supabaseAdmin
    .from('employees')
    .select('id, email, phone, first_name, last_name, status')
    .eq('id', id)
    .maybeSingle();

  if (empErr || !employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  if (action === 'approve') {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('employees')
      .update({
        status: 'active',
        verified_at: now,
        verified_by: 'admin',
        updated_at: now,
      })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send SMS notification to crew member
    if (employee.phone) {
      try {
        const { sendSMS } = await import('@/lib/sms');
        const msg = `Youre approved! Welcome to Junk Haul Calgary. You can now log in to the crew app and start picking up shifts. Download it at junkhaul.ca/portal`;
        await sendSMS(employee.phone, msg, null, 'approval');
      } catch (e) {
        console.warn('Approval SMS failed:', e.message);
      }
    }

    return NextResponse.json({ ok: true, status: 'active' });
  } else {
    // Reject
    const { error } = await supabaseAdmin
      .from('employees')
      .update({
        status: 'rejected',
        verified_at: new Date().toISOString(),
        verified_by: 'admin',
        verification_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send SMS notification
    if (employee.phone) {
      try {
        const { sendSMS } = await import('@/lib/sms');
        const msg = notes
          ? `Hi ${employee.first_name}, your onboarding was not approved. Reason: ${notes}. Please contact us at (587) 325 0751 if you have questions.`
          : `Hi ${employee.first_name}, your onboarding was not approved. Please contact us at (587) 325 0751.`;
        await sendSMS(employee.phone, msg, null, 'rejection');
      } catch (e) {
        console.warn('Rejection SMS failed:', e.message);
      }
    }

    return NextResponse.json({ ok: true, status: 'rejected' });
  }
}
