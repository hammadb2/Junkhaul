import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// GET /api/employee/issues?booking_id=xxx — list issues for a booking
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('booking_id');

  try {
    let query = supabaseAdmin.from('job_issues').select('*').eq('employee_id', emp.id);
    if (bookingId) query = query.eq('booking_id', bookingId);
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) return NextResponse.json({ issues: [] });
    return NextResponse.json({ issues: data || [] });
  } catch {
    return NextResponse.json({ issues: [] });
  }
}

// POST /api/employee/issues — create a new job issue flag
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { booking_id, issue_type, severity, description, photo_url } = await req.json();

    const { data, error } = await supabaseAdmin
      .from('job_issues')
      .insert({
        employee_id: emp.id,
        booking_id: booking_id || null,
        issue_type: issue_type || 'other',
        severity: severity || 'medium',
        description: description || '',
        photo_url: photo_url || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Also create a notification for admin
    await supabaseAdmin.from('crew_notifications').insert({
      employee_id: emp.id,
      type: 'warning',
      title: `Issue flagged: ${issue_type}`,
      body: description || `Severity: ${severity}`,
      link: booking_id ? `/portal/job?booking_id=${booking_id}` : null,
    }).then(() => {});

    return NextResponse.json({ issue: data });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
  }
}
