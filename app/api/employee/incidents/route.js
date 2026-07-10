import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// GET /api/employee/incidents — list incident reports for the current employee
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from('incident_reports')
      .select('*')
      .eq('employee_id', emp.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ incidents: [] });
    return NextResponse.json({ incidents: data || [] });
  } catch {
    return NextResponse.json({ incidents: [] });
  }
}

// POST /api/employee/incidents — file a new incident report
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { booking_id, incident_type, severity, description, location, photo_urls, reported_to } = await req.json();

    if (!description) return NextResponse.json({ error: 'Description is required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('incident_reports')
      .insert({
        employee_id: emp.id,
        booking_id: booking_id || null,
        incident_type: incident_type || 'other',
        severity: severity || 'medium',
        description,
        location: location || null,
        photo_urls: photo_urls || [],
        reported_to: reported_to || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Create notification
    await supabaseAdmin.from('crew_notifications').insert({
      employee_id: emp.id,
      type: 'warning',
      title: `Incident report filed: ${incident_type}`,
      body: `Severity: ${severity} — ${description.substring(0, 100)}`,
    }).then(() => {});

    return NextResponse.json({ incident: data });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to file incident' }, { status: 500 });
  }
}
