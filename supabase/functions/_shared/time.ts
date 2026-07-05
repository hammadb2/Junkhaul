// Shared time helpers for edge functions. Everything is Calgary local time.
export const TIMEZONE = 'America/Edmonton';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const dayNames = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const parseDateOnly = (d: string) => new Date(`${d}T12:00:00Z`);

export const formatDateLong = (d: string) => {
  const dt = parseDateOnly(d);
  return `${dayNames[dt.getUTCDay()]}, ${monthNames[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
};

export const formatTime = (t: string) => {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

// Current Calgary-local parts (DST-safe via Intl).
export const edmontonNow = () => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parseInt(parts.hour as string, 10),
    minute: parseInt(parts.minute as string, 10),
    weekday: parts.weekday as string, // 'Mon','Thu','Sun'
  };
};
