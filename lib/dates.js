// ============================================================
// Date/time helpers — everything customer-facing is Calgary local time.
// ============================================================
export const TIMEZONE = 'America/Edmonton';

// job_date is 'YYYY-MM-DD', job_time is 'HH:MM' (24h). Treat as Calgary local.
// We format for display without pulling the machine's timezone into it.
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const dayNames = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

// Parse 'YYYY-MM-DD' into a UTC-noon Date so weekday math is stable regardless
// of the server timezone (noon avoids any DST edge flipping the calendar day).
const parseDateOnly = (dateStr) => new Date(`${dateStr}T12:00:00Z`);

export const dayName = (dateStr) => dayNames[parseDateOnly(dateStr).getUTCDay()];

export const monthName = (dateStr) =>
  monthNames[parseDateOnly(dateStr).getUTCMonth()];

export const dayOfMonth = (dateStr) => parseDateOnly(dateStr).getUTCDate();

export const dayType = (dateStr) =>
  parseDateOnly(dateStr).getUTCDay() === 0 ? 'sunday' : 'thursday';

// '15:00' -> '3:00 PM'
export const formatTime = (time24) => {
  const [h, m] = time24.split(':').map((x) => parseInt(x, 10));
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

// "Thursday, July 3"
export const formatDateLong = (dateStr) =>
  `${dayName(dateStr)}, ${monthName(dateStr)} ${dayOfMonth(dateStr)}`;

// Current parts in Calgary local time (used by cron guards / no-show logic).
export const edmontonNowParts = () => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    weekday: parts.weekday, // 'Mon','Thu','Sun', ...
  };
};

// Compute the UTC instant for a Calgary-local job_date + job_time.
// Handles MST/MDT by probing both offsets and picking the one that renders back
// to the requested local time.
export const jobDateTimeUTC = (dateStr, time24) => {
  const [y, mo, d] = dateStr.split('-').map((x) => parseInt(x, 10));
  const [h, mi] = time24.split(':').map((x) => parseInt(x, 10));
  for (const offset of [6, 7]) {
    const guess = new Date(Date.UTC(y, mo - 1, d, h + offset, mi));
    const back = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      hour: '2-digit', hour12: false,
    }).formatToParts(guess).find((p) => p.type === 'hour').value;
    if (parseInt(back, 10) % 24 === h % 24) return guess;
  }
  // Fallback: assume MDT (-6 in summer is MDT? MDT is UTC-6, MST is UTC-7)
  return new Date(Date.UTC(y, mo - 1, d, h + 6, mi));
};
