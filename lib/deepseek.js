// ============================================================
// DeepSeek API wrapper — OpenAI-compatible chat completions.
//
// Two modes:
//   1. Simple text generation (briefings, summaries)
//   2. Function calling / tool use (AI agent actions)
//
// MODELS:
//   - deepseek-chat  → fast, supports function calling (use for agent)
//   - deepseek-v4-pro → reasoning model, higher quality text (use for briefings)
//
// USAGE (simple):
//   const { content, usage } = await callDeepSeek({
//     system: 'You are a sharp operator...',
//     prompt: 'Summarize today: 3 jobs, $450 to collect...',
//     temperature: 0.4,
//     max_tokens: 400,
//   });
//
// USAGE (function calling):
//   const { content, tool_calls, usage } = await callDeepSeek({
//     system: 'You are an AI agent...',
//     prompt: 'Call the frustrated customer',
//     tools: [{ type: 'function', function: { name: 'send_sms', ... } }],
//     model: 'deepseek-chat',
//   });
// ============================================================

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// Reasoning model for high-quality text generation (briefings)
const MODEL_REASONING = 'deepseek-v4-pro';
// Fast model for function calling / agent actions
const MODEL_AGENT = 'deepseek-chat';

export const callDeepSeek = async ({
  system = null,
  prompt = null,
  messages = null,
  temperature = 0.4,
  max_tokens = 500,
  tools = null,
  model = null,
  tool_choice = null,
}) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set');
  }

  // Build messages: either explicit messages array, or system+prompt
  let msgArray = [];
  if (messages) {
    msgArray = messages;
  } else {
    if (system) {
      msgArray.push({ role: 'system', content: system });
    }
    if (prompt) {
      msgArray.push({ role: 'user', content: prompt });
    }
  }

  const body = {
    model: model || (tools ? MODEL_AGENT : MODEL_REASONING),
    messages: msgArray,
    temperature,
    max_tokens,
    stream: false,
  };

  // Add tools if provided (function calling)
  if (tools && tools.length > 0) {
    body.tools = tools;
    if (tool_choice) {
      body.tool_choice = tool_choice;
    }
  }

  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DeepSeek API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const choice = data?.choices?.[0];
  const content = choice?.message?.content || '';
  const tool_calls = choice?.message?.tool_calls || null;
  const finish_reason = choice?.finish_reason || null;
  const usage = data?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  return { content, tool_calls, finish_reason, usage };
};
