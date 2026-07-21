import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee, isEmployeeAssignedToBooking } from '@/lib/employeeAuth';
import { checkRouteVersion, staleRouteResponse, missingVersionResponse } from '@/lib/routeVersionGuard';

export const runtime = 'nodejs';

// POST /api/crew/upload-photo — upload crew photo to Supabase storage.
// Accepts multipart/form-data with: booking_id, type, lat, lng, taken_at, photo
// Returns the public/signed URL of the uploaded photo.
//
// Auth: employee session cookie (jh_employee_session) only. The legacy
// x-crew-pin fallback was removed — the PIN-based crew app has no
// recorded usage (see docs/RELIABILITY_MASTER_PLAN.md).
const VALID_TYPES = [
  'arrival', 'completion',
  'before', 'after', 'item', 'damage', 'access_path',
  'truck_bed', 'donation_evidence', 'disposal_evidence', 'receipt',
];

export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const booking_id = formData.get('booking_id');
  const type = formData.get('type');
  const lat = formData.get('lat');
  const lng = formData.get('lng');
  const taken_at = formData.get('taken_at');
  const photo = formData.get('photo');
  const route_id = formData.get('route_id');
  const route_version = formData.get('route_version');

  if (!booking_id || !type || !photo) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Verify the employee is assigned to this booking's crew.
  if (!await isEmployeeAssignedToBooking(employee.id, booking_id)) {
    return NextResponse.json({ error: 'Not assigned to this booking' }, { status: 403 });
  }

  // Stale-write protection: reject if route_version is stale or missing.
  const routeVersionNum = route_version ? parseInt(route_version, 10) : null;
  const routeCheck = await checkRouteVersion(booking_id, route_id, routeVersionNum, {
    isLegacyPinAuth: false,
    actionType: 'photo_upload',
    employeeId: employee.id,
  });
  if (!routeCheck.valid) {
    if (routeCheck.status === 400) return missingVersionResponse();
    return staleRouteResponse(routeCheck.body);
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }

  // File size limit: 15 MB max (photos are compressed client-side to ~1920px).
  const MAX_FILE_SIZE = 15 * 1024 * 1024;
  if (photo.size && photo.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large: ${photo.size} bytes (max ${MAX_FILE_SIZE})` },
      { status: 413 }
    );
  }

  // MIME type verification: accept only image/jpeg (client compresses to JPEG).
  // Also check the file's reported type, not just the hardcoded contentType.
  if (photo.type && !photo.type.startsWith('image/')) {
    return NextResponse.json(
      { error: `Invalid file type: ${photo.type}. Only images are allowed.` },
      { status: 400 }
    );
  }

  const fileExt = 'jpg';
  const fileName = `${type}_${Date.now()}.${fileExt}`;
  const filePath = `crew/${booking_id}/${fileName}`;

  // Upload to Supabase Storage
  const { error: uploadErr } = await supabaseAdmin.storage
    .from('job-photos')
    .upload(filePath, photo, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  // Generate a signed URL (1-year expiry for legal protection)
  const { data: signedUrlData, error: signedErr } = await supabaseAdmin.storage
    .from('job-photos')
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  if (signedErr || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
  }

  const url = signedUrlData.signedUrl;

  // Append to crew_photos JSONB array on the booking
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('crew_photos')
    .eq('id', booking_id)
    .maybeSingle();

  const photos = booking?.crew_photos || [];
  photos.push({
    url,
    type,
    taken_at: taken_at || new Date().toISOString(),
    lat: lat ? parseFloat(lat) : null,
    lng: lng ? parseFloat(lng) : null,
    uploaded_by: employee.id,
  });

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({ crew_photos: photos })
    .eq('id', booking_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ url });
}
