import { jobDateTimeUTC } from './dates';
import { getNumberConfig } from './config';

// ============================================================
// NO-SHOW PREDICTION — simple rule-based model (Section 15).
// All weights are read from system_config with fallback defaults.
// ============================================================

const loadNoShowConfig = async () => {
  return {
    lead_gt_7d: await getNumberConfig('risk_lead_gt_7d', 35),
    lead_gt_5d: await getNumberConfig('risk_lead_gt_5d', 25),
    lead_gt_3d: await getNumberConfig('risk_lead_gt_3d', 15),
    lead_gt_1d: await getNumberConfig('risk_lead_gt_1d', 5),
    no_photo: await getNumberConfig('risk_no_photo', 20),
    phone_source: await getNumberConfig('risk_phone_source', 10),
    rescheduled: await getNumberConfig('risk_rescheduled', 25),
    time_0730: await getNumberConfig('risk_time_0730', 10),
    time_0900: await getNumberConfig('risk_time_0900', 5),
    sunday: await getNumberConfig('risk_sunday', 5),
  };
};

export const calculateNoShowRisk = async (booking) => {
  const cfg = await loadNoShowConfig();
  let risk = 0;
  const jobDatetime = jobDateTimeUTC(booking.job_date, booking.job_time);
  const daysUntilJob = (jobDatetime - new Date()) / 86400000;

  // Lead time (strongest predictor)
  if (daysUntilJob > 7) risk += cfg.lead_gt_7d;
  else if (daysUntilJob > 5) risk += cfg.lead_gt_5d;
  else if (daysUntilJob > 3) risk += cfg.lead_gt_3d;
  else if (daysUntilJob > 1) risk += cfg.lead_gt_1d;

  // No photo submitted (less committed)
  if (booking.photo_skipped) risk += cfg.no_photo;

  // Source (phone bookings slightly higher risk)
  if (booking.source === 'phone' || booking.source === 'vapi') risk += cfg.phone_source;

  // Already rescheduled once before
  if (booking.reschedule_count > 0) risk += cfg.rescheduled;

  // Time of day (early morning slots have slightly higher no-show rate)
  if (booking.job_time === '07:30') risk += cfg.time_0730;
  else if (booking.job_time === '09:00') risk += cfg.time_0900;

  // Sunday jobs slightly higher (weekend plans change)
  if (booking.job_date) {
    const dow = new Date(`${booking.job_date}T12:00:00Z`).getUTCDay();
    if (dow === 0) risk += cfg.sunday;
  }

  return Math.min(100, risk);
};
