import { NextResponse } from 'next/server';
import { addToWaitlist } from '@/lib/waitlist';

export const runtime = 'nodejs';

export async function POST(req) {
  const body = await req.json();
  const { name, phone, preferred_day_type = 'either', load_size = null, address = null } = body;
  if (!name || !phone) {
    return NextResponse.json({ error: 'Name and phone are required.' }, { status: 400 });
  }
  try {
    await addToWaitlist({ name, phone, preferred_day_type, load_size, address });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('waitlist add failed:', err);
    return NextResponse.json({ error: 'Could not add you to the waitlist.' }, { status: 500 });
  }
}
