import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runAgent } from '@/lib/aiAgent';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST /api/admin/agent
// Body: { message: string, conversation: [{role, content}] }
// Returns: { response, actions, usage }
export async function POST(req) {
  const auth = await requireStaffPermission(req, { permission: 'agent.use', action: 'agent.run' });
  if (!auth.ok) return auth.response;

  try {
    const { message, conversation = [] } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });
    }

    const result = await runAgent(message, conversation);

    // Log the conversation to ai_insights for history
    try {
      await supabaseAdmin.from('ai_insights').insert({
        content: `User: ${message}\nAgent: ${result.response}`,
        model: 'deepseek-chat-agent',
        input_summary: { message, actions: result.actions },
        generated_at: new Date().toISOString(),
      });
    } catch (_) {}

    return NextResponse.json(result);
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/admin/agent/actions — recent agent actions
export async function GET(req) {
  const auth = await requireStaffPermission(req, { permission: 'agent.use', action: 'agent.read_actions' });
  if (!auth.ok) return auth.response;

  try {
    // Try ai_agent_actions table first
    let { data, error } = await supabaseAdmin
      .from('ai_agent_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // Fallback: get from system_events
      const { data: events, error: evtErr } = await supabaseAdmin
        .from('system_events')
        .select('*')
        .eq('event_type', 'ai_agent_action')
        .order('created_at', { ascending: false })
        .limit(50);
      if (evtErr) return NextResponse.json({ error: evtErr.message }, { status: 500 });
      data = (events || []).map(e => ({
        id: e.id,
        tool_name: e.payload?.tool || 'unknown',
        arguments: e.payload?.args || {},
        success: e.payload?.success ?? true,
        error: e.payload?.error || null,
        created_at: e.created_at,
      }));
    }

    return NextResponse.json({ actions: data || [] });
  } catch (error) {
    console.error('Agent actions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
