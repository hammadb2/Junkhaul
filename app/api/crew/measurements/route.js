import { NextResponse } from 'next/server';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { recordPhysicalMeasurement, getMeasurementsForBooking } from '@/lib/physicalMeasurements';

export const runtime = 'nodejs';

export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const result = await recordPhysicalMeasurement({
      observationId: body.observation_id,
      bookingId: body.booking_id,
      deviceId: body.device_id,
      operatorId: employee.id,
      measurementType: body.measurement_type,
      weightKg: body.weight_kg,
      lengthCm: body.length_cm,
      widthCm: body.width_cm,
      heightCm: body.height_cm,
      units: body.units,
      photoUrl: body.photo_url,
      reason: body.reason,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function GET(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('booking_id');
  if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
  try {
    const measurements = await getMeasurementsForBooking(bookingId);
    return NextResponse.json({ measurements });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
