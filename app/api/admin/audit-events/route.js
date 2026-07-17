import { NextResponse } from 'next/server';
import { requireStaffPermission, redactSensitive } from '@/lib/staffAuth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'audit.read', action: 'audit_events.read' });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entity_type');
  const entityId = searchParams.get('entity_id');
  const eventType = searchParams.get('event_type');
  const actorId = searchParams.get('actor_id');
  const correlationId = searchParams.get('correlation_id');
  const since = searchParams.get('since');
  const allowed = searchParams.get('allowed');
  const limit = Math.min(500, Number.parseInt(searchParams.get('limit') || '200', 10));

  let query = supabaseAdmin
    .from('audit_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (entityType) query = query.eq('entity_type', entityType);
  if (entityId) query = query.eq('entity_id', entityId);
  if (eventType) query = query.eq('event_type', eventType);
  if (actorId) query = query.eq('actor_id', actorId);
  if (correlationId) query = query.eq('correlation_id', correlationId);
  if (since) query = query.gte('created_at', since);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events = (data || [])
    .filter((event) => {
      if (allowed === 'allowed') return event.event_type?.includes('allowed');
      if (allowed === 'denied') return event.event_type?.includes('denied');
      return true;
    })
    .map((event) => ({
      ...event,
      before: redactSensitive(event.before),
      after: redactSensitive(event.after),
      metadata: redactSensitive(event.metadata),
    }));

  return NextResponse.json({ events });
}
