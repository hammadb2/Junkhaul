import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

export async function GET(req) {
  const auth = await requireStaffPermission(req, {
    permission: 'admin.read',
    action: 'manager_dashboard.read',
    metadata: { route: '/api/admin/manager-dashboard' },
  });
  if (!auth.ok) return auth.response;

  const today = new Date().toISOString().slice(0, 10);
  const [
    { data: todayBookings },
    { data: unassignedBookings },
    { data: failedMessages },
    { data: donationReview },
    { data: incidents },
    { data: escalations },
    { data: crewHours },
    { data: paymentProblems },
  ] = await Promise.all([
    supabaseAdmin.from('bookings').select('id, booking_ref, name, phone, address, quadrant, job_date, job_time, status, crew_assignment_id, truck_size, deposit_paid, balance_due, no_show_risk_score').eq('job_date', today).order('job_time', { ascending: true }),
    supabaseAdmin.from('bookings').select('id, booking_ref, name, address, quadrant, job_date, job_time, status, crew_assignment_id, truck_size').gte('job_date', today).is('crew_assignment_id', null).in('status', ['confirmed','rescheduled']).order('job_date', { ascending: true }).limit(50),
    supabaseAdmin.from('messages').select('*').in('provider_status', ['failed','rejected','suppressed']).order('created_at', { ascending: false }).limit(25),
    supabaseAdmin.from('donation_requests').select('id, name, phone, address, status, ai_outcome, confidence, created_at, last_activity_at').in('status', ['submitted','analyzing','manual_review','needs_more_photos','ai_approved']).order('created_at', { ascending: false }).limit(25),
    supabaseAdmin.from('safety_incidents').select('*').in('status', ['open','investigating']).order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('escalations').select('*').in('status', ['open','pending']).order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('timesheets').select('id, employee_id, clock_in_at, clock_out_at, total_hours, approved_at, booking_id').is('approved_at', null).not('clock_out_at', 'is', null).order('clock_in_at', { ascending: false }).limit(25),
    supabaseAdmin.from('bookings').select('id, booking_ref, name, phone, job_date, status, deposit_paid, balance_due, payment_status').gte('job_date', today).or('deposit_paid.eq.false,payment_status.eq.failed').order('job_date', { ascending: true }).limit(25),
  ]);

  return NextResponse.json({
    today,
    role_context: { roles: auth.context.roles },
    queues: {
      today_bookings: todayBookings || [],
      unassigned_bookings: unassignedBookings || [],
      jobs_missing_crew: (unassignedBookings || []).filter((b) => !b.crew_assignment_id),
      jobs_missing_truck: (todayBookings || []).filter((b) => !b.truck_size),
      at_risk_jobs: (todayBookings || []).filter((b) => Number(b.no_show_risk_score || 0) >= 50),
      failed_quo_messages: failedMessages || [],
      donation_requests_awaiting_review: donationReview || [],
      incidents: incidents || [],
      escalations: escalations || [],
      crew_hours_awaiting_review: crewHours || [],
      payment_problems: paymentProblems || [],
    },
    counts: {
      today_bookings: (todayBookings || []).length,
      unassigned_bookings: (unassignedBookings || []).length,
      failed_quo_messages: (failedMessages || []).length,
      donation_review: (donationReview || []).length,
      incidents: (incidents || []).length,
      escalations: (escalations || []).length,
      crew_hours_awaiting_review: (crewHours || []).length,
      payment_problems: (paymentProblems || []).length,
    },
  });
}
