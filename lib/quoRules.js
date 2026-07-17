export function classifyInboundText(text = '') {
  const t = String(text).trim().toUpperCase();
  if (t === 'STOP' || t === 'STOPALL' || t === 'UNSUBSCRIBE') return 'STOP';
  if (t === 'START' || t === 'UNSTOP') return 'START';
  if (t === 'HELP') return 'HELP';
  if (['YES','Y','CONFIRM','OK'].includes(t)) return 'AFFIRMATIVE';
  if (['NO','N','CANCEL'].includes(t)) return 'NEGATIVE';
  return 'UNKNOWN';
}

export function responseMatchesExpected(text, expected) {
  if (!expected || expected.status !== 'active') return false;
  const normalized = String(text || '').trim().toUpperCase();
  return (expected.valid_responses || []).map((r) => String(r).trim().toUpperCase()).includes(normalized);
}
