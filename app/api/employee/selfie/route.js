import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';

export const runtime = 'nodejs';

const SELFIE_BUCKET = 'crew-photos';

// ============================================================
// POST /api/employee/selfie — upload crew selfie (auth required)
// Multipart form: field `file` (image)
// Uploads to Supabase Storage bucket `crew-photos` at
// selfies/{employee_id}.jpg, updates employees.selfie_url.
// ============================================================
export async function POST(req) {
  const emp = await getAuthedEmployee(req);
  if (!emp) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  if (!file) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  // Ensure the bucket exists (create if missing)
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.id === SELFIE_BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(SELFIE_BUCKET, { public: true });
  }

  // Upload — always overwrite the employee's selfie (upsert)
  const ext = (file.name || 'selfie.jpg').split('.').pop() || 'jpg';
  const path = `selfies/${emp.id}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin
    .storage
    .from(SELFIE_BUCKET)
    .upload(path, bytes, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin
    .storage
    .from(SELFIE_BUCKET)
    .getPublicUrl(path);

  const selfieUrl = urlData?.publicUrl;

  // Update employees.selfie_url
  const { error: updateErr } = await supabaseAdmin
    .from('employees')
    .update({ selfie_url: selfieUrl, updated_at: new Date().toISOString() })
    .eq('id', emp.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, selfie_url: selfieUrl });
}

// ============================================================
// GET /api/employee/selfie?booking_id=XXX — public endpoint
// Returns crew selfies for that booking (via crew_assignments
// for the booking's job_date).
// ============================================================
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('booking_id');
  if (!bookingId) {
    return NextResponse.json({ error: 'booking_id is required' }, { status: 400 });
  }

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, job_date')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ crew: [] });
  }

  const { data: assignments } = await supabaseAdmin
    .from('crew_assignments')
    .select('driver_employee_id, secondary_employee_id')
    .eq('assignment_date', booking.job_date);

  const crewIds = new Set();
  for (const a of assignments || []) {
    if (a.driver_employee_id) crewIds.add(a.driver_employee_id);
    if (a.secondary_employee_id) crewIds.add(a.secondary_employee_id);
  }

  if (crewIds.size === 0) {
    return NextResponse.json({ crew: [] });
  }

  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select('first_name, selfie_url')
    .in('id', Array.from(crewIds));

  const crew = (employees || []).map((e) => ({
    first_name: e.first_name,
    selfie_url: e.selfie_url,
  }));

  return NextResponse.json({ crew });
}
