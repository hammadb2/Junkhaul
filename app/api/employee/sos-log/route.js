import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { sendSMS } from '@/lib/sms';

export const runtime = 'nodejs';

// POST /api/employee/sos-log — logs an SOS event and notifies dispatch.
// This ensures the SOS is recorded server-side even if the crew
// doesn't complete sending the SMS from their phone's Messages app.
export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { lat, lng, timestamp } = body;
  const now = timestamp || new Date().toISOString();

  // Insert into safety_alerts table (or incidents if safety_alerts doesn't exist)
  let alertRecord;
  const { data: alert, error: alertErr } = await supabaseAdmin
    .from('safety_alerts')
    .insert({
      employee_id: employee.id,
      alert_type: 'sos',
      lat: lat || null,
      lng: lng || null,
      status: 'active',
      created_at: now,
      notes: `SOS triggered by ${employee.name}`,
    })
    .select()
    .single();

  if (alertErr) {
    // Fallback to incident_reports
    const { data: incident, error: incErr } = await supabaseAdmin
      .from('incident_reports')
      .insert({
        employee_id: employee.id,
        incident_type: 'sos_emergency',
        severity: 'critical',
        description: `SOS triggered by ${employee.name}${lat ? ` from lat:${lat}, lng:${lng}` : ''}`,
        status: 'open',
        created_at: now,
      })
      .select()
      .single();

    if (incErr) {
      return NextResponse.json({ error: 'Failed to log SOS' }, { status: 500 });
    }
    alertRecord = incident;
  } else {
    alertRecord = alert;
  }

  // Notify dispatch via SMS (Hammad's number)
  const dispatchPhone = process.env.DISPATCH_PHONE || '5873250751';
  const locationStr = lat && lng ? ` Location: https://maps.google.com/?q=${lat},${lng}` : '';
  try {
    await sendSMS(
      dispatchPhone,
      `EMERGENCY SOS from ${employee.name} (${employee.email || 'no email'}).${locationStr} Check the admin dashboard immediately.`,
      null,
      'sos_alert'
    );
  } catch {
    // SMS failure shouldn't block the response — the alert is already logged
  }

  return NextResponse.json({ success: true, alert_id: alertRecord?.id });
}
