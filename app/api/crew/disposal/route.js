import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthedEmployee } from '@/lib/employeeAuth';
import { recordScaleTicket, createDisposalRun } from '@/lib/disposal';

export const runtime = 'nodejs';

// POST /api/crew/disposal — crew submits a scale ticket for a disposal run.
// Body:
//   assignment_id, route_plan_id, facility_id, waste_stream,
//   booking_ids, items, predicted_weight_kg,
//   inbound_weight_kg, outbound_weight_kg, waste_class,
//   facility_fee, surcharge, photo_url, receipt_url, ocr_raw
export async function POST(req) {
  const employee = await getAuthedEmployee(req);
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    assignment_id,
    route_plan_id,
    facility_id,
    waste_stream = 'general',
    booking_ids = [],
    items = [],
    predicted_weight_kg = 0,
    inbound_weight_kg,
    outbound_weight_kg,
    waste_class,
    facility_fee_cents = 0,
    surcharge_cents = 0,
    photo_url,
    receipt_url,
    ocr_raw,
    predicted_cost_cents,
  } = body;

  if (!facility_id || !inbound_weight_kg) {
    return NextResponse.json({ error: 'facility_id and inbound_weight_kg required' }, { status: 400 });
  }

  try {
    let run;
    if (body.disposal_run_id) {
      const { data } = await supabaseAdmin.from('disposal_runs').select('*').eq('id', body.disposal_run_id).single();
      run = data;
    }
    if (!run) {
      run = await createDisposalRun({
        assignmentId: assignment_id,
        routePlanId: route_plan_id,
        facilityId,
        wasteStream,
        bookingIds,
        items,
        weightKg: predicted_weight_kg,
        predictedCostCents: predicted_cost_cents || 0,
      });
    }

    const result = await recordScaleTicket({
      disposalRunId: run.id,
      inboundWeightKg: Number(inbound_weight_kg),
      outboundWeightKg: Number(outbound_weight_kg || 0),
      wasteClass,
      facilityFeeCents: Number(facility_fee_cents),
      surchargeCents: Number(surcharge_cents),
      photoUrl: photo_url,
      receiptUrl: receipt_url,
      ocrRaw: ocr_raw || {},
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
