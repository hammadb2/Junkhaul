export function normalizePhone(input) {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(input).trim().startsWith('+')) return String(input).trim();
  return digits ? `+${digits}` : null;
}

export function phoneDigits(input) {
  return normalizePhone(input)?.replace(/\D/g, '') || null;
}
