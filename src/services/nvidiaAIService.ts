/**
 * NVIDIA AI Service — Central OpenAI-Compatible Client
 *
 * Single source of truth for all NVIDIA API interactions.
 * All 12 agents route through this service.
 * The API key is NEVER exposed to frontend, logs, or responses.
 *
 * Uses native fetch (Node 18+) — zero extra dependencies.
 */

import 'dotenv/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NvidiaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NvidiaRequestOptions {
  /** Temperature 0–1. Default 0.2 for deterministic factual extraction. */
  temperature?: number;
  /** Max tokens. Default 2048. */
  maxTokens?: number;
  /** Top-P sampling. Default 0.9. */
  topP?: number;
  /** Request timeout in ms. Default 30_000. */
  timeoutMs?: number;
}

export interface NvidiaResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finishReason: string;
  durationMs: number;
}

export interface NvidiaServiceConfig {
  apiBase: string;
  model: string;
  /** Key loaded exclusively from env — never passed in directly. */
  _keySource: 'env';
}

// ─── Configuration (loaded from environment — never hard-coded) ───────────────

function getNvidiaConfig(): NvidiaServiceConfig {
  const apiBase =
    process.env.NVIDIA_API_BASE ?? 'https://integrate.api.nvidia.com/v1';
  const model =
    process.env.NVIDIA_MODEL ?? 'nvidia/nvidia-nemotron-nano-9b-v2';

  return { apiBase, model, _keySource: 'env' };
}

function getNvidiaKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key || key.trim() === '' || key === 'your_new_rotated_key') {
    throw new NvidiaConfigError(
      'NVIDIA_API_KEY is not set. Add it to your environment/.env file.'
    );
  }
  return key.trim();
}

// ─── Custom Errors ────────────────────────────────────────────────────────────

export class NvidiaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NvidiaConfigError';
  }
}

export class NvidiaAPIError extends Error {
  public readonly statusCode: number;
  public readonly retryable: boolean;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'NvidiaAPIError';
    this.statusCode = statusCode;
    // 429 rate-limit and 5xx server errors are retryable
    this.retryable = statusCode === 429 || statusCode >= 500;
  }
}

export class NvidiaTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`NVIDIA API request timed out after ${timeoutMs}ms`);
    this.name = 'NvidiaTimeoutError';
  }
}

export class NvidiaParseError extends Error {
  public readonly rawContent: string;
  constructor(rawContent: string) {
    super('Failed to parse JSON response from NVIDIA model');
    this.name = 'NvidiaParseError';
    this.rawContent = rawContent;
  }
}

// ─── Core Chat Completion ─────────────────────────────────────────────────────

/**
 * Send a chat completion request to NVIDIA Nemotron Nano 9B.
 * This is the ONLY function that holds/uses the API key.
 * Never call this from frontend code.
 */
export async function nvidiaChat(
  messages: NvidiaMessage[],
  options: NvidiaRequestOptions = {}
): Promise<NvidiaResponse> {
  const config = getNvidiaConfig();
  const apiKey = getNvidiaKey(); // throws NvidiaConfigError if missing

  const {
    temperature = 0.2,
    maxTokens = 2048,
    topP = 0.9,
    timeoutMs = 30_000,
  } = options;

  const requestBody = {
    model: config.model,
    messages,
    temperature,
    max_tokens: maxTokens,
    top_p: topP,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(`${config.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Key used here only — never logged, never returned
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'RozgarVaani-MultiAgent/1.0',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new NvidiaTimeoutError(timeoutMs);
    }
    throw new NvidiaAPIError(`Network error: ${err.message}`, 0);
  } finally {
    clearTimeout(timer);
  }

  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error body');
    // Scrub any accidental key echo from error body
    const safeError = errorText.replace(/(Bearer\s+)\S+/gi, '$1[REDACTED]');
    throw new NvidiaAPIError(
      `NVIDIA API error ${response.status}: ${safeError}`,
      response.status
    );
  }

  const json = await response.json() as any;

  const content: string = json?.choices?.[0]?.message?.content ?? '';
  const finishReason: string = json?.choices?.[0]?.finish_reason ?? 'stop';
  const usage = json?.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  return {
    content,
    model: json?.model ?? config.model,
    usage,
    finishReason,
    durationMs,
  };
}

// ─── JSON Extraction Helper ───────────────────────────────────────────────────

/**
 * Extract a JSON object from a model response that may contain
 * markdown code fences or surrounding prose.
 */
export function extractJSON(raw: string): unknown {
  // 1. Try direct parse
  try {
    return JSON.parse(raw.trim());
  } catch { /* ignore */ }

  // 2. Extract from ```json ... ``` fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch { /* ignore */ }
  }

  // 3. Extract first { ... } block
  const braceStart = raw.indexOf('{');
  const braceEnd = raw.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(raw.slice(braceStart, braceEnd + 1));
    } catch { /* ignore */ }
  }

  throw new NvidiaParseError(raw);
}

// ─── Connection Test ──────────────────────────────────────────────────────────

/**
 * Lightweight connectivity check.
 * Returns model name on success, throws on failure.
 * Safe to call from health-check endpoints.
 */
export async function testNvidiaConnection(): Promise<{
  ok: boolean;
  model: string;
  durationMs: number;
  error?: string;
}> {
  try {
    const result = await nvidiaChat(
      [
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'Reply with exactly: {"status":"ok"}' },
      ],
      { temperature: 0, maxTokens: 20, timeoutMs: 15_000 }
    );
    return { ok: true, model: result.model, durationMs: result.durationMs };
  } catch (err: any) {
    return { ok: false, model: '', durationMs: 0, error: err.message };
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const NVIDIA_MODEL_DISPLAY_NAME = 'NVIDIA Nemotron Nano 9B';
export const NVIDIA_MODEL_ID = process.env.NVIDIA_MODEL ?? 'nvidia/nvidia-nemotron-nano-9b-v2';
export const NVIDIA_API_BASE = process.env.NVIDIA_API_BASE ?? 'https://integrate.api.nvidia.com/v1';
