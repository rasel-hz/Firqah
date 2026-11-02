// Server-side Llama client. Works with any OpenAI-compatible chat-completions provider
// that hosts Llama (tested on Cloudflare Workers AI's OpenAI endpoint).
// No third-party imports: validation is injected so this file is testable on its own.
// Never import this from client-side code: it reads the API key from the environment.

export type LlamaErrorCode =
  | 'missing_config'
  | 'timeout'
  | 'rate_limited'
  | 'network'
  | 'provider_error'
  | 'invalid_output';

/** Messages are safe to show to the user: no stack traces, no secrets. */
const USER_MESSAGES: Record<LlamaErrorCode, string> = {
  missing_config:
    'خدمة Llama غير مهيّأة. أضف LLAMA_API_BASE_URL و LLAMA_API_KEY و LLAMA_MODEL في ملف البيئة ثم أعد تشغيل التطبيق.',
  timeout: 'استغرق النموذج وقتًا أطول من المسموح. حاول مرة أخرى.',
  rate_limited: 'تم تجاوز حد الطلبات لدى مزوّد النموذج. انتظر قليلًا ثم حاول مجددًا.',
  network: 'تعذّر الوصول إلى مزوّد النموذج. تحقق من الاتصال ثم حاول مجددًا.',
  provider_error: 'رجع مزوّد النموذج خطأ. حاول مجددًا، وإذا تكرر تحقق من اسم النموذج والمفتاح.',
  invalid_output: 'رجع النموذج ردًا غير صالح بعد محاولة إصلاح واحدة. حاول مجددًا.',
};

export class LlamaError extends Error {
  readonly code: LlamaErrorCode;
  readonly userMessage: string;
  /** Internal detail for server logs only. Never send this to the browser. */
  readonly detail?: string;

  constructor(code: LlamaErrorCode, detail?: string) {
    super(`${code}${detail ? `: ${detail}` : ''}`);
    this.name = 'LlamaError';
    this.code = code;
    this.userMessage = USER_MESSAGES[code];
    this.detail = detail;
  }
}

export interface LlamaConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Ask the provider for JSON mode. Turn off with LLAMA_JSON_MODE=off if the provider rejects it. */
  jsonMode: boolean;
}

export function readLlamaConfig(env: Record<string, string | undefined> = process.env): LlamaConfig {
  const baseUrl = env.LLAMA_API_BASE_URL?.trim();
  const apiKey = env.LLAMA_API_KEY?.trim();
  const model = env.LLAMA_MODEL?.trim();
  if (!baseUrl || !apiKey || !model) throw new LlamaError('missing_config');
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey,
    model,
    jsonMode: (env.LLAMA_JSON_MODE ?? 'on').toLowerCase() !== 'off',
  };
}

/** Room for a batch of 10 participants with 7 skills each. It is a ceiling: only what is generated is billed. */
const DEFAULT_MAX_TOKENS = 6000;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallOptions<T> {
  system: string;
  user: string;
  /** Throws if the parsed JSON does not match the expected shape. Usually `(d) => schema.parse(d)`. */
  validate: (data: unknown) => T;
  config?: LlamaConfig;
  timeoutMs?: number;
  temperature?: number;
  /** Some providers cut replies short by default (Cloudflare Workers AI), which breaks the JSON. */
  maxTokens?: number;
  fetchImpl?: typeof fetch;
}

/** Pull a JSON object out of a model reply, tolerating code fences and surrounding prose. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object found in reply');
  return JSON.parse(candidate.slice(start, end + 1));
}

async function chat(
  messages: ChatMessage[],
  config: LlamaConfig,
  timeoutMs: number,
  temperature: number,
  maxTokens: number,
  fetchImpl: typeof fetch,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(config.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    if (response.status === 429) throw new LlamaError('rate_limited');
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new LlamaError('provider_error', `HTTP ${response.status} ${body.slice(0, 200)}`);
    }
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[]; usage?: unknown };
    if (data.usage) console.info('[llama] usage', JSON.stringify(data.usage));
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new LlamaError('provider_error', 'empty completion');
    }
    return content;
  } catch (error) {
    if (error instanceof LlamaError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new LlamaError('timeout');
    throw new LlamaError('network', error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls Llama and returns validated JSON. If the first reply is malformed or fails
 * validation, makes exactly one repair attempt, then fails with a clear error.
 */
export async function callLlamaJson<T>(options: CallOptions<T>): Promise<T> {
  const config = options.config ?? readLlamaConfig();
  const timeoutMs = options.timeoutMs ?? 45_000;
  const temperature = options.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const fetchImpl = options.fetchImpl ?? fetch;

  const messages: ChatMessage[] = [
    { role: 'system', content: options.system },
    { role: 'user', content: options.user },
  ];

  const first = await chat(messages, config, timeoutMs, temperature, maxTokens, fetchImpl);
  let firstProblem: string;
  try {
    return options.validate(extractJson(first));
  } catch (error) {
    firstProblem = error instanceof Error ? error.message : String(error);
  }

  const repairMessages: ChatMessage[] = [
    ...messages,
    { role: 'assistant', content: first },
    {
      role: 'user',
      content:
        'Your previous reply was not valid. Problem: ' +
        firstProblem.slice(0, 500) +
        '\nReturn ONLY the corrected JSON object, with no commentary and no code fences.',
    },
  ];
  const second = await chat(repairMessages, config, timeoutMs, temperature, maxTokens, fetchImpl);
  try {
    return options.validate(extractJson(second));
  } catch (error) {
    throw new LlamaError('invalid_output', error instanceof Error ? error.message : String(error));
  }
}
