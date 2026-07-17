import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET /api/employee/route-stream — Server-Sent Events stream that
// notifies the crew app when their route plan changes.
//
// Authentication: uses the custom jh_employee_session cookie via
// getAuthedEmployee. No Supabase Auth or anon key involved.
//
// The server resolves the employee's crew assignment and polls
// route_plans for changes. The client never provides an assignment ID
// as authorization — the server derives it from the authenticated session.
//
// Event format:
//   event: route_update
//   data: {"route_id":"...","route_version":3,"change_reason":"..."}
//
// The client then fetches /api/employee/route-plan for the full route.
//
// Falls back gracefully: if no assignment exists, sends a no_assignment
// event and closes. If the session terminates, the stream closes.
export async function GET(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve the employee's current crew assignment server-side.
  // Never accept a client-provided assignment ID.
  const today = new Date().toISOString().split('T')[0];
  const { data: assignment } = await supabaseAdmin
    .from('crew_assignments')
    .select('id, current_route_version, current_route_plan_id')
    .or(`driver_employee_id.eq.${employee.id},secondary_employee_id.eq.${employee.id}`)
    .eq('assignment_date', today)
    .maybeSingle();

  if (!assignment) {
    return new Response(
      _sseEvent('no_assignment', { message: 'No crew assignment for today' }),
      { headers: _sseHeaders() }
    );
  }

  // Track the last known route version. Poll for changes.
  let lastVersion = assignment.current_route_version || 0;
  let lastPlanId = assignment.current_route_plan_id;
  let closed = false;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial state.
      controller.enqueue(
        encoder.encode(_sseEvent('route_state', {
          route_id: lastPlanId,
          route_version: lastVersion,
        }))
      );

      // Poll every 5 seconds for route changes.
      const interval = setInterval(async () => {
        if (closed) return;

        try {
          // Re-validate the session on each poll.
          // If the employee logged out, the cookie is gone and
          // getAuthedEmployee will return null.
          const stillValid = await getAuthedEmployee(req);
          if (!stillValid) {
            controller.enqueue(
              encoder.encode(_sseEvent('session_terminated', {}))
            );
            controller.close();
            clearInterval(interval);
            closed = true;
            return;
          }

          // Check for a new route version.
          const { data: latest } = await supabaseAdmin
            .from('route_plans')
            .select('id, route_version, route_change_reason')
            .eq('crew_assignment_id', assignment.id)
            .order('route_version', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latest && latest.route_version > lastVersion) {
            lastVersion = latest.route_version;
            lastPlanId = latest.id;
            controller.enqueue(
              encoder.encode(_sseEvent('route_update', {
                route_id: latest.id,
                route_version: latest.route_version,
                change_reason: latest.route_change_reason || null,
              }))
            );
          }
        } catch (err) {
          // Network/transient error — keep polling.
          // Log but don't close the stream.
          console.error('route-stream poll error:', err.message);
        }
      }, 5000);

      // Clean up on cancel.
      req.signal?.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch (_) {}
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, { headers: _sseHeaders() });
}

function _sseHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
}

function _sseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
