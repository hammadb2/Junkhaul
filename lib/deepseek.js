// ============================================================
// DeepSeek API wrapper — OpenAI-compatible chat completions.
//
// USAGE:
//   const { content, usage } = await callDeepSeek({
//     system: 'You are a sharp operator...',
//     prompt: 'Summarize today: 3 jobs, $450 to collect...',
//     temperature: 0.4,
//     max_tokens: 400,
//   });
//
// MODEL: deepseek-v4-pro
//   The legacy aliases `deepseek-chat` and `deepseek-reasoner` are
//   being fully retired on 2026-07-24T15:59:00Z. Using the real
//   model name now avoids a forced migration in two weeks.
//
// PERFORMANCE NOTE:
//   DeepSeek V4 Pro benchmarks at ~53 tokens/sec with ~1s
//   time-to-first-token. That's fine for async briefings like the
//   admin narrator (nobody is watching it load), but NOT suitable
//   for live voice (Vapi) or real-time SMS where a customer would
//   sit through multi-second silence. Keep using Groq for those.
// ============================================================

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-v4-pro';

export const callDeepSeek = async ({
  system = null,
  prompt,
  temperature = 0.4,
  max_tokens = 500,
}) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set');
  }

  const messages = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature,
      max_tokens,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DeepSeek API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  const usage = data?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  return { content, usage };
};
