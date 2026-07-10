import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

// GET /api/employee/notifications — list notifications for the current employee
export async function GET(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from('crew_notifications')
      .select('*')
      .eq('employee_id', emp.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // Table might not exist yet — return empty
      return NextResponse.json({ notifications: [], unread: 0 });
    }

    const unread = (data || []).filter((n) => !n.read_at).length;
    return NextResponse.json({ notifications: data || [], unread });
  } catch {
    return NextResponse.json({ notifications: [], unread: 0 });
  }
}

// POST /api/employee/notifications — mark notifications as read
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, markAll } = await req.json();

    if (markAll) {
      const { error } = await supabaseAdmin
        .from('crew_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('employee_id', emp.id)
        .is('read_at', null);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (id) {
      const { error } = await supabaseAdmin
        .from('crew_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('employee_id', emp.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
