import { jobDateTimeUTC } from './dates';

// ============================================================
// NO-SHOW PREDICTION — simple rule-based model (Section 15).
// ============================================================
export const calculateNoShowRisk = (booking) => {
  let risk = 0;
  const jobDatetime = jobDateTimeUTC(booking.job_date, booking.job_time);
  const daysUntilJob = (jobDatetime - new Date()) / 86400000;

  // Lead time (strongest predictor)
  if (daysUntilJob > 7) risk += 35;
  else if (daysUntilJob > 5) risk += 25;
  else if (daysUntilJob > 3) risk += 15;
  else if (daysUntilJob > 1) risk += 5;

  // No photo submitted (less committed)
  if (booking.photo_skipped) risk += 20;

  // Source (phone bookings slightly higher risk)
  if (booking.source === 'phone' || booking.source === 'vapi') risk += 10;

  // Already rescheduled once before
  if (booking.reschedule_count > 0) risk += 25;

  // Time of day (early morning slots have slightly higher no-show rate)
  if (booking.job_time === '07:30') risk += 10;
  else if (booking.job_time === '09:00') risk += 5;

  // Sunday jobs slightly higher (weekend plans change)
  if (booking.job_date) {
    const dow = new Date(`${booking.job_date}T12:00:00Z`).getUTCDay();
    if (dow === 0) risk += 5;
  }

  return Math.min(100, risk);
};
